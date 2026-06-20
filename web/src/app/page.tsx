"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BellRing,
  BrainCircuit,
  Orbit,
  Radar,
  TimerReset,
  Waypoints,
} from "lucide-react";
import { GravityWell } from "@/components/shared/gravity-well";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const workflowSteps = [
  {
    title: "Capture the disturbance",
    description:
      "Incoming webhooks or manual triggers create incidents without relying on chat messages getting noticed.",
    icon: Radar,
  },
  {
    title: "Resolve who should respond",
    description:
      "Schedules and escalation policies turn a noisy alert into a specific responsible engineer in real time.",
    icon: Orbit,
  },
  {
    title: "Keep the timeline honest",
    description:
      "Acknowledgements, comments, escalations, and resolutions all stay visible so the team can learn after the incident.",
    icon: Waypoints,
  },
];

const proofPoints = [
  {
    eyebrow: "Real-time coordination",
    title: "Socket-powered incident delivery",
    description:
      "Engineers see new incidents arrive, reassign, and settle in the dashboard without refresh loops or stale tabs.",
    icon: BellRing,
  },
  {
    eyebrow: "Reliable escalation",
    title: "Redis and BullMQ keep pressure on the queue",
    description:
      "Escalation timers survive restarts and keep nudging incidents to the next responder until someone takes ownership.",
    icon: TimerReset,
  },
  {
    eyebrow: "Operational learning",
    title: "AI-assisted postmortems stay grounded in the timeline",
    description:
      "The same incident data that drove the response also drives the review, so documentation feels connected instead of bolted on.",
    icon: BrainCircuit,
  },
];

const heroMetrics = [
  { label: "Live routing", value: "Socket + queue" },
  { label: "Response model", value: "Schedule aware" },
  { label: "Outcome", value: "Alert to postmortem" },
];

const sectionReveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.24 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
} as const;

export default function HomePage() {
  const reduceMotion = useReducedMotion();

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 pb-10">
        <motion.section
          className="app-shell hero-glow overflow-hidden"
          initial={reduceMotion ? undefined : { opacity: 0, y: 18 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="border-b border-border/70 px-5 py-5 sm:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                  OnCallr
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <GravityWell intensity="pulse" size={16} tone="brand" />
                  Live incident control plane
                </span>
              </div>
              <ThemeToggle />
            </div>
          </div>

          <div className="grid gap-12 px-5 py-10 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-14">
            <div className="space-y-8">
              <div className="space-y-5">
                <Badge
                  className="rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-[11px] uppercase tracking-[0.32em] text-primary"
                  variant="secondary"
                >
                  Gravity Well Interface
                </Badge>
                <div className="space-y-4">
                  <h1 className="headline-glow max-w-4xl text-4xl font-semibold tracking-tight sm:text-6xl">
                    Pull production chaos into a stable orbit.
                  </h1>
                  <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                    OnCallr is a real-time incident and on-call system that captures incoming alerts, resolves who should respond, escalates automatically, and turns the full incident trail into a usable postmortem.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild className="rounded-full px-5 shadow-[0_0_32px_color-mix(in_oklch,var(--primary)_28%,transparent)]" size="lg">
                  <Link href="/login">
                    Enter the console
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild className="rounded-full px-5" size="lg" variant="outline">
                  <Link href="/dashboard">Go straight to dashboard</Link>
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {heroMetrics.map((metric) => (
                  <motion.div
                    key={metric.label}
                    whileHover={reduceMotion ? undefined : { scale: 1.015, y: -2 }}
                    className="orbital-panel rounded-[26px] border border-border/70 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                      {metric.label}
                    </p>
                    <p className="mt-2 text-lg font-semibold">{metric.value}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 -z-10 rounded-full bg-[radial-gradient(circle,color-mix(in_oklch,var(--primary)_10%,transparent)_0%,transparent_68%)] blur-3xl" />
              <GravityWell className="mx-auto" intensity="hero" size={420} tone="brand" />
              <motion.div
                animate={
                  reduceMotion
                    ? undefined
                    : {
                        opacity: [0.55, 1, 0.55],
                        y: [0, -6, 0],
                      }
                }
                className="absolute left-0 top-[18%] rounded-full border border-primary/20 bg-background/85 px-4 py-2 text-xs text-muted-foreground shadow-lg backdrop-blur-xl"
                transition={{ duration: 4.8, ease: "easeInOut", repeat: Infinity }}
              >
                <div className="flex items-center gap-2">
                  <GravityWell intensity="pulse" size={16} tone="critical" />
                  Severity captured
                </div>
              </motion.div>
              <motion.div
                animate={
                  reduceMotion
                    ? undefined
                    : {
                        opacity: [0.5, 1, 0.5],
                        y: [0, 7, 0],
                      }
                }
                className="absolute bottom-[16%] right-0 rounded-full border border-primary/20 bg-background/85 px-4 py-2 text-xs text-muted-foreground shadow-lg backdrop-blur-xl"
                transition={{ duration: 5.4, ease: "easeInOut", repeat: Infinity }}
              >
                <div className="flex items-center gap-2">
                  <GravityWell intensity="pulse" size={16} tone="ok" />
                  Response stabilized
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>

        <motion.section
          className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]"
          {...sectionReveal}
        >
          <Card className="app-shell orbital-panel border-primary/10">
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <GravityWell intensity="pulse" size={18} tone="info" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  What first-time visitors should understand
                </p>
              </div>
              <CardTitle className="text-2xl tracking-tight">
                This is a mini PagerDuty-style product built as a systems portfolio piece.
              </CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-7">
                It exists to demonstrate durable background jobs, schedule-aware routing, real-time dashboards, AI-assisted postmortems, and the operational UX around those ideas.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="rounded-[24px] border border-border/70 bg-background/60 p-5">
                <div className="flex items-center gap-3">
                  <GravityWell intensity="pulse" size={18} tone="critical" />
                  <p className="font-medium">Incidents enter as disturbances</p>
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Alerts arrive through service webhooks or a manual dashboard trigger, then get assigned and tracked as incidents.
                </p>
              </div>
              <div className="rounded-[24px] border border-border/70 bg-background/60 p-5">
                <div className="flex items-center gap-3">
                  <GravityWell intensity="pulse" size={18} tone="warning" />
                  <p className="font-medium">Escalation keeps pressure on the response</p>
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  BullMQ drives timeout-based escalation steps so silence never quietly wins.
                </p>
              </div>
              <div className="rounded-[24px] border border-border/70 bg-background/60 p-5">
                <div className="flex items-center gap-3">
                  <GravityWell intensity="pulse" size={18} tone="ok" />
                  <p className="font-medium">Resolution becomes operational memory</p>
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Timelines, analytics, and postmortems preserve what happened so the next incident starts with context.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.title}
                  whileHover={reduceMotion ? undefined : { scale: 1.015, y: -2 }}
                  {...sectionReveal}
                  transition={{
                    ...sectionReveal.transition,
                    delay: reduceMotion ? 0 : index * 0.08,
                  }}
                >
                  <Card className="app-shell orbital-panel min-h-full">
                    <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                      <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                          Step 0{index + 1}
                        </p>
                        <CardTitle className="text-xl tracking-tight">
                          {step.title}
                        </CardTitle>
                        <CardDescription className="text-sm leading-7">
                          {step.description}
                        </CardDescription>
                      </div>
                    </CardHeader>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        <motion.section className="space-y-5" {...sectionReveal}>
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
              Product proof
            </p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Same design language, different operational moments.
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
              The landing page carries the full orbital motif; the app itself inherits the same DNA with smaller status pulses, stronger surfaces, and calmer motion that stays useful while engineers work.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {proofPoints.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  whileHover={reduceMotion ? undefined : { scale: 1.015, y: -2 }}
                  {...sectionReveal}
                  transition={{
                    ...sectionReveal.transition,
                    delay: reduceMotion ? 0 : index * 0.1,
                  }}
                >
                  <Card className="app-shell orbital-panel h-full">
                    <CardHeader className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                          {item.eyebrow}
                        </span>
                        <div className="flex size-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                          <Icon className="size-5" />
                        </div>
                      </div>
                      <CardTitle className="text-xl tracking-tight">{item.title}</CardTitle>
                      <CardDescription className="text-sm leading-7">
                        {item.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        <motion.section
          className="app-shell orbital-panel relative overflow-hidden px-5 py-8 sm:px-8"
          {...sectionReveal}
        >
          <div className="absolute -right-16 top-1/2 hidden -translate-y-1/2 lg:block">
            <GravityWell intensity="ambient" size={240} tone="brand" />
          </div>

          <div className="relative z-10 max-w-3xl space-y-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
              Best demo path
            </p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Sign in, trigger an incident, and watch the whole orbital system respond.
            </h2>
            <p className="text-sm leading-7 text-muted-foreground sm:text-base">
              Use the magic-link flow, open the dashboard, create a manual incident from Services, and then watch assignment, notifications, timeline, and analytics move together in real time.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-full px-5" size="lg">
                <Link href="/login">
                  Start with sign in
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild className="rounded-full px-5" size="lg" variant="outline">
                <Link href="/services">Open services</Link>
              </Button>
            </div>
          </div>
        </motion.section>
      </div>
    </main>
  );
}
