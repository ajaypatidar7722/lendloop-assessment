"use client";

import { useMutation, usePaginatedQuery } from "convex/react";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import ConfirmButton from "@/components/ConfirmButton";
import EmptyState from "@/components/EmptyState";
import ListSkeleton from "@/components/ListSkeleton";
import PageHeader from "@/components/PageHeader";
import InfiniteScroll from "@/components/InfiniteScroll";
import ToolCard from "@/components/ToolCard";
import ToolFormDialog from "@/components/ToolFormDialog";
import { Button } from "@/components/ui/button";
import { withToast } from "@/lib/errors";
import { useToday } from "@/lib/hooks";
import { api } from "@/convex/_generated/api";

const PAGE_SIZE = 12;

export default function ListingsView() {
  const today = useToday();
  const tools = usePaginatedQuery(api.tools.myListings, today ? { today } : "skip", {
    initialNumItems: PAGE_SIZE,
  });
  const remove = useMutation(api.tools.remove);

  const addButton = (
    <ToolFormDialog
      trigger={
        <Button size="lg" className="shadow-sm">
          <PlusIcon data-icon="inline-start" /> List a tool
        </Button>
      }
    />
  );

  return (
    <>
      <PageHeader
        title="My listings"
        description="Tools you're lending. You approve every request."
        action={addButton}
      />
      {tools.status === "LoadingFirstPage" ? (
        <ListSkeleton grid rows={3} />
      ) : tools.results.length === 0 ? (
        <EmptyState
          title="You haven't listed anything yet"
          description="A drill, a ladder, a camping stove: whatever you can spare for a few days."
          action={addButton}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tools.results.map((tool) => (
            <ToolCard
              key={tool._id}
              tool={tool}
              actions={
                <>
                  <ToolFormDialog
                    toolId={tool._id}
                    initial={{
                      name: tool.name,
                      category: tool.category,
                      condition: tool.condition,
                      description: tool.description,
                    }}
                    trigger={
                      <Button variant="outline" size="sm">
                        <PencilIcon data-icon="inline-start" /> Edit
                      </Button>
                    }
                  />
                  <ConfirmButton
                    title={`Remove "${tool.name}"?`}
                    description="It disappears from the board and any pending requests are declined. You can't remove a tool while it has an approved loan."
                    confirmLabel="Remove listing"
                    onConfirm={() =>
                      withToast(() => remove({ toolId: tool._id }), "Listing removed.")
                    }
                  >
                    <Trash2Icon data-icon="inline-start" /> Remove
                  </ConfirmButton>
                </>
              }
            />
          ))}
        </div>
      )}
      <InfiniteScroll list={tools} pageSize={PAGE_SIZE} />
    </>
  );
}
