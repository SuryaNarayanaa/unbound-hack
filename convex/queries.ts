import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { hashApiKey } from "./lib/api_key";

// Helper to authenticate user by API key
async function authenticateUser(ctx: QueryCtx | MutationCtx, apiKey: string): Promise<any> {
  const apiKeyHash = await hashApiKey(apiKey);
  const user: any = await ctx.runQuery(internal.users.getUserByApiKey, { apiKeyHash });
  if (!user) {
    throw new Error("Invalid API Key");
  }
  return user;
}

// Helper to check role
function checkRole(user: { role?: "admin" | "member" }, requiredRole?: "admin" | "member") {
  if (requiredRole && user.role !== requiredRole) {
    throw new Error("Forbidden: Insufficient permissions");
  }
}

// Get current user info
export const getMe = query({
  args: { apiKey: v.string() },
  returns: v.union(
    v.object({
      id: v.id("users"),
      email: v.optional(v.string()),
      name: v.optional(v.string()),
      role: v.optional(v.union(v.literal("admin"), v.literal("member"))),
      credits: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args): Promise<{
    id: any;
    email?: string;
    name?: string;
    role?: "admin" | "member";
    credits: number;
  } | null> => {
    const user = await authenticateUser(ctx, args.apiKey);
    const result: {
      id: any;
      email?: string;
      name?: string;
      role?: "admin" | "member";
      credits: number;
    } | null = await ctx.runQuery(internal.users.getMe, { userId: user._id });
    return result;
  },
});

// List users (Admin only)
export const listUsers = query({
  args: { apiKey: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx, args.apiKey);
    checkRole(user, "admin");
    const users: any[] = await ctx.runQuery(internal.admin.listUsers, {});
    
    // Transform to match frontend format
    const usersWithCredits: any[] = await Promise.all(
      users.map(async (u: any) => {
        const creditDoc = await ctx.db
          .query("user_credits")
          .withIndex("by_user_id", (q) => q.eq("user_id", u._id))
          .unique();
        
        return {
          id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          credits: creditDoc?.balance ?? 0,
          created_at: u.created_at,
        };
      })
    );
    
    return usersWithCredits;
  },
});

// Create user (Admin only)
export const createUser = mutation({
  args: {
    apiKey: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    initialCredits: v.optional(v.number()),
  },
  returns: v.object({
    userId: v.id("users"),
    apiKey: v.string(),
  }),
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx, args.apiKey);
    checkRole(user, "admin");
    
    const result: {
      userId: any;
      email: string;
      apiKey: string;
    } = await ctx.runMutation(internal.admin.createApiUser, {
      email: args.email,
      name: args.name,
      role: args.role,
    });
    
    // Create audit log for user creation
    // user_id is the created user, creator is stored in details
    await ctx.runMutation(internal.admin.createAuditLog, {
      userId: result.userId, // The user who was created
      eventType: "USER_CREATED",
      details: {
        created_by: user._id, // The admin who created the user
        email: args.email,
        name: args.name,
        role: args.role,
        initial_credits: args.initialCredits ?? 100,
      },
    });
    
    // Set initial credits (default to 100 if not provided)
    const creditsToAdd = args.initialCredits ?? 100;
    await ctx.runMutation(internal.admin.adjustCredits, {
      userId: result.userId,
      amount: creditsToAdd,
      reason: "initial_credits",
    });
    
    return {
      userId: result.userId,
      apiKey: result.apiKey,
    };
  },
});

// Adjust credits (Admin only)
export const adjustCredits = mutation({
  args: {
    apiKey: v.string(),
    userId: v.id("users"),
    amount: v.number(),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx, args.apiKey);
    checkRole(user, "admin");
    
    await ctx.runMutation(internal.admin.adjustCredits, {
      userId: args.userId,
      amount: args.amount,
      reason: args.reason ?? "manual_adjustment",
    });
    
    return null;
  },
});

// List rules (Admin only)
export const listRules = query({
  args: { apiKey: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args): Promise<any[]> => {
    const user = await authenticateUser(ctx, args.apiKey);
    checkRole(user, "admin");
    const result: any[] = await ctx.runQuery(internal.rules.listRules, {});
    return result;
  },
});

// Create rule (Admin only)
export const createRule = mutation({
  args: {
    apiKey: v.string(),
    pattern: v.string(),
    action: v.union(v.literal("AUTO_ACCEPT"), v.literal("AUTO_REJECT"), v.literal("REQUIRE_APPROVAL")),
    priority: v.number(),
    enabled: v.boolean(),
    cost: v.optional(v.number()),
    // Escalation fields
    escalation_enabled: v.optional(v.boolean()),
    escalation_delay_ms: v.optional(v.number()),
    escalation_action: v.optional(v.union(v.literal("AUTO_ACCEPT"), v.literal("AUTO_REJECT"))),
    // Time-based scheduling fields
    schedule_type: v.optional(v.union(v.literal("always"), v.literal("time_windows"), v.literal("cron"))),
    time_windows: v.optional(v.array(v.object({
      day_of_week: v.number(),
      start_hour: v.number(),
      start_minute: v.number(),
      end_hour: v.number(),
      end_minute: v.number(),
      timezone: v.optional(v.string()),
    }))),
    cron_expression: v.optional(v.string()),
    cron_timezone: v.optional(v.string()),
    restricted_to_user_id: v.optional(v.id("users")),
    restricted_to_role: v.optional(v.union(v.literal("admin"), v.literal("member"))),
    voting_threshold: v.optional(v.number()),
  },
  returns: v.id("rules"),
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx, args.apiKey);
    checkRole(user, "admin");
    
    // Validate regex pattern
    try {
      new RegExp(args.pattern);
    } catch (error: any) {
      throw new Error(`Invalid regex pattern: ${error.message}`);
    }
    
    const ruleId: any = await ctx.runMutation(internal.admin.createRule, {
      pattern: args.pattern,
      action: args.action,
      priority: args.priority,
      enabled: args.enabled,
      creatorId: user._id,
      cost: args.cost,
      escalation_enabled: args.escalation_enabled,
      escalation_delay_ms: args.escalation_delay_ms,
      escalation_action: args.escalation_action,
      schedule_type: args.schedule_type,
      time_windows: args.time_windows,
      cron_expression: args.cron_expression,
      cron_timezone: args.cron_timezone,
      restricted_to_user_id: args.restricted_to_user_id,
      restricted_to_role: args.restricted_to_role,
    });
    
    // Create audit log with pattern and action
    await ctx.runMutation(internal.admin.createAuditLog, {
      userId: user._id,
      eventType: "RULE_CREATED",
      details: {
        rule_id: ruleId,
        pattern: args.pattern,
        action: args.action,
        priority: args.priority,
        cost: args.cost,
        escalation_enabled: args.escalation_enabled,
        escalation_delay_ms: args.escalation_delay_ms,
        escalation_action: args.escalation_action,
        schedule_type: args.schedule_type,
        time_windows: args.time_windows,
        cron_expression: args.cron_expression,
        cron_timezone: args.cron_timezone,
      },
    });
    
    return ruleId;
  },
});

// Update rule (Admin only)
export const updateRule = mutation({
  args: {
    apiKey: v.string(),
    ruleId: v.id("rules"),
    pattern: v.optional(v.string()),
    action: v.optional(v.union(
      v.literal("AUTO_ACCEPT"),
      v.literal("AUTO_REJECT"),
      v.literal("REQUIRE_APPROVAL")
    )),
    priority: v.optional(v.number()),
    enabled: v.optional(v.boolean()),
    cost: v.optional(v.number()),
    // Escalation fields
    escalation_enabled: v.optional(v.boolean()),
    escalation_delay_ms: v.optional(v.number()),
    escalation_action: v.optional(v.union(v.literal("AUTO_ACCEPT"), v.literal("AUTO_REJECT"))),
    // Time-based scheduling fields
    schedule_type: v.optional(v.union(v.literal("always"), v.literal("time_windows"), v.literal("cron"))),
    time_windows: v.optional(v.array(v.object({
      day_of_week: v.number(),
      start_hour: v.number(),
      start_minute: v.number(),
      end_hour: v.number(),
      end_minute: v.number(),
      timezone: v.optional(v.string()),
    }))),
    cron_expression: v.optional(v.string()),
    cron_timezone: v.optional(v.string()),
    restricted_to_user_id: v.optional(v.id("users")),
    restricted_to_role: v.optional(v.union(v.literal("admin"), v.literal("member"))),
    voting_threshold: v.optional(v.number()),
  },
  returns: v.id("rules"),
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx, args.apiKey);
    checkRole(user, "admin");
    
    // Get current rule to include in audit log
    const currentRule: any = await ctx.runQuery(internal.rules.getRule, {
      ruleId: args.ruleId,
    });
    
    if (!currentRule) {
      throw new Error("Rule not found");
    }
    
    // Validate regex pattern if provided
    if (args.pattern) {
      try {
        new RegExp(args.pattern);
      } catch (error: any) {
        throw new Error(`Invalid regex pattern: ${error.message}`);
      }
    }
    
    await ctx.runMutation(internal.rules.updateRule, {
      ruleId: args.ruleId,
      pattern: args.pattern,
      action: args.action,
      priority: args.priority,
      enabled: args.enabled,
      cost: args.cost,
      escalation_enabled: args.escalation_enabled,
      escalation_delay_ms: args.escalation_delay_ms,
      escalation_action: args.escalation_action,
      schedule_type: args.schedule_type,
      time_windows: args.time_windows,
      cron_expression: args.cron_expression,
      cron_timezone: args.cron_timezone,
      restricted_to_user_id: args.restricted_to_user_id,
      restricted_to_role: args.restricted_to_role,
    });
    
    // Create audit log with pattern and action
    await ctx.runMutation(internal.admin.createAuditLog, {
      userId: user._id,
      eventType: "RULE_UPDATED",
      details: {
        rule_id: args.ruleId,
        pattern: args.pattern ?? currentRule.pattern,
        action: args.action ?? currentRule.action,
        updates: {
          pattern: args.pattern,
          action: args.action,
          priority: args.priority,
          enabled: args.enabled,
          cost: args.cost,
          escalation_enabled: args.escalation_enabled,
          escalation_delay_ms: args.escalation_delay_ms,
          escalation_action: args.escalation_action,
          schedule_type: args.schedule_type,
          time_windows: args.time_windows,
          cron_expression: args.cron_expression,
          cron_timezone: args.cron_timezone,
        },
      },
    });
    
    return args.ruleId;
  },
});

// Delete rule (Admin only)
export const deleteRule = mutation({
  args: {
    apiKey: v.string(),
    ruleId: v.id("rules"),
  },
  returns: v.id("rules"),
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx, args.apiKey);
    checkRole(user, "admin");
    
    // Get rule details before deletion for audit log
    const rule: any = await ctx.runQuery(internal.rules.getRule, {
      ruleId: args.ruleId,
    });
    
    if (!rule) {
      throw new Error("Rule not found");
    }
    
    await ctx.runMutation(internal.rules.deleteRule, {
      ruleId: args.ruleId,
    });
    
    // Create audit log with pattern and action
    await ctx.runMutation(internal.admin.createAuditLog, {
      userId: user._id,
      eventType: "RULE_DELETED",
      details: {
        rule_id: args.ruleId,
        pattern: rule.pattern,
        action: rule.action,
      },
    });
    
    return args.ruleId;
  },
});

// Submit command
export const submitCommand = mutation({
  args: {
    apiKey: v.string(),
    commandText: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx, args.apiKey);
    const result: any = await ctx.runMutation(internal.commands.submitCommand, {
      userId: user._id,
      commandText: args.commandText,
    });
    return result;
  },
});

// List commands
export const listCommands = query({
  args: {
    apiKey: v.string(),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("executed"),
      v.literal("rejected"),
      v.literal("needs_approval")
    )),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args): Promise<any[]> => {
    const user = await authenticateUser(ctx, args.apiKey);
    
    // Members can only see their own commands, admins can see all
    const userId = user.role === "admin" ? undefined : user._id;
    
    const result: any[] = await ctx.runQuery(internal.commands.listCommands, {
      userId: userId,
      status: args.status,
    });
    return result;
  },
});

// Get audit logs (Admin only)
export const getAuditLogs = query({
  args: {
    apiKey: v.string(),
    userId: v.optional(v.id("users")),
    eventType: v.optional(v.union(
      v.literal("COMMAND_SUBMITTED"),
      v.literal("COMMAND_EXECUTED"),
      v.literal("COMMAND_REJECTED"),
      v.literal("RULE_CREATED"),
      v.literal("USER_CREATED"),
      v.literal("USER_UPDATED"),
      v.literal("CREDITS_UPDATED"),
      v.literal("RULE_UPDATED"),
      v.literal("RULE_DELETED"),
      v.literal("COMMAND_ESCALATED"),
      v.literal("COMMAND_APPROVED"),
      v.literal("COMMAND_REJECTED_BY_APPROVER"),
      v.literal("VOTE_CAST")
    )),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args): Promise<any[]> => {
    const user = await authenticateUser(ctx, args.apiKey);
    checkRole(user, "admin");
    
    const result: any[] = await ctx.runQuery(internal.admin.getAuditLogs, {
      userId: args.userId,
      eventType: args.eventType,
      from: args.from,
      to: args.to,
      limit: args.limit,
    });
    return result;
  },
});

// Get pending approvals (Admin only)
export const getPendingApprovals = query({
  args: {
    apiKey: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args): Promise<any[]> => {
    const user = await authenticateUser(ctx, args.apiKey);
    checkRole(user, "admin");
    
    const commands: any[] = await ctx.runQuery(internal.approvals.getPendingApprovals, {});
    
    // Enrich with vote counts
    const enriched: any[] = await Promise.all(
      commands.map(async (cmd: any) => {
        const voteCounts = await ctx.runQuery(internal.approvals.getVoteCounts, {
          commandId: cmd._id,
        });
        const votes = await ctx.runQuery(internal.approvals.getVotesForCommand, {
          commandId: cmd._id,
        });
        return {
          ...cmd,
          voteCounts,
          votes,
        };
      })
    );
    
    return enriched;
  },
});

// Approve command (Admin only)
export const approveCommand = mutation({
  args: {
    apiKey: v.string(),
    commandId: v.id("commands"),
    reason: v.optional(v.string()),
  },
  returns: v.id("commands"),
  handler: async (ctx, args): Promise<any> => {
    const user = await authenticateUser(ctx, args.apiKey);
    checkRole(user, "admin");
    
    return await ctx.runMutation(internal.approvals.approveCommand, {
      commandId: args.commandId,
      approverId: user._id,
      reason: args.reason,
    });
  },
});

// Reject command (Admin only)
export const rejectCommand = mutation({
  args: {
    apiKey: v.string(),
    commandId: v.id("commands"),
    reason: v.string(),
  },
  returns: v.id("commands"),
  handler: async (ctx, args): Promise<any> => {
    const user = await authenticateUser(ctx, args.apiKey);
    checkRole(user, "admin");
    
    return await ctx.runMutation(internal.approvals.rejectCommand, {
      commandId: args.commandId,
      approverId: user._id,
      reason: args.reason,
    });
  },
});

// Cast vote on command (Admin only)
export const castVote = mutation({
  args: {
    apiKey: v.string(),
    commandId: v.id("commands"),
    voteType: v.union(v.literal("approve"), v.literal("reject")),
  },
  returns: v.id("votes"),
  handler: async (ctx, args): Promise<any> => {
    const user = await authenticateUser(ctx, args.apiKey);
    checkRole(user, "admin");
    
    return await ctx.runMutation(internal.approvals.castVote, {
      commandId: args.commandId,
      userId: user._id,
      voteType: args.voteType,
    });
  },
});

// Get vote counts for a command
export const getVoteCounts = query({
  args: {
    apiKey: v.string(),
    commandId: v.id("commands"),
  },
  returns: v.object({
    approve: v.number(),
    reject: v.number(),
    total: v.number(),
  }),
  handler: async (ctx, args): Promise<{ approve: number; reject: number; total: number }> => {
    const user = await authenticateUser(ctx, args.apiKey);
    checkRole(user, "admin");
    
    return await ctx.runQuery(internal.approvals.getVoteCounts, {
      commandId: args.commandId,
    });
  },
});

// Detect rule conflicts
export const detectRuleConflicts = query({
  args: {
    apiKey: v.string(),
    pattern: v.string(),
    action: v.union(v.literal("AUTO_ACCEPT"), v.literal("AUTO_REJECT"), v.literal("REQUIRE_APPROVAL")),
    excludeRuleId: v.optional(v.id("rules")),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args): Promise<any[]> => {
    const user = await authenticateUser(ctx, args.apiKey);
    checkRole(user, "admin");
    
    return await ctx.runQuery(internal.rules.detectConflicts, {
      pattern: args.pattern,
      action: args.action,
      excludeRuleId: args.excludeRuleId,
    });
  },
});

