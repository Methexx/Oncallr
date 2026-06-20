import Link from "next/link";
import { ArrowRight, BellRing, Clock3, FileText, ShieldCheck, Sparkles, Waypoints } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col">
        <section className="app-shell hero-glow overflow-hidden">
          <div className="border-b border-border/70 px-5 py-5 sm:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                  OnCallr
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-4xl">
                  Real-time incident response for the teams who carry production
                </h1>
              </div>
              <ThemeToggle />
            </div>
          </div>

          <div className="grid gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1.2fr_0.8fr] lg:py-14">
            <div className="space-y-8">
              <div className="space-y-5">
                <Badge className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.25em]" variant="secondary">
                  Alert to Postmortem
                </Badge>
                <p className="max-w-3xl text-lg leading-8 text-muted-foreground sm:text-xl">
                  OnCallr helps engineering teams receive incidents, route them to the right on-call responder, escalate automatically, keep the live timeline clear, and generate postmortems once the fire is out.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild className="rounded-full px-5" size="lg">
                  <Link href="/login">
                    Open the console
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild className="rounded-full px-5" size="lg" variant="outline">
                  <Link href="/dashboard">Jump to dashboard</Link>
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="border-border/70 bg-background/70 shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-3xl">Live</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Socket-driven incident delivery updates the dashboard without refreshes.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/70 bg-background/70 shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-3xl">Durable</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Redis and BullMQ keep escalation timers alive even across restarts.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/70 bg-background/70 shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-3xl">Traceable</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Timelines, analytics, and postmortems turn noisy alerts into accountable operations.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="space-y-4">
              <Card className="app-shell border-border/60 bg-background/70 shadow-none">
                <CardHeader>
                  <CardTitle>What new users should know</CardTitle>
                  <CardDescription>
                    This is a single-team incident management platform built like a mini PagerDuty-style system.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <div className="flex gap-3">
                    <BellRing className="mt-0.5 size-4 text-primary" />
                    <p>Incidents can come in from service-specific webhook URLs or be triggered manually from the UI.</p>
                  </div>
                  <div className="flex gap-3">
                    <Clock3 className="mt-0.5 size-4 text-primary" />
                    <p>The app resolves who is on call right now, notifies them instantly, and escalates if nobody responds.</p>
                  </div>
                  <div className="flex gap-3">
                    <FileText className="mt-0.5 size-4 text-primary" />
                    <p>Resolved incidents feed directly into an editable AI-assisted postmortem workflow.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="grid gap-6 py-8 lg:grid-cols-3">
          <Card className="app-shell">
            <CardHeader>
              <Waypoints className="size-5 text-primary" />
              <CardTitle>How the flow works</CardTitle>
              <CardDescription>The full response path from detection to review.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>1. A webhook or admin action triggers an incident.</p>
              <p>2. The escalation policy resolves a user or current schedule assignee.</p>
              <p>3. The responder gets a live dashboard notification.</p>
              <p>4. The incident is acknowledged, investigated, resolved, and documented.</p>
            </CardContent>
          </Card>

          <Card className="app-shell">
            <CardHeader>
              <ShieldCheck className="size-5 text-primary" />
              <CardTitle>Why it matters</CardTitle>
              <CardDescription>This is more than a CRUD demo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>It demonstrates role-aware auth, durable background jobs, real-time UI sync, schedule logic, and operational analytics.</p>
              <p>It also keeps the audit trail visible, so every notification, escalation, comment, and resolution remains reviewable.</p>
            </CardContent>
          </Card>

          <Card className="app-shell">
            <CardHeader>
              <Sparkles className="size-5 text-primary" />
              <CardTitle>Try it quickly</CardTitle>
              <CardDescription>Best path for a fresh evaluator.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Use the magic-link sign in flow, open the dashboard, trigger a manual incident, and watch the queue, timeline, and analytics update together.</p>
              <Button asChild className="mt-2 rounded-full">
                <Link href="/login">Start with sign in</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
