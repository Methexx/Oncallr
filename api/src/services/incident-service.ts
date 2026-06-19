import {
  IncidentEventType,
  IncidentSeverity,
  IncidentStatus,
} from "@prisma/client";
import { FastifyInstance } from "fastify";
import { triggerInitialEscalation } from "./escalation-service";

interface CreateIncidentInput {
  serviceId: string;
  title: string;
  description?: string;
  severity: IncidentSeverity;
}

export async function createIncidentFromWebhook(
  app: FastifyInstance,
  input: CreateIncidentInput
) {
  const incident = await app.prisma.$transaction(async (tx) => {
    const createdIncident = await tx.incident.create({
      data: {
        serviceId: input.serviceId,
        title: input.title,
        description: input.description,
        severity: input.severity,
        status: IncidentStatus.TRIGGERED,
      },
    });

    await tx.incidentEvent.create({
      data: {
        incidentId: createdIncident.id,
        type: IncidentEventType.CREATED,
        message: "Incident created from webhook ingestion.",
      },
    });

    return createdIncident;
  });

  await triggerInitialEscalation(app, incident.id);

  return incident;
}
