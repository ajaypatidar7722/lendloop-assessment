"use client";

import { useQuery } from "convex/react";
import { WrenchIcon } from "lucide-react";
import { CategoryBadge } from "@/components/badges";
import EmptyState from "@/components/EmptyState";
import ListSkeleton from "@/components/ListSkeleton";
import { api } from "@/convex/_generated/api";

/** Read-only, signed-out view: tool name and category only (no owner details). */
export default function PublicToolGrid() {
  const tools = useQuery(api.tools.listPublic);

  if (tools === undefined) return <ListSkeleton grid rows={6} />;
  if (tools.length === 0) {
    return <EmptyState title="No tools listed yet" description="Be the first to lend something." />;
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((tool) => (
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
  );
}
