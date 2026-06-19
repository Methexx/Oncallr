"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Cell, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { getAnalyticsOverview } from "@/services/analytics";

const timeRanges = [7, 30, 90] as const;
const barColors = ["#111827", "#374151", "#6b7280", "#9ca3af", "#d1d5db"];

function formatMinutes(value: number) {
  if (value <= 0) {
    return "0 min";
  }

  if (value >= 60) {
    return `${(value / 60).toFixed(1)} hr`;
  }

  return `${value.toFixed(0)} min`;
}

export function AnalyticsView() {
  const auth = useAuth();
  const [days, setDays] = useState<(typeof timeRanges)[number]>(30);
  const isAdmin = auth.user?.role === "ADMIN";

  const analyticsQuery = useQuery({
    queryKey: ["analytics", "overview", days],
    queryFn: () => getAnalyticsOverview(days),
    enabled: auth.isAuthenticated && isAdmin,
    retry: false,
  });

  if (auth.isLoading || analyticsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics access</CardTitle>
          <CardDescription>
            Analytics are available to admins only.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const summary = analyticsQuery.data;

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics unavailable</CardTitle>
          <CardDescription>
            We could not load analytics right now.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            MTTA, MTTR, incident volume, and busiest on-call coverage for the last {summary.days} days.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {timeRanges.map((range) => (
            <Button
              key={range}
              onClick={() => setDays(range)}
              size="sm"
              type="button"
              variant={days === range ? "default" : "outline"}
            >
              {range} days
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total incidents</CardTitle>
            <CardDescription>All incidents in the selected time range.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{summary.totals.incidents}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>MTTA</CardTitle>
            <CardDescription>Mean time to acknowledge.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatMinutes(summary.mttaMinutes)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>MTTR</CardTitle>
            <CardDescription>Mean time to resolve.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatMinutes(summary.mttrMinutes)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status mix</CardTitle>
            <CardDescription>Live operational state distribution.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant="outline">Triggered {summary.totals.triggered}</Badge>
            <Badge variant="outline">Acknowledged {summary.totals.acknowledged}</Badge>
            <Badge variant="outline">Resolved {summary.totals.resolved}</Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Incidents over time</CardTitle>
            <CardDescription>
              Trend of incident creation across the selected range.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summary.incidentsOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line
                  dataKey="count"
                  stroke="#111827"
                  strokeWidth={2}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Volume by service</CardTitle>
            <CardDescription>
              Which services generated the most incidents.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.volumeByService}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="serviceName" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {summary.volumeByService.map((entry, index) => (
                    <Cell
                      key={`${entry.serviceName}-${index}`}
                      fill={barColors[index % barColors.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Busiest on-call coverage</CardTitle>
          <CardDescription>
            Which schedule/user pair handled the most incidents in the selected range.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summary.busiestOnCall.length > 0 ? (
            <div className="space-y-3">
              {summary.busiestOnCall.map((entry) => (
                <div
                  key={`${entry.scheduleName}-${entry.userName}`}
                  className="flex flex-wrap items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{entry.userName}</p>
                    <p className="text-sm text-muted-foreground">{entry.scheduleName}</p>
                  </div>
                  <Badge variant="secondary">{entry.count} incidents</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No on-call coverage data is available yet for this range.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
