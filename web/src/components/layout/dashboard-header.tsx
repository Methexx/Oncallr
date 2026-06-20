"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { BellRing, ChartNoAxesCombined, ClipboardList, FileText, Gauge, Layers3, Settings2, ShieldAlert, TimerReset } from "lucide-react";
import { GravityWell } from "@/components/shared/gravity-well";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/my-incidents", label: "My Incidents", icon: BellRing },
  { href: "/incidents", label: "Incidents", icon: ShieldAlert },
  { href: "/services", label: "Services", icon: Layers3 },
  { href: "/schedules", label: "Schedules", icon: TimerReset },
  { href: "/escalation-policies", label: "Policies", icon: ClipboardList },
  { href: "/analytics", label: "Analytics", icon: ChartNoAxesCombined },
  { href: "/postmortems", label: "Postmortems", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function DashboardHeader() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <header className="app-shell mb-6 overflow-hidden">
      <div className="hero-glow border-b border-border/70 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
              OnCallr Console
            </p>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Incident response without operational guesswork
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Follow live incidents, manage rotations, escalate automatically, and keep the team aligned from alert to postmortem.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs text-primary">
                <GravityWell intensity="pulse" size={16} tone="brand" />
                Live orbital status
              </div>
            </div>
          </div>

        <div className="flex items-center gap-3">
          <Link
            className="rounded-full border border-border/70 bg-background/70 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background"
              href="/"
            >
              View site intro
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 px-4 py-4 sm:px-6">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

          return (
            <motion.div
              key={href}
              whileHover={reduceMotion ? undefined : { scale: 1.015, y: -2 }}
            >
              <Link
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all",
                  isActive
                    ? "border-primary/28 bg-primary text-primary-foreground shadow-[0_0_28px_color-mix(in_oklch,var(--primary)_20%,transparent)]"
                    : "border-border/70 bg-background/65 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                href={href}
              >
                <Icon className="size-4" />
                <span>{label}</span>
                {isActive ? (
                  <GravityWell intensity="pulse" size={12} tone="brand" />
                ) : null}
              </Link>
            </motion.div>
          );
        })}
      </nav>
    </header>
  );
}
