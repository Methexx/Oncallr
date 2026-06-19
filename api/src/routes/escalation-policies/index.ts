import { EscalationTargetType, UserRole } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AuthTokenPayload } from "../../types/auth";

const escalationStepSchema = z
  .object({
    type: z.nativeEnum(EscalationTargetType),
    userId: z.string().uuid().optional(),
    scheduleId: z.string().uuid().optional(),
    label: z.string().trim().max(120).optional(),
  })
  .superRefine((step, context) => {
    if (step.type === EscalationTargetType.USER && !step.userId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "User step requires a userId.",
        path: ["userId"],
      });
    }

    if (step.type === EscalationTargetType.SCHEDULE && !step.scheduleId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Schedule step requires a scheduleId.",
        path: ["scheduleId"],
      });
    }
  });

const policyPayloadSchema = z.object({
  serviceId: z.string().uuid(),
  timeoutMinutes: z.coerce.number().int().min(1).max(240),
  steps: z.array(escalationStepSchema).min(1).max(10),
});

export const escalationPolicyRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/",
    {
      preHandler: app.authenticate,
    },
    async () => {
      const policies = await app.prisma.escalationPolicy.findMany({
        include: {
          service: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return {
        policies,
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
          message: "Only admins can configure escalation policies.",
        });
      }

      const body = policyPayloadSchema.parse(request.body);

      const service = await app.prisma.service.findUnique({
        where: {
          id: body.serviceId,
        },
      });

      if (!service) {
        return reply.code(404).send({
          message: "Service not found.",
        });
      }

      const userIds = body.steps
        .map((step) => step.userId)
        .filter((value): value is string => Boolean(value));
      const scheduleIds = body.steps
        .map((step) => step.scheduleId)
        .filter((value): value is string => Boolean(value));

      if (userIds.length > 0) {
        const users = await app.prisma.user.findMany({
          where: {
            id: {
              in: userIds,
            },
          },
          select: {
            id: true,
          },
        });

        if (users.length !== new Set(userIds).size) {
          return reply.code(400).send({
            message: "One or more selected users do not exist.",
          });
        }
      }

      if (scheduleIds.length > 0) {
        const schedules = await app.prisma.schedule.findMany({
          where: {
            id: {
              in: scheduleIds,
            },
          },
          select: {
            id: true,
          },
        });

        if (schedules.length !== new Set(scheduleIds).size) {
          return reply.code(400).send({
            message: "One or more selected schedules do not exist.",
          });
        }
      }

      const policy = await app.prisma.escalationPolicy.upsert({
        where: {
          serviceId: body.serviceId,
        },
        update: {
          timeoutMinutes: body.timeoutMinutes,
          steps: body.steps,
        },
        create: {
          serviceId: body.serviceId,
          timeoutMinutes: body.timeoutMinutes,
          steps: body.steps,
        },
        include: {
          service: true,
        },
      });

      return reply.code(201).send({
        policy,
      });
    }
  );
};
