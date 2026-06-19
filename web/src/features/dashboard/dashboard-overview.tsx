"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { getMyIncidents } from "@/services/incidents";

function formatSeverity(severity: string) {
  return severity.charAt(0) + severity.slice(1).toLowerCase();
}

export function DashboardOverview() {
  const router = useRouter();
  const auth = useAuth();
  const incidentsQuery = useQuery({
    queryKey: ["incidents", "my"],
    queryFn: getMyIncidents,
    enabled: auth.isAuthenticated,
    retry: false,
  });

  const incidentsError = incidentsQuery.error as AxiosError | null;

  useEffect(() => {
    if (auth.isUnauthorized || incidentsError?.response?.status === 401) {
      router.replace("/login");
    }
  }, [auth.isUnauthorized, incidentsError, router]);

  if (auth.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!auth.user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authentication needed</CardTitle>
          <CardDescription>
            Sign in to load your current on-call incident queue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link className="text-sm font-medium underline underline-offset-4" href="/login">
            Go to login
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Signed in as {auth.user.email}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome back, {auth.user.name}
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Role</CardTitle>
            <CardDescription>Current dashboard permission level.</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">{auth.user.role}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assigned incidents</CardTitle>
            <CardDescription>Open incidents currently assigned to you.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {incidentsQuery.data?.length ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My live incidents</CardTitle>
          <CardDescription>
            Pulled from the Fastify API using React Query.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {incidentsQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : incidentsQuery.data && incidentsQuery.data.length > 0 ? (
            <div className="space-y-3">
              {incidentsQuery.data.map((incident) => (
                <div
                  key={incident.id}
                  className="rounded-lg border border-border bg-background p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{incident.title}</p>
                    <Badge>{formatSeverity(incident.severity)}</Badge>
                    <Badge variant="outline">{incident.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {incident.service?.name ?? "Unknown service"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No incidents are currently assigned to you.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
