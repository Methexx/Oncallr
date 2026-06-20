"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/hooks/use-socket";
import {
  acknowledgeIncident,
  getAllIncidents,
  getMyIncidents,
} from "@/services/incidents";
import { getServices } from "@/services/services";
import { getUsers } from "@/services/users";
import {
  Incident,
  IncidentNotificationPayload,
  IncidentUpdatePayload,
} from "@/types/incident";

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

function getSeverityVariant(severity: Incident["severity"]) {
  if (severity === "CRITICAL") {
    return "default";
  }

  if (severity === "HIGH") {
    return "secondary";
  }

  return "outline";
}

export function IncidentListView({
  mode,
  title,
  description,
}: IncidentListViewProps) {
  const auth = useAuth();
  const socket = useSocket();
  const queryClient = useQueryClient();
  const isAdmin = auth.user?.role === "ADMIN" && mode === "all";
  const [activeStatus, setActiveStatus] = useState<IncidentStatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const deferredSearch = useDeferredValue(search.trim());

  const incidentsQuery = useQuery({
    queryKey: [
      "incidents",
      mode,
      activeStatus,
      isAdmin ? deferredSearch : "",
      isAdmin ? serviceFilter : "",
      isAdmin ? assigneeFilter : "",
    ],
    queryFn: () =>
      mode === "assigned"
        ? getMyIncidents()
        : getAllIncidents({
            status: activeStatus === "ALL" ? undefined : activeStatus,
            serviceId: isAdmin && serviceFilter !== "all" ? serviceFilter : undefined,
            assigneeId:
              isAdmin && assigneeFilter !== "all" ? assigneeFilter : undefined,
            search: isAdmin && deferredSearch.length > 0 ? deferredSearch : undefined,
          }),
    enabled: auth.isAuthenticated,
    retry: false,
  });

  const servicesQuery = useQuery({
    queryKey: ["services", "filter-options"],
    queryFn: getServices,
    enabled: auth.isAuthenticated && isAdmin,
    retry: false,
  });

  const usersQuery = useQuery({
    queryKey: ["users", "filter-options"],
    queryFn: getUsers,
    enabled: auth.isAuthenticated && isAdmin,
    retry: false,
  });

  const visibleIncidents = useMemo(() => {
    const incidents = incidentsQuery.data ?? [];

    if (mode === "assigned") {
      if (activeStatus === "ALL") {
        return incidents;
      }

      return incidents.filter((incident) => incident.status === activeStatus);
    }

    return incidents;
  }, [activeStatus, incidentsQuery.data, mode]);

  const summary = useMemo(
    () => ({
      total: visibleIncidents.length,
      triggered: visibleIncidents.filter((incident) => incident.status === "TRIGGERED")
        .length,
      acknowledged: visibleIncidents.filter(
        (incident) => incident.status === "ACKNOWLEDGED"
      ).length,
      resolved: visibleIncidents.filter((incident) => incident.status === "RESOLVED")
        .length,
    }),
    [visibleIncidents]
  );

  const refreshIncidents = useEffectEvent(() => {
    startTransition(() => {
      void queryClient.invalidateQueries({
        queryKey: ["incidents"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["postmortems"],
      });
    });
  });

  const handleIncidentUpdated = useEffectEvent((payload: IncidentUpdatePayload) => {
    if (payload.updateType === "ESCALATED") {
      toast.info(`Escalation advanced for ${payload.serviceName}.`, {
        description: `${payload.title} is now assigned to ${payload.currentAssigneeName ?? "the next responder"}.`,
      });
    }

    refreshIncidents();
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
    const onIncidentUpdated = (payload: IncidentUpdatePayload) => {
      handleIncidentUpdated(payload);
    };

    socket.on("incident:new", onIncidentCreated);
    socket.on("incident:update", onIncidentUpdated);

    return () => {
      socket.off("incident:new", onIncidentCreated);
      socket.off("incident:update", onIncidentUpdated);
    };
  }, [auth.isAuthenticated, socket]);

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total visible</CardDescription>
            <CardTitle className="text-3xl">{summary.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Triggered</CardDescription>
            <CardTitle className="text-3xl">{summary.triggered}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Acknowledged</CardDescription>
            <CardTitle className="text-3xl">{summary.acknowledged}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Resolved</CardDescription>
            <CardTitle className="text-3xl">{summary.resolved}</CardTitle>
          </CardHeader>
        </Card>
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
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <Tabs
              onValueChange={(value) => setActiveStatus(value as IncidentStatusFilter)}
              value={activeStatus}
            >
              <TabsList>
                <TabsTrigger value="ALL">All</TabsTrigger>
                <TabsTrigger value="TRIGGERED">Triggered</TabsTrigger>
                <TabsTrigger value="ACKNOWLEDGED">Acknowledged</TabsTrigger>
                <TabsTrigger value="RESOLVED">Resolved</TabsTrigger>
              </TabsList>
            </Tabs>

            {isAdmin ? (
              <div className="grid gap-3 md:grid-cols-3 xl:min-w-[780px]">
                <div className="space-y-2">
                  <Label htmlFor="incident-search">Search</Label>
                  <Input
                    id="incident-search"
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search title, description, service..."
                    value={search}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Service</Label>
                  <Select onValueChange={setServiceFilter} value={serviceFilter}>
                    <SelectTrigger>
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

                <div className="space-y-2">
                  <Label>Assignee</Label>
                  <Select onValueChange={setAssigneeFilter} value={assigneeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All assignees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All assignees</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {(usersQuery.data ?? []).map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}
          </div>

          {incidentsQuery.isLoading ||
          auth.isLoading ||
          servicesQuery.isLoading ||
          usersQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : visibleIncidents.length > 0 ? (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Incident</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleIncidents.map((incident) => (
                    <TableRow key={incident.id}>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <Link
                            className="font-medium underline-offset-4 hover:underline"
                            href={`/incidents/${incident.id}`}
                          >
                            {incident.title}
                          </Link>
                          {incident.description ? (
                            <p className="max-w-[360px] text-xs text-muted-foreground">
                              {incident.description}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        {incident.service?.name ?? "Unknown service"}
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant={getSeverityVariant(incident.severity)}>
                          {formatSeverity(incident.severity)}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant="outline">{formatStatus(incident.status)}</Badge>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <p>{incident.currentAssignee?.name ?? "Unassigned"}</p>
                          {incident.currentAssignee ? (
                            <p className="text-xs text-muted-foreground">
                              {incident.currentAssignee.email}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-sm text-muted-foreground">
                        {formatDate(incident.createdAt)}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex justify-end gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/incidents/${incident.id}`}>Open</Link>
                          </Button>
                          <Button
                            disabled={
                              acknowledgeMutation.isPending ||
                              incident.status !== "TRIGGERED"
                            }
                            onClick={() => acknowledgeMutation.mutate(incident.id)}
                            size="sm"
                            type="button"
                          >
                            {incident.status === "ACKNOWLEDGED"
                              ? "Acknowledged"
                              : acknowledgeMutation.isPending
                                ? "Acknowledging..."
                                : "Acknowledge"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
