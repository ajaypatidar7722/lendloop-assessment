"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { useMe } from "@/lib/hooks";
import { cn } from "@/lib/utils";

type CountKey = "incoming" | "myRequests";

const LINKS: { href: string; label: string; countKey?: CountKey }[] = [
  { href: "/app/tools", label: "Tools" },
  { href: "/app/listings", label: "My listings" },
  { href: "/app/requests", label: "My requests", countKey: "myRequests" },
  { href: "/app/incoming", label: "Incoming", countKey: "incoming" },
];

/** Matches BADGE_CAP in convex/loans.ts: the query reads at most this many + 1. */
const BADGE_CAP = 99;

/**
 * Signed-in navigation. The Admin link is hidden from non-admins for tidiness
 * only; the admin functions themselves reject non-admins on the server.
 */
export default function MainNav() {
  const pathname = usePathname();
  const me = useMe();
  // pendingCounts requires a stored users row, so wait for `me` before asking.
  const counts = useQuery(api.loans.pendingCounts, me ? {} : "skip");
  const links = me?.role === "admin" ? [...LINKS, { href: "/admin", label: "Admin" }] : LINKS;

  return (
    <nav
      aria-label="Main"
      className="-mx-1 flex gap-1 overflow-x-auto text-sm [scrollbar-width:none]"
    >
      {links.map((link) => {
        const { href, label } = link;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const count = "countKey" in link && link.countKey ? (counts?.[link.countKey] ?? 0) : 0;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 whitespace-nowrap transition-colors",
              active
                ? "bg-secondary font-medium text-secondary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {label}
            {count > 0 && (
              <span
                className="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[11px] leading-none font-semibold text-primary-foreground tabular-nums"
                aria-label={`${count} pending`}
              >
                {count > BADGE_CAP ? `${BADGE_CAP}+` : count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
