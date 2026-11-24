import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { LOAN_EVENT_RECIPIENT, type LoanEventType } from "./validators";
import { displayFirstName } from "./views";

export type LoanEvent = { type: LoanEventType; loanId: Id<"loans"> };

/**
 * The exact JSON n8n receives. Data minimization: one recipient email, first
 * names only, no user IDs, no description, nothing about other loans.
 */
export type NotificationPayload = {
  eventId: string;
  type: LoanEventType;
  occurredAt: string;
  loan: {
    id: Id<"loans">;
    toolName: string;
    status: Doc<"loans">["status"];
    startDate: string;
    endDate: string;
  };
  recipient: { role: "owner" | "borrower"; firstName: string; email: string };
  counterparty: { firstName: string };
};

/**
 * Transactional outbox. Every loan status change calls this inside its own
 * mutation, so the delivery row commits or rolls back together with the change:
 * a notification is never lost after a commit and never sent for a rollback.
 * The scheduled action (webhooks.deliver) does the network I/O and retries.
 *
 * eventId is `${loanId}:${type}`. The state machine allows each transition at
 * most once per loan, so the ID is unique and stable across retries, which lets
 * n8n de-duplicate on it.
 */
export async function enqueueNotification(ctx: MutationCtx, event: LoanEvent): Promise<void> {
  const eventId = `${event.loanId}:${event.type}`;
  const existing = await ctx.db
    .query("webhookDeliveries")
    .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
    .unique();
  if (existing !== null) return;

  const loan = await ctx.db.get("loans", event.loanId);
  if (loan === null) return;
  const tool = await ctx.db.get("tools", loan.toolId);
  const role = LOAN_EVENT_RECIPIENT[event.type];
  const [recipient, other] =
    role === "owner"
      ? [await ctx.db.get("users", loan.ownerId), await ctx.db.get("users", loan.borrowerId)]
      : [await ctx.db.get("users", loan.borrowerId), await ctx.db.get("users", loan.ownerId)];
  if (recipient === null) return; // deleted account: nobody to notify

  const payload: NotificationPayload = {
    eventId,
    type: event.type,
    occurredAt: new Date().toISOString(),
    loan: {
      id: loan._id,
      toolName: tool?.name ?? "a removed tool",
      status: loan.status,
      startDate: loan.startDate,
      endDate: loan.endDate,
    },
    recipient: { role, firstName: displayFirstName(recipient), email: recipient.email },
    counterparty: { firstName: other ? displayFirstName(other) : "A neighbor" },
  };

  const deliveryId = await ctx.db.insert("webhookDeliveries", {
    eventId,
    eventType: event.type,
    loanId: loan._id,
    body: JSON.stringify(payload), // stored once, so every retry signs identical bytes
    attempts: 0,
    status: "pending",
  });
  await ctx.scheduler.runAfter(0, internal.webhooks.deliver, { deliveryId });
}
