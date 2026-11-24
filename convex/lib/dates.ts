import { appError } from "./errors";

// Loan dates are calendar days stored as "YYYY-MM-DD" (UTC). That format sorts
// lexically, so plain string comparison (<, <=) is correct date comparison.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

function toMs(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

/** Rejects malformed or impossible dates such as "2026-02-30". */
export function assertIsoDate(value: string, field: string): void {
  const ms = toMs(value);
  if (
    !ISO_DATE.test(value) ||
    Number.isNaN(ms) ||
    new Date(ms).toISOString().slice(0, 10) !== value
  ) {
    throw appError("INVALID", `${field} must be a valid date (YYYY-MM-DD).`);
  }
}

/** Today in UTC. Only call from mutations/actions; queries must take `today` as an arg. */
export function todayUtc(now: number = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toMs(to) - toMs(from)) / DAY_MS);
}

/** Inclusive ranges: a loan ending on the 5th and one starting on the 5th overlap. */
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}
