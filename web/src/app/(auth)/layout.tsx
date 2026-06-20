import Link from "next/link";
import { ReactNode } from "react";
import { GravityWell } from "@/components/shared/gravity-well";
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
                Catch the alert, steady the orbit, keep the team composed.
              </h1>
            </div>
            <ThemeToggle />
          </div>

          <div className="relative flex flex-1 flex-col justify-between overflow-hidden px-8 py-10">
            <div className="absolute right-[-4rem] top-[4rem] opacity-85">
              <GravityWell intensity="ambient" size={250} tone="brand" />
            </div>

            <div className="relative z-10 space-y-7">
              <p className="max-w-xl text-lg leading-8 text-muted-foreground">
                Built for engineering teams that need live alerts, dependable escalations, on-call visibility, and a credible record after the outage is over.
              </p>

              <div className="grid gap-4">
                <div className="orbital-panel rounded-[28px] border border-border/70 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">
                    Real-time response
                  </p>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    Socket.io notifications, live queues, and no-refresh incident updates keep responders in the same orbit.
                  </p>
                </div>
                <div className="orbital-panel rounded-[28px] border border-border/70 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">
                    Reliable escalation
                  </p>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    Schedule-aware routing with BullMQ timers and Redis-backed durability keeps incidents from going dark.
                  </p>
                </div>
                <div className="orbital-panel rounded-[28px] border border-border/70 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">
                    Operational memory
                  </p>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    Timelines, analytics, and AI-assisted postmortems turn response work into reusable team context.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative z-10 rounded-[28px] border border-border/70 bg-background/72 p-5 text-sm text-muted-foreground backdrop-blur-xl">
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
          <div className="relative w-full max-w-xl space-y-4">
            <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center opacity-70">
              <GravityWell intensity="ambient" size={220} tone="brand" />
            </div>
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
