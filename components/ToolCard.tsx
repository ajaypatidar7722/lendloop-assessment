import type { ReactNode } from "react";
import { AvailabilityBadge, CategoryBadge, TrustedBadge } from "@/components/badges";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CONDITION_LABELS } from "@/lib/format";
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

export default function ToolCard({ tool, actions }: { tool: ToolCardData; actions?: ReactNode }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={tool.category} />
          <AvailabilityBadge availability={tool.availability} />
        </div>
        <CardTitle className="text-lg">{tool.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 text-sm">
        <p className="text-muted-foreground">
          {tool.description || <span className="italic">No description</span>}
        </p>
        <dl className="mt-auto grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="text-muted-foreground">Condition</dt>
          <dd>{CONDITION_LABELS[tool.condition]}</dd>
          <dt className="text-muted-foreground">Lender</dt>
          <dd className="flex flex-wrap items-center gap-2">
            {tool.isMine ? "You" : tool.owner.firstName}
            {tool.owner.trustedLender && <TrustedBadge />}
          </dd>
        </dl>
      </CardContent>
      {actions && <CardFooter className="gap-2">{actions}</CardFooter>}
    </Card>
  );
}
