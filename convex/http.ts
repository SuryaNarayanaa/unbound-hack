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

// User Routes

// GET /me - Returns user info + balance
http.route({
  path: "/api/me",
  method: "GET",
  handler: authenticatedRoute(async (ctx, req, user) => {
    const userInfo = await ctx.runQuery(internal.users.getMe, { userId: user._id });
    if (!userInfo) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(userInfo), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// Admin Routes

// POST /users - Create user (Admin only)
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
    
    // Create audit log for user creation
    await ctx.runMutation(internal.admin.createAuditLog, {
      userId: result.userId,
      eventType: "USER_CREATED",
      details: {
        created_by: user._id,
        email: body.email,
        name: body.name,
        role: body.role || "member",
        initial_credits: body.initialCredits ?? 0,
      },
    });
    
    // Set initial credits if provided
    if (body.initialCredits !== undefined && body.initialCredits > 0) {
      await ctx.runMutation(internal.admin.adjustCredits, {
        userId: result.userId,
        amount: body.initialCredits,
        reason: "initial_credits",
      });
    }
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }, "admin"),
});

// PATCH /users/:id/credits - Adjust credits (Admin only)
http.route({
  path: "/api/users/:userId/credits",
  method: "PATCH",
  handler: authenticatedRoute(async (ctx, req, user) => {
    const url = new URL(req.url);
    // Extract userId from path: /api/users/{userId}/credits
    // More robust parsing: match the pattern and extract userId
    const pathMatch = url.pathname.match(/^\/api\/users\/([^\/]+)\/credits$/);
    if (!pathMatch || !pathMatch[1]) {
      return new Response(JSON.stringify({ error: "Invalid user ID in path" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const userId = pathMatch[1] as Id<"users">;
    const body = await req.json();
    
    await ctx.runMutation(internal.admin.adjustCredits, {
      userId: userId,
      amount: body.amount,
    });
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }, "admin"),
});

// Rules Routes (Admin only)

// GET /rules - List all rules
http.route({
  path: "/api/rules",
  method: "GET",
  handler: authenticatedRoute(async (ctx, req, user) => {
    const rules = await ctx.runQuery(internal.rules.listRules, {});
    return new Response(JSON.stringify(rules), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }, "admin"),
});

// POST /rules - Create rule with regex validation
http.route({
  path: "/api/rules",
  method: "POST",
  handler: authenticatedRoute(async (ctx, req, user) => {
    const body = await req.json();
    
    // Validate regex pattern
    try {
      new RegExp(body.pattern);
    } catch (error: any) {
      return new Response(JSON.stringify({ error: `Invalid regex pattern: ${error.message}` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    const ruleId = await ctx.runMutation(internal.admin.createRule, {
      pattern: body.pattern,
      action: body.action,
      priority: body.priority ?? 0,
      enabled: body.enabled ?? true,
      creatorId: user._id,
      cost: body.cost,
    });
    
    // Create audit log
    await ctx.runMutation(internal.admin.createAuditLog, {
      userId: user._id,
      eventType: "RULE_CREATED",
      details: {
        rule_id: ruleId,
        pattern: body.pattern,
        action: body.action,
        priority: body.priority ?? 0,
        cost: body.cost,
      },
    });
    
    return new Response(JSON.stringify({ ruleId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }, "admin"),
});

// PATCH /rules/:id - Update rule
http.route({
  path: "/api/rules/:ruleId",
  method: "PATCH",
  handler: authenticatedRoute(async (ctx, req, user) => {
    const url = new URL(req.url);
    const ruleId = url.pathname.split("/").pop() as Id<"rules">;
    const body = await req.json();
    
    // Validate regex pattern if provided
    if (body.pattern) {
      try {
        new RegExp(body.pattern);
      } catch (error: any) {
        return new Response(JSON.stringify({ error: `Invalid regex pattern: ${error.message}` }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
    
    await ctx.runMutation(internal.rules.updateRule, {
      ruleId: ruleId,
      pattern: body.pattern,
      action: body.action,
      priority: body.priority,
      enabled: body.enabled,
      cost: body.cost,
    });
    
    // Create audit log
    await ctx.runMutation(internal.admin.createAuditLog, {
      userId: user._id,
      eventType: "RULE_UPDATED",
      details: {
        rule_id: ruleId,
        updates: body,
      },
    });
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }, "admin"),
});

// DELETE /rules/:id - Delete rule
http.route({
  path: "/api/rules/:ruleId",
  method: "DELETE",
  handler: authenticatedRoute(async (ctx, req, user) => {
    const url = new URL(req.url);
    const ruleId = url.pathname.split("/").pop() as Id<"rules">;
    
    await ctx.runMutation(internal.rules.deleteRule, {
      ruleId: ruleId,
    });
    
    // Create audit log
    await ctx.runMutation(internal.admin.createAuditLog, {
      userId: user._id,
      eventType: "RULE_DELETED",
      details: {
        rule_id: ruleId,
      },
    });
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }, "admin"),
});

// Commands Routes

// POST /commands - Submit command
http.route({
  path: "/api/commands",
  method: "POST",
  handler: authenticatedRoute(async (ctx, req, user) => {
    const body = await req.json();
    
    if (!body.command_text) {
      return new Response(JSON.stringify({ error: "command_text is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    const result = await ctx.runMutation(internal.commands.submitCommand, {
      userId: user._id,
      commandText: body.command_text,
    });
    
    // Return appropriate HTTP status codes based on command status
    // 400/403 for rejected commands (especially insufficient credits)
    if (result.status === "rejected") {
      const statusCode = result.reason === "INSUFFICIENT_CREDITS" ? 403 : 400;
      return new Response(JSON.stringify({
        error: result.reason || "Command rejected",
        ...result
      }), {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// GET /commands - List commands with optional filters
http.route({
  path: "/api/commands",
  method: "GET",
  handler: authenticatedRoute(async (ctx, req, user) => {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    
    // Members can only see their own commands, admins can see all
    const userId = user.role === "admin" ? undefined : user._id;
    
    const commands = await ctx.runQuery(internal.commands.listCommands, {
      userId: userId,
      status: status as any,
    });
    
    return new Response(JSON.stringify(commands), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// GET /commands/:id - Get command details
http.route({
  path: "/api/commands/:commandId",
  method: "GET",
  handler: authenticatedRoute(async (ctx, req, user) => {
    const url = new URL(req.url);
    const commandId = url.pathname.split("/").pop() as Id<"commands">;
    
    const command = await ctx.runQuery(internal.commands.getCommand, {
      commandId: commandId,
    });
    
    if (!command) {
      return new Response(JSON.stringify({ error: "Command not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // Members can only see their own commands
    if (user.role !== "admin" && command.user_id !== user._id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    return new Response(JSON.stringify(command), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// Audit Logs (Admin only)

// GET /audit - List audit logs with query param filters
http.route({
  path: "/api/audit",
  method: "GET",
  handler: authenticatedRoute(async (ctx, req, user) => {
    const url = new URL(req.url);
    const userIdParam = url.searchParams.get("userId");
    const eventTypeParam = url.searchParams.get("eventType");
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");
    const limitParam = url.searchParams.get("limit");
    
    const logs = await ctx.runQuery(internal.admin.getAuditLogs, {
      userId: userIdParam ? (userIdParam as Id<"users">) : undefined,
      eventType: eventTypeParam as any,
      from: fromParam ? parseInt(fromParam) : undefined,
      to: toParam ? parseInt(toParam) : undefined,
      limit: limitParam ? parseInt(limitParam) : undefined,
    });
    
    return new Response(JSON.stringify(logs), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }, "admin"),
});

export default http;
