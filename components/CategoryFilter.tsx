"use client";

import { CATEGORIES, CATEGORY_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Category } from "@/convex/lib/validators";

/** Category chips. `undefined` means "All". */
export default function CategoryFilter({
  value,
  onChange,
}: {
  value: Category | undefined;
  onChange: (value: Category | undefined) => void;
}) {
  const chip = (label: string, selected: boolean, next: Category | undefined) => (
    <button
      key={label}
      type="button"
      aria-pressed={selected}
      onClick={() => onChange(next)}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card hover:border-highlight hover:bg-accent",
      )}
    >
      {label}
    </button>
  );

  return (
    <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
      {chip("All", value === undefined, undefined)}
      {CATEGORIES.map((c) => chip(CATEGORY_LABELS[c], value === c, c))}
    </div>
  );
}
