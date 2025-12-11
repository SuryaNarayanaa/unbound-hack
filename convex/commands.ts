import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Submit a command - matches against rules and processes
// This function implements a transactional flow with proper error handling
export const submitCommand = internalMutation({
  args: {
    userId: v.id("users"),
    commandText: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      // 1. Start transaction: Load user row (for safety) and user_credits
      // Note: Convex mutations are atomic transactions - all database operations in this handler
      // are executed atomically. If any operation fails, the entire mutation rolls back.
      // This provides ACID guarantees similar to explicit FOR UPDATE locking in traditional SQL.
      // We load both user and credits to ensure user exists and get current balance.
      const user = await ctx.db.get(args.userId);
      if (!user) {
        throw new Error("User not found");
      }

      const creditDoc = await ctx.db
        .query("user_credits")
        .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
        .unique();

      const currentBalance = creditDoc?.balance ?? 0;

      // 2. Early balance check: If balance <= 0, reject immediately (optimization before rule matching)
      // This avoids unnecessary rule matching when user has no credits
      if (currentBalance <= 0) {
        // Create command with rejected status
        const commandId = await ctx.db.insert("commands", {
          user_id: args.userId,
          command_text: args.commandText,
          status: "rejected",
          cost: 1, // Default cost since we haven't matched rules yet
          created_at: Date.now(),
          rejection_reason: "INSUFFICIENT_CREDITS",
        });

        // Create COMMAND_SUBMITTED audit log first
        await ctx.db.insert("audit_logs", {
          user_id: args.userId,
          command_id: commandId,
          event_type: "COMMAND_SUBMITTED",
          details: {
            command_text: args.commandText,
          },
          created_at: Date.now(),
        });

        // Create COMMAND_REJECTED audit log
        await ctx.db.insert("audit_logs", {
          user_id: args.userId,
          command_id: commandId,
          event_type: "COMMAND_REJECTED",
          details: {
            reason: "INSUFFICIENT_CREDITS",
            available: currentBalance,
          },
          created_at: Date.now(),
        });

        return {
          commandId,
          status: "rejected",
          reason: "INSUFFICIENT_CREDITS",
        };
      }

      // 3. Fetch enabled rules sorted by priority
      const enabledRules: any[] = await ctx.runQuery(internal.rules.getEnabledRules, {});
      
      // Sort by priority descending (higher priority first)
      // If priorities are equal, sort by created_at ASC (earlier rules win) to enforce "first match wins"
      const sortedRules: any[] = enabledRules.sort((a: any, b: any) => {
        const priorityA = a.priority ?? 0;
        const priorityB = b.priority ?? 0;
        if (priorityA !== priorityB) {
          return priorityB - priorityA; // Higher priority first
        }
        // Tiebreaker: earlier created_at wins (ASC order)
        const createdA = a.created_at ?? 0;
        const createdB = b.created_at ?? 0;
        return createdA - createdB;
      });

      // 4. Match command_text against rule patterns
      // If no rule matches, default to AUTO_REJECT (as per requirements: "treat as AUTO_REJECT or needs manual decision")
      let matchedRule = null;
      let action: "AUTO_ACCEPT" | "AUTO_REJECT" | "REQUIRE_APPROVAL" = "AUTO_REJECT";
      let cost = 1; // Default cost

      for (const rule of sortedRules) {
        try {
          const regex = new RegExp(rule.pattern);
          // For patterns starting with ^, use match to ensure it matches from the start
          // For other patterns, use test to search anywhere in the string
          let isMatch = false;
          if (rule.pattern.startsWith("^")) {
            // Use match to ensure pattern matches from the beginning of the string
            // When pattern starts with ^, match() only returns non-null if it matches from index 0
            const match = args.commandText.match(regex);
            isMatch = match !== null && match.index === 0;
          } else {
            // Use test to search anywhere in the string
            isMatch = regex.test(args.commandText);
          }
          
          if (isMatch) {
            matchedRule = rule;
            action = rule.action;
            cost = rule.cost ?? 1; // Use rule cost if specified, otherwise default to 1
            break; // First match wins
          }
        } catch (error) {
          // Invalid regex pattern, skip this rule
          console.error(`Invalid regex pattern in rule ${rule._id}: ${rule.pattern}`);
          continue;
        }
      }

      // 5. Check if user has sufficient credits after determining cost from matched rule
      // This is the primary balance check as per requirements - check balance after rule matching
      // when we know the actual cost. The early check above is just an optimization.
      if (currentBalance <= 0 || currentBalance < cost) {
        // Create command with rejected status
        const commandId = await ctx.db.insert("commands", {
          user_id: args.userId,
          command_text: args.commandText,
          status: "rejected",
          matched_rule_id: matchedRule?._id,
          cost: cost,
          created_at: Date.now(),
          rejection_reason: "INSUFFICIENT_CREDITS",
        });

        // Create COMMAND_SUBMITTED audit log first
        await ctx.db.insert("audit_logs", {
          user_id: args.userId,
          command_id: commandId,
          event_type: "COMMAND_SUBMITTED",
          details: {
            command_text: args.commandText,
            matched_rule_id: matchedRule?._id,
            action: action,
          },
          created_at: Date.now(),
        });

        // Create COMMAND_REJECTED audit log
        await ctx.db.insert("audit_logs", {
          user_id: args.userId,
          command_id: commandId,
          event_type: "COMMAND_REJECTED",
          details: {
            reason: "INSUFFICIENT_CREDITS",
            required: cost,
            available: currentBalance,
          },
          created_at: Date.now(),
        });

        return {
          commandId,
          status: "rejected",
          reason: "INSUFFICIENT_CREDITS",
        };
      }

      // 6. Determine status based on action
      let status: "pending" | "executed" | "rejected" | "needs_approval" = "pending";
      if (action === "AUTO_ACCEPT") {
        status = "executed";
      } else if (action === "AUTO_REJECT") {
        status = "rejected";
      } else if (action === "REQUIRE_APPROVAL") {
        status = "needs_approval";
      }

      // 7. Transactionally process command based on action
      // Only deduct credits for AUTO_ACCEPT actions (successful execution)
      if (action === "AUTO_ACCEPT") {
        // Deduct credits on successful execution (execution is mocked and happens immediately)
        if (creditDoc) {
          await ctx.db.patch(creditDoc._id, {
            balance: creditDoc.balance - cost,
            updated_at: Date.now(),
          });
        } else {
          await ctx.db.insert("user_credits", {
            user_id: args.userId,
            balance: -cost,
            updated_at: Date.now(),
          });
        }
      }

      // 8. Create command record with mocked output for executed commands
      const mockedOutput = status === "executed" 
        ? `Execution mocked: would run '${args.commandText}'`
        : undefined;

      const commandId = await ctx.db.insert("commands", {
        user_id: args.userId,
        command_text: args.commandText,
        status: status,
        matched_rule_id: matchedRule?._id,
        cost: cost,
        created_at: Date.now(),
        executed_at: status === "executed" ? Date.now() : undefined,
        rejection_reason: status === "rejected" 
          ? (matchedRule ? "Matched rule with AUTO_REJECT action" : "No matching rule found - default AUTO_REJECT")
          : undefined,
        output: mockedOutput,
      });

      // 9. Create COMMAND_SUBMITTED audit log for all commands
      await ctx.db.insert("audit_logs", {
        user_id: args.userId,
        command_id: commandId,
        event_type: "COMMAND_SUBMITTED",
        details: {
          command_text: args.commandText,
          matched_rule_id: matchedRule?._id,
          action: action,
          cost: cost,
        },
        created_at: Date.now(),
      });

      // 10. Create final status audit log (COMMAND_EXECUTED or COMMAND_REJECTED)
      if (status === "executed") {
        await ctx.db.insert("audit_logs", {
          user_id: args.userId,
          command_id: commandId,
          event_type: "COMMAND_EXECUTED",
          details: {
            command_text: args.commandText,
            matched_rule_id: matchedRule?._id,
            action: action,
            cost: cost,
            note: "mocked_execution",
          },
          created_at: Date.now(),
        });
      } else if (status === "rejected") {
        await ctx.db.insert("audit_logs", {
          user_id: args.userId,
          command_id: commandId,
          event_type: "COMMAND_REJECTED",
          details: {
            command_text: args.commandText,
            matched_rule_id: matchedRule?._id,
            action: action,
            rejection_reason: matchedRule 
              ? "Matched rule with AUTO_REJECT action" 
              : "No matching rule found - default AUTO_REJECT",
          },
          created_at: Date.now(),
        });
      }

      return {
        commandId,
        status: status,
        action: action,
        cost: cost,
        matchedRuleId: matchedRule?._id,
        output: mockedOutput,
      };
    } catch (error: any) {
      // Transaction rollback: If any DB write fails, Convex will automatically rollback
      // Log the error and re-throw for proper error handling
      console.error("Error in submitCommand:", error);
      throw new Error(`Command submission failed: ${error.message}`);
    }
  },
});

// List commands with optional filters
export const listCommands = internalQuery({
  args: {
    userId: v.optional(v.id("users")),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("executed"),
      v.literal("rejected"),
      v.literal("needs_approval")
    )),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    if (args.userId && args.status) {
      return await ctx.db
        .query("commands")
        .withIndex("by_user_id_and_status", (q) =>
          q.eq("user_id", args.userId!).eq("status", args.status!)
        )
        .order("desc")
        .collect();
    } else if (args.userId) {
      return await ctx.db
        .query("commands")
        .withIndex("by_user_id", (q) => q.eq("user_id", args.userId!))
        .order("desc")
        .collect();
    } else if (args.status) {
      return await ctx.db
        .query("commands")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else {
      return await ctx.db
        .query("commands")
        .order("desc")
        .collect();
    }
  },
});

// Get a single command
export const getCommand = internalQuery({
  args: {
    commandId: v.id("commands"),
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.commandId);
  },
});

