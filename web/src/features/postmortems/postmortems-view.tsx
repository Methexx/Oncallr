"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
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
import { getPostmortemIncidents } from "@/services/postmortems";

function formatDate(value?: string | null) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function PostmortemsView() {
  const incidentsQuery = useQuery({
    queryKey: ["postmortems"],
    queryFn: getPostmortemIncidents,
    retry: false,
  });

  if (incidentsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Postmortems</h1>
        <p className="text-sm text-muted-foreground">
          Draft and save operational writeups for resolved incidents.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resolved incidents</CardTitle>
          <CardDescription>
            Open an incident, generate a first draft, then edit the final writeup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {incidentsQuery.data && incidentsQuery.data.length > 0 ? (
            <div className="space-y-3">
              {incidentsQuery.data.map((incident) => (
                <div
                  key={incident.id}
                  className="rounded-lg border border-border bg-background px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      className="font-medium underline-offset-4 hover:underline"
                      href={`/postmortems/${incident.id}`}
                    >
                      {incident.title}
                    </Link>
                    <Badge variant="secondary">{incident.severity}</Badge>
                    <Badge variant="outline">Resolved</Badge>
                    <Badge
                      variant={incident.postmortem?.finalContent ? "secondary" : "outline"}
                    >
                      {incident.postmortem?.finalContent ? "Saved" : "Needs writeup"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {incident.service?.name ?? "Unknown service"} · Resolved{" "}
                    {formatDate(incident.resolvedAt)}
                  </p>
                  <div className="mt-3">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/postmortems/${incident.id}`}>
                        {incident.postmortem?.finalContent
                          ? "Open postmortem"
                          : "Start postmortem"}
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No resolved incidents are available yet.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
