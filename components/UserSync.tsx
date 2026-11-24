"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";

/**
 * Once Convex has verified the Clerk token, make sure the caller has a users
 * row (created with role "user"). Runs once per sign-in; renders nothing.
 */
export default function UserSync() {
  const { isAuthenticated } = useConvexAuth();
  const store = useMutation(api.users.store);

  useEffect(() => {
    if (!isAuthenticated) return;
    store().catch((error: unknown) => console.error("Failed to store user", error));
  }, [isAuthenticated, store]);

  return null;
}
