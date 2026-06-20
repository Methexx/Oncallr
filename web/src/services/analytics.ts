import { apiClient } from "@/lib/api-client";
import { AnalyticsSummary } from "@/types/analytics";

interface AnalyticsResponse {
  summary: AnalyticsSummary;
}

export async function getAnalyticsOverview(days: number, serviceId?: string) {
  const { data } = await apiClient.get<AnalyticsResponse>("/analytics/overview", {
    params: {
      days,
      serviceId,
    },
  });

  return data.summary;
}
