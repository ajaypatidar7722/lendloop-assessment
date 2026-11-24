import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-6 text-[10px]",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
};

/** Initials in the brand lavender, the same for everyone. */
export default function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = (
    (words[0]?.[0] ?? "?") + (words.length > 1 ? (words.at(-1)?.[0] ?? "") : "")
  ).toUpperCase();

  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full bg-secondary font-semibold text-primary ring-2 ring-card",
        SIZES[size],
        className,
      )}
    >
      {initials}
    </span>
  );
}
