import { BellIcon, TriangleAlertIcon } from "lucide-react";
import type { ReactNode } from "react";
import { StatusBadge, TrustedBadge } from "@/components/badges";
import { Card, CardContent } from "@/components/ui/card";
import { describeActivity, formatRange, type LoanActivity } from "@/lib/format";
import { cn } from "@/lib/utils";
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

/** One loan as a row-like card. `role` decides how the other person is described. */
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
    <Card className="py-4">
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">
              {loan.tool.name}
              {loan.tool.removed && (
                <span className="ml-1 text-xs text-muted-foreground">(listing removed)</span>
              )}
            </span>
            <StatusBadge status={loan.status} overdue={loan.isOverdue} />
          </div>
          <p className="text-sm text-muted-foreground">
            {formatRange(loan.startDate, loan.endDate)} ·{" "}
            {role === "borrower" ? "from" : "requested by"}{" "}
            <span className="text-foreground">{loan.counterparty.firstName}</span>
            {loan.counterparty.trustedLender && role === "borrower" && (
              <TrustedBadge className="ml-2 align-middle" />
            )}
          </p>
          {loan.activity.length > 0 && (
            <ul aria-label="Automation activity" className="flex flex-col gap-0.5 pt-1">
              {loan.activity.map((item) => {
                const Icon = item.status === "failed" ? TriangleAlertIcon : BellIcon;
                return (
                  <li
                    key={`${item.kind}-${item.event}-${item.at}`}
                    className={cn(
                      "flex items-center gap-1.5 text-xs",
                      item.status === "failed" ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    <Icon className="size-3 shrink-0" aria-hidden />
                    {describeActivity(item, role)}
                  </li>
                );
              })}
            </ul>
          )}
          {footer}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </CardContent>
    </Card>
  );
}
