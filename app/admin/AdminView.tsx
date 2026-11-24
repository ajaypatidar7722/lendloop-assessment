"use client";

import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { CategoryBadge, StatusBadge, TrustedBadge } from "@/components/badges";
import ConfirmButton from "@/components/ConfirmButton";
import EmptyState from "@/components/EmptyState";
import ListSkeleton from "@/components/ListSkeleton";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { formatRange, STATUS_LABELS } from "@/lib/format";
import { useMe, useToday } from "@/lib/hooks";
import { api } from "@/convex/_generated/api";
import type { LoanStatus } from "@/convex/lib/validators";

export default function AdminView() {
  return (
    <>
      <PageHeader
        title="Admin"
        description="All loans, listing moderation and Trusted Lender badges."
      />
      <Tabs defaultValue="loans">
        <TabsList>
          <TabsTrigger value="loans">Loans</TabsTrigger>
          <TabsTrigger value="listings">Listings</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>
        <TabsContent value="loans" className="mt-4">
          <LoansTab />
        </TabsContent>
        <TabsContent value="listings" className="mt-4">
          <ListingsTab />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UsersTab />
        </TabsContent>
      </Tabs>
    </>
  );
}

const STATUSES = Object.keys(STATUS_LABELS) as LoanStatus[];

function LoansTab() {
  const today = useToday();
  const [status, setStatus] = useState<LoanStatus | "all">("all");
  const {
    results,
    status: pageStatus,
    loadMore,
  } = usePaginatedQuery(
    api.admin.allLoans,
    today ? { today, status: status === "all" ? undefined : status } : "skip",
    { initialNumItems: 25 },
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Status</span>
        <Select value={status} onValueChange={(v) => setStatus(v as LoanStatus | "all")}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All loans</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {pageStatus === "LoadingFirstPage" ? (
        <ListSkeleton rows={5} />
      ) : results.length === 0 ? (
        <EmptyState title="No loans match this filter" />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tool</TableHead>
                <TableHead>Lender</TableHead>
                <TableHead>Borrower</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((loan) => (
                <TableRow key={loan._id}>
                  <TableCell className="font-medium">{loan.toolName}</TableCell>
                  <TableCell>
                    <Person name={loan.owner.name} email={loan.owner.email} />
                  </TableCell>
                  <TableCell>
                    <Person name={loan.borrower.name} email={loan.borrower.email} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatRange(loan.startDate, loan.endDate)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={loan.status} overdue={loan.isOverdue} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pageStatus === "CanLoadMore" && (
        <Button variant="outline" className="self-center" onClick={() => loadMore(25)}>
          Load more
        </Button>
      )}
    </div>
  );
}

function Person({ name, email }: { name: string; email: string }) {
  return (
    <div className="flex flex-col">
      <span>{name}</span>
      <span className="text-xs text-muted-foreground">{email}</span>
    </div>
  );
}

function ListingsTab() {
  const today = useToday();
  const tools = useQuery(api.tools.list, today ? { today } : "skip");
  const removeTool = useMutation(api.admin.removeTool);

  if (tools === undefined) return <ListSkeleton rows={5} />;
  if (tools.length === 0) return <EmptyState title="No active listings" />;

  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tool</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Lender</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Moderation</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tools.map((tool) => (
            <TableRow key={tool._id}>
              <TableCell className="font-medium">{tool.name}</TableCell>
              <TableCell>
                <CategoryBadge category={tool.category} />
              </TableCell>
              <TableCell>{tool.isMine ? "You" : tool.owner.firstName}</TableCell>
              <TableCell>{tool.availability === "on_loan" ? "On loan" : "Available"}</TableCell>
              <TableCell className="text-right">
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
    </div>
  );
}

function UsersTab() {
  const me = useMe();
  const users = useQuery(api.admin.listUsers);
  const setTrusted = useMutation(api.users.setTrusted);

  if (users === undefined) return <ListSkeleton rows={4} />;

  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Trusted Lender</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user._id}>
              <TableCell>
                <Person
                  name={user._id === me?._id ? `${user.name} (you)` : user.name}
                  email={user.email}
                />
              </TableCell>
              <TableCell>
                <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
              </TableCell>
              <TableCell>
                {user.trustedLender ? (
                  <TrustedBadge />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right">
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
    </div>
  );
}
