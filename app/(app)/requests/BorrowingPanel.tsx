"use client";

import { useMutation, usePaginatedQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import ConfirmButton from "@/components/ConfirmButton";
import EmptyState from "@/components/EmptyState";
import ListSkeleton from "@/components/ListSkeleton";
import LoanCard from "@/components/LoanCard";
import InfiniteScroll from "@/components/InfiniteScroll";
import StatusFilter from "@/components/StatusFilter";
import { Button } from "@/components/ui/button";
import { withToast } from "@/lib/errors";
import { formatDay, STATUS_LABELS } from "@/lib/format";
import { useToday } from "@/lib/hooks";
import { api } from "@/convex/_generated/api";
import type { LoanStatus } from "@/convex/lib/validators";

const PAGE_SIZE = 8;

/** Things I've asked to borrow: cancel while pending, see overdue reminders. */
export default function BorrowingPanel({ pendingCount }: { pendingCount?: number }) {
  const today = useToday();
  const [status, setStatus] = useState<LoanStatus | undefined>();
  const loans = usePaginatedQuery(api.loans.myRequests, today ? { today, status } : "skip", {
    initialNumItems: PAGE_SIZE,
  });
  const cancel = useMutation(api.loans.cancel);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <StatusFilter value={status} onChange={setStatus} pendingCount={pendingCount} />
      </div>

      {loans.status === "LoadingFirstPage" ? (
        <ListSkeleton rows={4} />
      ) : loans.results.length === 0 ? (
        <EmptyState
          title={status ? `No ${STATUS_LABELS[status].toLowerCase()} requests` : "No requests yet"}
          description="Find something you need and pick the dates."
          action={
            <Button asChild>
              <Link href="/tools">Browse tools</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {loans.results.map((loan) => (
            <LoanCard
              key={loan._id}
              loan={loan}
              role="borrower"
              footer={
                loan.isOverdue ? (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    This was due back on {formatDay(loan.endDate)}. Please return it to{" "}
                    {loan.counterparty.firstName}.
                  </p>
                ) : null
              }
              actions={
                loan.status === "pending" ? (
                  <ConfirmButton
                    variant="outline"
                    title="Cancel this request?"
                    description={`${loan.counterparty.firstName} won't be able to approve it anymore.`}
                    confirmLabel="Cancel request"
                    onConfirm={() =>
                      withToast(() => cancel({ loanId: loan._id }), "Request cancelled.")
                    }
                  >
                    Cancel
                  </ConfirmButton>
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
