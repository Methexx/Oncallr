import { ScheduleDetailView } from "@/features/schedules/schedule-detail-view";

interface ScheduleDetailsPageProps {
  params: Promise<{
    scheduleId: string;
  }>;
}

export default async function ScheduleDetailsPage({
  params,
}: ScheduleDetailsPageProps) {
  const { scheduleId } = await params;

  return <ScheduleDetailView scheduleId={scheduleId} />;
}
