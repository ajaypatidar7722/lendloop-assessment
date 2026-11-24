import { ConvexError } from "convex/values";
import { toast } from "sonner";
import type { AppErrorData } from "@/convex/lib/errors";

/**
 * Server rules throw ConvexError({ code, message }) with a user-safe message.
 * Anything else (network, bugs) gets a generic message; details go to the console.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof ConvexError) {
    const data = error.data as Partial<AppErrorData> | undefined;
    if (data && typeof data.message === "string") return data.message;
  }
  console.error(error);
  return "Something went wrong. Please try again.";
}

/** Runs a mutation, shows a success toast, or a friendly error toast. Returns success. */
export async function withToast(action: () => Promise<unknown>, success: string): Promise<boolean> {
  try {
    await action();
    toast.success(success);
    return true;
  } catch (error) {
    toast.error(errorMessage(error));
    return false;
  }
}
