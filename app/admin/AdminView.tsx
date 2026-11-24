"use client";

import { useMutation, usePaginatedQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { ClipboardListIcon, ShieldCheckIcon, UsersIcon, WrenchIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import Avatar from "@/components/Avatar";
import {
  AvailabilityBadge,
  CategoryBadge,
  ConditionBadge,
  StatusBadge,
  TrustedBadge,
} from "@/components/badges";
import CategoryFilter from "@/components/CategoryFilter";
import ConfirmButton from "@/components/ConfirmButton";
import EmptyState from "@/components/EmptyState";
import ListSkeleton from "@/components/ListSkeleton";
import PageHeader from "@/components/PageHeader";
import InfiniteScroll from "@/components/InfiniteScroll";
import StatusFilter from "@/components/StatusFilter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { withToast } from "@/lib/errors";
import { formatRange } from "@/lib/format";
import { useMe, useToday } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import type { Category, LoanStatus } from "@/convex/lib/validators";

const PAGE_SIZE = 10;

export default function AdminView() {
  return (
    <>
      <PageHeader
        title="Admin"
        description="Every loan, listing moderation and Trusted Lender badges."
      />
      <Tabs defaultValue="loans" className="gap-5">
        <TabsList className="h-11 w-full p-1 sm:w-fit">
          <TabsTrigger value="loans" className="px-4">
            <ClipboardListIcon aria-hidden /> Loans
          </TabsTrigger>
          <TabsTrigger value="listings" className="px-4">
            <WrenchIcon aria-hidden /> Listings
          </TabsTrigger>
          <TabsTrigger value="users" className="px-4">
            <UsersIcon aria-hidden /> Users
          </TabsTrigger>
        </TabsList>
        <TabsContent value="loans">
          <LoansTab />
        </TabsContent>
        <TabsContent value="listings">
          <ListingsTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
      </Tabs>
    </>
  );
}

// ── Shared table bits ────────────────────────────────────────────────────────

function TablePanel({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-xl border bg-card shadow-xs">{children}</div>;
}

function Head({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <TableHead
      className={cn(
        "h-10 bg-muted/60 text-xs font-semibold tracking-wide text-muted-foreground uppercase",
        className,
      )}
    >
      {children}
    </TableHead>
  );
}

function Person({ name, email }: { name: string; email: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar name={name} />
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{name}</span>
        {email && <span className="truncate text-xs text-muted-foreground">{email}</span>}
      </div>
    </div>
  );
}

function Ago({ at }: { at: number }) {
  return (
    <span className="text-muted-foreground" title={new Date(at).toLocaleString()}>
      {formatDistanceToNow(at, { addSuffix: true })}
    </span>
  );
}

// ── Loans ────────────────────────────────────────────────────────────────────

function LoansTab() {
  const today = useToday();
  const [status, setStatus] = useState<LoanStatus | undefined>();
  const loans = usePaginatedQuery(api.admin.allLoans, today ? { today, status } : "skip", {
    initialNumItems: PAGE_SIZE,
  });

  return (
    <div className="flex flex-col gap-4">
      <StatusFilter value={status} onChange={setStatus} />
      {loans.status === "LoadingFirstPage" ? (
        <ListSkeleton rows={5} />
      ) : loans.results.length === 0 ? (
        <EmptyState title="No loans match this filter" />
      ) : (
        <TablePanel>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <Head className="pl-4">Tool</Head>
                <Head>Lender</Head>
                <Head>Borrower</Head>
                <Head>Dates</Head>
                <Head className="pr-4">Status</Head>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.results.map((loan) => (
                <TableRow key={loan._id} className={cn(loan.isOverdue && "bg-destructive/5")}>
                  <TableCell className="py-3 pl-4">
                    <div className="flex flex-col">
                      <span className="font-semibold">{loan.toolName}</span>
                      <span className="text-xs">
                        Requested <Ago at={loan._creationTime} />
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Person {...loan.owner} />
                  </TableCell>
                  <TableCell>
                    <Person {...loan.borrower} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatRange(loan.startDate, loan.endDate)}
                  </TableCell>
                  <TableCell className="pr-4">
                    <StatusBadge status={loan.status} overdue={loan.isOverdue} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TablePanel>
      )}
      <InfiniteScroll list={loans} pageSize={PAGE_SIZE} />
    </div>
  );
}

// ── Listings ─────────────────────────────────────────────────────────────────

function ListingsTab() {
  const today = useToday();
  const [category, setCategory] = useState<Category | undefined>();
  const tools = usePaginatedQuery(api.admin.listings, today ? { today, category } : "skip", {
    initialNumItems: PAGE_SIZE,
  });
  const removeTool = useMutation(api.admin.removeTool);

  return (
    <div className="flex flex-col gap-4">
      <CategoryFilter value={category} onChange={setCategory} />
      {tools.status === "LoadingFirstPage" ? (
        <ListSkeleton rows={5} />
      ) : tools.results.length === 0 ? (
        <EmptyState title="No active listings" />
      ) : (
        <TablePanel>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <Head className="pl-4">Tool</Head>
                <Head>Category</Head>
                <Head>Lender</Head>
                <Head>Status</Head>
                <Head>Listed</Head>
                <Head className="pr-4 text-right">Moderation</Head>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tools.results.map((tool) => (
                <TableRow key={tool._id}>
                  <TableCell className="py-3 pl-4">
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-semibold">{tool.name}</span>
                      <ConditionBadge condition={tool.condition} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <CategoryBadge category={tool.category} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Person name={tool.owner.name} email={tool.owner.email} />
                      {tool.owner.trustedLender && <TrustedBadge compact />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <AvailabilityBadge availability={tool.onLoan ? "on_loan" : "available"} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Ago at={tool._creationTime} />
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <ConfirmButton
                      title={`Remove "${tool.name}"?`}
                      description="The listing disappears for everyone and pending requests are declined. Existing loans keep their history."
                      confirmLabel="Remove listing"
                      onConfirm={() =>
                        withToast(() => removeTool({ toolId: tool._id }), "Listing removed.")
                      }
                    >
                      Remove
                    </ConfirmButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TablePanel>
      )}
      <InfiniteScroll list={tools} pageSize={PAGE_SIZE} />
    </div>
  );
}

// ── Users ────────────────────────────────────────────────────────────────────

function UsersTab() {
  const me = useMe();
  const users = usePaginatedQuery(api.admin.listUsers, {}, { initialNumItems: PAGE_SIZE });
  const setTrusted = useMutation(api.users.setTrusted);

  return (
    <div className="flex flex-col gap-4">
      {users.status === "LoadingFirstPage" ? (
        <ListSkeleton rows={4} />
      ) : (
        <TablePanel>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <Head className="pl-4">Member</Head>
                <Head>Role</Head>
                <Head>Trusted Lender</Head>
                <Head>Joined</Head>
                <Head className="pr-4 text-right">Action</Head>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.results.map((user) => (
                <TableRow key={user._id}>
                  <TableCell className="py-3 pl-4">
                    <Person
                      name={user._id === me?._id ? `${user.name} (you)` : user.name}
                      email={user.email}
                    />
                  </TableCell>
                  <TableCell>
                    {user.role === "admin" ? (
                      <Badge>
                        <ShieldCheckIcon data-icon="inline-start" /> Admin
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Member</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.trustedLender ? (
                      <TrustedBadge />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Ago at={user._creationTime} />
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <Button
                      size="sm"
                      variant={user.trustedLender ? "outline" : "secondary"}
                      onClick={() =>
                        withToast(
                          () => setTrusted({ userId: user._id, trusted: !user.trustedLender }),
                          user.trustedLender
                            ? `${user.name} is no longer a Trusted Lender.`
                            : `${user.name} is now a Trusted Lender.`,
                        )
                      }
                    >
                      {user.trustedLender ? "Remove badge" : "Mark trusted"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TablePanel>
      )}
      <InfiniteScroll list={users} pageSize={PAGE_SIZE} />
    </div>
  );
}
