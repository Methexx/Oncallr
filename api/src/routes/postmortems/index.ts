import type { Prisma } from "@prisma/client";
import { IncidentStatus, UserRole } from "@prisma/client";
import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  generatePostmortemDraftWithAi,
  isOpenAiConfigured,
} from "../../services/openai-service";
import { AuthTokenPayload } from "../../types/auth";

const incidentParamsSchema = z.object({
  incidentId: z.string().uuid(),
});

const postmortemContentSchema = z.object({
  summary: z.string().trim().min(1).max(10_000),
  impact: z.string().trim().min(1).max(10_000),
  rootCause: z.string().trim().min(1).max(10_000),
  resolution: z.string().trim().min(1).max(10_000),
  timelineHighlights: z.array(z.string().trim().min(1).max(2_000)).max(20),
  followUpActions: z.array(z.string().trim().min(1).max(2_000)).max(20),
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

function formatEventTypeLabel(type: string) {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function buildDraftContent(incident: {
  title: string;
  description: string | null;
  severity: string;
  createdAt: Date;
  resolvedAt: Date | null;
  service: {
    name: string;
  };
  events: Array<{
    type: string;
    message: string;
    createdAt: Date;
  }>;
}) {
  const timelineHighlights = incident.events.slice(0, 8).map((event) => {
    const timestamp = new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(event.createdAt);

    return `${timestamp} UTC - ${formatEventTypeLabel(event.type)}: ${event.message}`;
  });
  const commentEvents = incident.events.filter((event) => event.type === "COMMENTED");
  const latestComment = commentEvents.at(-1)?.message;

  return {
    summary:
      incident.description?.trim() ||
      `${incident.title} affected ${incident.service.name} and required active incident response.`,
    impact: `Severity ${incident.severity.toLowerCase()} incident on ${incident.service.name}. The incident opened at ${incident.createdAt.toISOString()} and resolved at ${
      incident.resolvedAt?.toISOString() ?? "an unknown time"
    }.`,
    rootCause:
      latestComment ??
      "Root cause analysis is still in progress. Review logs, deploy history, and infrastructure events.",
    resolution:
      commentEvents.length > 0
        ? commentEvents
            .slice(-2)
            .map((event) => event.message)
            .join("\n")
        : "Document the fix that restored service and the validation steps that confirmed recovery.",
    timelineHighlights,
    followUpActions: [
      `Add monitoring or alerts to catch similar ${incident.service.name} failures earlier.`,
      "Document the customer impact, blast radius, and communication timeline.",
      "Review whether escalation timing and ownership were correct for this incident.",
    ],
  } as Prisma.InputJsonValue;
}

async function getResolvedIncident(app: FastifyInstance, incidentId: string) {
  return app.prisma.incident.findUnique({
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
      postmortem: true,
    },
  });
}

export const postmortemRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/",
    {
      preHandler: app.authenticate,
    },
    async (request) => {
      const authUser = request.user as AuthTokenPayload;

      const incidents = await app.prisma.incident.findMany({
        where: {
          status: IncidentStatus.RESOLVED,
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
          resolvedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          postmortem: true,
        },
        orderBy: {
          resolvedAt: "desc",
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
      const incident = await getResolvedIncident(app, incidentId);

      if (!incident) {
        return reply.code(404).send({
          message: "Incident not found.",
        });
      }

      if (!canManageIncident(authUser, incident)) {
        return reply.code(403).send({
          message: "You cannot access this postmortem.",
        });
      }

      if (incident.status !== IncidentStatus.RESOLVED) {
        return reply.code(400).send({
          message: "Postmortems are available only after the incident is resolved.",
        });
      }

      return {
        incident,
        postmortem: incident.postmortem,
      };
    }
  );

  app.post(
    "/:incidentId/draft",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const authUser = request.user as AuthTokenPayload;
      const { incidentId } = incidentParamsSchema.parse(request.params);
      const incident = await getResolvedIncident(app, incidentId);

      if (!incident) {
        return reply.code(404).send({
          message: "Incident not found.",
        });
      }

      if (!canManageIncident(authUser, incident)) {
        return reply.code(403).send({
          message: "You cannot access this postmortem.",
        });
      }

      if (incident.status !== IncidentStatus.RESOLVED) {
        return reply.code(400).send({
          message: "Postmortems are available only after the incident is resolved.",
        });
      }

      let aiDraft: Prisma.InputJsonValue;

      if (isOpenAiConfigured(app)) {
        try {
          aiDraft = (await generatePostmortemDraftWithAi(
            app,
            incident
          )) as Prisma.InputJsonValue;
        } catch (error) {
          app.log.error({ err: error, incidentId }, "OpenAI postmortem generation failed.");
          return reply.code(502).send({
            message: "AI draft generation failed. Check the OpenAI configuration and try again.",
          });
        }
      } else {
        return reply.code(503).send({
          message: "OpenAI is not configured for AI postmortem generation yet.",
        });
      }

      const postmortem = await app.prisma.postmortem.upsert({
        where: {
          incidentId,
        },
        update: {
          aiDraft,
        },
        create: {
          incidentId,
          aiDraft,
        },
      });

      return reply.code(201).send({
        postmortem,
      });
    }
  );

  app.put(
    "/:incidentId",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const authUser = request.user as AuthTokenPayload;
      const { incidentId } = incidentParamsSchema.parse(request.params);
      const body = postmortemContentSchema.parse(request.body);
      const incident = await getResolvedIncident(app, incidentId);

      if (!incident) {
        return reply.code(404).send({
          message: "Incident not found.",
        });
      }

      if (!canManageIncident(authUser, incident)) {
        return reply.code(403).send({
          message: "You cannot access this postmortem.",
        });
      }

      if (incident.status !== IncidentStatus.RESOLVED) {
        return reply.code(400).send({
          message: "Postmortems are available only after the incident is resolved.",
        });
      }

      const postmortem = await app.prisma.postmortem.upsert({
        where: {
          incidentId,
        },
        update: {
          finalContent: body as Prisma.InputJsonValue,
        },
        create: {
          incidentId,
          aiDraft: incident.postmortem?.aiDraft ?? buildDraftContent(incident),
          finalContent: body as Prisma.InputJsonValue,
        },
      });

      return {
        postmortem,
      };
    }
  );
};
