import { IncidentListView } from "@/features/incidents/incident-list-view";

export default function MyIncidentsPage() {
  return (
    <IncidentListView
      description="Track incidents currently assigned to you and jump into the timeline fast."
      mode="assigned"
      title="My Incidents"
    />
  );
}
