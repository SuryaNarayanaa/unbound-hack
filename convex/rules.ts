import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { isRuleActive } from "./lib/schedule";

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
// Filters rules by time-based schedules to only return currently active rules
// Also filters by user-tier restrictions (user_id and role)
export const getEnabledRules = internalQuery({
  args: {
    userId: v.optional(v.id("users")),
    userRole: v.optional(v.union(v.literal("admin"), v.literal("member"))),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Get all enabled rules
    const enabledRules = await ctx.db
      .query("rules")
      .withIndex("by_enabled_and_priority", (q) => q.eq("enabled", true))
      .order("desc")
      .collect();
    
    // Filter by time-based schedules
    const now = new Date();
    let activeRules = enabledRules.filter((rule) => isRuleActive(rule, now));
    
    // Filter by user-tier restrictions
    if (args.userId || args.userRole) {
      activeRules = activeRules.filter((rule) => {
        // If rule has user restriction, check if it matches
        if (rule.restricted_to_user_id) {
          return rule.restricted_to_user_id === args.userId;
        }
        // If rule has role restriction, check if it matches
        if (rule.restricted_to_role) {
          return rule.restricted_to_role === args.userRole;
        }
        // If no restrictions, rule applies to all users
        return true;
      });
    }
    
    return activeRules;
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
    // User-tier restriction fields
    restricted_to_user_id: v.optional(v.id("users")),
    restricted_to_role: v.optional(v.union(v.literal("admin"), v.literal("member"))),
    voting_threshold: v.optional(v.number()),
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
    if (updates.escalation_enabled !== undefined) patchData.escalation_enabled = updates.escalation_enabled;
    if (updates.escalation_delay_ms !== undefined) patchData.escalation_delay_ms = updates.escalation_delay_ms;
    if (updates.escalation_action !== undefined) patchData.escalation_action = updates.escalation_action;
    if (updates.schedule_type !== undefined) patchData.schedule_type = updates.schedule_type;
    if (updates.time_windows !== undefined) patchData.time_windows = updates.time_windows;
    if (updates.cron_expression !== undefined) patchData.cron_expression = updates.cron_expression;
    if (updates.cron_timezone !== undefined) patchData.cron_timezone = updates.cron_timezone;
    if (updates.restricted_to_user_id !== undefined) patchData.restricted_to_user_id = updates.restricted_to_user_id;
    if (updates.restricted_to_role !== undefined) patchData.restricted_to_role = updates.restricted_to_role;
    if (updates.voting_threshold !== undefined) patchData.voting_threshold = updates.voting_threshold;

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

// Detect rule conflicts (overlapping patterns, conflicting actions)
export const detectConflicts = internalQuery({
  args: {
    pattern: v.string(),
    action: v.union(v.literal("AUTO_ACCEPT"), v.literal("AUTO_REJECT"), v.literal("REQUIRE_APPROVAL")),
    excludeRuleId: v.optional(v.id("rules")),
  },
  returns: v.array(v.object({
    ruleId: v.id("rules"),
    pattern: v.string(),
    action: v.string(),
    conflictType: v.union(
      v.literal("exact_duplicate"),
      v.literal("overlapping_pattern"),
      v.literal("conflicting_action")
    ),
    description: v.string(),
  })),
  handler: async (ctx, args) => {
    const allRules = await ctx.db.query("rules").collect();
    const conflicts: any[] = [];

    // Test patterns against sample strings to detect overlaps
    const testStrings = [
      args.pattern.replace(/[.*+?^${}()|[\]\\]/g, ""), // Remove regex special chars for basic test
      args.pattern,
      `test_${args.pattern}`,
      `${args.pattern}_test`,
    ];

    for (const rule of allRules) {
      if (rule._id === args.excludeRuleId) continue;
      if (!rule.enabled) continue;

      try {
        const ruleRegex = new RegExp(rule.pattern);
        const newRegex = new RegExp(args.pattern);

        // Check for exact duplicate
        if (rule.pattern === args.pattern) {
          conflicts.push({
            ruleId: rule._id,
            pattern: rule.pattern,
            action: rule.action,
            conflictType: "exact_duplicate",
            description: `Exact duplicate pattern found`,
          });
          continue;
        }

        // Check for overlapping patterns (patterns that match similar strings)
        let hasOverlap = false;
        for (const testStr of testStrings) {
          if (testStr) {
            const ruleMatches = ruleRegex.test(testStr);
            const newMatches = newRegex.test(testStr);
            if (ruleMatches && newMatches) {
              hasOverlap = true;
              break;
            }
          }
        }

        // Also check reverse: test rule's pattern against new pattern
        if (!hasOverlap) {
          try {
            const rulePatternTest = rule.pattern.replace(/[.*+?^${}()|[\]\\]/g, "");
            if (rulePatternTest && newRegex.test(rulePatternTest)) {
              hasOverlap = true;
            }
          } catch (e) {
            // Ignore regex errors in test
          }
        }

        if (hasOverlap) {
          // Check if actions conflict
          const actionsConflict = 
            (args.action === "AUTO_ACCEPT" && rule.action === "AUTO_REJECT") ||
            (args.action === "AUTO_REJECT" && rule.action === "AUTO_ACCEPT") ||
            (args.action === "REQUIRE_APPROVAL" && (rule.action === "AUTO_ACCEPT" || rule.action === "AUTO_REJECT"));

          if (actionsConflict) {
            conflicts.push({
              ruleId: rule._id,
              pattern: rule.pattern,
              action: rule.action,
              conflictType: "conflicting_action",
              description: `Overlapping pattern with conflicting action: ${rule.action} vs ${args.action}`,
            });
          } else {
            conflicts.push({
              ruleId: rule._id,
              pattern: rule.pattern,
              action: rule.action,
              conflictType: "overlapping_pattern",
              description: `Overlapping pattern detected (same action: ${rule.action})`,
            });
          }
        }
      } catch (error) {
        // Invalid regex, skip
        continue;
      }
    }

    return conflicts;
  },
});

