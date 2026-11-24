"use client";

import { usePaginatedQuery } from "convex/react";
import { ClockIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import CategoryFilter from "@/components/CategoryFilter";
import EmptyState from "@/components/EmptyState";
import ListSkeleton from "@/components/ListSkeleton";
import PageHeader from "@/components/PageHeader";
import InfiniteScroll from "@/components/InfiniteScroll";
import RequestDialog from "@/components/RequestDialog";
import ToolCard from "@/components/ToolCard";
import ToolFormDialog from "@/components/ToolFormDialog";
import { Button } from "@/components/ui/button";
import { useToday } from "@/lib/hooks";
import { api } from "@/convex/_generated/api";
import type { Category } from "@/convex/lib/validators";

const PAGE_SIZE = 12;

export default function ToolsView() {
  const today = useToday();
  const [category, setCategory] = useState<Category | undefined>();
  const tools = usePaginatedQuery(api.tools.list, today ? { today, category } : "skip", {
    initialNumItems: PAGE_SIZE,
  });

  return (
    <>
      <PageHeader
        title="Tools"
        description="Everything your neighbors are lending. A tool that's on loan can be requested again once it's returned."
        action={
          <ToolFormDialog
            trigger={
              <Button size="lg" className="shadow-sm">
                <PlusIcon data-icon="inline-start" /> List a tool
              </Button>
            }
          />
        }
      />
      <div className="mb-6">
        <CategoryFilter value={category} onChange={setCategory} />
      </div>
      {tools.status === "LoadingFirstPage" ? (
        <ListSkeleton grid />
      ) : tools.results.length === 0 ? (
        <EmptyState
          title={category ? "Nothing in this category yet" : "No tools listed yet"}
          description="Have something in the garage? List it so a neighbor can borrow it."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tools.results.map((tool) => (
            <ToolCard
              key={tool._id}
              tool={tool}
              actions={
                tool.isMine ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href="/listings">Manage</Link>
                  </Button>
                ) : tool.requestPending ? (
                  // One pending request per tool: point to it instead of offering another.
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/requests?tab=borrowing">
                      <ClockIcon data-icon="inline-start" /> Request pending
                    </Link>
                  </Button>
                ) : tool.availability === "on_loan" ? (
                  // Someone has it now; requests reopen when it's marked returned.
                  <Button variant="secondary" size="sm" disabled>
                    Available after return
                  </Button>
                ) : (
                  <RequestDialog toolId={tool._id} toolName={tool.name} />
                )
              }
            />
          ))}
        </div>
      )}
      <InfiniteScroll list={tools} pageSize={PAGE_SIZE} />
    </>
  );
}
