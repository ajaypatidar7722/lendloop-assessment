import { ConvexError } from "convex/values";

/**
 * Every expected failure is a ConvexError carrying a stable `code`, so the UI
 * can show a friendly message without parsing strings. Messages are generic on
 * purpose: they never reveal whether a record the caller can't see exists.
 */
export type ErrorCode =
  | "UNAUTHENTICATED" // no valid Clerk token
  | "NOT_REGISTERED" // token is valid but users.store hasn't run yet
  | "FORBIDDEN" // signed in, but not allowed to do this
  | "NOT_FOUND" // missing, removed, or not visible to the caller
  | "INVALID" // bad input that validators can't express (e.g. date order)
  | "CONFLICT"; // valid request that clashes with current state

export type AppErrorData = { code: ErrorCode; message: string };

export function appError(code: ErrorCode, message: string) {
  return new ConvexError<AppErrorData>({ code, message });
}
