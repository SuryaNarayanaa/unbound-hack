import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getUserByApiKey = internalQuery({
  args: { apiKeyHash: v.string() },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_api_key", (q) => q.eq("api_key", args.apiKeyHash))
      .unique();
  },
});

export const getUserByEmail = internalQuery({
  args: { email: v.string() },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .unique();
  },
});

export const createUser = internalMutation({
  args: {
    email: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("member")),
    apiKeyHash: v.string(),
    name: v.optional(v.string()),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", {
      email: args.email,
      role: args.role,
      api_key: args.apiKeyHash,
      name: args.name,
      created_at: Date.now(),
    });
  },
});

// Get current user details and credit balance
export const getMe = internalQuery({
  args: { userId: v.id("users") },
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
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    // Get credit balance
    const creditDoc = await ctx.db
      .query("user_credits")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
      .unique();

    return {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      credits: creditDoc?.balance ?? 0,
    };
  },
});

