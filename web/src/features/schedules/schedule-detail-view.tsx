"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useState } from "react";
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
import {
  getScheduleDetails,
  swapScheduleShifts,
  updateSchedule,
  updateScheduleShift,
} from "@/services/schedules";
import { Schedule } from "@/types/schedule";

interface ScheduleDetailViewProps {
  scheduleId: string;
}

interface RotationEditorProps {
  isSaving: boolean;
  onSave: (input: {
    scheduleId: string;
    name: string;
    timeZone: string;
    rotationLengthDays: number;
    members: Array<{ userId: string }>;
  }) => void;
  schedule: Schedule;
}

interface ShiftOverrideManagerProps {
  isSavingOverride: boolean;
  isSavingSwap: boolean;
  onSwap: (input: {
    scheduleId: string;
    firstShiftId: string;
    secondShiftId: string;
  }) => void;
  onOverride: (input: {
    scheduleId: string;
    shiftId: string;
    userId: string;
    startTime: string;
    endTime: string;
  }) => void;
  schedule: Schedule;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoFromLocal(value: string) {
  return new Date(value).toISOString();
}

function RotationEditor({
  isSaving,
  onSave,
  schedule,
}: RotationEditorProps) {
  const [name, setName] = useState(schedule.name);
  const [timeZone, setTimeZone] = useState(schedule.timeZone);
  const [rotationLengthDays, setRotationLengthDays] = useState(
    String(schedule.rotationLengthDays)
  );
  const [selectedUserIds, setSelectedUserIds] = useState(
    schedule.members.map((member) => member.userId)
  );

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
          Update member order and regenerate future shifts from the next available window.
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
            {schedule.members.map((member) => {
              const selected = selectedUserIds.includes(member.userId);

              return (
                <button
                  key={member.userId}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    selected
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                  onClick={() => toggleUser(member.userId)}
                  type="button"
                >
                  <span>
                    {member.user.name}
                    <span className="ml-2 text-xs opacity-80">{member.user.role}</span>
                  </span>
                  <span className="text-xs opacity-80">{member.user.email}</span>
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
                const user = schedule.members.find((entry) => entry.userId === userId)?.user;
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
              scheduleId: schedule.id,
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

function ShiftOverrideManager({
  isSavingOverride,
  isSavingSwap,
  onSwap,
  onOverride,
  schedule,
}: ShiftOverrideManagerProps) {
  const futureShifts = schedule.oncallShifts.filter(
    (shift) => new Date(shift.startTime) > new Date()
  );
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [overrideUserId, setOverrideUserId] = useState(
    futureShifts[0]?.userId ?? schedule.members[0]?.userId ?? ""
  );
  const [overrideStartTime, setOverrideStartTime] = useState(
    futureShifts[0] ? toDateTimeLocalValue(futureShifts[0].startTime) : ""
  );
  const [overrideEndTime, setOverrideEndTime] = useState(
    futureShifts[0] ? toDateTimeLocalValue(futureShifts[0].endTime) : ""
  );
  const [firstSwapShiftId, setFirstSwapShiftId] = useState(futureShifts[0]?.id ?? "");
  const [secondSwapShiftId, setSecondSwapShiftId] = useState(futureShifts[1]?.id ?? "");

  function startEditing(shiftId: string) {
    const shift = futureShifts.find((entry) => entry.id === shiftId);

    if (!shift) {
      return;
    }

    setEditingShiftId(shiftId);
    setOverrideUserId(shift.userId);
    setOverrideStartTime(toDateTimeLocalValue(shift.startTime));
    setOverrideEndTime(toDateTimeLocalValue(shift.endTime));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shift overrides</CardTitle>
        <CardDescription>
          Reassign one future shift or swap two future shifts without rebuilding the whole rotation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Future shifts</p>
            <Badge variant="outline">{futureShifts.length} available</Badge>
          </div>

          {futureShifts.length > 0 ? (
            <div className="space-y-3">
              {futureShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="rounded-lg border border-border bg-background p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{shift.user.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(shift.startTime)} - {formatDate(shift.endTime)}
                      </p>
                    </div>
                    <Button
                      onClick={() => startEditing(shift.id)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Override shift
                    </Button>
                  </div>

                  {editingShiftId === shift.id ? (
                    <div className="mt-4 grid gap-4 rounded-lg border border-border bg-muted/20 p-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`override-user-${shift.id}`}>Responder</Label>
                        <select
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          id={`override-user-${shift.id}`}
                          onChange={(event) => setOverrideUserId(event.target.value)}
                          value={overrideUserId}
                        >
                          {schedule.members.map((member) => (
                            <option key={member.userId} value={member.userId}>
                              {member.user.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`override-start-${shift.id}`}>Start time</Label>
                        <Input
                          id={`override-start-${shift.id}`}
                          onChange={(event) => setOverrideStartTime(event.target.value)}
                          type="datetime-local"
                          value={overrideStartTime}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`override-end-${shift.id}`}>End time</Label>
                        <Input
                          id={`override-end-${shift.id}`}
                          onChange={(event) => setOverrideEndTime(event.target.value)}
                          type="datetime-local"
                          value={overrideEndTime}
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <Button
                          disabled={
                            isSavingOverride ||
                            overrideUserId.length === 0 ||
                            overrideStartTime.length === 0 ||
                            overrideEndTime.length === 0
                          }
                          onClick={() =>
                            onOverride({
                              scheduleId: schedule.id,
                              shiftId: shift.id,
                              userId: overrideUserId,
                              startTime: toIsoFromLocal(overrideStartTime),
                              endTime: toIsoFromLocal(overrideEndTime),
                            })
                          }
                          type="button"
                        >
                          {isSavingOverride ? "Saving..." : "Save override"}
                        </Button>
                        <Button
                          onClick={() => setEditingShiftId(null)}
                          type="button"
                          variant="ghost"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No future shifts are available to override yet.
            </p>
          )}
        </div>

        <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
          <div className="space-y-1">
            <p className="font-medium">Swap two future shifts</p>
            <p className="text-sm text-muted-foreground">
              Useful for handoffs without editing each shift separately.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="swap-first-shift">First shift</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                id="swap-first-shift"
                onChange={(event) => setFirstSwapShiftId(event.target.value)}
                value={firstSwapShiftId}
              >
                <option value="">Choose a shift</option>
                {futureShifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.user.name} - {formatDate(shift.startTime)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="swap-second-shift">Second shift</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                id="swap-second-shift"
                onChange={(event) => setSecondSwapShiftId(event.target.value)}
                value={secondSwapShiftId}
              >
                <option value="">Choose a shift</option>
                {futureShifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.user.name} - {formatDate(shift.startTime)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button
            disabled={
              isSavingSwap ||
              firstSwapShiftId.length === 0 ||
              secondSwapShiftId.length === 0 ||
              firstSwapShiftId === secondSwapShiftId
            }
            onClick={() =>
              onSwap({
                scheduleId: schedule.id,
                firstShiftId: firstSwapShiftId,
                secondShiftId: secondSwapShiftId,
              })
            }
            type="button"
            variant="secondary"
          >
            {isSavingSwap ? "Swapping..." : "Swap shifts"}
          </Button>
        </div>
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

  const refreshSchedule = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["schedules"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["schedules", "detail", scheduleId],
      }),
    ]);
  };

  const updateScheduleMutation = useMutation({
    mutationFn: updateSchedule,
    onSuccess: async () => {
      toast.success("Schedule updated and future shifts regenerated.");
      await refreshSchedule();
    },
    onError: (error) => {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message ?? "Unable to update schedule."
          : "Unable to update schedule.";

      toast.error(message);
    },
  });

  const updateShiftMutation = useMutation({
    mutationFn: updateScheduleShift,
    onSuccess: async () => {
      toast.success("Shift override saved.");
      await refreshSchedule();
    },
    onError: (error) => {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message ?? "Unable to override shift."
          : "Unable to override shift.";

      toast.error(message);
    },
  });

  const swapShiftMutation = useMutation({
    mutationFn: swapScheduleShifts,
    onSuccess: async () => {
      toast.success("Future shifts swapped.");
      await refreshSchedule();
    },
    onError: (error) => {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message ?? "Unable to swap shifts."
          : "Unable to swap shifts.";

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

  const schedule = scheduleQuery.data;

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
        <>
          <RotationEditor
            isSaving={updateScheduleMutation.isPending}
            key={`${schedule.id}:${schedule.updatedAt ?? schedule.createdAt}:rotation`}
            onSave={(input) => updateScheduleMutation.mutate(input)}
            schedule={schedule}
          />
          <ShiftOverrideManager
            isSavingOverride={updateShiftMutation.isPending}
            isSavingSwap={swapShiftMutation.isPending}
            key={`${schedule.id}:${schedule.updatedAt ?? schedule.createdAt}:shifts`}
            onOverride={(input) => updateShiftMutation.mutate(input)}
            onSwap={(input) => swapShiftMutation.mutate(input)}
            schedule={schedule}
          />
        </>
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
