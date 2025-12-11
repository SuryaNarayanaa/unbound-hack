import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,
  users: defineTable({
    // ═══════════════════════════════════════════════════════════════
    // Convex Auth fields (populated automatically by OAuth)
    // ═══════════════════════════════════════════════════════════════
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),

    // OAuth profile fields (from Google, GitHub, etc.)
    name: v.optional(v.string()),
    image: v.optional(v.string()),

    // ═══════════════════════════════════════════════════════════════
    // Additional custom fields
    // ═══════════════════════════════════════════════════════════════
    api_key: v.optional(v.string()),               // Unique API key (hashed or long random)
    role: v.optional(v.union(v.literal("admin"), v.literal("member"))), // User role

    // Timestamps
    created_at: v.optional(v.number()),            // First sign-in timestamp
    updated_at: v.optional(v.number()),            // Last profile update
  })
    .index("email", ["email"])           // Required by Convex Auth
    .index("by_api_key", ["api_key"]),   // For API key lookups (should be unique)

  // ═══════════════════════════════════════════════════════════════
  // User Credits Table
  // ═══════════════════════════════════════════════════════════════
  user_credits: defineTable({
    user_id: v.id("users"),                        // Foreign key to users
    balance: v.number(),                            // Credit balance (integer)
    updated_at: v.number(),                         // Last update timestamp
  })
    .index("by_user_id", ["user_id"]),             // For user credit lookups

  // ═══════════════════════════════════════════════════════════════
  // Rules Table
  // ═══════════════════════════════════════════════════════════════
  rules: defineTable({
    pattern: v.string(),                            // Pattern text for matching
    action: v.union(
      v.literal("AUTO_ACCEPT"),
      v.literal("AUTO_REJECT"),
      v.literal("REQUIRE_APPROVAL"),
    ),                                              // Rule action type
    priority: v.optional(v.number()),               // Priority (higher = first match)
    cost: v.optional(v.number()),                   // Cost in credits (optional, for dynamic pricing)
    created_by: v.id("users"),                      // Foreign key to users (creator)
    created_at: v.number(),                         // Creation timestamp
    enabled: v.boolean(),                           // Whether rule is enabled
  })
    .index("by_enabled_and_priority", ["enabled", "priority"]) // For rule matching queries
    .index("by_created_by", ["created_by"]),       // For finding rules by creator

  // ═══════════════════════════════════════════════════════════════
  // Commands Table
  // ═══════════════════════════════════════════════════════════════
  commands: defineTable({
    user_id: v.id("users"),                        // Foreign key to users
    command_text: v.string(),                       // The command text
    status: v.union(
      v.literal("pending"),
      v.literal("executed"),
      v.literal("rejected"),
      v.literal("needs_approval"),
    ),                                              // Command status
    matched_rule_id: v.optional(v.id("rules")),    // Foreign key to rules (nullable)
    cost: v.number(),                               // Cost in credits (integer)
    created_at: v.number(),                         // Creation timestamp
    executed_at: v.optional(v.number()),            // Execution timestamp (nullable)
    rejection_reason: v.optional(v.string()),       // Rejection reason (nullable)
  })
    .index("by_user_id", ["user_id"])              // For user command queries
    .index("by_status", ["status"])                // For status-based queries
    .index("by_user_id_and_status", ["user_id", "status"]) // For combined queries
    .index("by_matched_rule_id", ["matched_rule_id"]), // For rule-related queries

  // ═══════════════════════════════════════════════════════════════
  // Audit Logs Table
  // ═══════════════════════════════════════════════════════════════
  audit_logs: defineTable({
    user_id: v.id("users"),                        // Foreign key to users
    command_id: v.optional(v.id("commands")),      // Foreign key to commands (nullable)
    event_type: v.union(
      v.literal("COMMAND_SUBMITTED"),
      v.literal("COMMAND_EXECUTED"),
      v.literal("COMMAND_REJECTED"),
      v.literal("RULE_CREATED"),
      v.literal("USER_CREATED"),
      v.literal("USER_UPDATED"),
      v.literal("CREDITS_UPDATED"),
      v.literal("RULE_UPDATED"),
      v.literal("RULE_DELETED"),
    ),                                              // Event type
    details: v.any(),                               // JSON details (flexible object)
    created_at: v.number(),                         // Creation timestamp
  })
    .index("by_user_id", ["user_id"])              // For user audit queries
    .index("by_event_type", ["event_type"])        // For event type queries
    .index("by_user_id_and_event_type", ["user_id", "event_type"]) // For combined queries
    .index("by_command_id", ["command_id"]),       // For command-related audit logs
});
