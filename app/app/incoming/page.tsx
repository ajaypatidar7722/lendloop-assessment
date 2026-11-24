import type { Metadata } from "next";
import IncomingView from "./IncomingView";

export const metadata: Metadata = { title: "Incoming requests" };

export default function IncomingPage() {
  return <IncomingView />;
}
