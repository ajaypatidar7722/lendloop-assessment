"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import CategoryFilter from "@/components/CategoryFilter";
import EmptyState from "@/components/EmptyState";
import ListSkeleton from "@/components/ListSkeleton";
import PageHeader from "@/components/PageHeader";
import RequestDialog from "@/components/RequestDialog";
import ToolCard from "@/components/ToolCard";
import { Button } from "@/components/ui/button";
import { useToday } from "@/lib/hooks";
import { api } from "@/convex/_generated/api";
import type { Category } from "@/convex/lib/validators";

export default function ToolsView() {
  const today = useToday();
  const [category, setCategory] = useState<Category | undefined>();
  const tools = useQuery(api.tools.list, today ? { today, category } : "skip");

  return (
    <>
      <PageHeader
        title="Tools"
        description="Everything your neighbors are lending. Tools on loan can still be requested for later dates."
        action={
          <Button asChild variant="outline">
            <Link href="/app/listings">List a tool</Link>
          </Button>
        }
      />
      <div className="mb-6">
        <CategoryFilter value={category} onChange={setCategory} />
      </div>
      {tools === undefined ? (
        <ListSkeleton grid />
      ) : tools.length === 0 ? (
        <EmptyState
          title={category ? "Nothing in this category yet" : "No tools listed yet"}
          description="Have something in the garage? List it so a neighbor can borrow it."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <ToolCard
              key={tool._id}
              tool={tool}
              actions={
                tool.isMine ? (
                  <span className="text-sm text-muted-foreground">Your listing</span>
                ) : (
                  <RequestDialog toolId={tool._id} toolName={tool.name} />
                )
              }
            />
          ))}
        </div>
      )}
    </>
  );
}
