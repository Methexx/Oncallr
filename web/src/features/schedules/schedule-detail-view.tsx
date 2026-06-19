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
import { getScheduleDetails } from "@/services/schedules";

interface ScheduleDetailViewProps {
  scheduleId: string;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ScheduleDetailView({ scheduleId }: ScheduleDetailViewProps) {
  const scheduleQuery = useQuery({
    queryKey: ["schedules", "detail", scheduleId],
    queryFn: () => getScheduleDetails(scheduleId),
    retry: false,
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
          <Badge variant="secondary">
            {schedule.currentOnCall
              ? `On call now: ${schedule.currentOnCall.user.name}`
              : "No active shift"}
          </Badge>
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
