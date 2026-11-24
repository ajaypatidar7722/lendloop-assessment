import RequireUser from "@/components/RequireUser";

// Route group: "(app)" groups the signed-in pages under this layout without
// adding a URL segment, so they live at /tools, /listings, /requests, /incoming.
// proxy.ts redirects signed-out visitors; RequireUser additionally waits until
// the Convex user row exists.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <RequireUser>{children}</RequireUser>
    </div>
  );
}
