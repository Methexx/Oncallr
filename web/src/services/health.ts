import { apiClient } from "@/lib/api-client";
import { HealthStatus } from "@/types/health";

export async function getHealthStatus() {
  const { data } = await apiClient.get<HealthStatus>("/health");
  return data;
}
