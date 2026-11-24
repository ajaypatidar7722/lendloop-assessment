import type { Metadata } from "next";
import ListingsView from "./ListingsView";

export const metadata: Metadata = { title: "My listings" };

export default function ListingsPage() {
  return <ListingsView />;
}
