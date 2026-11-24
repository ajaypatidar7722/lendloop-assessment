"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { withToast } from "@/lib/errors";
import { formatRange, fromIsoDate, MAX_LOAN_DAYS, toIsoDate } from "@/lib/format";
import { useToday } from "@/lib/hooks";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Pick a date range and send a borrow request. The calendar blocks past days and
 * ranges over 30 days; the server re-checks those plus overlaps with booked dates.
 */
export default function RequestDialog({
  toolId,
  toolName,
}: {
  toolId: Id<"tools">;
  toolName: string;
}) {
  const today = useToday();
  const request = useMutation(api.loans.request);
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>();
  const [busy, setBusy] = useState(false);

  const start = range?.from ? toIsoDate(range.from) : null;
  const end = range?.to ? toIsoDate(range.to) : start;

  async function submit() {
    if (!start || !end) return;
    setBusy(true);
    const ok = await withToast(
      () => request({ toolId, startDate: start, endDate: end }),
      `Request sent for ${toolName}. The owner will be notified.`,
    );
    setBusy(false);
    if (ok) {
      setOpen(false);
      setRange(undefined);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Request to borrow</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-fit">
        <DialogHeader>
          <DialogTitle>Borrow {toolName}</DialogTitle>
          <DialogDescription>
            Pick the first and last day you need it (up to {MAX_LOAN_DAYS} days).
          </DialogDescription>
        </DialogHeader>
        {today && (
          <Calendar
            mode="range"
            selected={range}
            onSelect={setRange}
            disabled={{ before: fromIsoDate(today) }}
            max={MAX_LOAN_DAYS - 1}
            defaultMonth={fromIsoDate(today)}
            className="mx-auto rounded-lg border"
          />
        )}
        <p className="min-h-5 text-center text-sm text-muted-foreground" aria-live="polite">
          {start && end ? formatRange(start, end) : "No dates selected"}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!start || busy}>
            {busy ? "Sending…" : "Send request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
