import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Submit a command - matches against rules and processes
export const submitCommand = internalMutation({
  args: {
    userId: v.id("users"),
    commandText: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // 1. Validate user credits
    const creditDoc = await ctx.db
      .query("user_credits")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
      .unique();

    const currentBalance = creditDoc?.balance ?? 0;

    // 2. Fetch enabled rules sorted by priority
    const enabledRules: any[] = await ctx.runQuery(internal.rules.getEnabledRules, {});
    
    // Sort by priority descending (higher priority first)
    const sortedRules: any[] = enabledRules.sort((a: any, b: any) => {
      const priorityA = a.priority ?? 0;
      const priorityB = b.priority ?? 0;
      return priorityB - priorityA;
    });

    // 3. Match command_text against rule patterns
    let matchedRule = null;
    let action: "AUTO_ACCEPT" | "AUTO_REJECT" | "REQUIRE_APPROVAL" = "REQUIRE_APPROVAL";
    let cost = 1; // Default cost

    for (const rule of sortedRules) {
      try {
        const regex = new RegExp(rule.pattern);
        if (regex.test(args.commandText)) {
          matchedRule = rule;
          action = rule.action;
          cost = rule.cost ?? 1; // Use rule cost if specified, otherwise default to 1
          break; // First match wins
        }
      } catch (error) {
        // Invalid regex pattern, skip this rule
        console.error(`Invalid regex pattern in rule ${rule._id}: ${rule.pattern}`);
        continue;
      }
    }

    // 4. Check if user has sufficient credits
    if (currentBalance < cost) {
      // Create command with rejected status
      const commandId: any = await ctx.db.insert("commands", {
        user_id: args.userId,
        command_text: args.commandText,
        status: "rejected",
        matched_rule_id: matchedRule?._id,
        cost: cost,
        created_at: Date.now(),
        rejection_reason: "Insufficient credits",
      });

      // Create audit log
      await ctx.db.insert("audit_logs", {
        user_id: args.userId,
        command_id: commandId,
        event_type: "COMMAND_REJECTED",
        details: {
          reason: "Insufficient credits",
          required: cost,
          available: currentBalance,
        },
        created_at: Date.now(),
      });

      return {
        commandId,
        status: "rejected",
        reason: "Insufficient credits",
      };
    }

    // 5. Determine status based on action
    let status: "pending" | "executed" | "rejected" | "needs_approval" = "pending";
    if (action === "AUTO_ACCEPT") {
      status = "executed";
    } else if (action === "AUTO_REJECT") {
      status = "rejected";
    } else if (action === "REQUIRE_APPROVAL") {
      status = "needs_approval";
    }

    // 6. Transactionally deduct credits and store command + audit log
    // Deduct credits
    if (creditDoc) {
      await ctx.db.patch(creditDoc._id, {
        balance: creditDoc.balance - cost,
        updated_at: Date.now(),
      });
    } else {
      await ctx.db.insert("user_credits", {
        user_id: args.userId,
        balance: -cost,
        updated_at: Date.now(),
      });
    }

    // Create command
    const commandId = await ctx.db.insert("commands", {
      user_id: args.userId,
      command_text: args.commandText,
      status: status,
      matched_rule_id: matchedRule?._id,
      cost: cost,
      created_at: Date.now(),
      executed_at: status === "executed" ? Date.now() : undefined,
      rejection_reason: status === "rejected" ? "Matched rule with AUTO_REJECT action" : undefined,
    });

    // Create audit log
    const eventType = status === "executed" 
      ? "COMMAND_EXECUTED" 
      : status === "rejected" 
      ? "COMMAND_REJECTED" 
      : "COMMAND_SUBMITTED";

    await ctx.db.insert("audit_logs", {
      user_id: args.userId,
      command_id: commandId,
      event_type: eventType,
      details: {
        command_text: args.commandText,
        matched_rule_id: matchedRule?._id,
        action: action,
        cost: cost,
      },
      created_at: Date.now(),
    });

    return {
      commandId,
      status: status,
      action: action,
      cost: cost,
      matchedRuleId: matchedRule?._id,
    };
  },
});

// List commands with optional filters
export const listCommands = internalQuery({
  args: {
    userId: v.optional(v.id("users")),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("executed"),
      v.literal("rejected"),
      v.literal("needs_approval")
    )),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    if (args.userId && args.status) {
      return await ctx.db
        .query("commands")
        .withIndex("by_user_id_and_status", (q) =>
          q.eq("user_id", args.userId!).eq("status", args.status!)
        )
        .order("desc")
        .collect();
    } else if (args.userId) {
      return await ctx.db
        .query("commands")
        .withIndex("by_user_id", (q) => q.eq("user_id", args.userId!))
        .order("desc")
        .collect();
    } else if (args.status) {
      return await ctx.db
        .query("commands")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else {
      return await ctx.db
        .query("commands")
        .order("desc")
        .collect();
    }
  },
});

// Get a single command
export const getCommand = internalQuery({
  args: {
    commandId: v.id("commands"),
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.commandId);
  },
});

