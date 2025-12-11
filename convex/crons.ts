import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Process escalations for commands that need approval
 * Runs every minute to check for commands that have exceeded their escalation delay
 */
export const processEscalations = internalMutation({
  args: {},
  returns: v.object({
    processed: v.number(),
  }),
  handler: async (ctx) => {
    const now = Date.now();
    let processed = 0;

    // Find all commands that:
    // 1. Have status "needs_approval"
    // 2. Have an escalation_at timestamp
    // 3. Have not been escalated yet
    // 4. Have passed their escalation time
    const commandsToEscalate = await ctx.db
      .query("commands")
      .withIndex("by_status_and_escalation_at", (q) =>
        q.eq("status", "needs_approval")
      )
      .filter((q) =>
        q.and(
          q.neq(q.field("escalation_at"), undefined),
          q.neq(q.field("escalated"), true),
          q.lte(q.field("escalation_at"), now)
        )
      )
      .collect();

    for (const command of commandsToEscalate) {
      if (!command.escalation_at || command.escalated) {
        continue;
      }

      // Get the matched rule to determine escalation action
      let escalationAction: "AUTO_ACCEPT" | "AUTO_REJECT" | null = null;

      if (command.matched_rule_id) {
        const rule = await ctx.db.get(command.matched_rule_id);
        if (rule?.escalation_enabled && rule.escalation_action) {
          escalationAction = rule.escalation_action;
        }
      }

      // If no escalation action is defined, skip (shouldn't happen, but safety check)
      if (!escalationAction) {
        continue;
      }

      // Process the escalation
      const newStatus = escalationAction === "AUTO_ACCEPT" ? "executed" : "rejected";
      
      // Get user credits for potential deduction
      const creditDoc = await ctx.db
        .query("user_credits")
        .withIndex("by_user_id", (q) => q.eq("user_id", command.user_id))
        .unique();

      // If auto-accepting, deduct credits
      if (escalationAction === "AUTO_ACCEPT") {
        if (creditDoc) {
          await ctx.db.patch(creditDoc._id, {
            balance: creditDoc.balance - command.cost,
            updated_at: now,
          });
        } else {
          await ctx.db.insert("user_credits", {
            user_id: command.user_id,
            balance: -command.cost,
            updated_at: now,
          });
        }
      }

      // Update command status
      await ctx.db.patch(command._id, {
        status: newStatus,
        escalated: true,
        escalation_action: escalationAction,
        executed_at: escalationAction === "AUTO_ACCEPT" ? now : undefined,
        rejection_reason:
          escalationAction === "AUTO_REJECT"
            ? "Escalated: Auto-rejected due to timeout"
            : undefined,
        output:
          escalationAction === "AUTO_ACCEPT"
            ? `Execution mocked (escalated): would run '${command.command_text}'`
            : undefined,
      });

      // Create audit log for escalation
      await ctx.db.insert("audit_logs", {
        user_id: command.user_id,
        command_id: command._id,
        event_type: "COMMAND_ESCALATED",
        details: {
          escalation_action: escalationAction,
          original_status: "needs_approval",
          new_status: newStatus,
          escalation_at: command.escalation_at,
          processed_at: now,
        },
        created_at: now,
      });

      // Create final status audit log
      if (escalationAction === "AUTO_ACCEPT") {
        await ctx.db.insert("audit_logs", {
          user_id: command.user_id,
          command_id: command._id,
          event_type: "COMMAND_EXECUTED",
          details: {
            command_text: command.command_text,
            matched_rule_id: command.matched_rule_id,
            action: escalationAction,
            cost: command.cost,
            note: "escalated_execution",
          },
          created_at: now,
        });
      } else {
        await ctx.db.insert("audit_logs", {
          user_id: command.user_id,
          command_id: command._id,
          event_type: "COMMAND_REJECTED",
          details: {
            command_text: command.command_text,
            matched_rule_id: command.matched_rule_id,
            action: escalationAction,
            rejection_reason: "Escalated: Auto-rejected due to timeout",
          },
          created_at: now,
        });
      }

      processed++;
    }

    return { processed };
  },
});

const crons = cronJobs();

// Run escalation processing every minute
crons.interval(
  "process escalations",
  { minutes: 1 },
  internal.crons.processEscalations,
  {}
);

export default crons;

