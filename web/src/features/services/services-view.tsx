"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import {
  createService,
  getServices,
  triggerServiceIncident,
} from "@/services/services";
import { Service } from "@/types/service";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getWebhookUrl(token: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
  return `${apiUrl}/webhooks/incidents/${token}`;
}

function ServiceCard({ service }: { service: Service }) {
  const webhookUrl = getWebhookUrl(service.webhookToken);

  async function copyWebhookUrl() {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      toast.success("Webhook URL copied.");
    } catch {
      toast.error("Unable to copy webhook URL.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Link className="underline-offset-4 hover:underline" href={`/services/${service.id}`}>
            {service.name}
          </Link>
        </CardTitle>
        <CardDescription>
          Created {formatDate(service.createdAt)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant={service.escalationPolicy ? "secondary" : "outline"}>
            {service.escalationPolicy ? "Policy attached" : "No policy yet"}
          </Badge>
        </div>

        {service.description ? (
          <p className="text-sm text-muted-foreground">{service.description}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No description added yet.
          </p>
        )}

        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Webhook URL
          </p>
          <p className="break-all text-sm">{webhookUrl}</p>
          <Button onClick={copyWebhookUrl} size="sm" type="button" variant="outline">
            Copy webhook URL
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ServicesView() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [incidentTitle, setIncidentTitle] = useState("");
  const [incidentDescription, setIncidentDescription] = useState("");
  const [incidentSeverity, setIncidentSeverity] = useState<
    "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  >("HIGH");
  const isAdmin = auth.user?.role === "ADMIN";

  const servicesQuery = useQuery({
    queryKey: ["services"],
    queryFn: getServices,
    enabled: auth.isAuthenticated,
    retry: false,
  });

  const createServiceMutation = useMutation({
    mutationFn: createService,
    onSuccess: async () => {
      setName("");
      setDescription("");
      toast.success("Service created.");
      await queryClient.invalidateQueries({
        queryKey: ["services"],
      });
    },
    onError: (error) => {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message ?? "Unable to create service."
          : "Unable to create service.";

      toast.error(message);
    },
  });

  const triggerIncidentMutation = useMutation({
    mutationFn: triggerServiceIncident,
    onSuccess: async (incident) => {
      setSelectedServiceId("");
      setIncidentTitle("");
      setIncidentDescription("");
      setIncidentSeverity("HIGH");
      toast.success("Incident triggered manually.");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["services"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["incidents"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["incidents", "my"],
        }),
      ]);
      void navigator.clipboard?.writeText(incident.id).catch(() => undefined);
    },
    onError: (error) => {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message ?? "Unable to trigger incident."
          : "Unable to trigger incident.";

      toast.error(message);
    },
  });

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Services</h1>
        <p className="text-sm text-muted-foreground">
          Manage the monitored services that generate incidents and webhook entry points.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.35fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create service</CardTitle>
              <CardDescription>
                Admins can create new monitored services and reveal their webhook URLs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isAdmin ? (
                <p className="text-sm text-muted-foreground">
                  You are signed in as an engineer, so this panel is read-only.
                </p>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="service-name">Service name</Label>
                <Input
                  disabled={!isAdmin || createServiceMutation.isPending}
                  id="service-name"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Payment API"
                  value={name}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-description">Description</Label>
                <Textarea
                  disabled={!isAdmin || createServiceMutation.isPending}
                  id="service-description"
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Processes checkout and payment requests."
                  value={description}
                />
              </div>

              <Button
                className="w-full"
                disabled={!isAdmin || createServiceMutation.isPending || name.trim().length < 2}
                onClick={() =>
                  createServiceMutation.mutate({
                    name: name.trim(),
                    description: description.trim() || undefined,
                  })
                }
                type="button"
              >
                {createServiceMutation.isPending ? "Creating..." : "Create service"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trigger incident</CardTitle>
              <CardDescription>
                Create a live incident from the dashboard for demos, testing, or fire drills.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isAdmin ? (
                <p className="text-sm text-muted-foreground">
                  Only admins can trigger incidents manually.
                </p>
              ) : null}

              <div className="space-y-2">
                <Label>Service</Label>
                <Select
                  onValueChange={setSelectedServiceId}
                  value={selectedServiceId}
                >
                  <SelectTrigger disabled={!isAdmin || triggerIncidentMutation.isPending}>
                    <SelectValue placeholder="Choose a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {(servicesQuery.data ?? []).map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="incident-title">Incident title</Label>
                <Input
                  disabled={!isAdmin || triggerIncidentMutation.isPending}
                  id="incident-title"
                  onChange={(event) => setIncidentTitle(event.target.value)}
                  placeholder="Payment API returning 500s"
                  value={incidentTitle}
                />
              </div>

              <div className="space-y-2">
                <Label>Severity</Label>
                <Select
                  onValueChange={(value) =>
                    setIncidentSeverity(
                      value as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
                    )
                  }
                  value={incidentSeverity}
                >
                  <SelectTrigger disabled={!isAdmin || triggerIncidentMutation.isPending}>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="incident-description">Description</Label>
                <Textarea
                  disabled={!isAdmin || triggerIncidentMutation.isPending}
                  id="incident-description"
                  onChange={(event) => setIncidentDescription(event.target.value)}
                  placeholder="Error rate spiked after the latest deploy and checkout traffic is failing."
                  value={incidentDescription}
                />
              </div>

              <Button
                className="w-full"
                disabled={
                  !isAdmin ||
                  triggerIncidentMutation.isPending ||
                  selectedServiceId.length === 0 ||
                  incidentTitle.trim().length < 3
                }
                onClick={() =>
                  triggerIncidentMutation.mutate({
                    serviceId: selectedServiceId,
                    title: incidentTitle.trim(),
                    description: incidentDescription.trim() || undefined,
                    severity: incidentSeverity,
                  })
                }
                type="button"
                variant="secondary"
              >
                {triggerIncidentMutation.isPending
                  ? "Triggering..."
                  : "Trigger incident"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Service registry</CardTitle>
            <CardDescription>
              Existing services and their current webhook endpoints.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {servicesQuery.isLoading || auth.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : servicesQuery.data && servicesQuery.data.length > 0 ? (
              <div className="space-y-4">
                {servicesQuery.data.map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No services created yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
