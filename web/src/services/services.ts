import { apiClient } from "@/lib/api-client";
import { Service } from "@/types/service";

interface ServicesResponse {
  services: Service[];
}

interface ServiceResponse {
  service: Service;
}

interface IncidentResponse {
  incident: {
    id: string;
    title: string;
    status: "TRIGGERED" | "ACKNOWLEDGED" | "RESOLVED";
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  };
}

interface CreateServiceInput {
  name: string;
  description?: string;
}

interface TriggerIncidentInput {
  serviceId: string;
  title: string;
  description?: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

export async function getServices() {
  const { data } = await apiClient.get<ServicesResponse>("/services");
  return data.services;
}

export async function createService(input: CreateServiceInput) {
  const { data } = await apiClient.post<ServiceResponse>("/services", input);
  return data.service;
}

export async function getServiceDetails(serviceId: string) {
  const { data } = await apiClient.get<ServiceResponse>(`/services/${serviceId}`);
  return data.service;
}

export async function triggerServiceIncident(input: TriggerIncidentInput) {
  const { data } = await apiClient.post<IncidentResponse>(
    `/services/${input.serviceId}/incidents`,
    {
      title: input.title,
      description: input.description,
      severity: input.severity,
    }
  );

  return data.incident;
}

export async function regenerateWebhookToken(serviceId: string) {
  const { data } = await apiClient.post<ServiceResponse>(
    `/services/${serviceId}/regenerate-webhook-token`
  );
  return data.service;
}
