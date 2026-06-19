import { IncidentStatus } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { cancelEscalationCheck } from "../../services/escalation-service";
import { AuthTokenPayload } from "../../types/auth";

const incidentParamsSchema = z.object({
  incidentId: z.string().uuid(),
});

export const incidentRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/my",
    {
      preHandler: app.authenticate,
    },
    async (request) => {
      const authUser = request.user as AuthTokenPayload;
      const incidents = await app.prisma.incident.findMany({
        where: {
          currentAssigneeId: authUser.sub,
        },
        include: {
          service: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return {
        incidents,
      };
    }
  );

  app.post(
    "/:incidentId/acknowledge",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const authUser = request.user as AuthTokenPayload;
      const { incidentId } = incidentParamsSchema.parse(request.params);

      const incident = await app.prisma.incident.findUnique({
        where: {
          id: incidentId,
        },
      });

      if (!incident) {
        return reply.code(404).send({
          message: "Incident not found.",
        });
      }

      if (
        incident.currentAssigneeId !== authUser.sub &&
        authUser.role !== "ADMIN"
      ) {
        return reply.code(403).send({
          message: "You cannot acknowledge this incident.",
        });
      }

      const updatedIncident = await app.prisma.incident.update({
        where: {
          id: incidentId,
        },
        data: {
          status: IncidentStatus.ACKNOWLEDGED,
          acknowledgedAt: new Date(),
          acknowledgedById: authUser.sub,
        },
      });

      await app.prisma.incidentEvent.create({
        data: {
          incidentId,
          actorId: authUser.sub,
          type: "ACKNOWLEDGED",
          message: "Incident acknowledged by the current assignee.",
        },
      });

      await cancelEscalationCheck(app, incidentId);

      return {
        incident: updatedIncident,
      };
    }
  );
};
