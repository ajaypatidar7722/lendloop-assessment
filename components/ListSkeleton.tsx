import { Skeleton } from "@/components/ui/skeleton";

export default function ListSkeleton({
  rows = 6,
  grid = false,
}: {
  rows?: number;
  grid?: boolean;
}) {
  return (
    <div className={grid ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-3"}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={grid ? "h-44 rounded-xl" : "h-20 rounded-xl"} />
      ))}
    </div>
  );
}
