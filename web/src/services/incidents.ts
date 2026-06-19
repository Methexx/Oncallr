import { apiClient } from "@/lib/api-client";
import { Incident, IncidentEvent } from "@/types/incident";

interface MyIncidentsResponse {
  incidents: Incident[];
}

interface IncidentResponse {
  incident: Incident;
}

interface IncidentEventResponse {
  event: IncidentEvent;
}

export async function getMyIncidents() {
  const { data } = await apiClient.get<MyIncidentsResponse>("/incidents/my");
  return data.incidents;
}

export async function getAllIncidents(
  status?: "TRIGGERED" | "ACKNOWLEDGED" | "RESOLVED"
) {
  const { data } = await apiClient.get<MyIncidentsResponse>("/incidents", {
    params: status ? { status } : undefined,
  });
  return data.incidents;
}

export async function acknowledgeIncident(incidentId: string) {
  const { data } = await apiClient.post<IncidentResponse>(
    `/incidents/${incidentId}/acknowledge`
  );
  return data.incident;
}

export async function getIncidentDetails(incidentId: string) {
  const { data } = await apiClient.get<IncidentResponse>(`/incidents/${incidentId}`);
  return data.incident;
}

export async function addIncidentComment(
  incidentId: string,
  message: string
) {
  const { data } = await apiClient.post<IncidentEventResponse>(
    `/incidents/${incidentId}/comments`,
    { message }
  );
  return data.event;
}

export async function resolveIncident(
  incidentId: string,
  resolutionNote?: string
) {
  const { data } = await apiClient.post<IncidentResponse>(
    `/incidents/${incidentId}/resolve`,
    resolutionNote ? { resolutionNote } : {}
  );
  return data.incident;
}
