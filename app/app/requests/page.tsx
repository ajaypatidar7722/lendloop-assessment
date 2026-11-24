import type { Metadata } from "next";
import RequestsView from "./RequestsView";

export const metadata: Metadata = { title: "My requests" };

export default function RequestsPage() {
  return <RequestsView />;
}
