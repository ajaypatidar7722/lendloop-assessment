import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import SiteHeader from "@/components/SiteHeader";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "LendLoop", template: "%s · LendLoop" },
  description: "Borrow what you need. Lend what you don't.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ClerkProvider>
          <ConvexClientProvider>
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <footer className="border-t py-6 text-center text-xs text-muted-foreground">
              LendLoop · a neighborhood tool-lending board
            </footer>
            {/* Light-only theme, so pin the toaster instead of following the OS. */}
            <Toaster theme="light" richColors position="bottom-right" />
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
