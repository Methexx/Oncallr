import { IncidentSeverity } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { createIncidentFromWebhook } from "../../services/incident-service";

const webhookParamsSchema = z.object({
  webhookToken: z.string().uuid(),
});

const createIncidentSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().max(5_000).optional(),
  severity: z.nativeEnum(IncidentSeverity),
});

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/incidents/:webhookToken",
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const { webhookToken } = webhookParamsSchema.parse(request.params);
      const body = createIncidentSchema.parse(request.body);

      const service = await app.prisma.service.findUnique({
        where: {
          webhookToken,
        },
        include: {
          escalationPolicy: true,
        },
      });

      if (!service) {
        return reply.code(404).send({
          message: "Service webhook not found.",
        });
      }

      const incident = await createIncidentFromWebhook(app, {
        serviceId: service.id,
        title: body.title,
        description: body.description,
        severity: body.severity,
      });

      return reply.code(201).send({
        incidentId: incident.id,
        status: incident.status,
      });
    }
  );
};
