import { apiClient } from "@/lib/api-client";
import { Incident } from "@/types/incident";

interface MyIncidentsResponse {
  incidents: Incident[];
}

export async function getMyIncidents() {
  const { data } = await apiClient.get<MyIncidentsResponse>("/incidents/my");
  return data.incidents;
}
