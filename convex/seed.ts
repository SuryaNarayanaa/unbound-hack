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

