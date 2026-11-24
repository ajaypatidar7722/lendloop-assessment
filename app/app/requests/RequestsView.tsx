"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import ConfirmButton from "@/components/ConfirmButton";
import EmptyState from "@/components/EmptyState";
import ListSkeleton from "@/components/ListSkeleton";
import LoanCard from "@/components/LoanCard";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { withToast } from "@/lib/errors";
import { formatDay } from "@/lib/format";
import { useToday } from "@/lib/hooks";
import { api } from "@/convex/_generated/api";

export default function RequestsView() {
  const today = useToday();
  const loans = useQuery(api.loans.myRequests, today ? { today } : "skip");
  const cancel = useMutation(api.loans.cancel);

  return (
    <>
      <PageHeader title="My requests" description="Things you've asked to borrow." />
      {loans === undefined ? (
        <ListSkeleton rows={4} />
      ) : loans.length === 0 ? (
        <EmptyState
          title="No requests yet"
          description="Find something you need and pick the dates."
          action={
            <Button asChild>
              <Link href="/app/tools">Browse tools</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {loans.map((loan) => (
            <LoanCard
              key={loan._id}
              loan={loan}
              role="borrower"
              footer={
                loan.isOverdue ? (
                  <p className="text-sm text-destructive">
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
    </>
  );
}
