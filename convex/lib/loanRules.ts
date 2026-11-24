import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { rangesOverlap } from "./dates";
import { appError } from "./errors";
import { enqueueNotification } from "./notify";
import type { LoanStatus } from "./validators";

/** Max loans scanned per tool+status. A tool never has more than a handful open. */
const PER_TOOL_LIMIT = 100;

export const MAX_LOAN_DAYS = 30;

// ── State machine ────────────────────────────────────────────────────────────
// The only legal moves. Anything else (e.g. approving a returned loan) throws.
const TRANSITIONS: Record<LoanStatus, readonly LoanStatus[]> = {
  pending: ["approved", "declined", "cancelled"],
  approved: ["returned"],
  declined: [],
  cancelled: [],
  returned: [],
};

export function assertTransition(from: LoanStatus, to: LoanStatus): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw appError("CONFLICT", `This request is already ${from}, so it can't be ${to}.`);
  }
}

// ── Queries over a tool's loans ──────────────────────────────────────────────

export async function loansForTool(
  ctx: QueryCtx,
  toolId: Id<"tools">,
  status: LoanStatus,
): Promise<Doc<"loans">[]> {
  return await ctx.db
    .query("loans")
    .withIndex("by_toolId_and_status", (q) => q.eq("toolId", toolId).eq("status", status))
    .take(PER_TOOL_LIMIT);
}

/**
 * The days an approved loan actually occupies the tool. Until it's marked
 * returned, an overdue loan keeps the tool busy through today: the borrower
 * still has it, whatever the booked end date says.
 */
export function occupiedUntil(loan: Doc<"loans">, today: string): string {
  return loan.endDate < today ? today : loan.endDate;
}

/** An approved loan occupying any day in [start, end], ignoring `excludeId`. */
export async function findApprovedOverlap(
  ctx: QueryCtx,
  toolId: Id<"tools">,
  range: { start: string; end: string; today: string; excludeId?: Id<"loans"> },
): Promise<Doc<"loans"> | null> {
  const approved = await loansForTool(ctx, toolId, "approved");
  return (
    approved.find(
      (loan) =>
        loan._id !== range.excludeId &&
        rangesOverlap(range.start, range.end, loan.startDate, occupiedUntil(loan, range.today)),
    ) ?? null
  );
}

/**
 * "On loan" today: an approved loan has started and hasn't been marked returned.
 * Overdue loans count as on loan, because the tool hasn't come back yet.
 */
export async function isOnLoan(ctx: QueryCtx, toolId: Id<"tools">, today: string) {
  const approved = await loansForTool(ctx, toolId, "approved");
  return approved.some((loan) => loan.startDate <= today);
}

// ── Writes ───────────────────────────────────────────────────────────────────

/** Moves a loan to `to` (validated) and queues the matching notification. */
export async function transitionLoan(
  ctx: MutationCtx,
  loan: Doc<"loans">,
  to: Exclude<LoanStatus, "pending">,
): Promise<void> {
  assertTransition(loan.status, to);
  const now = Date.now();
  await ctx.db.patch("loans", loan._id, {
    status: to,
    ...(to === "approved" || to === "declined" ? { decidedAt: now } : {}),
    ...(to === "returned" ? { returnedAt: now } : {}),
  });
  await enqueueNotification(ctx, { type: `loan.${to}`, loanId: loan._id });
}

/** Declines pending requests for a tool, optionally only those overlapping a range. */
export async function declinePending(
  ctx: MutationCtx,
  toolId: Id<"tools">,
  overlapping?: { start: string; end: string; exceptId: Id<"loans"> },
): Promise<number> {
  const pending = await loansForTool(ctx, toolId, "pending");
  let declined = 0;
  for (const loan of pending) {
    if (overlapping) {
      if (loan._id === overlapping.exceptId) continue;
      if (!rangesOverlap(overlapping.start, overlapping.end, loan.startDate, loan.endDate))
        continue;
    }
    await transitionLoan(ctx, loan, "declined");
    declined++;
  }
  return declined;
}
