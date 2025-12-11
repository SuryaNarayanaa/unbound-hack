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
    .index("by_api_key", ["api_key"]),
    // For API key lookups (should be unique)
  numbers: defineTable({
    value: v.number(),
  }),
});
