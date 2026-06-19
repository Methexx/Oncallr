import { IncidentListView } from "@/features/incidents/incident-list-view";

export default function IncidentsPage() {
  return (
    <IncidentListView
      description="Browse accessible incidents across services, regardless of current assignment."
      mode="all"
      title="Incidents"
    />
  );
}
