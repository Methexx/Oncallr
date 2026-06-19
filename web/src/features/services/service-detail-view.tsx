"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getServiceDetails } from "@/services/services";

interface ServiceDetailViewProps {
  serviceId: string;
}

function formatDate(value?: string) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ServiceDetailView({ serviceId }: ServiceDetailViewProps) {
  const serviceQuery = useQuery({
    queryKey: ["services", "detail", serviceId],
    queryFn: () => getServiceDetails(serviceId),
    retry: false,
  });

  if (serviceQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const service = serviceQuery.data;

  if (!service) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Service unavailable</CardTitle>
          <CardDescription>We could not load this service.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <Link
          className="text-sm font-medium text-muted-foreground underline underline-offset-4"
          href="/services"
        >
          Back to services
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">{service.name}</h1>
        <p className="text-sm text-muted-foreground">
          {service.description ?? "No description added yet."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Webhook details</CardTitle>
          <CardDescription>
            Incoming webhook endpoint and current policy attachment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant={service.escalationPolicy ? "secondary" : "outline"}>
              {service.escalationPolicy
                ? `Policy timeout ${service.escalationPolicy.timeoutMinutes} min`
                : "No escalation policy attached"}
            </Badge>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
            <p className="font-medium">Webhook token</p>
            <p className="mt-1 break-all text-muted-foreground">{service.webhookToken}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent incidents</CardTitle>
          <CardDescription>
            Latest incidents created for this service.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {service.incidents && service.incidents.length > 0 ? (
            <div className="space-y-3">
              {service.incidents.map((incident) => (
                <div
                  key={incident.id}
                  className="rounded-lg border border-border bg-background px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      className="font-medium underline-offset-4 hover:underline"
                      href={`/incidents/${incident.id}`}
                    >
                      {incident.title}
                    </Link>
                    <Badge>{incident.severity}</Badge>
                    <Badge variant="outline">{incident.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Created {formatDate(incident.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No incidents have been created for this service yet.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
