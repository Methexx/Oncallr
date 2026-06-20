import { IncidentEventType, IncidentStatus, UserRole } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  cancelEscalationCheck,
  processEscalationJob,
} from "../../services/escalation-service";
import { emitIncidentUpdate } from "../../services/socket-service";
import { AuthTokenPayload } from "../../types/auth";

const incidentParamsSchema = z.object({
  incidentId: z.string().uuid(),
});

const incidentListQuerySchema = z.object({
  status: z.enum(["TRIGGERED", "ACKNOWLEDGED", "RESOLVED"]).optional(),
  serviceId: z.string().uuid().optional(),
  assigneeId: z.union([z.string().uuid(), z.literal("unassigned")]).optional(),
  search: z.string().trim().max(200).optional(),
});

const incidentCommentSchema = z.object({
  message: z.string().trim().min(1).max(5_000),
});

const incidentResolveSchema = z.object({
  resolutionNote: z.string().trim().max(5_000).optional(),
});

function canManageIncident(
  authUser: AuthTokenPayload,
  incident: {
    currentAssigneeId: string | null;
    acknowledgedById: string | null;
    resolvedById: string | null;
  }
) {
  return (
    authUser.role === UserRole.ADMIN ||
    incident.currentAssigneeId === authUser.sub ||
    incident.acknowledgedById === authUser.sub ||
    incident.resolvedById === authUser.sub
  );
}

export const incidentRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/",
    {
      preHandler: app.authenticate,
    },
    async (request) => {
      const authUser = request.user as AuthTokenPayload;
      const query = incidentListQuerySchema.parse(request.query);

      const incidents = await app.prisma.incident.findMany({
        where: {
          ...(query.status ? { status: query.status } : {}),
          ...(query.serviceId ? { serviceId: query.serviceId } : {}),
          ...(query.assigneeId
            ? query.assigneeId === "unassigned"
              ? { currentAssigneeId: null }
              : { currentAssigneeId: query.assigneeId }
            : {}),
          ...(query.search
            ? {
                OR: [
                  {
                    title: {
                      contains: query.search,
                      mode: "insensitive",
                    },
                  },
                  {
                    description: {
                      contains: query.search,
                      mode: "insensitive",
                    },
                  },
                  {
                    service: {
                      name: {
                        contains: query.search,
                        mode: "insensitive",
                      },
                    },
                  },
                ],
              }
            : {}),
          ...(authUser.role === UserRole.ADMIN
            ? {}
            : {
                OR: [
                  { currentAssigneeId: authUser.sub },
                  { acknowledgedById: authUser.sub },
                  { resolvedById: authUser.sub },
                ],
              }),
        },
        include: {
          service: true,
          currentAssignee: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
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
          currentAssignee: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
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

  app.get(
    "/:incidentId",
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
        include: {
          service: true,
          currentAssignee: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          acknowledgedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          resolvedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          events: {
            include: {
              actor: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

      if (!incident) {
        return reply.code(404).send({
          message: "Incident not found.",
        });
      }

      if (!canManageIncident(authUser, incident)) {
        return reply.code(403).send({
          message: "You cannot view this incident.",
        });
      }

      return {
        incident,
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
        include: {
          service: true,
          currentAssignee: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!incident) {
        return reply.code(404).send({
          message: "Incident not found.",
        });
      }

      if (!canManageIncident(authUser, incident)) {
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

      emitIncidentUpdate(
        app,
        {
          incidentId: updatedIncident.id,
          title: updatedIncident.title,
          severity: updatedIncident.severity,
          serviceName: incident.service.name,
          status: IncidentStatus.ACKNOWLEDGED,
          currentAssigneeId: updatedIncident.currentAssigneeId,
          currentAssigneeName: incident.currentAssignee?.name ?? null,
          escalationStepIndex: updatedIncident.escalationStepIndex,
          updateType: "ACKNOWLEDGED",
        },
        {
          userIds: [incident.currentAssigneeId, authUser.sub],
          includeAdmins: true,
        }
      );

      return {
        incident: updatedIncident,
      };
    }
  );

  app.post(
    "/:incidentId/comments",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const authUser = request.user as AuthTokenPayload;
      const { incidentId } = incidentParamsSchema.parse(request.params);
      const body = incidentCommentSchema.parse(request.body);

      const incident = await app.prisma.incident.findUnique({
        where: {
          id: incidentId,
        },
        include: {
          service: true,
          currentAssignee: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!incident) {
        return reply.code(404).send({
          message: "Incident not found.",
        });
      }

      if (!canManageIncident(authUser, incident)) {
        return reply.code(403).send({
          message: "You cannot comment on this incident.",
        });
      }

      const event = await app.prisma.incidentEvent.create({
        data: {
          incidentId,
          actorId: authUser.sub,
          type: IncidentEventType.COMMENTED,
          message: body.message,
        },
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      return reply.code(201).send({
        event,
      });
    }
  );

  app.post(
    "/:incidentId/resolve",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const authUser = request.user as AuthTokenPayload;
      const { incidentId } = incidentParamsSchema.parse(request.params);
      const body = incidentResolveSchema.parse(request.body);

      const incident = await app.prisma.incident.findUnique({
        where: {
          id: incidentId,
        },
        include: {
          service: true,
          currentAssignee: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!incident) {
        return reply.code(404).send({
          message: "Incident not found.",
        });
      }

      if (!canManageIncident(authUser, incident)) {
        return reply.code(403).send({
          message: "You cannot resolve this incident.",
        });
      }

      const updatedIncident = await app.prisma.$transaction(async (tx) => {
        if (body.resolutionNote) {
          await tx.incidentEvent.create({
            data: {
              incidentId,
              actorId: authUser.sub,
              type: IncidentEventType.COMMENTED,
              message: body.resolutionNote,
            },
          });
        }

        const resolvedIncident = await tx.incident.update({
          where: {
            id: incidentId,
          },
          data: {
            status: IncidentStatus.RESOLVED,
            resolvedAt: new Date(),
            resolvedById: authUser.sub,
          },
        });

        await tx.incidentEvent.create({
          data: {
            incidentId,
            actorId: authUser.sub,
            type: IncidentEventType.RESOLVED,
            message: "Incident resolved.",
          },
        });

        return resolvedIncident;
      });

      await cancelEscalationCheck(app, incidentId);

      emitIncidentUpdate(
        app,
        {
          incidentId: updatedIncident.id,
          title: updatedIncident.title,
          severity: updatedIncident.severity,
          serviceName: incident.service.name,
          status: IncidentStatus.RESOLVED,
          currentAssigneeId: updatedIncident.currentAssigneeId,
          currentAssigneeName: incident.currentAssignee?.name ?? null,
          escalationStepIndex: updatedIncident.escalationStepIndex,
          updateType: "RESOLVED",
        },
        {
          userIds: [incident.currentAssigneeId, authUser.sub],
          includeAdmins: true,
        }
      );

      return {
        incident: updatedIncident,
      };
    }
  );

  app.post(
    "/:incidentId/escalate-now",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const authUser = request.user as AuthTokenPayload;
      const { incidentId } = incidentParamsSchema.parse(request.params);

      if (authUser.role !== UserRole.ADMIN) {
        return reply.code(403).send({
          message: "Only admins can force an escalation step.",
        });
      }

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

      if (incident.status !== IncidentStatus.TRIGGERED) {
        return reply.code(400).send({
          message: "Only triggered incidents can be escalated.",
        });
      }

      await cancelEscalationCheck(app, incidentId);
      await processEscalationJob(
        app,
        {
          incidentId,
        },
        {
          skipReschedule: false,
        }
      );

      const refreshedIncident = await app.prisma.incident.findUnique({
        where: {
          id: incidentId,
        },
      });

      return {
        incident: refreshedIncident,
      };
    }
  );
};
