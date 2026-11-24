import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { RepeatIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import MainNav from "@/components/MainNav";
import { Button } from "@/components/ui/button";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold text-brand-deep">
          <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
            <RepeatIcon className="size-4" aria-hidden />
          </span>
          LendLoop
        </Link>
        {/* Clerk's <Show> reads the request, so it sits inside Suspense (cacheComponents). */}
        <Suspense>
          <div className="order-last w-full sm:order-none sm:w-auto sm:flex-1">
            <Show when="signed-in">
              <MainNav />
            </Show>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <Button size="sm">Sign in</Button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </div>
        </Suspense>
      </div>
    </header>
  );
}
