"use client";

import { useMutation } from "convex/react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { withToast } from "@/lib/errors";
import { CATEGORIES, CATEGORY_LABELS, CONDITION_LABELS, CONDITIONS } from "@/lib/format";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { Category, Condition } from "@/convex/lib/validators";

export type ToolFormValues = {
  name: string;
  category: Category;
  condition: Condition;
  description: string;
};

const EMPTY: ToolFormValues = {
  name: "",
  category: "power_tools",
  condition: "good",
  description: "",
};

/**
 * Create a listing, or edit one when `toolId` + `initial` are given.
 * Limits mirror the server (name 2–80, description ≤ 500); the server re-validates.
 */
export default function ToolFormDialog({
  trigger,
  toolId,
  initial,
}: {
  trigger: ReactNode;
  toolId?: Id<"tools">;
  initial?: ToolFormValues;
}) {
  const create = useMutation(api.tools.create);
  const update = useMutation(api.tools.update);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<ToolFormValues>(initial ?? EMPTY);
  const [busy, setBusy] = useState(false);
  const editing = toolId !== undefined;

  const set = <K extends keyof ToolFormValues>(key: K, value: ToolFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const ok = await withToast(
      () => (editing ? update({ toolId, ...values }) : create(values)),
      editing ? "Listing updated." : "Tool listed. Neighbors can now request it.",
    );
    setBusy(false);
    if (ok) {
      setOpen(false);
      if (!editing) setValues(EMPTY);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setValues(initial ?? EMPTY);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit listing" : "List a tool"}</DialogTitle>
            <DialogDescription>
              Other signed-in neighbors see the name, category, condition, description and your
              first name. Visitors who aren&apos;t signed in only see the name and category.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tool-name">Name</Label>
            <Input
              id="tool-name"
              required
              minLength={2}
              maxLength={80}
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Cordless drill"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="tool-category">Category</Label>
              <Select value={values.category} onValueChange={(v) => set("category", v as Category)}>
                <SelectTrigger id="tool-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tool-condition">Condition</Label>
              <Select
                value={values.condition}
                onValueChange={(v) => set("condition", v as Condition)}
              >
                <SelectTrigger id="tool-condition" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CONDITION_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tool-description">Short description</Label>
            <Textarea
              id="tool-description"
              maxLength={500}
              rows={3}
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What's included, any quirks, pickup notes…"
            />
            <p className="text-right text-xs text-muted-foreground">
              {values.description.length}/500
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : editing ? "Save changes" : "List tool"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
