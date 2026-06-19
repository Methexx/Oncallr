import { apiClient } from "@/lib/api-client";
import { Service } from "@/types/service";

interface ServicesResponse {
  services: Service[];
}

interface ServiceResponse {
  service: Service;
}

interface CreateServiceInput {
  name: string;
  description?: string;
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
