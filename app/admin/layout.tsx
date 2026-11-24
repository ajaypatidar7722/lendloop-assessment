import RequireUser from "@/components/RequireUser";

// Hiding this page from non-admins is cosmetic: every admin function checks the
// role on the server (adminQuery / adminMutation).
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <RequireUser admin>{children}</RequireUser>
    </div>
  );
}
