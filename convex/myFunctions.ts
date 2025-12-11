import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Write your Convex functions in any file inside this directory (`convex`).
// See https://docs.convex.dev/functions for more.

// Query to get current authenticated user info
export const getCurrentUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return { user: null };
    }
    const user = await ctx.db.get(userId);
    return {
      user: user
        ? {
            email: user.email ?? null,
            name: user.name ?? null,
            image: user.image ?? null,
            role: user.role ?? null,
          }
        : null,
    };
  },
});
