"use client";

import { useQuery } from "convex/react";
import { useSyncExternalStore } from "react";
import { api } from "@/convex/_generated/api";

const noSubscribe = () => () => {};

/**
 * Today's date in UTC ("YYYY-MM-DD"), or null during server prerender.
 * Convex queries can't read the clock, so pages pass this in as an argument.
 * Reading it client-side only keeps the prerendered shell free of `new Date()`.
 */
export function useToday(): string | null {
  return useSyncExternalStore(
    noSubscribe,
    () => new Date().toISOString().slice(0, 10),
    () => null,
  );
}

/** The signed-in user's profile (undefined while loading, null if not stored yet). */
export function useMe() {
  return useQuery(api.users.me);
}
