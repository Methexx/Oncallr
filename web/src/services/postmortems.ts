import { apiClient } from "@/lib/api-client";
import { Incident } from "@/types/incident";
import { Postmortem, PostmortemContent } from "@/types/postmortem";

interface PostmortemListResponse {
  incidents: Incident[];
}

interface PostmortemDetailResponse {
  incident: Incident;
  postmortem: Postmortem | null;
}

interface PostmortemResponse {
  postmortem: Postmortem;
}

export async function getPostmortemIncidents() {
  const { data } = await apiClient.get<PostmortemListResponse>("/postmortems");
  return data.incidents;
}

export async function getPostmortemDetails(incidentId: string) {
  const { data } = await apiClient.get<PostmortemDetailResponse>(
    `/postmortems/${incidentId}`
  );
  return data;
}

export async function generatePostmortemDraft(incidentId: string) {
  const { data } = await apiClient.post<PostmortemResponse>(
    `/postmortems/${incidentId}/draft`
  );
  return data.postmortem;
}

export async function savePostmortem(
  incidentId: string,
  content: PostmortemContent
) {
  const { data } = await apiClient.put<PostmortemResponse>(
    `/postmortems/${incidentId}`,
    content
  );
  return data.postmortem;
}
