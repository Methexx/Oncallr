"use client";

import { startTransition, useEffect, useEffectEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";
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
import { useSocket } from "@/hooks/use-socket";
import {
  acknowledgeIncident,
  getMyIncidents,
} from "@/services/incidents";
import {
  IncidentNotificationPayload,
  IncidentUpdatePayload,
} from "@/types/incident";

function formatSeverity(severity: string) {
  return severity.charAt(0) + severity.slice(1).toLowerCase();
}

export function DashboardOverview() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const socket = useSocket();
  const auth = useAuth();
  const incidentsQuery = useQuery({
    queryKey: ["incidents", "my"],
    queryFn: getMyIncidents,
    enabled: auth.isAuthenticated,
    retry: false,
  });

  const incidentsError = incidentsQuery.error as AxiosError | null;
  const isAuthenticated = auth.isAuthenticated;
  const acknowledgeMutation = useMutation({
    mutationFn: acknowledgeIncident,
    onSuccess: () => {
      toast.success("Incident acknowledged.");
      void queryClient.invalidateQueries({
        queryKey: ["incidents", "my"],
      });
    },
    onError: (error) => {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message ?? "Unable to acknowledge incident."
          : "Unable to acknowledge incident.";

      toast.error(message);
    },
  });

  const handleIncidentCreated = useEffectEvent(
    (payload: IncidentNotificationPayload) => {
      toast.info(`New ${payload.severity.toLowerCase()} incident for ${payload.serviceName}.`, {
        description: payload.title,
      });

      startTransition(() => {
        void queryClient.invalidateQueries({
          queryKey: ["incidents", "my"],
        });
      });
    }
  );

  const handleIncidentUpdated = useEffectEvent(
    (payload: IncidentUpdatePayload) => {
      if (payload.updateType === "ESCALATED") {
        toast.info(`Incident escalated for ${payload.serviceName}.`, {
          description: `${payload.title} is now assigned to ${payload.currentAssigneeName ?? "a new responder"}.`,
        });
      }

      startTransition(() => {
        void queryClient.invalidateQueries({
          queryKey: ["incidents", "my"],
        });
        void queryClient.invalidateQueries({
          queryKey: ["incidents"],
        });
      });
    }
  );

  useEffect(() => {
    if (auth.isUnauthorized || incidentsError?.response?.status === 401) {
      router.replace("/login");
    }
  }, [auth.isUnauthorized, incidentsError, router]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const onIncidentCreated = (payload: IncidentNotificationPayload) => {
      handleIncidentCreated(payload);
    };
    const onIncidentUpdated = (payload: IncidentUpdatePayload) => {
      handleIncidentUpdated(payload);
    };

    socket.on("incident:new", onIncidentCreated);
    socket.on("incident:update", onIncidentUpdated);

    return () => {
      socket.off("incident:new", onIncidentCreated);
      socket.off("incident:update", onIncidentUpdated);
    };
  }, [isAuthenticated, socket]);

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
                    <Link
                      className="font-medium underline-offset-4 hover:underline"
                      href={`/incidents/${incident.id}`}
                    >
                      {incident.title}
                    </Link>
                    <Badge>{formatSeverity(incident.severity)}</Badge>
                    <Badge variant="outline">{incident.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {incident.service?.name ?? "Unknown service"}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      disabled={
                        acknowledgeMutation.isPending ||
                        incident.status !== "TRIGGERED"
                      }
                      onClick={() => acknowledgeMutation.mutate(incident.id)}
                      size="sm"
                      type="button"
                    >
                      {acknowledgeMutation.isPending
                        ? "Acknowledging..."
                        : incident.status === "ACKNOWLEDGED"
                          ? "Acknowledged"
                          : "Acknowledge"}
                    </Button>
                  </div>
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
