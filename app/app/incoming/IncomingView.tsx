"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import ConfirmButton from "@/components/ConfirmButton";
import EmptyState from "@/components/EmptyState";
import ListSkeleton from "@/components/ListSkeleton";
import LoanCard from "@/components/LoanCard";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { withToast } from "@/lib/errors";
import { useToday } from "@/lib/hooks";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function IncomingView() {
  const today = useToday();
  const loans = useQuery(api.loans.incoming, today ? { today } : "skip");
  const approve = useMutation(api.loans.approve);
  const decline = useMutation(api.loans.decline);
  const markReturned = useMutation(api.loans.markReturned);
  const [busyId, setBusyId] = useState<Id<"loans"> | null>(null);

  async function run(loanId: Id<"loans">, action: () => Promise<unknown>, success: string) {
    setBusyId(loanId);
    await withToast(action, success);
    setBusyId(null);
  }

  if (loans === undefined) {
    return (
      <>
        <PageHeader title="Incoming requests" />
        <ListSkeleton rows={4} />
      </>
    );
  }

  const pending = loans.filter((l) => l.status === "pending");
  const active = loans.filter((l) => l.status === "approved");
  const history = loans.filter((l) => l.status !== "pending" && l.status !== "approved");

  return (
    <>
      <PageHeader
        title="Incoming requests"
        description="Requests to borrow your tools. Approving one declines any other request for overlapping dates."
      />

      {loans.length === 0 && (
        <EmptyState
          title="No requests yet"
          description="When a neighbor asks to borrow one of your tools, it shows up here."
        />
      )}

      <Section title="Waiting for you" count={pending.length}>
        {pending.map((loan) => (
          <LoanCard
            key={loan._id}
            loan={loan}
            role="owner"
            actions={
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
            }
          />
        ))}
      </Section>

      <Section title="Currently lent out" count={active.length}>
        {active.map((loan) => (
          <LoanCard
            key={loan._id}
            loan={loan}
            role="owner"
            actions={
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
            }
          />
        ))}
      </Section>

      <Section title="History" count={history.length}>
        {history.map((loan) => (
          <LoanCard key={loan._id} loan={loan} role="owner" />
        ))}
      </Section>
    </>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">
        {title} <span className="text-foreground">({count})</span>
      </h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}
