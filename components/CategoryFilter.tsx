"use client";

import FilterChips, { type ChipOption } from "@/components/FilterChips";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/format";
import type { Category } from "@/convex/lib/validators";

const OPTIONS: ChipOption<Category>[] = [
  { value: undefined, label: "All" },
  ...CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] })),
];

/** Category chips. `undefined` means "All". */
export default function CategoryFilter({
  value,
  onChange,
}: {
  value: Category | undefined;
  onChange: (value: Category | undefined) => void;
}) {
  return (
    <FilterChips label="Filter by category" options={OPTIONS} value={value} onChange={onChange} />
  );
}
