import { BadgeCheckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CATEGORY_LABELS, CONDITION_LABELS, STATUS_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Category, Condition, LoanStatus } from "@/convex/lib/validators";

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <Badge variant="secondary" className="font-normal">
      {CATEGORY_LABELS[category]}
    </Badge>
  );
}

export function ConditionBadge({ condition }: { condition: Condition }) {
  return (
    <Badge variant="outline" className="font-normal text-muted-foreground">
      {CONDITION_LABELS[condition]}
    </Badge>
  );
}

export function AvailabilityBadge({ availability }: { availability: "available" | "on_loan" }) {
  return availability === "available" ? (
    <Badge className="bg-success text-success-foreground">Available</Badge>
  ) : (
    <Badge className="bg-warning text-warning-foreground">On loan</Badge>
  );
}

/** Full badge, or `compact` for a check icon with an accessible label. */
export function TrustedBadge({ className, compact }: { className?: string; compact?: boolean }) {
  const title = "Marked as a Trusted Lender by an admin";
  if (compact) {
    // A real button so the tooltip also opens on keyboard focus and on tap.
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Trusted Lender"
            className={cn(
              "inline-flex rounded-full text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              className,
            )}
          >
            <BadgeCheckIcon className="size-4" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent>Trusted Lender</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Badge className={cn("bg-highlight/50 text-brand-deep", className)} title={title}>
      <BadgeCheckIcon data-icon="inline-start" />
      Trusted Lender
    </Badge>
  );
}

const STATUS_STYLES: Record<LoanStatus, string> = {
  pending: "bg-warning text-warning-foreground",
  approved: "bg-success text-success-foreground",
  declined: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
  returned: "bg-secondary text-secondary-foreground",
};

/** Dot colours for status filters: status is the one place colour carries meaning. */
export const STATUS_DOTS: Record<LoanStatus, string> = {
  pending: "bg-amber-500",
  approved: "bg-emerald-500",
  declined: "bg-red-500",
  cancelled: "bg-slate-400",
  returned: "bg-indigo-500",
};

export function StatusBadge({ status, overdue }: { status: LoanStatus; overdue?: boolean }) {
  if (overdue) {
    return <Badge className="bg-destructive text-white">Overdue</Badge>;
  }
  return <Badge className={STATUS_STYLES[status]}>{STATUS_LABELS[status]}</Badge>;
}
