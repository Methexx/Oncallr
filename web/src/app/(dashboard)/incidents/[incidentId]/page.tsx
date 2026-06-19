interface IncidentDetailsPageProps {
  params: Promise<{
    incidentId: string;
  }>;
}

export default async function IncidentDetailsPage({
  params,
}: IncidentDetailsPageProps) {
  const { incidentId } = await params;

  return (
    <section className="text-sm text-muted-foreground">
      Incident details page for {incidentId}
    </section>
  );
}
