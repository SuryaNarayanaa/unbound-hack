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
    
    // ═══════════════════════════════════════════════════════════════
    // Escalation fields
    // ═══════════════════════════════════════════════════════════════
    escalation_enabled: v.optional(v.boolean()),    // Whether escalation is enabled for this rule
    escalation_delay_ms: v.optional(v.number()),    // Delay in milliseconds before escalation triggers
    escalation_action: v.optional(v.union(
      v.literal("AUTO_ACCEPT"),
      v.literal("AUTO_REJECT"),
    )),                                             // Action to take when escalation triggers
    
    // ═══════════════════════════════════════════════════════════════
    // Time-based scheduling fields
    // ═══════════════════════════════════════════════════════════════
    schedule_type: v.optional(v.union(
      v.literal("always"),                          // Always active when enabled (default)
      v.literal("time_windows"),                    // Active during specific time windows
      v.literal("cron"),                            // Active based on cron expression
    )),                                             // Type of schedule
    time_windows: v.optional(v.array(v.object({     // Array of time windows (for schedule_type: "time_windows")
      day_of_week: v.number(),                      // 0-6 (Sunday-Saturday)
      start_hour: v.number(),                       // 0-23
      start_minute: v.number(),                     // 0-59
      end_hour: v.number(),                         // 0-23
      end_minute: v.number(),                       // 0-59
      timezone: v.optional(v.string()),             // Timezone (e.g., "America/New_York"), defaults to UTC
    }))),
    cron_expression: v.optional(v.string()),        // Cron expression (for schedule_type: "cron")
    cron_timezone: v.optional(v.string()),          // Timezone for cron (defaults to UTC)
    
    // ═══════════════════════════════════════════════════════════════
    // User-tier rule fields
    // ═══════════════════════════════════════════════════════════════
    restricted_to_user_id: v.optional(v.id("users")), // If set, rule only applies to this user
    restricted_to_role: v.optional(v.union(v.literal("admin"), v.literal("member"))), // If set, rule only applies to this role
    voting_threshold: v.optional(v.number()),       // Required votes for auto-approval (if voting enabled for this rule)
  })
    .index("by_enabled_and_priority", ["enabled", "priority"]) // For rule matching queries
    .index("by_created_by", ["created_by"])       // For finding rules by creator
    .index("by_restricted_user", ["restricted_to_user_id"]) // For user-specific rules
    .index("by_restricted_role", ["restricted_to_role"]), // For role-specific rules

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
    output: v.optional(v.string()),                 // Mocked execution output (nullable)
    
    // ═══════════════════════════════════════════════════════════════
    // Escalation tracking fields
    // ═══════════════════════════════════════════════════════════════
    escalation_at: v.optional(v.number()),          // Timestamp when escalation should trigger
    escalated: v.optional(v.boolean()),             // Whether escalation has been processed
    escalation_action: v.optional(v.union(
      v.literal("AUTO_ACCEPT"),
      v.literal("AUTO_REJECT"),
    )),                                             // Action taken during escalation
    
    // ═══════════════════════════════════════════════════════════════
    // Approval tracking fields
    // ═══════════════════════════════════════════════════════════════
    approver_id: v.optional(v.id("users")),        // User who approved/rejected the command
    approved_at: v.optional(v.number()),            // Timestamp when command was approved/rejected
    approval_reason: v.optional(v.string()),        // Reason for approval/rejection
    voting_threshold: v.optional(v.number()),       // Required votes for auto-approval (if voting enabled)
  })
    .index("by_user_id", ["user_id"])              // For user command queries
    .index("by_status", ["status"])                // For status-based queries
    .index("by_user_id_and_status", ["user_id", "status"]) // For combined queries
    .index("by_matched_rule_id", ["matched_rule_id"]) // For rule-related queries
    .index("by_status_and_escalation_at", ["status", "escalation_at"]), // For escalation queries

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
      v.literal("COMMAND_ESCALATED"),
      v.literal("COMMAND_APPROVED"),
      v.literal("COMMAND_REJECTED_BY_APPROVER"),
      v.literal("VOTE_CAST"),
    ),                                              // Event type
    details: v.any(),                               // JSON details (flexible object)
    created_at: v.number(),                         // Creation timestamp
  })
    .index("by_user_id", ["user_id"])              // For user audit queries
    .index("by_event_type", ["event_type"])        // For event type queries
    .index("by_user_id_and_event_type", ["user_id", "event_type"]) // For combined queries
    .index("by_command_id", ["command_id"])        // For command-related audit logs
    .index("by_created_at", ["created_at"]),       // For time-based queries

  // ═══════════════════════════════════════════════════════════════
  // Votes Table (for voting on commands requiring approval)
  // ═══════════════════════════════════════════════════════════════
  votes: defineTable({
    command_id: v.id("commands"),                  // Foreign key to commands
    user_id: v.id("users"),                        // Foreign key to users (voter)
    vote_type: v.union(
      v.literal("approve"),
      v.literal("reject"),
    ),                                              // Vote type
    created_at: v.number(),                         // Vote timestamp
  })
    .index("by_command_id", ["command_id"])        // For command vote queries
    .index("by_user_id", ["user_id"])              // For user vote queries
    .index("by_command_and_user", ["command_id", "user_id"]), // For unique vote per user per command
});
