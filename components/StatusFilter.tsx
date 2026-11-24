"use client";

import FilterChips, { type ChipOption } from "@/components/FilterChips";
import { STATUS_DOTS } from "@/components/badges";
import { STATUS_LABELS } from "@/lib/format";
import type { LoanStatus } from "@/convex/lib/validators";

const STATUSES = Object.keys(STATUS_LABELS) as LoanStatus[];

/** Loan status chips. `undefined` means "All"; `pendingCount` badges the Pending chip. */
export default function StatusFilter({
  value,
  onChange,
  pendingCount,
}: {
  value: LoanStatus | undefined;
  onChange: (value: LoanStatus | undefined) => void;
  pendingCount?: number;
}) {
  const options: ChipOption<LoanStatus>[] = [
    { value: undefined, label: "All" },
    ...STATUSES.map((s) => ({
      value: s,
      label: STATUS_LABELS[s],
      dot: STATUS_DOTS[s],
      count: s === "pending" ? pendingCount : undefined,
    })),
  ];
  return (
    <FilterChips label="Filter by status" options={options} value={value} onChange={onChange} />
  );
}
