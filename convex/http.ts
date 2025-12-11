import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
import { hashApiKey } from "./lib/api_key";
import { Id } from "./_generated/dataModel";

const http = httpRouter();

auth.addHttpRoutes(http);

// Helper for API Key Auth and RBAC
const authenticatedRoute = (
  handler: (ctx: any, req: Request, user: any) => Promise<Response>,
  requiredRole?: "admin" | "member"
) => {
  return httpAction(async (ctx, req) => {
    const keyHeader = req.headers.get("X-API-Key") || req.headers.get("Authorization");
    let apiKey = keyHeader;
    if (keyHeader && keyHeader.startsWith("ApiKey ")) {
      apiKey = keyHeader.replace("ApiKey ", "");
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing API Key" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKeyHash = await hashApiKey(apiKey);
    const user = await ctx.runQuery(internal.users.getUserByApiKey, { apiKeyHash });

    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid API Key" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (requiredRole && user.role !== requiredRole) {
      return new Response(JSON.stringify({ error: "Forbidden: Insufficient permissions" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Call the actual handler with the user object attached
    return handler(ctx, req, user);
  });
};

// Admin Routes

// Create User
http.route({
  path: "/api/users",
  method: "POST",
  handler: authenticatedRoute(async (ctx, req, user) => {
    const body = await req.json();
    const result = await ctx.runMutation(internal.admin.createApiUser, {
        email: body.email,
        name: body.name,
        role: body.role || "member",
    });
    return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
  }, "admin"),
});

// List Users
http.route({
  path: "/api/users",
  method: "GET",
  handler: authenticatedRoute(async (ctx, req, user) => {
    const users = await ctx.runQuery(internal.admin.listUsers, {});
    return new Response(JSON.stringify(users), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
  }, "admin"),
});

// Create Rule
http.route({
  path: "/api/rules",
  method: "POST",
  handler: authenticatedRoute(async (ctx, req, user) => {
    const body = await req.json();
    const ruleId = await ctx.runMutation(internal.admin.createRule, {
        pattern: body.pattern,
        action: body.action,
        priority: body.priority,
        enabled: body.enabled ?? true,
        creatorId: user._id,
    });
    return new Response(JSON.stringify({ ruleId }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
  }, "admin"),
});

// Adjust Credits
http.route({
  path: "/api/credits",
  method: "POST",
  handler: authenticatedRoute(async (ctx, req, user) => {
    const body = await req.json();
    // Validate that userId is a valid ID format or rely on Convex to throw
    // Assuming body.userId is a string that is a valid ID
    await ctx.runMutation(internal.admin.adjustCredits, {
        userId: body.userId as Id<"users">,
        amount: body.amount,
    });
    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
  }, "admin"),
});

// Audit Logs
http.route({
  path: "/api/audit",
  method: "GET",
  handler: authenticatedRoute(async (ctx, req, user) => {
    const logs = await ctx.runQuery(internal.admin.getAuditLogs, {});
    return new Response(JSON.stringify(logs), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
  }, "admin"),
});

export default http;
