"use client";

import { useMemo, useState } from "react";
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
import { useAuth } from "@/hooks/use-auth";
import {
  getEscalationPolicies,
  saveEscalationPolicy,
} from "@/services/escalation-policies";
import { getSchedules } from "@/services/schedules";
import { getServices } from "@/services/services";
import { getUsers } from "@/services/users";
import {
  EscalationPolicy,
  EscalationPolicyStep,
} from "@/types/escalation-policy";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function PolicyCard({ policy }: { policy: EscalationPolicy }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{policy.service.name}</CardTitle>
        <CardDescription>
          Timeout {policy.timeoutMinutes} minutes · Updated {formatDate(policy.updatedAt)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {policy.steps.map((step, index) => (
          <div
            key={`${policy.id}-${index}`}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Step {index + 1}</Badge>
              <Badge>{step.type}</Badge>
            </div>
            <p className="mt-2 text-muted-foreground">
              {step.label ??
                (step.type === "USER"
                  ? `Escalate to user ${step.userId}`
                  : `Escalate to schedule ${step.scheduleId}`)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function EscalationPoliciesView() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = auth.user?.role === "ADMIN";
  const [serviceId, setServiceId] = useState("");
  const [timeoutMinutes, setTimeoutMinutes] = useState("5");
  const [steps, setSteps] = useState<EscalationPolicyStep[]>([
    { type: "SCHEDULE", scheduleId: "", label: "Primary schedule" },
  ]);

  const policiesQuery = useQuery({
    queryKey: ["escalation-policies"],
    queryFn: getEscalationPolicies,
    enabled: auth.isAuthenticated,
    retry: false,
  });

  const servicesQuery = useQuery({
    queryKey: ["services"],
    queryFn: getServices,
    enabled: auth.isAuthenticated && isAdmin,
    retry: false,
  });

  const schedulesQuery = useQuery({
    queryKey: ["schedules"],
    queryFn: getSchedules,
    enabled: auth.isAuthenticated && isAdmin,
    retry: false,
  });

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
    enabled: auth.isAuthenticated && isAdmin,
    retry: false,
  });

  const savePolicyMutation = useMutation({
    mutationFn: saveEscalationPolicy,
    onSuccess: async () => {
      toast.success("Escalation policy saved.");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["escalation-policies"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["services"],
        }),
      ]);
    },
    onError: (error) => {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message ?? "Unable to save escalation policy."
          : "Unable to save escalation policy.";

      toast.error(message);
    },
  });

  const availableServices = useMemo(() => servicesQuery.data ?? [], [servicesQuery.data]);
  const availableSchedules = useMemo(() => schedulesQuery.data ?? [], [schedulesQuery.data]);
  const availableUsers = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);

  function updateStep(index: number, nextStep: EscalationPolicyStep) {
    setSteps((current) => current.map((step, stepIndex) => (stepIndex === index ? nextStep : step)));
  }

  function addStep() {
    setSteps((current) => [
      ...current,
      { type: "USER", userId: "", label: `Fallback ${current.length + 1}` },
    ]);
  }

  function removeStep(index: number) {
    setSteps((current) => current.filter((_, stepIndex) => stepIndex !== index));
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Escalation Policies</h1>
        <p className="text-sm text-muted-foreground">
          Control who gets paged first, when escalation happens, and which schedule or user owns each fallback step.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr]">
        <Card>
          <CardHeader>
            <CardTitle>Configure policy</CardTitle>
            <CardDescription>
              Attach a service to a timeout-based escalation chain.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isAdmin ? (
              <p className="text-sm text-muted-foreground">
                You are signed in as an engineer, so policy editing is read-only.
              </p>
            ) : null}

            <div className="space-y-2">
              <Label>Service</Label>
              <Select
                disabled={!isAdmin || savePolicyMutation.isPending}
                onValueChange={setServiceId}
                value={serviceId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {availableServices.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeout-minutes">Timeout minutes</Label>
              <Input
                disabled={!isAdmin || savePolicyMutation.isPending}
                id="timeout-minutes"
                onChange={(event) => setTimeoutMinutes(event.target.value)}
                type="number"
                value={timeoutMinutes}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Escalation steps</Label>
                <Button
                  disabled={!isAdmin || savePolicyMutation.isPending || steps.length >= 10}
                  onClick={addStep}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Add step
                </Button>
              </div>

              {steps.map((step, index) => (
                <div
                  key={`step-${index}`}
                  className="space-y-3 rounded-lg border border-border bg-muted/20 p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Step {index + 1}</p>
                    {steps.length > 1 ? (
                      <Button
                        disabled={!isAdmin || savePolicyMutation.isPending}
                        onClick={() => removeStep(index)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label>Target type</Label>
                    <Select
                      disabled={!isAdmin || savePolicyMutation.isPending}
                      onValueChange={(value) =>
                        updateStep(index, {
                          type: value as EscalationPolicyStep["type"],
                          label: step.label,
                          userId: value === "USER" ? step.userId : undefined,
                          scheduleId: value === "SCHEDULE" ? step.scheduleId : undefined,
                        })
                      }
                      value={step.type}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USER">User</SelectItem>
                        <SelectItem value="SCHEDULE">Schedule</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {step.type === "USER" ? (
                    <div className="space-y-2">
                      <Label>Target user</Label>
                      <Select
                        disabled={!isAdmin || savePolicyMutation.isPending}
                        onValueChange={(value) =>
                          updateStep(index, {
                            ...step,
                            userId: value,
                          })
                        }
                        value={step.userId ?? ""}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Target schedule</Label>
                      <Select
                        disabled={!isAdmin || savePolicyMutation.isPending}
                        onValueChange={(value) =>
                          updateStep(index, {
                            ...step,
                            scheduleId: value,
                          })
                        }
                        value={step.scheduleId ?? ""}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select schedule" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSchedules.map((schedule) => (
                            <SelectItem key={schedule.id} value={schedule.id}>
                              {schedule.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input
                      disabled={!isAdmin || savePolicyMutation.isPending}
                      onChange={(event) =>
                        updateStep(index, {
                          ...step,
                          label: event.target.value,
                        })
                      }
                      placeholder="Primary schedule"
                      value={step.label ?? ""}
                    />
                  </div>
                </div>
              ))}
            </div>

            <Button
              className="w-full"
              disabled={
                !isAdmin ||
                savePolicyMutation.isPending ||
                !serviceId ||
                !Number.isFinite(Number(timeoutMinutes)) ||
                steps.some(
                  (step) =>
                    (step.type === "USER" && !step.userId) ||
                    (step.type === "SCHEDULE" && !step.scheduleId)
                )
              }
              onClick={() =>
                savePolicyMutation.mutate({
                  serviceId,
                  timeoutMinutes: Number(timeoutMinutes),
                  steps,
                })
              }
              type="button"
            >
              {savePolicyMutation.isPending ? "Saving..." : "Save policy"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Policy registry</CardTitle>
            <CardDescription>
              Existing service escalation chains and timeout settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {policiesQuery.isLoading || auth.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : policiesQuery.data && policiesQuery.data.length > 0 ? (
              <div className="space-y-4">
                {policiesQuery.data.map((policy) => (
                  <PolicyCard key={policy.id} policy={policy} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No escalation policies saved yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
