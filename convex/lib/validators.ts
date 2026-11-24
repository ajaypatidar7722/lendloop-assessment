import { v, type Infer } from "convex/values";

// Single source of truth for domain enums. The schema, function args and
// (later) the UI's zod schemas all derive from these.

export const roleValidator = v.union(v.literal("admin"), v.literal("user"));
export type Role = Infer<typeof roleValidator>;

export const categoryValidator = v.union(
  v.literal("power_tools"),
  v.literal("hand_tools"),
  v.literal("garden"),
  v.literal("kitchen"),
  v.literal("camping"),
  v.literal("cleaning"),
  v.literal("other"),
);
export type Category = Infer<typeof categoryValidator>;

export const conditionValidator = v.union(
  v.literal("new"),
  v.literal("like_new"),
  v.literal("good"),
  v.literal("fair"),
  v.literal("worn"),
);
export type Condition = Infer<typeof conditionValidator>;

// Lifecycle: pending → approved | declined | cancelled; approved → returned.
// Transitions are enforced server-side (see loanRules.ts).
export const loanStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("declined"),
  v.literal("cancelled"),
  v.literal("returned"),
);
export type LoanStatus = Infer<typeof loanStatusValidator>;

// What happened to a loan, as sent to n8n. One per state-machine transition.
export const loanEventTypeValidator = v.union(
  v.literal("loan.requested"),
  v.literal("loan.approved"),
  v.literal("loan.declined"),
  v.literal("loan.cancelled"),
  v.literal("loan.returned"),
);
export type LoanEventType = Infer<typeof loanEventTypeValidator>;

/**
 * Who hears about each event: the person who didn't cause it. Requests and
 * cancellations go to the owner; decisions and returns go to the borrower.
 * Shared by the outbox (who to email) and the UI (how to describe it).
 */
export const LOAN_EVENT_RECIPIENT: Record<LoanEventType, "owner" | "borrower"> = {
  "loan.requested": "owner",
  "loan.cancelled": "owner",
  "loan.approved": "borrower",
  "loan.declined": "borrower",
  "loan.returned": "borrower",
};

export const automationKindValidator = v.union(
  v.literal("request_notification"),
  v.literal("overdue_reminder"),
);

export const automationStatusValidator = v.union(v.literal("sent"), v.literal("failed"));

export const deliveryStatusValidator = v.union(
  v.literal("pending"),
  v.literal("delivered"),
  v.literal("failed"),
);

/** Calendar dates are stored as "YYYY-MM-DD" strings (UTC), so they compare lexically. */
export const isoDateValidator = v.string();
