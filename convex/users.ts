import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";
import { appError } from "./lib/errors";
import { adminMutation, identityMutation, publicQuery } from "./lib/functions";
import { roleValidator } from "./lib/validators";

/**
 * Called by the client right after sign-in. Creates the caller's users row
 * (role "user") or refreshes name/email from the token. Never touches role or
 * trustedLender, so a client can't promote itself.
 */
export const store = identityMutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    const { identity } = ctx;
    if (!identity.email) {
      throw appError("INVALID", "Your Clerk session token is missing the email claim.");
    }
    // Never derive a display name from the email: other users see first names
    // (in the app and in n8n emails), and an email prefix would leak the address.
    const givenName = identity.givenName?.trim() || undefined;
    const name = identity.name?.trim() || givenName || "Neighbor";

    const existing = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (existing !== null) {
      if (
        existing.name !== name ||
        existing.firstName !== givenName ||
        existing.email !== identity.email
      ) {
        await ctx.db.patch("users", existing._id, {
          name,
          firstName: givenName,
          email: identity.email,
        });
      }
      return existing._id;
    }

    return await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      name,
      firstName: givenName,
      email: identity.email,
      role: "user",
      trustedLender: false,
    });
  },
});

/** The caller's own profile, or null when signed out / not yet stored. */
export const me = publicQuery({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("users"),
      name: v.string(),
      email: v.string(),
      role: roleValidator,
      trustedLender: v.boolean(),
    }),
  ),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user === null) return null;
    const { _id, name, email, role, trustedLender } = user;
    return { _id, name, email, role, trustedLender };
  },
});

/**
 * Internal only: no client can call it. Bootstrap the first admin from the CLI:
 *   npx convex run users:setRole '{"email":"you@example.com","role":"admin"}'
 */
export const setRole = internalMutation({
  args: { email: v.string(), role: roleValidator },
  returns: v.null(),
  handler: async (ctx, { email, role }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (user === null) throw appError("NOT_FOUND", `No user with email ${email}. Sign in first.`);
    await ctx.db.patch("users", user._id, { role });
    return null;
  },
});

/** Admin marks (or unmarks) a lender as "Trusted Lender". */
export const setTrusted = adminMutation({
  args: { userId: v.id("users"), trusted: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { userId, trusted }) => {
    const target = await ctx.db.get("users", userId);
    if (target === null) throw appError("NOT_FOUND", "User not found.");
    await ctx.db.patch("users", userId, { trustedLender: trusted });
    return null;
  },
});
