import type { Metadata } from "next";
import { Suspense } from "react";
import ListSkeleton from "@/components/ListSkeleton";
import RequestsView from "./RequestsView";

export const metadata: Metadata = { title: "Requests" };

// RequestsView reads ?tab= from the URL, which needs a Suspense boundary.
export default function RequestsPage() {
  return (
    <Suspense fallback={<ListSkeleton rows={4} />}>
      <RequestsView />
    </Suspense>
  );
}
