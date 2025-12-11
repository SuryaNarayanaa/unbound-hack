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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("rules", {
      pattern: args.pattern,
      action: args.action,
      priority: args.priority,
      enabled: args.enabled,
      created_by: args.creatorId,
      created_at: Date.now(),
    });
  },
});

export const adjustCredits = internalMutation({
  args: {
    userId: v.id("users"),
    amount: v.number(), // positive to add, negative to deduct
  },
  handler: async (ctx, args) => {
    const creditDoc = await ctx.db
      .query("user_credits")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
      .unique();

    if (creditDoc) {
        await ctx.db.patch(creditDoc._id, {
            balance: creditDoc.balance + args.amount,
            updated_at: Date.now(),
        });
    } else {
        await ctx.db.insert("user_credits", {
            user_id: args.userId,
            balance: args.amount,
            updated_at: Date.now(),
        });
    }
  },
});

export const getAuditLogs = internalQuery({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("audit_logs").order("desc").take(100);
    }
});

