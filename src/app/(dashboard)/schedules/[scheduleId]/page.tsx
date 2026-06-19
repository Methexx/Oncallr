interface ScheduleDetailsPageProps {
  params: Promise<{
    scheduleId: string;
  }>;
}

export default async function ScheduleDetailsPage({
  params,
}: ScheduleDetailsPageProps) {
  const { scheduleId } = await params;

  return (
    <section className="text-sm text-muted-foreground">
      Schedule details page for {scheduleId}
    </section>
  );
}
