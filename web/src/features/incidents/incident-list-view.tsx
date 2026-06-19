"use client";

import { startTransition, useEffect, useEffectEvent, useState } from "react";
import Link from "next/link";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/hooks/use-socket";
import {
  acknowledgeIncident,
  getAllIncidents,
  getMyIncidents,
} from "@/services/incidents";
import { Incident, IncidentNotificationPayload } from "@/types/incident";

type IncidentListMode = "all" | "assigned";
type IncidentStatusFilter = "ALL" | "TRIGGERED" | "ACKNOWLEDGED" | "RESOLVED";

interface IncidentListViewProps {
  mode: IncidentListMode;
  title: string;
  description: string;
}

function formatSeverity(severity: string) {
  return severity.charAt(0) + severity.slice(1).toLowerCase();
}

function formatStatus(status: Incident["status"]) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function IncidentListView({
  mode,
  title,
  description,
}: IncidentListViewProps) {
  const auth = useAuth();
  const socket = useSocket();
  const queryClient = useQueryClient();
  const [activeStatus, setActiveStatus] = useState<IncidentStatusFilter>("ALL");

  const incidentsQuery = useQuery({
    queryKey: ["incidents", mode, activeStatus],
    queryFn: () =>
      mode === "assigned"
        ? getMyIncidents()
        : getAllIncidents(activeStatus === "ALL" ? undefined : activeStatus),
    enabled: auth.isAuthenticated,
    retry: false,
  });

  const refreshIncidents = useEffectEvent(() => {
    startTransition(() => {
      void queryClient.invalidateQueries({
        queryKey: ["incidents"],
      });
    });
  });

  const acknowledgeMutation = useMutation({
    mutationFn: acknowledgeIncident,
    onSuccess: () => {
      toast.success("Incident acknowledged.");
      void queryClient.invalidateQueries({
        queryKey: ["incidents"],
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

  useEffect(() => {
    if (!auth.isAuthenticated) {
      return;
    }

    const onIncidentCreated = (payload: IncidentNotificationPayload) => {
      toast.info(`New ${payload.severity.toLowerCase()} incident for ${payload.serviceName}.`, {
        description: payload.title,
      });
      refreshIncidents();
    };

    socket.on("incident:new", onIncidentCreated);

    return () => {
      socket.off("incident:new", onIncidentCreated);
    };
  }, [auth.isAuthenticated, socket]);

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incident queue</CardTitle>
          <CardDescription>
            {mode === "assigned"
              ? "Incidents currently assigned to you."
              : "Incidents you can access in this environment."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs onValueChange={(value) => setActiveStatus(value as IncidentStatusFilter)} value={activeStatus}>
            <TabsList>
              <TabsTrigger value="ALL">All</TabsTrigger>
              <TabsTrigger value="TRIGGERED">Triggered</TabsTrigger>
              <TabsTrigger value="ACKNOWLEDGED">Acknowledged</TabsTrigger>
              <TabsTrigger value="RESOLVED">Resolved</TabsTrigger>
            </TabsList>
          </Tabs>

          {incidentsQuery.isLoading || auth.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
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
                    <Badge variant="outline">{formatStatus(incident.status)}</Badge>
                  </div>

                  <div className="mt-3 grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
                    <p>{incident.service?.name ?? "Unknown service"}</p>
                    <p>Created {formatDate(incident.createdAt)}</p>
                    <p>
                      Assigned to {incident.currentAssignee?.name ?? "Unassigned"}
                    </p>
                  </div>

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
              No incidents match this view yet.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
