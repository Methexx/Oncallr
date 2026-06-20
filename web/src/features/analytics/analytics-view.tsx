"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { getAnalyticsOverview } from "@/services/analytics";
import { getServices } from "@/services/services";

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

function formatAveragePerDay(value: number) {
  return value.toFixed(1);
}

export function AnalyticsView() {
  const auth = useAuth();
  const [days, setDays] = useState<(typeof timeRanges)[number]>(30);
  const [serviceFilter, setServiceFilter] = useState("all");
  const isAdmin = auth.user?.role === "ADMIN";

  const servicesQuery = useQuery({
    queryKey: ["services", "analytics-filter"],
    queryFn: getServices,
    enabled: auth.isAuthenticated && isAdmin,
    retry: false,
  });

  const analyticsQuery = useQuery({
    queryKey: ["analytics", "overview", days, serviceFilter],
    queryFn: () =>
      getAnalyticsOverview(
        days,
        serviceFilter === "all" ? undefined : serviceFilter
      ),
    enabled: auth.isAuthenticated && isAdmin,
    retry: false,
  });

  if (auth.isLoading || analyticsQuery.isLoading || servicesQuery.isLoading) {
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
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            MTTA, MTTR, severity mix, service volume, and on-call load for the last{" "}
            {summary.days} days.
          </p>
          {summary.serviceFilter ? (
            <Badge variant="secondary">
              Filtered to {summary.serviceFilter.name}
            </Badge>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
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

          <Select onValueChange={setServiceFilter} value={serviceFilter}>
            <SelectTrigger className="w-full md:w-64">
              <SelectValue placeholder="All services" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All services</SelectItem>
              {(servicesQuery.data ?? []).map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle>Total incidents</CardTitle>
            <CardDescription>All incidents in the selected range.</CardDescription>
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
            <CardTitle>Avg / day</CardTitle>
            <CardDescription>Average incident load per day.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {formatAveragePerDay(summary.averageIncidentsPerDay)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status mix</CardTitle>
            <CardDescription>Current lifecycle distribution.</CardDescription>
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

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.25fr]">
        <Card>
          <CardHeader>
            <CardTitle>Severity mix</CardTitle>
            <CardDescription>
              How the selected incidents break down by severity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary.severityBreakdown.length > 0 ? (
              <div className="space-y-3">
                {summary.severityBreakdown.map((entry) => (
                  <div
                    key={entry.severity}
                    className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
                  >
                    <p className="font-medium">{entry.severity}</p>
                    <Badge variant="secondary">{entry.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No severity data is available for this range.
              </p>
            )}
          </CardContent>
        </Card>

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
      </div>
    </section>
  );
}
