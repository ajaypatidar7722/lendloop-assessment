import { BadgeCheckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Category, LoanStatus } from "@/convex/lib/validators";

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <Badge variant="secondary" className="font-normal">
      {CATEGORY_LABELS[category]}
    </Badge>
  );
}

export function AvailabilityBadge({ availability }: { availability: "available" | "on_loan" }) {
  return availability === "available" ? (
    <Badge className="bg-success text-success-foreground">Available</Badge>
  ) : (
    <Badge className="bg-muted text-muted-foreground">On loan</Badge>
  );
}

export function TrustedBadge({ className }: { className?: string }) {
  return (
    <Badge
      className={cn("bg-highlight/50 text-brand-deep", className)}
      title="Marked as a Trusted Lender by an admin"
    >
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

export function StatusBadge({ status, overdue }: { status: LoanStatus; overdue?: boolean }) {
  if (overdue) {
    return <Badge className="bg-destructive text-white">Overdue</Badge>;
  }
  return <Badge className={STATUS_STYLES[status]}>{STATUS_LABELS[status]}</Badge>;
}
