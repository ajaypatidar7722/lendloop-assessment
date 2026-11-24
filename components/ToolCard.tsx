import type { ReactNode } from "react";
import Avatar from "@/components/Avatar";
import { AvailabilityBadge, TrustedBadge } from "@/components/badges";
import { Card } from "@/components/ui/card";
import { CATEGORY_LABELS, CONDITION_LABELS } from "@/lib/format";
import { cn, lavenderCard } from "@/lib/utils";
import type { Category, Condition } from "@/convex/lib/validators";

export type ToolCardData = {
  name: string;
  category: Category;
  condition: Condition;
  description: string;
  owner: { firstName: string; trustedLender: boolean };
  isMine: boolean;
  availability: "available" | "on_loan";
};

/**
 * A listing. Reading order: category and availability (scan), name (largest
 * text), description and condition (details), then one footer row with who
 * lends it on the left and what you can do on the right.
 */
export default function ToolCard({ tool, actions }: { tool: ToolCardData; actions?: ReactNode }) {
  return (
    <Card
      className={cn(
        lavenderCard,
        "h-full gap-0 py-0 transition-all duration-200 hover:shadow-md hover:ring-primary/30",
      )}
    >
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {CATEGORY_LABELS[tool.category]}
          </p>
          <AvailabilityBadge availability={tool.availability} />
        </div>

        <h3 className="mt-2 text-lg leading-snug font-semibold tracking-tight">{tool.name}</h3>

        {/* Fixed two-line area so cards in a row line up whatever the text length. */}
        <p
          className={cn(
            "mt-1.5 line-clamp-2 min-h-10 text-sm leading-5",
            tool.description ? "text-muted-foreground" : "text-muted-foreground/60",
          )}
        >
          {tool.description || "No description provided."}
        </p>

        <p className="mt-4 text-sm text-muted-foreground">
          Condition{" "}
          <span className="font-medium text-foreground">{CONDITION_LABELS[tool.condition]}</span>
        </p>
      </div>

      <div className="flex min-h-14 items-center justify-between gap-3 border-t border-highlight/50 px-5 py-3">
        {tool.isMine ? (
          <span className="text-sm text-muted-foreground">Listed by you</span>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <Avatar name={tool.owner.firstName} size="sm" />
            <span className="truncate text-sm font-medium">{tool.owner.firstName}</span>
            {tool.owner.trustedLender && <TrustedBadge compact />}
          </div>
        )}
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </Card>
  );
}
