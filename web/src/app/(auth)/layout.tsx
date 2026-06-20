import Link from "next/link";
import { ReactNode } from "react";
import { ThemeToggle } from "@/components/shared/theme-toggle";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="app-shell hero-glow hidden overflow-hidden lg:flex lg:flex-col">
          <div className="flex items-center justify-between border-b border-border/70 px-8 py-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                OnCallr
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Calm the incident room before it becomes chaos
              </h1>
            </div>
            <ThemeToggle />
          </div>

          <div className="flex flex-1 flex-col justify-between px-8 py-10">
            <div className="space-y-6">
              <p className="max-w-xl text-lg leading-8 text-muted-foreground">
                Built for engineering teams that need live alerts, dependable escalations, on-call visibility, and a credible story after the outage is over.
              </p>

              <div className="grid gap-4">
                <div className="rounded-3xl border border-border/70 bg-background/70 p-5">
                  <p className="text-sm font-semibold">Real-time response</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Socket.io notifications, live queues, and no-refresh incident updates.
                  </p>
                </div>
                <div className="rounded-3xl border border-border/70 bg-background/70 p-5">
                  <p className="text-sm font-semibold">Reliable escalation</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Schedule-aware routing with BullMQ timers and Redis-backed durability.
                  </p>
                </div>
                <div className="rounded-3xl border border-border/70 bg-background/70 p-5">
                  <p className="text-sm font-semibold">Operational memory</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Timelines, analytics, and AI-assisted postmortems keep the team learning instead of repeating outages.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-background/70 p-5 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">New here?</p>
              <p className="mt-2">
                Start on the public intro page if you want the high-level tour before signing in.
              </p>
              <Link className="mt-4 inline-flex font-medium text-primary hover:underline" href="/">
                Read the project intro
              </Link>
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center">
          <div className="w-full max-w-xl space-y-4">
            <div className="flex items-center justify-between lg:hidden">
              <Link href="/">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                  OnCallr
                </p>
              </Link>
              <ThemeToggle />
            </div>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
