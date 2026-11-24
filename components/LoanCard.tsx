import { CalendarDaysIcon } from "lucide-react";
import type { ReactNode } from "react";
import Avatar from "@/components/Avatar";
import { StatusBadge, TrustedBadge } from "@/components/badges";
import { Card } from "@/components/ui/card";
import { describeActivity, formatRange, type LoanActivity } from "@/lib/format";
import { cn, lavenderCard } from "@/lib/utils";
import type { LoanStatus } from "@/convex/lib/validators";

export type LoanCardData = {
  tool: { name: string; removed: boolean };
  counterparty: { firstName: string; trustedLender: boolean };
  status: LoanStatus;
  startDate: string;
  endDate: string;
  isOverdue: boolean;
  activity: LoanActivity[];
};

/**
 * One loan. Reading order: tool + status (what and where it stands), dates and
 * the other person (details), automation activity (history), then actions.
 * `role` is the viewer's side of the loan.
 */
export default function LoanCard({
  loan,
  role,
  actions,
  footer,
}: {
  loan: LoanCardData;
  role: "borrower" | "owner";
  actions?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card
      className={cn(
        lavenderCard,
        "gap-0 py-0 transition-shadow hover:shadow-md",
        loan.isOverdue && "ring-destructive/40",
      )}
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base leading-snug font-semibold tracking-tight">
              {loan.tool.name}
            </h3>
            <StatusBadge status={loan.status} overdue={loan.isOverdue} />
            {loan.tool.removed && (
              <span className="text-xs text-muted-foreground">(listing removed)</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDaysIcon className="size-4 text-primary/70" aria-hidden />
              {formatRange(loan.startDate, loan.endDate)}
            </span>
            <span className="inline-flex items-center gap-2">
              <Avatar name={loan.counterparty.firstName} size="sm" />
              <span>
                {role === "borrower" ? "Lender" : "Borrower"}{" "}
                <span className="font-medium text-foreground">{loan.counterparty.firstName}</span>
              </span>
              {loan.counterparty.trustedLender && role === "borrower" && <TrustedBadge compact />}
            </span>
          </div>

          {footer}
        </div>

        {actions && <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">{actions}</div>}
      </div>

      {loan.activity.length > 0 && <Timeline activity={loan.activity} viewer={role} />}
    </Card>
  );
}

/**
 * Automation updates as a vertical timeline, newest first: a line on the left
 * joins one dot per update. The newest dot is filled; failures are red.
 */
function Timeline({
  activity,
  viewer,
}: {
  activity: LoanActivity[];
  viewer: "owner" | "borrower";
}) {
  return (
    <section className="border-t border-highlight/50 px-5 pt-3 pb-4">
      <h4 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Updates
      </h4>
      {/*
        Each row: a 10px dot (centre 10px from the row top, level with the first
        text line) and, for every row but the last, a 1px connector running from
        this dot's centre to the next dot's centre. The line therefore starts and
        ends exactly on the first and last dots.
      */}
      <ol className="flex flex-col">
        {activity.map((item, i) => {
          const failed = item.status === "failed";
          const isLast = i === activity.length - 1;
          const { text, when } = describeActivity(item, viewer);
          return (
            <li
              key={`${item.kind}-${item.event}-${item.at}`}
              className={cn("relative flex gap-3", !isLast && "pb-4")}
            >
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute top-2.5 -bottom-2.5 left-[4.5px] w-px bg-highlight"
                />
              )}
              <span
                aria-hidden
                className={cn(
                  "relative mt-[5px] size-2.5 shrink-0 rounded-full",
                  failed ? "bg-destructive" : i === 0 ? "bg-primary" : "bg-highlight",
                )}
              />
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-sm leading-5",
                    failed ? "font-medium text-destructive" : i === 0 && "font-medium",
                  )}
                >
                  {text}
                </p>
                <time
                  dateTime={new Date(item.at).toISOString()}
                  title={new Date(item.at).toLocaleString()}
                  className="text-xs text-muted-foreground"
                >
                  {when}
                </time>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
