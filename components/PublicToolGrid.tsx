"use client";

import { usePaginatedQuery } from "convex/react";
import { Loader2Icon, WrenchIcon } from "lucide-react";
import { useEffect } from "react";
import { CategoryBadge } from "@/components/badges";
import EmptyState from "@/components/EmptyState";
import ListSkeleton from "@/components/ListSkeleton";
import { api } from "@/convex/_generated/api";

const PAGE_SIZE = 12;

/**
 * Read-only, signed-out view: tool name and category only (no owner details).
 * Shows every tool: after each page arrives, the next one is requested
 * automatically until the list is exhausted, with a spinner meanwhile.
 */
export default function PublicToolGrid() {
  const tools = usePaginatedQuery(api.tools.listPublic, {}, { initialNumItems: PAGE_SIZE });
  const { status, loadMore } = tools;

  useEffect(() => {
    if (status === "CanLoadMore") loadMore(PAGE_SIZE);
  }, [status, loadMore]);

  if (tools.status === "LoadingFirstPage") return <ListSkeleton grid rows={6} />;
  if (tools.results.length === 0) {
    return <EmptyState title="No tools listed yet" description="Be the first to lend something." />;
  }

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tools.results.map((tool) => (
          <li
            key={tool._id}
            className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-xs"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
              <WrenchIcon className="size-4" aria-hidden />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="truncate font-medium">{tool.name}</span>
              <CategoryBadge category={tool.category} />
            </div>
          </li>
        ))}
      </ul>
      {(status === "CanLoadMore" || status === "LoadingMore") && (
        <p
          className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground"
          aria-live="polite"
        >
          <Loader2Icon className="size-4 animate-spin" aria-hidden /> Loading more tools…
        </p>
      )}
    </>
  );
}
