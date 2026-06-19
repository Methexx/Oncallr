import { IncidentDetailView } from "@/features/incidents/incident-detail-view";

interface IncidentDetailsPageProps {
  params: Promise<{
    incidentId: string;
  }>;
}

export default async function IncidentDetailsPage({
  params,
}: IncidentDetailsPageProps) {
  const { incidentId } = await params;

  return <IncidentDetailView incidentId={incidentId} />;
}
