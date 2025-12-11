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
        initial_credits: args.initialCredits ?? 0,
      },
    });
    
    // Set initial credits if provided
    if (args.initialCredits !== undefined && args.initialCredits > 0) {
      await ctx.runMutation(internal.admin.adjustCredits, {
        userId: result.userId,
        amount: args.initialCredits,
        reason: "initial_credits",
      });
    }
    
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
      v.literal("RULE_DELETED")
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

