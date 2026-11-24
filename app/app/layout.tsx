import RequireUser from "@/components/RequireUser";

// proxy.ts already redirects signed-out visitors away from /app/**.
// RequireUser additionally waits until the Convex user row exists.
export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <RequireUser>{children}</RequireUser>
    </div>
  );
}
