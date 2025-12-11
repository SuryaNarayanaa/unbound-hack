import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Get commands that need approval
export const getPendingApprovals = internalQuery({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    return await ctx.db
      .query("commands")
      .withIndex("by_status", (q) => q.eq("status", "needs_approval"))
      .order("desc")
      .collect();
  },
});

// Get votes for a command
export const getVotesForCommand = internalQuery({
  args: {
    commandId: v.id("commands"),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("votes")
      .withIndex("by_command_id", (q) => q.eq("command_id", args.commandId))
      .collect();
  },
});

// Get vote counts for a command
export const getVoteCounts = internalQuery({
  args: {
    commandId: v.id("commands"),
  },
  returns: v.object({
    approve: v.number(),
    reject: v.number(),
    total: v.number(),
  }),
  handler: async (ctx, args): Promise<{
    approve: number;
    reject: number;
    total: number;
  }> => {
    const votes: any[] = await ctx.runQuery(internal.approvals.getVotesForCommand, {
      commandId: args.commandId,
    });
    
    const approve: number = votes.filter((v: any) => v.vote_type === "approve").length;
    const reject: number = votes.filter((v: any) => v.vote_type === "reject").length;
    
    return {
      approve,
      reject,
      total: votes.length,
    };
  },
});

// Cast a vote on a command
export const castVote = internalMutation({
  args: {
    commandId: v.id("commands"),
    userId: v.id("users"),
    voteType: v.union(v.literal("approve"), v.literal("reject")),
  },
  returns: v.id("votes"),
  handler: async (ctx, args) => {
    // Check if command exists and is pending approval
    const command = await ctx.db.get(args.commandId);
    if (!command) {
      throw new Error("Command not found");
    }
    if (command.status !== "needs_approval") {
      throw new Error("Command is not pending approval");
    }

    // Check if user has already voted
    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_command_and_user", (q) =>
        q.eq("command_id", args.commandId).eq("user_id", args.userId)
      )
      .unique();

    let voteId;
    if (existingVote) {
      // Update existing vote
      await ctx.db.patch(existingVote._id, {
        vote_type: args.voteType,
        created_at: Date.now(),
      });
      voteId = existingVote._id;
    } else {
      // Create new vote
      voteId = await ctx.db.insert("votes", {
        command_id: args.commandId,
        user_id: args.userId,
        vote_type: args.voteType,
        created_at: Date.now(),
      });
    }

    // Check if voting threshold is met
    const voteCounts = await ctx.runQuery(internal.approvals.getVoteCounts, {
      commandId: args.commandId,
    });

    // If command has a voting threshold, check if it's met
    if (command.voting_threshold && voteCounts.approve >= command.voting_threshold) {
      // Auto-approve based on votes
      await ctx.runMutation(internal.approvals.approveCommand, {
        commandId: args.commandId,
        approverId: args.userId,
        reason: `Auto-approved: ${voteCounts.approve} approve votes reached threshold of ${command.voting_threshold}`,
      });
    }

    // Create audit log
    await ctx.runMutation(internal.admin.createAuditLog, {
      userId: args.userId,
      commandId: args.commandId,
      eventType: "VOTE_CAST",
      details: {
        vote_type: args.voteType,
        approve_count: voteCounts.approve,
        reject_count: voteCounts.reject,
      },
    });

    return voteId;
  },
});

// Approve a command
export const approveCommand = internalMutation({
  args: {
    commandId: v.id("commands"),
    approverId: v.id("users"),
    reason: v.optional(v.string()),
  },
  returns: v.id("commands"),
  handler: async (ctx, args) => {
    const command = await ctx.db.get(args.commandId);
    if (!command) {
      throw new Error("Command not found");
    }
    if (command.status !== "needs_approval") {
      throw new Error("Command is not pending approval");
    }

    // Check if user has sufficient credits
    const creditDoc = await ctx.db
      .query("user_credits")
      .withIndex("by_user_id", (q) => q.eq("user_id", command.user_id))
      .unique();

    const currentBalance = creditDoc?.balance ?? 0;
    if (currentBalance < command.cost) {
      throw new Error("Insufficient credits to execute command");
    }

    // Deduct credits
    if (creditDoc) {
      await ctx.db.patch(creditDoc._id, {
        balance: creditDoc.balance - command.cost,
        updated_at: Date.now(),
      });
    } else {
      await ctx.db.insert("user_credits", {
        user_id: command.user_id,
        balance: -command.cost,
        updated_at: Date.now(),
      });
    }

    // Update command status
    await ctx.db.patch(args.commandId, {
      status: "executed",
      executed_at: Date.now(),
      approver_id: args.approverId,
      approved_at: Date.now(),
      approval_reason: args.reason,
      output: `Execution mocked: would run '${command.command_text}'`,
    });

    // Create audit logs
    await ctx.runMutation(internal.admin.createAuditLog, {
      userId: args.approverId,
      commandId: args.commandId,
      eventType: "COMMAND_APPROVED",
      details: {
        reason: args.reason,
        cost: command.cost,
      },
    });

    await ctx.runMutation(internal.admin.createAuditLog, {
      userId: command.user_id,
      commandId: args.commandId,
      eventType: "COMMAND_EXECUTED",
      details: {
        command_text: command.command_text,
        matched_rule_id: command.matched_rule_id,
        cost: command.cost,
        note: "mocked_execution",
        approved_by: args.approverId,
      },
    });

    return args.commandId;
  },
});

// Reject a command (by approver)
export const rejectCommand = internalMutation({
  args: {
    commandId: v.id("commands"),
    approverId: v.id("users"),
    reason: v.string(),
  },
  returns: v.id("commands"),
  handler: async (ctx, args) => {
    const command = await ctx.db.get(args.commandId);
    if (!command) {
      throw new Error("Command not found");
    }
    if (command.status !== "needs_approval") {
      throw new Error("Command is not pending approval");
    }

    // Update command status
    await ctx.db.patch(args.commandId, {
      status: "rejected",
      approver_id: args.approverId,
      approved_at: Date.now(),
      approval_reason: args.reason,
      rejection_reason: args.reason,
    });

    // Create audit logs
    await ctx.runMutation(internal.admin.createAuditLog, {
      userId: args.approverId,
      commandId: args.commandId,
      eventType: "COMMAND_REJECTED_BY_APPROVER",
      details: {
        reason: args.reason,
      },
    });

    await ctx.runMutation(internal.admin.createAuditLog, {
      userId: command.user_id,
      commandId: args.commandId,
      eventType: "COMMAND_REJECTED",
      details: {
        command_text: command.command_text,
        matched_rule_id: command.matched_rule_id,
        rejection_reason: args.reason,
        rejected_by: args.approverId,
      },
    });

    return args.commandId;
  },
});

