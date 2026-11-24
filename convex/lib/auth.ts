import type { UserIdentity } from "convex/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { appError } from "./errors";

// All identity comes from the verified Clerk JWT (ctx.auth). No function ever
// accepts a user ID as "who am I"; IDs in args are only ever *targets*.

export async function requireIdentity(ctx: QueryCtx): Promise<UserIdentity> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) throw appError("UNAUTHENTICATED", "Please sign in.");
  return identity;
}

/** The caller's users row, or null when signed out or not yet stored. */
export async function getCurrentUser(ctx: QueryCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
}

export async function requireUser(ctx: QueryCtx): Promise<Doc<"users">> {
  await requireIdentity(ctx);
  const user = await getCurrentUser(ctx);
  if (user === null) throw appError("NOT_REGISTERED", "Your account is still being set up.");
  return user;
}

export async function requireAdmin(ctx: QueryCtx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== "admin") throw appError("FORBIDDEN", "Admins only.");
  return user;
}

/**
 * Returns the tool if `user` owns it. Removed tools count as not found.
 * Tools are publicly listed, so FORBIDDEN here leaks nothing.
 */
export async function assertToolOwner(
  ctx: QueryCtx,
  user: Doc<"users">,
  toolId: Id<"tools">,
): Promise<Doc<"tools">> {
  const tool = await ctx.db.get("tools", toolId);
  if (tool === null || tool.removedAt !== undefined) {
    throw appError("NOT_FOUND", "Tool not found.");
  }
  if (tool.ownerId !== user._id) throw appError("FORBIDDEN", "You can only manage your own tools.");
  return tool;
}

export type LoanParty = "owner" | "borrower" | "either";

/**
 * Returns the loan if `user` is the required party. Non-parties get NOT_FOUND
 * (not FORBIDDEN) so loan IDs can't be probed for existence.
 */
export async function assertLoanParty(
  ctx: QueryCtx,
  user: Doc<"users">,
  loanId: Id<"loans">,
  party: LoanParty,
): Promise<Doc<"loans">> {
  const loan = await ctx.db.get("loans", loanId);
  const isOwner = loan?.ownerId === user._id;
  const isBorrower = loan?.borrowerId === user._id;
  const allowed =
    party === "owner" ? isOwner : party === "borrower" ? isBorrower : isOwner || isBorrower;
  if (loan === null || !allowed) throw appError("NOT_FOUND", "Loan not found.");
  return loan;
}
