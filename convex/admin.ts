import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { generateApiKey, hashApiKey } from "./lib/api_key";

// Create a new user (Admin only operation)
export const createApiUser = internalMutation({
  args: {
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  returns: v.object({
    userId: v.id("users"),
    email: v.string(),
    apiKey: v.string(),
  }),
  handler: async (ctx, args) => {
    const apiKey = generateApiKey();
    const apiKeyHash = await hashApiKey(apiKey);

    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      role: args.role,
      api_key: apiKeyHash,
      created_at: Date.now(),
    });

    return {
      userId,
      email: args.email,
      apiKey: apiKey,
    };
  },
});

export const listUsers = internalQuery({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const createRule = internalMutation({
  args: {
    pattern: v.string(),
    action: v.union(v.literal("AUTO_ACCEPT"), v.literal("AUTO_REJECT"), v.literal("REQUIRE_APPROVAL")),
    priority: v.number(),
    enabled: v.boolean(),
    creatorId: v.id("users"),
    cost: v.optional(v.number()),
  },
  returns: v.id("rules"),
  handler: async (ctx, args) => {
    // Ensure priority is explicitly set (default to 0 if somehow not provided)
    const priority = args.priority ?? 0;
    
    return await ctx.db.insert("rules", {
      pattern: args.pattern,
      action: args.action,
      priority: priority,
      enabled: args.enabled,
      created_by: args.creatorId,
      created_at: Date.now(),
      cost: args.cost,
    });
  },
});

export const adjustCredits = internalMutation({
  args: {
    userId: v.id("users"),
    amount: v.number(), // positive to add, negative to deduct
    reason: v.optional(v.string()), // Reason for credit change
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const creditDoc = await ctx.db
      .query("user_credits")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
      .unique();

    const oldBalance = creditDoc?.balance ?? 0;
    const newBalance = oldBalance + args.amount;

    if (creditDoc) {
        await ctx.db.patch(creditDoc._id, {
            balance: newBalance,
            updated_at: Date.now(),
        });
    } else {
        await ctx.db.insert("user_credits", {
            user_id: args.userId,
            balance: args.amount,
            updated_at: Date.now(),
        });
    }

    // Create audit log with reason
    await ctx.db.insert("audit_logs", {
      user_id: args.userId,
      event_type: "CREDITS_UPDATED",
      details: {
        old_balance: oldBalance,
        new_balance: newBalance,
        reason: args.reason ?? "manual_adjustment",
      },
      created_at: Date.now(),
    });
  },
});

export const createAuditLog = internalMutation({
  args: {
    userId: v.id("users"),
    commandId: v.optional(v.id("commands")),
    eventType: v.union(
      v.literal("COMMAND_SUBMITTED"),
      v.literal("COMMAND_EXECUTED"),
      v.literal("COMMAND_REJECTED"),
      v.literal("RULE_CREATED"),
      v.literal("USER_CREATED"),
      v.literal("USER_UPDATED"),
      v.literal("CREDITS_UPDATED"),
      v.literal("RULE_UPDATED"),
      v.literal("RULE_DELETED")
    ),
    details: v.any(),
  },
  returns: v.id("audit_logs"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("audit_logs", {
      user_id: args.userId,
      command_id: args.commandId,
      event_type: args.eventType,
      details: args.details,
      created_at: Date.now(),
    });
  },
});

export const getAuditLogs = internalQuery({
  args: {
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
    from: v.optional(v.number()), // Timestamp
    to: v.optional(v.number()),   // Timestamp
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    let logs;

    // Apply filters based on available indexes
    if (args.userId && args.eventType) {
      logs = await ctx.db
        .query("audit_logs")
        .withIndex("by_user_id_and_event_type", (q) =>
          q.eq("user_id", args.userId!).eq("event_type", args.eventType!)
        )
        .order("desc")
        .collect();
    } else if (args.userId) {
      logs = await ctx.db
        .query("audit_logs")
        .withIndex("by_user_id", (q) => q.eq("user_id", args.userId!))
        .order("desc")
        .collect();
    } else if (args.eventType) {
      logs = await ctx.db
        .query("audit_logs")
        .withIndex("by_event_type", (q) => q.eq("event_type", args.eventType!))
        .order("desc")
        .collect();
    } else {
      logs = await ctx.db
        .query("audit_logs")
        .order("desc")
        .collect();
    }

    // Apply time range filter if provided (post-query filtering)
    if (args.from !== undefined || args.to !== undefined) {
      logs = logs.filter((log) => {
        if (args.from !== undefined && log.created_at < args.from) {
          return false;
        }
        if (args.to !== undefined && log.created_at > args.to) {
          return false;
        }
        return true;
      });
    }

    // Apply limit
    const limit = args.limit ?? 100;
    return logs.slice(0, limit);
  },
});

