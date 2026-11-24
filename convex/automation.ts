import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import { daysBetween } from "./lib/dates";
import { automationStatusValidator } from "./lib/validators";
import { displayFirstName } from "./lib/views";

// Data access for the n8n HTTP endpoints in http.ts. Everything is internal:
// clients can't call these, and http.ts only calls them after verifying the
// request's HMAC signature.

const MAX_OVERDUE = 200;

function reminderKey(loanId: Id<"loans">, date: string): string {
  return `reminder:${loanId}:${date}`;
}

/**
 * Approved loans whose end date is before `today` (UTC), minus any that already
 * got a successful reminder today. Re-running the daily workflow therefore
 * sends nothing twice. Data minimization: only what a reminder email needs.
 */
export const overdueLoans = internalQuery({
  args: { today: v.string() },
  returns: v.array(
    v.object({
      loanId: v.id("loans"),
      idempotencyKey: v.string(),
      toolName: v.string(),
      endDate: v.string(),
      daysOverdue: v.number(),
      borrower: v.object({ firstName: v.string(), email: v.string() }),
    }),
  ),
  handler: async (ctx, { today }) => {
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_status_and_endDate", (q) => q.eq("status", "approved").lt("endDate", today))
      .take(MAX_OVERDUE);

    const result = [];
    for (const loan of loans) {
      const idempotencyKey = reminderKey(loan._id, today);
      const already = await ctx.db
        .query("automationEvents")
        .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", idempotencyKey))
        .unique();
      if (already?.status === "sent") continue;

      const borrower = await ctx.db.get("users", loan.borrowerId);
      if (borrower === null) continue;
      const tool = await ctx.db.get("tools", loan.toolId);
      result.push({
        loanId: loan._id,
        idempotencyKey,
        toolName: tool?.name ?? "the tool",
        endDate: loan.endDate,
        daysOverdue: daysBetween(loan.endDate, today),
        borrower: { firstName: displayFirstName(borrower), email: borrower.email },
      });
    }
    return result;
  },
});

const writeResult = v.union(
  v.object({
    ok: v.literal(true),
    outcome: v.union(v.literal("created"), v.literal("updated"), v.literal("duplicate")),
  }),
  v.object({ ok: v.literal(false), reason: v.literal("not_found") }),
);

/**
 * Upsert on idempotencyKey (unique by construction). A retry with the same
 * status is a no-op; a later "sent" may replace an earlier "failed", but a
 * "failed" never overwrites a "sent".
 */
async function upsertEvent(
  ctx: MutationCtx,
  event: {
    loanId: Id<"loans">;
    kind: "request_notification" | "overdue_reminder";
    status: "sent" | "failed";
    idempotencyKey: string;
    detail?: string;
  },
) {
  const existing = await ctx.db
    .query("automationEvents")
    .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", event.idempotencyKey))
    .unique();
  if (existing === null) {
    await ctx.db.insert("automationEvents", { ...event, occurredAt: Date.now() });
    return { ok: true as const, outcome: "created" as const };
  }
  if (existing.status === "failed" && event.status === "sent") {
    await ctx.db.patch("automationEvents", existing._id, {
      status: "sent",
      detail: event.detail,
      occurredAt: Date.now(),
    });
    return { ok: true as const, outcome: "updated" as const };
  }
  return { ok: true as const, outcome: "duplicate" as const };
}

/** n8n reports the outcome of one overdue reminder. */
export const recordReminder = internalMutation({
  args: {
    loanId: v.string(),
    idempotencyKey: v.string(),
    status: automationStatusValidator,
    detail: v.optional(v.string()),
  },
  returns: writeResult,
  handler: async (ctx, args) => {
    const loanId = ctx.db.normalizeId("loans", args.loanId);
    // The key must be one overdueLoans could have issued for this loan.
    if (loanId === null || !args.idempotencyKey.startsWith(`reminder:${loanId}:`)) {
      return { ok: false as const, reason: "not_found" as const };
    }
    if ((await ctx.db.get("loans", loanId)) === null) {
      return { ok: false as const, reason: "not_found" as const };
    }
    return await upsertEvent(ctx, {
      loanId,
      kind: "overdue_reminder",
      status: args.status,
      idempotencyKey: args.idempotencyKey,
      detail: args.detail,
    });
  },
});

/** n8n acknowledges a request notification it handled (keyed by the outbox eventId). */
export const recordNotification = internalMutation({
  args: { eventId: v.string(), status: automationStatusValidator, detail: v.optional(v.string()) },
  returns: writeResult,
  handler: async (ctx, { eventId, status, detail }) => {
    const delivery = await ctx.db
      .query("webhookDeliveries")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .unique();
    if (delivery === null) return { ok: false as const, reason: "not_found" as const };
    return await upsertEvent(ctx, {
      loanId: delivery.loanId,
      kind: "request_notification",
      status,
      idempotencyKey: `notify:${eventId}`,
      detail,
    });
  },
});

/** The n8n error workflow reports a failed execution. executionId makes retries no-ops. */
export const recordWorkflowError = internalMutation({
  args: {
    workflowName: v.string(),
    executionId: v.string(),
    nodeName: v.optional(v.string()),
    message: v.string(),
  },
  returns: v.object({ outcome: v.union(v.literal("created"), v.literal("duplicate")) }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("workflowErrors")
      .withIndex("by_executionId", (q) => q.eq("executionId", args.executionId))
      .unique();
    if (existing !== null) return { outcome: "duplicate" as const };
    await ctx.db.insert("workflowErrors", { ...args, occurredAt: Date.now() });
    return { outcome: "created" as const };
  },
});
