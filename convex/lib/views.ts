import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { isOnLoan } from "./loanRules";
import {
  automationKindValidator,
  automationStatusValidator,
  categoryValidator,
  conditionValidator,
  type LoanEventType,
  loanEventTypeValidator,
  loanStatusValidator,
} from "./validators";

// Shapes returned to signed-in users. Data minimization: other people appear by
// first name only (plus the Trusted Lender badge). Emails never leave Convex
// except to admins and to n8n for the one recipient of a message.

/**
 * The only name other people see. Prefers the first name from Clerk (which may
 * contain spaces); falls back to the first word of the full name for older rows.
 */
export function displayFirstName(user: Pick<Doc<"users">, "name" | "firstName">): string {
  return user.firstName?.trim() || user.name.trim().split(/\s+/)[0] || "Neighbor";
}

/** Small per-request cache so a list owned by few people doesn't re-read users. */
export function userLoader(ctx: QueryCtx) {
  const cache = new Map<Id<"users">, Doc<"users"> | null>();
  return async (id: Id<"users">) => {
    if (!cache.has(id)) cache.set(id, await ctx.db.get("users", id));
    return cache.get(id) ?? null;
  };
}

// ── Tools ────────────────────────────────────────────────────────────────────

export const toolCardValidator = v.object({
  _id: v.id("tools"),
  name: v.string(),
  category: categoryValidator,
  condition: conditionValidator,
  description: v.string(),
  owner: v.object({ firstName: v.string(), trustedLender: v.boolean() }),
  isMine: v.boolean(),
  /** The viewer already has a pending request for this tool (the server rejects a second one). */
  requestPending: v.boolean(),
  availability: v.union(v.literal("available"), v.literal("on_loan")),
});

/** Upper bound on one user's pending requests read per page of cards. */
const MAX_PENDING_PER_VIEWER = 100;

export async function toToolCards(
  ctx: QueryCtx,
  tools: Doc<"tools">[],
  viewerId: Id<"users">,
  today: string,
) {
  const getUser = userLoader(ctx);
  // One indexed read for the whole page, not one per tool.
  const pendingToolIds = new Set(
    (
      await ctx.db
        .query("loans")
        .withIndex("by_borrowerId_and_status", (q) =>
          q.eq("borrowerId", viewerId).eq("status", "pending"),
        )
        .take(MAX_PENDING_PER_VIEWER)
    ).map((loan) => loan.toolId),
  );
  const cards = [];
  for (const tool of tools) {
    const owner = await getUser(tool.ownerId);
    cards.push({
      _id: tool._id,
      name: tool.name,
      category: tool.category,
      condition: tool.condition,
      description: tool.description,
      owner: {
        firstName: owner ? displayFirstName(owner) : "Neighbor",
        trustedLender: owner?.trustedLender ?? false,
      },
      isMine: tool.ownerId === viewerId,
      requestPending: pendingToolIds.has(tool._id),
      availability: (await isOnLoan(ctx, tool._id, today))
        ? ("on_loan" as const)
        : ("available" as const),
    });
  }
  return cards;
}

// ── Loans ────────────────────────────────────────────────────────────────────

const ACTIVITY_LIMIT = 3;

/**
 * One line of "what the automation did" on a loan. Only kind, outcome and time:
 * error details and recipient addresses stay server-side.
 */
const activityValidator = v.object({
  kind: automationKindValidator,
  /** For notifications: which loan event it was about. */
  event: v.union(v.null(), loanEventTypeValidator),
  status: automationStatusValidator,
  at: v.number(),
});

const LOAN_EVENT_TYPES = new Set<string>(loanEventTypeValidator.members.map((m) => m.value));

/** eventId is `${loanId}:${type}` (see notify.ts); the type is the part after the last ":". */
function eventTypeOf(eventId: string): LoanEventType | null {
  const type = eventId.slice(eventId.lastIndexOf(":") + 1);
  return LOAN_EVENT_TYPES.has(type) ? (type as LoanEventType) : null;
}

/**
 * The newest automation outcomes for a loan: what n8n reported back
 * (automationEvents) plus deliveries Convex gave up on because n8n was
 * unreachable (failed webhookDeliveries), so a failure is never invisible.
 */
async function loanActivity(ctx: QueryCtx, loanId: Id<"loans">) {
  const reported = await ctx.db
    .query("automationEvents")
    .withIndex("by_loanId", (q) => q.eq("loanId", loanId))
    .order("desc")
    .take(ACTIVITY_LIMIT * 2);
  const undelivered = await ctx.db
    .query("webhookDeliveries")
    .withIndex("by_loanId_and_status", (q) => q.eq("loanId", loanId).eq("status", "failed"))
    .order("desc")
    .take(ACTIVITY_LIMIT);

  const activity = reported.map((e) => ({
    kind: e.kind,
    event:
      e.kind === "request_notification"
        ? eventTypeOf(e.idempotencyKey.replace(/^notify:/, ""))
        : null,
    status: e.status,
    at: e.occurredAt,
  }));
  const reportedEvents = new Set(activity.map((a) => a.event));
  for (const d of undelivered) {
    const event = eventTypeOf(d.eventId);
    if (reportedEvents.has(event)) continue; // n8n already reported this one
    activity.push({ kind: "request_notification", event, status: "failed", at: d._creationTime });
  }
  return activity.sort((a, b) => b.at - a.at).slice(0, ACTIVITY_LIMIT);
}

export const loanViewValidator = v.object({
  _id: v.id("loans"),
  _creationTime: v.number(),
  tool: v.object({
    _id: v.id("tools"),
    name: v.string(),
    removed: v.boolean(),
  }),
  /** The other person: the owner on "My requests", the borrower on "Incoming". */
  counterparty: v.object({ firstName: v.string(), trustedLender: v.boolean() }),
  status: loanStatusValidator,
  startDate: v.string(),
  endDate: v.string(),
  isOverdue: v.boolean(),
  activity: v.array(activityValidator),
});

export async function toLoanViews(
  ctx: QueryCtx,
  loans: Doc<"loans">[],
  counterpartyOf: (loan: Doc<"loans">) => Id<"users">,
  today: string,
) {
  const getUser = userLoader(ctx);
  const views = [];
  for (const loan of loans) {
    const tool = await ctx.db.get("tools", loan.toolId);
    const other = await getUser(counterpartyOf(loan));
    views.push({
      _id: loan._id,
      _creationTime: loan._creationTime,
      tool: {
        _id: loan.toolId,
        name: tool?.name ?? "Removed tool",
        removed: tool === null || tool.removedAt !== undefined,
      },
      counterparty: {
        firstName: other ? displayFirstName(other) : "Neighbor",
        trustedLender: other?.trustedLender ?? false,
      },
      status: loan.status,
      startDate: loan.startDate,
      endDate: loan.endDate,
      isOverdue: loan.status === "approved" && loan.endDate < today,
      activity: await loanActivity(ctx, loan._id),
    });
  }
  return views;
}
