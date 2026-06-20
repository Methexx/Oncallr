import { randomUUID } from "crypto";
import { IncidentSeverity, UserRole } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { createIncident } from "../../services/incident-service";
import { AuthTokenPayload } from "../../types/auth";

const createServiceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2_000).optional(),
});

const serviceParamsSchema = z.object({
  serviceId: z.string().uuid(),
});

const createManualIncidentSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(5_000).optional(),
  severity: z.nativeEnum(IncidentSeverity),
});

export const serviceRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/",
    {
      preHandler: app.authenticate,
    },
    async () => {
      const services = await app.prisma.service.findMany({
        include: {
          escalationPolicy: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return {
        services,
      };
    }
  );

  app.get(
    "/:serviceId",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const { serviceId } = serviceParamsSchema.parse(request.params);

      const service = await app.prisma.service.findUnique({
        where: {
          id: serviceId,
        },
        include: {
          escalationPolicy: true,
          incidents: {
            take: 10,
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

      if (!service) {
        return reply.code(404).send({
          message: "Service not found.",
        });
      }

      return {
        service,
      };
    }
  );

  app.post(
    "/",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const authUser = request.user as AuthTokenPayload;

      if (authUser.role !== UserRole.ADMIN) {
        return reply.code(403).send({
          message: "Only admins can create services.",
        });
      }

      const body = createServiceSchema.parse(request.body);

      const service = await app.prisma.service.create({
        data: {
          name: body.name,
          description: body.description,
          webhookToken: randomUUID(),
        },
        include: {
          escalationPolicy: true,
        },
      });

      return reply.code(201).send({
        service,
      });
    }
  );

  app.post(
    "/:serviceId/incidents",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const authUser = request.user as AuthTokenPayload;

      if (authUser.role !== UserRole.ADMIN) {
        return reply.code(403).send({
          message: "Only admins can trigger incidents manually.",
        });
      }

      const { serviceId } = serviceParamsSchema.parse(request.params);
      const body = createManualIncidentSchema.parse(request.body);

      const service = await app.prisma.service.findUnique({
        where: {
          id: serviceId,
        },
      });

      if (!service) {
        return reply.code(404).send({
          message: "Service not found.",
        });
      }

      const incident = await createIncident(app, {
        serviceId,
        title: body.title,
        description: body.description,
        severity: body.severity,
        source: "manual",
      });

      return reply.code(201).send({
        incident,
      });
    }
  );

  app.post(
    "/:serviceId/regenerate-webhook-token",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const authUser = request.user as AuthTokenPayload;

      if (authUser.role !== UserRole.ADMIN) {
        return reply.code(403).send({
          message: "Only admins can regenerate webhook tokens.",
        });
      }

      const { serviceId } = serviceParamsSchema.parse(request.params);

      const service = await app.prisma.service.findUnique({
        where: {
          id: serviceId,
        },
      });

      if (!service) {
        return reply.code(404).send({
          message: "Service not found.",
        });
      }

      const updatedService = await app.prisma.service.update({
        where: {
          id: serviceId,
        },
        data: {
          webhookToken: randomUUID(),
        },
        include: {
          escalationPolicy: true,
          incidents: {
            take: 10,
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

      return {
        service: updatedService,
      };
    }
  );
};
