"use client";

import { useMutation, usePaginatedQuery } from "convex/react";
import { useState } from "react";
import ConfirmButton from "@/components/ConfirmButton";
import EmptyState from "@/components/EmptyState";
import ListSkeleton from "@/components/ListSkeleton";
import LoanCard from "@/components/LoanCard";
import InfiniteScroll from "@/components/InfiniteScroll";
import StatusFilter from "@/components/StatusFilter";
import { Button } from "@/components/ui/button";
import { withToast } from "@/lib/errors";
import { STATUS_LABELS } from "@/lib/format";
import { useToday } from "@/lib/hooks";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { LoanStatus } from "@/convex/lib/validators";

const PAGE_SIZE = 8;

/** Requests on my tools: approve, decline, mark returned. */
export default function LendingPanel({ pendingCount }: { pendingCount?: number }) {
  const today = useToday();
  const [status, setStatus] = useState<LoanStatus | undefined>();
  const loans = usePaginatedQuery(api.loans.incoming, today ? { today, status } : "skip", {
    initialNumItems: PAGE_SIZE,
  });
  const approve = useMutation(api.loans.approve);
  const decline = useMutation(api.loans.decline);
  const markReturned = useMutation(api.loans.markReturned);
  const [busyId, setBusyId] = useState<Id<"loans"> | null>(null);

  async function run(loanId: Id<"loans">, action: () => Promise<unknown>, success: string) {
    setBusyId(loanId);
    await withToast(action, success);
    setBusyId(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <StatusFilter value={status} onChange={setStatus} pendingCount={pendingCount} />
        <p className="text-xs text-muted-foreground">
          Approving a request automatically declines other requests for overlapping dates.
        </p>
      </div>

      {loans.status === "LoadingFirstPage" ? (
        <ListSkeleton rows={4} />
      ) : loans.results.length === 0 ? (
        <EmptyState
          title={status ? `No ${STATUS_LABELS[status].toLowerCase()} requests` : "No requests yet"}
          description="When a neighbor asks to borrow one of your tools, it shows up here."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {loans.results.map((loan) => (
            <LoanCard
              key={loan._id}
              loan={loan}
              role="owner"
              actions={
                loan.status === "pending" ? (
                  <>
                    <ConfirmButton
                      variant="outline"
                      title="Decline this request?"
                      description={`${loan.counterparty.firstName} will be notified.`}
                      confirmLabel="Decline"
                      onConfirm={() =>
                        run(loan._id, () => decline({ loanId: loan._id }), "Request declined.")
                      }
                    >
                      Decline
                    </ConfirmButton>
                    <Button
                      size="sm"
                      disabled={busyId === loan._id}
                      onClick={() =>
                        run(
                          loan._id,
                          () => approve({ loanId: loan._id }),
                          "Approved. The borrower will be notified.",
                        )
                      }
                    >
                      Approve
                    </Button>
                  </>
                ) : loan.status === "approved" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyId === loan._id}
                    onClick={() =>
                      run(loan._id, () => markReturned({ loanId: loan._id }), "Marked as returned.")
                    }
                  >
                    Mark returned
                  </Button>
                ) : null
              }
            />
          ))}
        </div>
      )}
      <InfiniteScroll list={loans} pageSize={PAGE_SIZE} />
    </div>
  );
}
