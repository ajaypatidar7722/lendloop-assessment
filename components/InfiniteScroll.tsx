"use client";

import type { PaginationStatus } from "convex/react";
import { Loader2Icon } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

/**
 * Infinite scroll for a usePaginatedQuery list: an invisible marker below the
 * list loads the next page when it comes within ~400px of the viewport.
 *
 * A new observer is created whenever the status changes, so if a page was too
 * short to push the marker out of view, the next page loads straight away.
 * The "Load more" button is the fallback for keyboard and assistive-tech users.
 */
export default function InfiniteScroll({
  list,
  pageSize,
}: {
  list: { status: PaginationStatus; loadMore: (numItems: number) => void; results: unknown[] };
  pageSize: number;
}) {
  const marker = useRef<HTMLDivElement>(null);
  const { status, loadMore } = list;

  useEffect(() => {
    const el = marker.current;
    if (!el || status !== "CanLoadMore") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore(pageSize);
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [status, loadMore, pageSize]);

  if (status === "LoadingFirstPage") return null;

  return (
    <div ref={marker} className="mt-6 flex min-h-10 items-center justify-center" aria-live="polite">
      {status === "LoadingMore" && (
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" aria-hidden /> Loading more…
        </span>
      )}
      {status === "CanLoadMore" && (
        <Button variant="ghost" size="sm" onClick={() => loadMore(pageSize)}>
          Load more
        </Button>
      )}
      {status === "Exhausted" && list.results.length > pageSize && (
        <span className="text-xs text-muted-foreground">You&apos;ve reached the end</span>
      )}
    </div>
  );
}
