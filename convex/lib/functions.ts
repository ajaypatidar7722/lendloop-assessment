import { customCtx, customMutation, customQuery } from "convex-helpers/server/customFunctions";
import { mutation, query } from "../_generated/server";
import { requireAdmin, requireIdentity, requireUser } from "./auth";

/**
 * The ONLY place public Convex functions are built. Every exported function in
 * convex/ must use one of these, so its privilege level is visible at the
 * definition site. ESLint (eslint.config.mjs) forbids importing the raw
 * `query` / `mutation` / `action` builders anywhere else in convex/.
 *
 * Internal functions (internalQuery/internalMutation/internalAction) are not
 * reachable from clients, so they're imported directly from _generated/server.
 */

/** Anyone, including signed-out visitors. Must return only public-safe fields. */
export const publicQuery = query;

/** A valid Clerk token, even before the users row exists. Only for users.store. */
export const identityMutation = customMutation(
  mutation,
  customCtx(async (ctx) => ({ identity: await requireIdentity(ctx) })),
);

/** Signed in and registered. `ctx.user` is the caller's users row. */
export const authedQuery = customQuery(
  query,
  customCtx(async (ctx) => ({ user: await requireUser(ctx) })),
);
export const authedMutation = customMutation(
  mutation,
  customCtx(async (ctx) => ({ user: await requireUser(ctx) })),
);

/** Signed in with role "admin". `ctx.user` is the admin's users row. */
export const adminQuery = customQuery(
  query,
  customCtx(async (ctx) => ({ user: await requireAdmin(ctx) })),
);
export const adminMutation = customMutation(
  mutation,
  customCtx(async (ctx) => ({ user: await requireAdmin(ctx) })),
);
