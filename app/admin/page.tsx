import type { Metadata } from "next";
import AdminView from "./AdminView";

export const metadata: Metadata = { title: "Admin" };

export default function AdminPage() {
  return <AdminView />;
}
