import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// List all rules
export const listRules = internalQuery({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    return await ctx.db
      .query("rules")
      .order("desc")
      .collect();
  },
});

// Get enabled rules sorted by priority (for command matching)
export const getEnabledRules = internalQuery({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    return await ctx.db
      .query("rules")
      .withIndex("by_enabled_and_priority", (q) => q.eq("enabled", true))
      .order("desc")
      .collect();
  },
});

// Update a rule
export const updateRule = internalMutation({
  args: {
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
    const { ruleId, ...updates } = args;
    const rule = await ctx.db.get(ruleId);
    if (!rule) {
      throw new Error("Rule not found");
    }

    const patchData: any = {};
    if (updates.pattern !== undefined) patchData.pattern = updates.pattern;
    if (updates.action !== undefined) patchData.action = updates.action;
    if (updates.priority !== undefined) patchData.priority = updates.priority;
    if (updates.enabled !== undefined) patchData.enabled = updates.enabled;
    if (updates.cost !== undefined) patchData.cost = updates.cost;

    await ctx.db.patch(ruleId, patchData);
    return ruleId;
  },
});

// Delete a rule
export const deleteRule = internalMutation({
  args: {
    ruleId: v.id("rules"),
  },
  returns: v.id("rules"),
  handler: async (ctx, args) => {
    const rule = await ctx.db.get(args.ruleId);
    if (!rule) {
      throw new Error("Rule not found");
    }
    await ctx.db.delete(args.ruleId);
    return args.ruleId;
  },
});

// Get a single rule
export const getRule = internalQuery({
  args: {
    ruleId: v.id("rules"),
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.ruleId);
  },
});

