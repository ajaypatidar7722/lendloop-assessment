"use client";

import { useConvexAuth } from "convex/react";
import type { ReactNode } from "react";
import EmptyState from "@/components/EmptyState";
import ListSkeleton from "@/components/ListSkeleton";
import { useMe } from "@/lib/hooks";

/**
 * Renders children only once Convex has verified the token AND the users row
 * exists (UserSync creates it right after sign-in). Without this, the first
 * render after sign-up would call authed queries before the row exists.
 * With `admin`, also requires role "admin". The server enforces both anyway.
 */
export default function RequireUser({
  children,
  admin = false,
}: {
  children: ReactNode;
  admin?: boolean;
}) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const me = useMe();

  if (!isLoading && !isAuthenticated) {
    return <EmptyState title="Please sign in" description="Sign in to lend or borrow tools." />;
  }
  if (isLoading || !me) return <ListSkeleton />;
  if (admin && me.role !== "admin") {
    return (
      <EmptyState
        title="Admins only"
        description="You don't have access to this page. Ask an admin if you think you should."
      />
    );
  }
  return <>{children}</>;
}
