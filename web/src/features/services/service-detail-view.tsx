"use client";

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
import { useAuth } from "@/hooks/use-auth";
import {
  getServiceDetails,
  regenerateWebhookToken,
} from "@/services/services";

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

function getWebhookUrl(token: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
  return `${apiUrl}/webhooks/incidents/${token}`;
}

export function ServiceDetailView({ serviceId }: ServiceDetailViewProps) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = auth.user?.role === "ADMIN";

  const serviceQuery = useQuery({
    queryKey: ["services", "detail", serviceId],
    queryFn: () => getServiceDetails(serviceId),
    retry: false,
  });

  const regenerateTokenMutation = useMutation({
    mutationFn: () => regenerateWebhookToken(serviceId),
    onSuccess: async (service) => {
      toast.success("Webhook token regenerated.");
      await queryClient.invalidateQueries({
        queryKey: ["services", "detail", serviceId],
      });
      await navigator.clipboard
        .writeText(getWebhookUrl(service.webhookToken))
        .catch(() => undefined);
    },
    onError: (error) => {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message ?? "Unable to regenerate token."
          : "Unable to regenerate token.";

      toast.error(message);
    },
  });

  async function copyWebhookUrl(token: string) {
    try {
      await navigator.clipboard.writeText(getWebhookUrl(token));
      toast.success("Webhook URL copied.");
    } catch {
      toast.error("Unable to copy webhook URL.");
    }
  }

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

  const webhookUrl = getWebhookUrl(service.webhookToken);

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
            <p className="font-medium">Webhook URL</p>
            <p className="mt-1 break-all text-muted-foreground">{webhookUrl}</p>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
            <p className="font-medium">Webhook token</p>
            <p className="mt-1 break-all text-muted-foreground">{service.webhookToken}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => copyWebhookUrl(service.webhookToken)}
              type="button"
              variant="outline"
            >
              Copy webhook URL
            </Button>

            {isAdmin ? (
              <Button
                disabled={regenerateTokenMutation.isPending}
                onClick={() => regenerateTokenMutation.mutate()}
                type="button"
              >
                {regenerateTokenMutation.isPending
                  ? "Rotating..."
                  : "Rotate webhook token"}
              </Button>
            ) : null}
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
