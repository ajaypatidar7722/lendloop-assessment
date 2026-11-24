"use client";

import { useQuery } from "convex/react";
import { ArrowDownLeftIcon, ArrowUpRightIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import BorrowingPanel from "./BorrowingPanel";
import LendingPanel from "./LendingPanel";

type Tab = "lending" | "borrowing";

/**
 * Lending (requests on my tools) and Borrowing (my requests) in one place.
 * The tab lives in the URL (?tab=lending|borrowing) so emails and the old
 * /incoming link can open the right one.
 */
export default function RequestsView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab: Tab = params.get("tab") === "borrowing" ? "borrowing" : "lending";
  const counts = useQuery(api.loans.pendingCounts);

  return (
    <>
      <PageHeader
        title="Requests"
        description="Tools you're lending to neighbors and tools you've asked to borrow."
      />
      <Tabs
        value={tab}
        onValueChange={(next) => router.replace(`${pathname}?tab=${next}`, { scroll: false })}
        className="gap-6"
      >
        <TabsList className="h-11 w-full p-1 sm:w-fit">
          <TabsTrigger value="lending" className="px-4">
            <ArrowUpRightIcon aria-hidden /> Lending
            <CountPill count={counts?.incoming} label="waiting for your decision" />
          </TabsTrigger>
          <TabsTrigger value="borrowing" className="px-4">
            <ArrowDownLeftIcon aria-hidden /> Borrowing
            <CountPill count={counts?.myRequests} label="waiting on the lender" />
          </TabsTrigger>
        </TabsList>
        <TabsContent value="lending">
          <LendingPanel pendingCount={counts?.incoming} />
        </TabsContent>
        <TabsContent value="borrowing">
          <BorrowingPanel pendingCount={counts?.myRequests} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function CountPill({ count, label }: { count: number | undefined; label: string }) {
  if (!count) return null;
  return (
    <span
      className="rounded-full bg-primary px-1.5 text-[11px] leading-4 font-semibold text-primary-foreground tabular-nums"
      aria-label={`${count} ${label}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
