import { Show, SignInButton } from "@clerk/nextjs";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import PublicToolGrid from "@/components/PublicToolGrid";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <>
      <section className="bg-gradient-to-br from-brand-deep to-primary text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-16 sm:py-24">
          <p className="text-sm font-medium tracking-wide text-highlight uppercase">LendLoop</p>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Borrow what you need. Lend what you don&apos;t.
          </h1>
          <p className="max-w-xl text-lg text-white/80">
            A neighborhood board for sharing drills, ladders, tents and mixers. List what sits in
            your garage, request what you need for a few days, and get a reminder when it&apos;s
            time to give it back.
          </p>
          <div>
            <Suspense>
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <Button size="lg" className="bg-white px-5 text-primary hover:bg-highlight">
                    Sign in to lend or borrow
                  </Button>
                </SignInButton>
              </Show>
              <Show when="signed-in">
                <Button asChild size="lg" className="bg-white px-5 text-primary hover:bg-highlight">
                  <Link href="/app/tools">
                    Browse tools <ArrowRightIcon data-icon="inline-end" />
                  </Link>
                </Button>
              </Show>
            </Suspense>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Available in the neighborhood</h2>
            <p className="text-sm text-muted-foreground">
              Sign in to see details, availability and who&apos;s lending.
            </p>
          </div>
        </div>
        <PublicToolGrid />
      </section>
    </>
  );
}
