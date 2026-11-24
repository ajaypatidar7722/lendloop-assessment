import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";
import { assertLoanParty, getCurrentUser } from "./lib/auth";
import { assertIsoDate, daysBetween, todayUtc } from "./lib/dates";
import { appError } from "./lib/errors";
import { authedMutation, authedQuery, publicQuery } from "./lib/functions";
import {
  declinePending,
  findApprovedOverlap,
  isOnLoan,
  loansForTool,
  MAX_LOAN_DAYS,
  transitionLoan,
} from "./lib/loanRules";
import { enqueueNotification } from "./lib/notify";
import { loanStatusValidator } from "./lib/validators";
import { loanViewValidator, toLoanViews } from "./lib/views";

// ── Borrower actions ─────────────────────────────────────────────────────────

/**
 * Ask to borrow a tool for [startDate, endDate] (inclusive, YYYY-MM-DD).
 * Rules: not your own tool; not while it's on loan (until it's marked returned);
 * start ≥ today; start ≤ end; at most 30 days; no overlap with an approved loan;
 * one pending request per tool per borrower.
 */
export const request = authedMutation({
  args: { toolId: v.id("tools"), startDate: v.string(), endDate: v.string() },
  returns: v.id("loans"),
  handler: async (ctx, { toolId, startDate, endDate }) => {
    assertIsoDate(startDate, "Start date");
    assertIsoDate(endDate, "End date");

    const tool = await ctx.db.get("tools", toolId);
    if (tool === null || tool.removedAt !== undefined)
      throw appError("NOT_FOUND", "Tool not found.");
    if (tool.ownerId === ctx.user._id) throw appError("INVALID", "You can't borrow your own tool.");

    const today = todayUtc();
    if (startDate < today) throw appError("INVALID", "Start date can't be in the past.");
    if (endDate < startDate)
      throw appError("INVALID", "End date must be on or after the start date.");
    if (daysBetween(startDate, endDate) + 1 > MAX_LOAN_DAYS) {
      throw appError("INVALID", `Loans can be at most ${MAX_LOAN_DAYS} days.`);
    }

    // While someone has the tool (an approved loan has started and it hasn't been
    // marked returned, overdue included), nobody else can queue up for it.
    if (await isOnLoan(ctx, toolId, today)) {
      throw appError(
        "CONFLICT",
        "This tool is on loan right now. You can request it once it's been returned.",
      );
    }
    if (await findApprovedOverlap(ctx, toolId, { start: startDate, end: endDate, today })) {
      throw appError(
        "CONFLICT",
        "The tool is booked, or hasn't been returned yet, for some of those dates.",
      );
    }
    const pending = await loansForTool(ctx, toolId, "pending");
    if (pending.some((loan) => loan.borrowerId === ctx.user._id)) {
      throw appError("CONFLICT", "You already have a pending request for this tool.");
    }

    const loanId = await ctx.db.insert("loans", {
      toolId,
      ownerId: tool.ownerId,
      borrowerId: ctx.user._id,
      startDate,
      endDate,
      status: "pending",
    });
    await enqueueNotification(ctx, { type: "loan.requested", loanId });
    return loanId;
  },
});

/** Borrower withdraws a request that hasn't been decided yet. */
export const cancel = authedMutation({
  args: { loanId: v.id("loans") },
  returns: v.null(),
  handler: async (ctx, { loanId }) => {
    const loan = await assertLoanParty(ctx, ctx.user, loanId, "borrower");
    await transitionLoan(ctx, loan, "cancelled");
    return null;
  },
});

// ── Owner actions ────────────────────────────────────────────────────────────

/**
 * Owner approves. The overlap check runs again here, inside the same
 * transaction as the write. Convex mutations are serializable, so two approvals
 * racing for the same dates can't both succeed. Other pending requests that
 * overlap the approved dates are declined automatically.
 */
export const approve = authedMutation({
  args: { loanId: v.id("loans") },
  returns: v.null(),
  handler: async (ctx, { loanId }) => {
    const loan = await assertLoanParty(ctx, ctx.user, loanId, "owner");
    const today = todayUtc();
    if (loan.status === "pending" && loan.endDate < today) {
      throw appError("INVALID", "These dates have already passed. Decline the request instead.");
    }
    const clash = await findApprovedOverlap(ctx, loan.toolId, {
      start: loan.startDate,
      end: loan.endDate,
      today,
      excludeId: loan._id,
    });
    if (clash) {
      throw appError(
        "CONFLICT",
        clash.endDate < today
          ? "This tool hasn't been returned from an overdue loan yet. Mark it returned first."
          : "You've already approved another loan for some of these dates.",
      );
    }
    await transitionLoan(ctx, loan, "approved");
    await declinePending(ctx, loan.toolId, {
      start: loan.startDate,
      end: loan.endDate,
      exceptId: loan._id,
    });
    return null;
  },
});

export const decline = authedMutation({
  args: { loanId: v.id("loans") },
  returns: v.null(),
  handler: async (ctx, { loanId }) => {
    const loan = await assertLoanParty(ctx, ctx.user, loanId, "owner");
    await transitionLoan(ctx, loan, "declined");
    return null;
  },
});

/** Owner confirms the tool came back. Only an approved loan can be returned. */
export const markReturned = authedMutation({
  args: { loanId: v.id("loans") },
  returns: v.null(),
  handler: async (ctx, { loanId }) => {
    const loan = await assertLoanParty(ctx, ctx.user, loanId, "owner");
    await transitionLoan(ctx, loan, "returned");
    return null;
  },
});

// ── Views ────────────────────────────────────────────────────────────────────
// `today` comes from the client because queries can't read the clock
// (that would break caching). It only affects the overdue flag.

const loanPageArgs = {
  paginationOpts: paginationOptsValidator,
  today: v.string(),
  status: v.optional(loanStatusValidator),
};

/** "Borrowing" tab: loans where I'm the borrower, newest first, optionally one status. */
export const myRequests = authedQuery({
  args: loanPageArgs,
  returns: paginationResultValidator(loanViewValidator),
  handler: async (ctx, { paginationOpts, today, status }) => {
    assertIsoDate(today, "today");
    const me = ctx.user._id;
    const result =
      status === undefined
        ? await ctx.db
            .query("loans")
            .withIndex("by_borrowerId", (q) => q.eq("borrowerId", me))
            .order("desc")
            .paginate(paginationOpts)
        : await ctx.db
            .query("loans")
            .withIndex("by_borrowerId_and_status", (q) =>
              q.eq("borrowerId", me).eq("status", status),
            )
            .order("desc")
            .paginate(paginationOpts);
    return { ...result, page: await toLoanViews(ctx, result.page, (l) => l.ownerId, today) };
  },
});

/**
 * Nav badge counts: pending requests on my tools (waiting for me to decide)
 * and my own pending requests (waiting on the owner). Each read is capped at
 * BADGE_CAP + 1 so the client can render "99+" without an unbounded scan.
 *
 * A publicQuery on purpose: the nav can still be mounted for a moment after
 * sign-out, and throwing there would crash the page. Signed-out callers get
 * zeros; a signed-in caller only ever sees their own counts.
 */
const BADGE_CAP = 99; // keep in sync with MainNav's "99+" display

export const pendingCounts = publicQuery({
  args: {},
  returns: v.object({ incoming: v.number(), myRequests: v.number() }),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user === null) return { incoming: 0, myRequests: 0 };
    const [incoming, myRequests] = await Promise.all([
      ctx.db
        .query("loans")
        .withIndex("by_ownerId_and_status", (q) =>
          q.eq("ownerId", user._id).eq("status", "pending"),
        )
        .take(BADGE_CAP + 1),
      ctx.db
        .query("loans")
        .withIndex("by_borrowerId_and_status", (q) =>
          q.eq("borrowerId", user._id).eq("status", "pending"),
        )
        .take(BADGE_CAP + 1),
    ]);
    return { incoming: incoming.length, myRequests: myRequests.length };
  },
});

/** "Lending" tab: loans on my tools, newest first, optionally one status. */
export const incoming = authedQuery({
  args: loanPageArgs,
  returns: paginationResultValidator(loanViewValidator),
  handler: async (ctx, { paginationOpts, today, status }) => {
    assertIsoDate(today, "today");
    const me = ctx.user._id;
    const result =
      status === undefined
        ? await ctx.db
            .query("loans")
            .withIndex("by_ownerId", (q) => q.eq("ownerId", me))
            .order("desc")
            .paginate(paginationOpts)
        : await ctx.db
            .query("loans")
            .withIndex("by_ownerId_and_status", (q) => q.eq("ownerId", me).eq("status", status))
            .order("desc")
            .paginate(paginationOpts);
    return { ...result, page: await toLoanViews(ctx, result.page, (l) => l.borrowerId, today) };
  },
});
