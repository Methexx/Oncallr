import { addDays } from "date-fns";
import { UserRole } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AuthTokenPayload } from "../../types/auth";

const scheduleMemberSchema = z.object({
  userId: z.string().uuid(),
});

const createScheduleSchema = z.object({
  name: z.string().trim().min(2).max(120),
  timeZone: z.string().trim().min(2).max(100),
  rotationLengthDays: z.coerce.number().int().min(1).max(30).default(7),
  members: z.array(scheduleMemberSchema).min(1),
});

const updateScheduleSchema = z.object({
  name: z.string().trim().min(2).max(120),
  timeZone: z.string().trim().min(2).max(100),
  rotationLengthDays: z.coerce.number().int().min(1).max(30),
  members: z.array(scheduleMemberSchema).min(1),
});

const scheduleParamsSchema = z.object({
  scheduleId: z.string().uuid(),
});

function startOfNextHour(date: Date) {
  const value = new Date(date);
  value.setMinutes(0, 0, 0);
  value.setHours(value.getHours() + 1);
  return value;
}

function buildShiftPlan(options: {
  scheduleId: string;
  members: Array<{ userId: string }>;
  rotationLengthDays: number;
  startAt: Date;
  shiftCount?: number;
}) {
  const shiftCount = options.shiftCount ?? Math.max(options.members.length * 2, 8);

  return Array.from({ length: shiftCount }, (_, index) => {
    const member = options.members[index % options.members.length];
    const startTime = addDays(options.startAt, index * options.rotationLengthDays);
    const endTime = addDays(
      options.startAt,
      (index + 1) * options.rotationLengthDays
    );

    return {
      scheduleId: options.scheduleId,
      userId: member.userId,
      startTime,
      endTime,
    };
  });
}

export const scheduleRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/",
    {
      preHandler: app.authenticate,
    },
    async () => {
      const now = new Date();
      const schedules = await app.prisma.schedule.findMany({
        include: {
          members: {
          include: {
            user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
            orderBy: {
              rotationOrder: "asc",
            },
          },
          oncallShifts: {
            where: {
              endTime: {
                gt: now,
              },
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
            orderBy: {
              startTime: "asc",
            },
            take: 12,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const enriched = schedules.map((schedule) => {
        const currentOnCall =
          schedule.oncallShifts.find(
            (shift) => shift.startTime <= now && shift.endTime > now
          ) ?? null;

        return {
          ...schedule,
          currentOnCall,
        };
      });

      return {
        schedules: enriched,
      };
    }
  );

  app.get(
    "/:scheduleId",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const { scheduleId } = scheduleParamsSchema.parse(request.params);
      const now = new Date();

      const schedule = await app.prisma.schedule.findUnique({
        where: {
          id: scheduleId,
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
            orderBy: {
              rotationOrder: "asc",
            },
          },
          oncallShifts: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
            orderBy: {
              startTime: "asc",
            },
            take: 12,
          },
        },
      });

      if (!schedule) {
        return reply.code(404).send({
          message: "Schedule not found.",
        });
      }

      const currentOnCall =
        schedule.oncallShifts.find(
          (shift) => shift.startTime <= now && shift.endTime > now
        ) ?? null;

      return {
        schedule: {
          ...schedule,
          currentOnCall,
        },
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
          message: "Only admins can create schedules.",
        });
      }

      const body = createScheduleSchema.parse(request.body);
      const uniqueMembers = Array.from(
        new Map(body.members.map((member) => [member.userId, member])).values()
      );

      const users = await app.prisma.user.findMany({
        where: {
          id: {
            in: uniqueMembers.map((member) => member.userId),
          },
        },
        select: {
          id: true,
        },
      });

      if (users.length !== uniqueMembers.length) {
        return reply.code(400).send({
          message: "One or more selected users do not exist.",
        });
      }

      const shiftStart = startOfNextHour(new Date());

      const schedule = await app.prisma.$transaction(async (tx) => {
        const createdSchedule = await tx.schedule.create({
          data: {
            name: body.name,
            timeZone: body.timeZone,
            rotationLengthDays: body.rotationLengthDays,
          },
        });

        await tx.scheduleMember.createMany({
          data: uniqueMembers.map((member, index) => ({
            scheduleId: createdSchedule.id,
            userId: member.userId,
            rotationOrder: index + 1,
          })),
        });

        await tx.oncallShift.createMany({
          data: buildShiftPlan({
            scheduleId: createdSchedule.id,
            members: uniqueMembers,
            rotationLengthDays: body.rotationLengthDays,
            startAt: shiftStart,
          }),
        });

        return tx.schedule.findUniqueOrThrow({
          where: {
            id: createdSchedule.id,
          },
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                  },
                },
              },
              orderBy: {
                rotationOrder: "asc",
              },
            },
            oncallShifts: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                  },
                },
              },
              orderBy: {
                startTime: "asc",
              },
              take: 12,
            },
          },
        });
      });

      return reply.code(201).send({
        schedule: {
          ...schedule,
          currentOnCall: schedule.oncallShifts[0] ?? null,
        },
      });
    }
  );

  app.put(
    "/:scheduleId",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const authUser = request.user as AuthTokenPayload;

      if (authUser.role !== UserRole.ADMIN) {
        return reply.code(403).send({
          message: "Only admins can update schedules.",
        });
      }

      const { scheduleId } = scheduleParamsSchema.parse(request.params);
      const body = updateScheduleSchema.parse(request.body);
      const uniqueMembers = Array.from(
        new Map(body.members.map((member) => [member.userId, member])).values()
      );

      const schedule = await app.prisma.schedule.findUnique({
        where: {
          id: scheduleId,
        },
        include: {
          oncallShifts: {
            where: {
              endTime: {
                gt: new Date(),
              },
            },
            orderBy: {
              startTime: "asc",
            },
            take: 1,
          },
        },
      });

      if (!schedule) {
        return reply.code(404).send({
          message: "Schedule not found.",
        });
      }

      const users = await app.prisma.user.findMany({
        where: {
          id: {
            in: uniqueMembers.map((member) => member.userId),
          },
        },
        select: {
          id: true,
        },
      });

      if (users.length !== uniqueMembers.length) {
        return reply.code(400).send({
          message: "One or more selected users do not exist.",
        });
      }

      const now = new Date();
      const activeOrNextShift = schedule.oncallShifts[0] ?? null;
      const regenerationStart =
        activeOrNextShift && activeOrNextShift.startTime <= now
          ? activeOrNextShift.endTime
          : startOfNextHour(now);

      const updatedSchedule = await app.prisma.$transaction(async (tx) => {
        await tx.schedule.update({
          where: {
            id: scheduleId,
          },
          data: {
            name: body.name,
            timeZone: body.timeZone,
            rotationLengthDays: body.rotationLengthDays,
          },
        });

        await tx.scheduleMember.deleteMany({
          where: {
            scheduleId,
          },
        });

        await tx.scheduleMember.createMany({
          data: uniqueMembers.map((member, index) => ({
            scheduleId,
            userId: member.userId,
            rotationOrder: index + 1,
          })),
        });

        await tx.oncallShift.deleteMany({
          where: {
            scheduleId,
            startTime: {
              gte: regenerationStart,
            },
          },
        });

        await tx.oncallShift.createMany({
          data: buildShiftPlan({
            scheduleId,
            members: uniqueMembers,
            rotationLengthDays: body.rotationLengthDays,
            startAt: regenerationStart,
          }),
        });

        return tx.schedule.findUniqueOrThrow({
          where: {
            id: scheduleId,
          },
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                  },
                },
              },
              orderBy: {
                rotationOrder: "asc",
              },
            },
            oncallShifts: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                  },
                },
              },
              orderBy: {
                startTime: "asc",
              },
              take: 12,
            },
          },
        });
      });

      const currentOnCall =
        updatedSchedule.oncallShifts.find(
          (shift) => shift.startTime <= now && shift.endTime > now
        ) ?? null;

      return {
        schedule: {
          ...updatedSchedule,
          currentOnCall,
        },
      };
    }
  );
};
