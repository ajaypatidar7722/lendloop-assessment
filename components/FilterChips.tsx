"use client";

import { cn } from "@/lib/utils";

export type ChipOption<T extends string> = {
  value: T | undefined;
  label: string;
  /** Tailwind background class for a small colour dot. */
  dot?: string;
  /** Optional count shown in a pill, e.g. pending requests. */
  count?: number;
};

/** A row of toggle chips. `undefined` is the "All" option. */
export default function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ChipOption<T>[];
  value: T | undefined;
  onChange: (value: T | undefined) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.label}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card text-foreground/80 hover:border-highlight hover:bg-accent hover:text-foreground",
            )}
          >
            {option.dot && (
              <span
                aria-hidden
                className={cn(
                  "size-2 rounded-full",
                  option.dot,
                  selected && "ring-2 ring-white/60",
                )}
              />
            )}
            {option.label}
            {option.count !== undefined && option.count > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[11px] leading-4 tabular-nums",
                  selected ? "bg-white/25" : "bg-primary text-primary-foreground",
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
