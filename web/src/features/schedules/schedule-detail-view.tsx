"use client";

import Link from "next/link";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { getScheduleDetails, updateSchedule } from "@/services/schedules";
import { getUsers } from "@/services/users";

interface ScheduleDetailViewProps {
  scheduleId: string;
}

interface ScheduleEditorProps {
  scheduleId: string;
  initialName: string;
  initialTimeZone: string;
  initialRotationLengthDays: number;
  initialUserIds: string[];
  availableUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
  }>;
  isSaving: boolean;
  onSave: (input: {
    scheduleId: string;
    name: string;
    timeZone: string;
    rotationLengthDays: number;
    members: Array<{ userId: string }>;
  }) => void;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ScheduleEditor({
  scheduleId,
  initialName,
  initialTimeZone,
  initialRotationLengthDays,
  initialUserIds,
  availableUsers,
  isSaving,
  onSave,
}: ScheduleEditorProps) {
  const [name, setName] = useState(initialName);
  const [timeZone, setTimeZone] = useState(initialTimeZone);
  const [rotationLengthDays, setRotationLengthDays] = useState(
    String(initialRotationLengthDays)
  );
  const [selectedUserIds, setSelectedUserIds] = useState(initialUserIds);

  function toggleUser(userId: string) {
    setSelectedUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit rotation</CardTitle>
        <CardDescription>
          Update the member order and regenerate future shifts from the next available window.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="schedule-name">Schedule name</Label>
            <Input
              id="schedule-name"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="schedule-timezone">Time zone</Label>
            <Input
              id="schedule-timezone"
              onChange={(event) => setTimeZone(event.target.value)}
              value={timeZone}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rotation-length">Rotation length (days)</Label>
            <Input
              id="rotation-length"
              min={1}
              onChange={(event) => setRotationLengthDays(event.target.value)}
              type="number"
              value={rotationLengthDays}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Rotation members</Label>
          <div className="space-y-2">
            {availableUsers.map((user) => {
              const selected = selectedUserIds.includes(user.id);

              return (
                <button
                  key={user.id}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    selected
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                  onClick={() => toggleUser(user.id)}
                  type="button"
                >
                  <span>
                    {user.name}
                    <span className="ml-2 text-xs opacity-80">{user.role}</span>
                  </span>
                  <span className="text-xs opacity-80">{user.email}</span>
                </button>
              );
            })}
          </div>
        </div>

        {selectedUserIds.length > 0 ? (
          <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Regenerated order
            </p>
            <div className="space-y-1 text-sm">
              {selectedUserIds.map((userId, index) => {
                const user = availableUsers.find((entry) => entry.id === userId);
                return (
                  <p key={userId}>
                    {index + 1}. {user?.name ?? "Unknown user"}
                  </p>
                );
              })}
            </div>
          </div>
        ) : null}

        <Button
          className="w-full"
          disabled={
            isSaving ||
            name.trim().length < 2 ||
            timeZone.trim().length < 2 ||
            Number(rotationLengthDays) < 1 ||
            selectedUserIds.length === 0
          }
          onClick={() =>
            onSave({
              scheduleId,
              name: name.trim(),
              timeZone: timeZone.trim(),
              rotationLengthDays: Number(rotationLengthDays),
              members: selectedUserIds.map((userId) => ({ userId })),
            })
          }
          type="button"
        >
          {isSaving ? "Regenerating..." : "Save and regenerate future shifts"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function ScheduleDetailView({ scheduleId }: ScheduleDetailViewProps) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = auth.user?.role === "ADMIN";

  const scheduleQuery = useQuery({
    queryKey: ["schedules", "detail", scheduleId],
    queryFn: () => getScheduleDetails(scheduleId),
    retry: false,
  });

  const usersQuery = useQuery({
    queryKey: ["users", "schedule-edit"],
    queryFn: getUsers,
    enabled: isAdmin,
    retry: false,
  });

  const availableUsers = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const schedule = scheduleQuery.data;

  const updateScheduleMutation = useMutation({
    mutationFn: updateSchedule,
    onSuccess: async () => {
      toast.success("Schedule updated and future shifts regenerated.");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["schedules"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["schedules", "detail", scheduleId],
        }),
      ]);
    },
    onError: (error) => {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message ?? "Unable to update schedule."
          : "Unable to update schedule.";

      toast.error(message);
    },
  });

  if (scheduleQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!schedule) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Schedule unavailable</CardTitle>
          <CardDescription>We could not load this schedule.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <Link
          className="text-sm font-medium text-muted-foreground underline underline-offset-4"
          href="/schedules"
        >
          Back to schedules
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">{schedule.name}</h1>
        <p className="text-sm text-muted-foreground">{schedule.timeZone}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current coverage</CardTitle>
          <CardDescription>
            Who is actively on call and what comes next.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {schedule.currentOnCall
                ? `On call now: ${schedule.currentOnCall.user.name}`
                : "No active shift"}
            </Badge>
            <Badge variant="outline">
              {schedule.rotationLengthDays} day rotation
            </Badge>
          </div>
          {schedule.currentOnCall ? (
            <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
              <p className="font-medium">{schedule.currentOnCall.user.name}</p>
              <p className="mt-1 text-muted-foreground">
                {formatDate(schedule.currentOnCall.startTime)} -{" "}
                {formatDate(schedule.currentOnCall.endTime)}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {isAdmin ? (
        usersQuery.isLoading ? (
          <Card>
            <CardContent className="space-y-2 pt-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ) : (
          <ScheduleEditor
            availableUsers={availableUsers}
            initialName={schedule.name}
            initialRotationLengthDays={schedule.rotationLengthDays}
            initialTimeZone={schedule.timeZone}
            initialUserIds={schedule.members.map((member) => member.userId)}
            isSaving={updateScheduleMutation.isPending}
            key={`${schedule.id}:${schedule.updatedAt ?? schedule.createdAt}`}
            onSave={(input) => updateScheduleMutation.mutate(input)}
            scheduleId={scheduleId}
          />
        )
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Rotation members</CardTitle>
          <CardDescription>
            Current member order for this schedule.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {schedule.members.map((member) => (
            <div
              key={member.userId}
              className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
            >
              <div>
                <p className="font-medium">
                  {member.rotationOrder}. {member.user.name}
                </p>
                <p className="text-sm text-muted-foreground">{member.user.email}</p>
              </div>
              <Badge variant="outline">{member.user.role}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming shifts</CardTitle>
          <CardDescription>
            Next scheduled on-call windows.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {schedule.oncallShifts.map((shift) => (
            <div
              key={shift.id}
              className="rounded-lg border border-border bg-background px-4 py-3"
            >
              <p className="font-medium">{shift.user.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(shift.startTime)} - {formatDate(shift.endTime)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
