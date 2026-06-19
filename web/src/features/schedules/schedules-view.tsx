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
import { createSchedule, getSchedules } from "@/services/schedules";
import { getUsers } from "@/services/users";
import { Schedule } from "@/types/schedule";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ScheduleCard({ schedule }: { schedule: Schedule }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Link className="underline-offset-4 hover:underline" href={`/schedules/${schedule.id}`}>
            {schedule.name}
          </Link>
        </CardTitle>
        <CardDescription>{schedule.timeZone}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {schedule.currentOnCall
              ? `On call now: ${schedule.currentOnCall.user.name}`
              : "No active shift"}
          </Badge>
          <Badge variant="outline">
            {schedule.members.length} rotation member{schedule.members.length === 1 ? "" : "s"}
          </Badge>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Rotation order
          </p>
          <div className="space-y-2">
            {schedule.members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm"
              >
                <span>
                  {member.rotationOrder}. {member.user.name}
                </span>
                <span className="text-muted-foreground">{member.user.email}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Upcoming shifts
          </p>
          <div className="space-y-2">
            {schedule.oncallShifts.slice(0, 4).map((shift) => (
              <div
                key={shift.id}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <p className="font-medium">{shift.user.name}</p>
                <p className="text-muted-foreground">
                  {formatDate(shift.startTime)} - {formatDate(shift.endTime)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SchedulesView() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [timeZone, setTimeZone] = useState("UTC");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const isAdmin = auth.user?.role === "ADMIN";

  const schedulesQuery = useQuery({
    queryKey: ["schedules"],
    queryFn: getSchedules,
    enabled: auth.isAuthenticated,
    retry: false,
  });

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
    enabled: auth.isAuthenticated && isAdmin,
    retry: false,
  });

  const createScheduleMutation = useMutation({
    mutationFn: createSchedule,
    onSuccess: async () => {
      setName("");
      setTimeZone("UTC");
      setSelectedUserIds([]);
      toast.success("Schedule created.");
      await queryClient.invalidateQueries({
        queryKey: ["schedules"],
      });
    },
    onError: (error) => {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message ?? "Unable to create schedule."
          : "Unable to create schedule.";

      toast.error(message);
    },
  });

  const availableUsers = useMemo(
    () => usersQuery.data ?? [],
    [usersQuery.data]
  );

  function toggleUser(userId: string) {
    setSelectedUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    );
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Schedules</h1>
        <p className="text-sm text-muted-foreground">
          Define on-call rotations, see who is on call now, and preview upcoming shifts.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create schedule</CardTitle>
            <CardDescription>
              Admins can create rotations and assign members in order.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isAdmin ? (
              <p className="text-sm text-muted-foreground">
                You are signed in as an engineer, so schedule creation is read-only.
              </p>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="schedule-name">Schedule name</Label>
              <Input
                disabled={!isAdmin || createScheduleMutation.isPending}
                id="schedule-name"
                onChange={(event) => setName(event.target.value)}
                placeholder="Primary Backend Rotation"
                value={name}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule-time-zone">Time zone</Label>
              <Input
                disabled={!isAdmin || createScheduleMutation.isPending}
                id="schedule-time-zone"
                onChange={(event) => setTimeZone(event.target.value)}
                placeholder="UTC"
                value={timeZone}
              />
            </div>

            <div className="space-y-2">
              <Label>Rotation members</Label>
              {usersQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
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
                        disabled={!isAdmin || createScheduleMutation.isPending}
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
              )}
            </div>

            {selectedUserIds.length > 0 ? (
              <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Rotation preview
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
                !isAdmin ||
                createScheduleMutation.isPending ||
                name.trim().length < 2 ||
                timeZone.trim().length < 2 ||
                selectedUserIds.length === 0
              }
              onClick={() =>
                createScheduleMutation.mutate({
                  name: name.trim(),
                  timeZone: timeZone.trim(),
                  members: selectedUserIds.map((userId) => ({ userId })),
                })
              }
              type="button"
            >
              {createScheduleMutation.isPending ? "Creating..." : "Create schedule"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule registry</CardTitle>
            <CardDescription>
              Current rotations, active assignees, and upcoming shifts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {schedulesQuery.isLoading || auth.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : schedulesQuery.data && schedulesQuery.data.length > 0 ? (
              <div className="space-y-4">
                {schedulesQuery.data.map((schedule) => (
                  <ScheduleCard key={schedule.id} schedule={schedule} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No schedules created yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
