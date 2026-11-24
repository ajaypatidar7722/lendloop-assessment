import { formatDistanceToNow } from "date-fns";
import {
  LOAN_EVENT_RECIPIENT,
  type Category,
  type Condition,
  type LoanEventType,
  type LoanStatus,
} from "@/convex/lib/validators";

export const CATEGORY_LABELS: Record<Category, string> = {
  power_tools: "Power tools",
  hand_tools: "Hand tools",
  garden: "Garden",
  kitchen: "Kitchen",
  camping: "Camping",
  cleaning: "Cleaning",
  other: "Other",
};

export const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

export const CONDITION_LABELS: Record<Condition, string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
  worn: "Worn",
};

export const CONDITIONS = Object.keys(CONDITION_LABELS) as Condition[];

export const STATUS_LABELS: Record<LoanStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  declined: "Declined",
  cancelled: "Cancelled",
  returned: "Returned",
};

/** Mirrors convex/lib/loanRules.ts MAX_LOAN_DAYS (the server enforces it too). */
export const MAX_LOAN_DAYS = 30;

/** "2026-11-25" → "Nov 25, 2026". Parsed as UTC so the day never shifts. */
export function formatDay(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatRange(start: string, end: string): string {
  return start === end ? formatDay(start) : `${formatDay(start)} – ${formatDay(end)}`;
}

export type LoanActivity = {
  kind: "request_notification" | "overdue_reminder";
  event: LoanEventType | null;
  status: "sent" | "failed";
  at: number;
};

const EVENT_NOUN: Record<LoanEventType, string> = {
  "loan.requested": "the request",
  "loan.approved": "the approval",
  "loan.declined": "the decline",
  "loan.cancelled": "the cancellation",
  "loan.returned": "the return",
};

/**
 * One activity line, phrased for whoever is looking:
 * "You were notified of the approval" / "Lender notified of the request" /
 * "Overdue reminder sent", plus "· 2 days ago".
 */
export function describeActivity(activity: LoanActivity, viewer: "owner" | "borrower"): string {
  const when = formatDistanceToNow(activity.at, { addSuffix: true });
  const failed = activity.status === "failed";

  if (activity.kind === "overdue_reminder") {
    const to = viewer === "borrower" ? " to you" : "";
    return `${failed ? "Overdue reminder failed" : `Overdue reminder sent${to}`} · ${when}`;
  }

  const recipient = activity.event ? LOAN_EVENT_RECIPIENT[activity.event] : null;
  const about = activity.event ? ` of ${EVENT_NOUN[activity.event]}` : "";
  const who = recipient === viewer ? "you" : recipient === "owner" ? "the lender" : "the borrower";
  if (failed) return `Couldn't notify ${who}${about} · ${when}`;
  const subject = who === "you" ? "You were" : who === "the lender" ? "Lender" : "Borrower";
  return `${subject} notified${about} · ${when}`;
}

/** Local calendar date (from the date picker) → "YYYY-MM-DD". */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "YYYY-MM-DD" → local Date at midnight, for the date picker. */
export function fromIsoDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}
