import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { generateApiKey, hashApiKey } from "./lib/api_key";

export const seedAdmin = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const existing = await ctx.runQuery(internal.users.getUserByEmail, { email: "admin@example.com" });
    if (existing) {
      console.log("Admin already exists. Skipping seed.");
      return;
    }

    const apiKey = generateApiKey();
    const apiKeyHash = await hashApiKey(apiKey);

    await ctx.runMutation(internal.users.createUser, {
      email: "admin@example.com",
      role: "admin",
      apiKeyHash: apiKeyHash,
      name: "Default Admin",
    });

    console.log("============================================================");
    console.log("Admin User Created");
    console.log("Email: admin@example.com");
    console.log("API Key: " + apiKey);
    console.log("Store this key securely. It cannot be retrieved later.");
    console.log("============================================================");
  },
});

export const seedRules = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Get the first admin user to use as creator
    const adminUser = await ctx.runQuery(internal.users.getUserByEmail, { email: "admin@example.com" });
    if (!adminUser) {
      console.log("No admin user found. Please run seedAdmin first.");
      return;
    }

    // Check if rules already exist
    const existingRules = await ctx.runQuery(internal.rules.listRules, {});
    if (existingRules.length > 0) {
      console.log("Rules already exist. Skipping seed.");
      return;
    }

    // Define starter rules with priorities (higher = evaluated first)
    const starterRules = [
      {
        pattern: ":(){ :|:& };:",
        action: "AUTO_REJECT" as const,
        priority: 100,
        enabled: true,
        description: "Fork bomb protection",
      },
      {
        pattern: "rm\\s+-rf\\s+/",
        action: "AUTO_REJECT" as const,
        priority: 90,
        enabled: true,
        description: "Prevent rm -rf on root",
      },
      {
        pattern: "mkfs\\.",
        action: "AUTO_REJECT" as const,
        priority: 80,
        enabled: true,
        description: "Prevent filesystem formatting",
      },
      {
        pattern: "git\\s+(status|log|diff)",
        action: "AUTO_ACCEPT" as const,
        priority: 50,
        enabled: true,
        description: "Auto-accept safe git commands",
      },
      {
        pattern: "^(ls|cat|pwd|echo)",
        action: "AUTO_ACCEPT" as const,
        priority: 40,
        enabled: true,
        description: "Auto-accept basic read-only commands",
      },
    ];

    // Create each rule
    for (const rule of starterRules) {
      try {
        // Validate regex pattern before creating
        new RegExp(rule.pattern);
        
        await ctx.runMutation(internal.admin.createRule, {
          pattern: rule.pattern,
          action: rule.action,
          priority: rule.priority,
          enabled: rule.enabled,
          creatorId: adminUser._id,
        });
        console.log(`Created rule: ${rule.description} (${rule.pattern})`);
      } catch (error: any) {
        console.error(`Failed to create rule ${rule.description}: Invalid regex pattern: ${error.message}`);
      }
    }

    console.log("============================================================");
    console.log(`Successfully seeded ${starterRules.length} starter rules`);
    console.log("============================================================");
  },
});

