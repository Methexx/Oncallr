"use client";

import { useMemo, useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import {
  acknowledgeIncident,
  addIncidentComment,
  getIncidentDetails,
  resolveIncident,
} from "@/services/incidents";
import { Incident, IncidentEvent } from "@/types/incident";

interface IncidentDetailViewProps {
  incidentId: string;
}

function formatSeverity(severity: string) {
  return severity.charAt(0) + severity.slice(1).toLowerCase();
}

function formatEventLabel(eventType: IncidentEvent["type"]) {
  return eventType.charAt(0) + eventType.slice(1).toLowerCase();
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function IncidentSummary({ incident }: { incident: Incident }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{incident.title}</CardTitle>
        <CardDescription>
          {incident.service?.name ?? "Unknown service"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge>{formatSeverity(incident.severity)}</Badge>
          <Badge variant="outline">{incident.status}</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium">Created</p>
            <p className="text-sm text-muted-foreground">
              {formatDate(incident.createdAt)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Current assignee</p>
            <p className="text-sm text-muted-foreground">
              {incident.currentAssignee?.name ?? "Unassigned"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Acknowledged</p>
            <p className="text-sm text-muted-foreground">
              {formatDate(incident.acknowledgedAt)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Resolved</p>
            <p className="text-sm text-muted-foreground">
              {formatDate(incident.resolvedAt)}
            </p>
          </div>
        </div>
        {incident.description ? (
          <>
            <Separator />
            <div>
              <p className="text-sm font-medium">Description</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {incident.description}
              </p>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function IncidentTimeline({ events }: { events: IncidentEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
        <CardDescription>
          Full audit trail for this incident.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="rounded-lg border border-border bg-background p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{formatEventLabel(event.type)}</Badge>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(event.createdAt)}
                  </p>
                </div>
                <p className="mt-2 text-sm">{event.message}</p>
                {event.actor ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    By {event.actor.name} ({event.actor.email})
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function IncidentDetailView({ incidentId }: IncidentDetailViewProps) {
  const queryClient = useQueryClient();
  const auth = useAuth();
  const [comment, setComment] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const incidentQuery = useQuery({
    queryKey: ["incidents", "detail", incidentId],
    queryFn: () => getIncidentDetails(incidentId),
    enabled: auth.isAuthenticated,
    retry: false,
  });

  const incident = incidentQuery.data;
  const canAcknowledge = incident?.status === "TRIGGERED";
  const canResolve = incident?.status !== "RESOLVED";

  const refreshIncidentData = useMemo(
    () => async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["incidents", "detail", incidentId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["incidents", "my"],
        }),
      ]);
    },
    [incidentId, queryClient]
  );

  const acknowledgeMutation = useMutation({
    mutationFn: () => acknowledgeIncident(incidentId),
    onSuccess: async () => {
      toast.success("Incident acknowledged.");
      await refreshIncidentData();
    },
    onError: (error) => {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message ?? "Unable to acknowledge incident."
          : "Unable to acknowledge incident.";

      toast.error(message);
    },
  });

  const commentMutation = useMutation({
    mutationFn: () => addIncidentComment(incidentId, comment),
    onSuccess: async () => {
      setComment("");
      toast.success("Comment added.");
      await refreshIncidentData();
    },
    onError: (error) => {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message ?? "Unable to add comment."
          : "Unable to add comment.";

      toast.error(message);
    },
  });

  const resolveMutation = useMutation({
    mutationFn: () =>
      resolveIncident(incidentId, resolutionNote.trim() || undefined),
    onSuccess: async () => {
      setResolutionNote("");
      toast.success("Incident resolved.");
      await refreshIncidentData();
    },
    onError: (error) => {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message ?? "Unable to resolve incident."
          : "Unable to resolve incident.";

      toast.error(message);
    },
  });

  if (incidentQuery.isLoading || auth.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!incident) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Incident unavailable</CardTitle>
          <CardDescription>
            We could not load this incident right now.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            className="text-sm font-medium underline underline-offset-4"
            href="/dashboard"
          >
            Back to dashboard
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <Link
          className="text-sm font-medium text-muted-foreground underline underline-offset-4"
          href="/dashboard"
        >
          Back to dashboard
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Incident details</h1>
      </div>

      <IncidentSummary incident={incident} />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <IncidentTimeline events={incident.events ?? []} />

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>
                Update incident state from this panel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="w-full"
                disabled={acknowledgeMutation.isPending || !canAcknowledge}
                onClick={() => acknowledgeMutation.mutate()}
                type="button"
              >
                {acknowledgeMutation.isPending
                  ? "Acknowledging..."
                  : "Acknowledge incident"}
              </Button>

              <div className="space-y-2">
                <Label htmlFor="resolution-note">Resolution note</Label>
                <Textarea
                  id="resolution-note"
                  onChange={(event) => setResolutionNote(event.target.value)}
                  placeholder="What fixed the issue?"
                  value={resolutionNote}
                />
              </div>

              <Button
                className="w-full"
                disabled={resolveMutation.isPending || !canResolve}
                onClick={() => resolveMutation.mutate()}
                type="button"
                variant="secondary"
              >
                {resolveMutation.isPending ? "Resolving..." : "Resolve incident"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add comment</CardTitle>
              <CardDescription>
                Capture investigation notes and handoff context.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="incident-comment">Comment</Label>
                <Textarea
                  id="incident-comment"
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Checked logs, looks like a DB connection pool issue..."
                  value={comment}
                />
              </div>
              <Button
                className="w-full"
                disabled={commentMutation.isPending || comment.trim().length === 0}
                onClick={() => commentMutation.mutate()}
                type="button"
              >
                {commentMutation.isPending ? "Posting..." : "Post comment"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Identifiers</CardTitle>
              <CardDescription>Useful metadata while debugging.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="incident-id">Incident ID</Label>
                <Input id="incident-id" readOnly value={incident.id} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="service-id">Service ID</Label>
                <Input
                  id="service-id"
                  readOnly
                  value={incident.service?.id ?? "Unknown"}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
