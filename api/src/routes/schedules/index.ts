import { addDays } from "date-fns";
import { UserRole } from "@prisma/client";
import { FastifyInstance, FastifyPluginAsync } from "fastify";
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

const scheduleShiftParamsSchema = z.object({
  scheduleId: z.string().uuid(),
  shiftId: z.string().uuid(),
});

const updateShiftSchema = z.object({
  userId: z.string().uuid(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
});

const swapShiftsSchema = z.object({
  firstShiftId: z.string().uuid(),
  secondShiftId: z.string().uuid(),
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

async function getScheduleWithDetails(app: FastifyInstance, scheduleId: string) {
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
    return null;
  }

  const currentOnCall =
    schedule.oncallShifts.find(
      (shift) => shift.startTime <= now && shift.endTime > now
    ) ?? null;

  return {
    ...schedule,
    currentOnCall,
  };
}

async function findShiftOverlap(app: FastifyInstance, input: {
  scheduleId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  excludeShiftId?: string;
}) {
  const [scheduleOverlap, userOverlap] = await Promise.all([
    app.prisma.oncallShift.findFirst({
      where: {
        scheduleId: input.scheduleId,
        id: input.excludeShiftId ? { not: input.excludeShiftId } : undefined,
        startTime: {
          lt: input.endTime,
        },
        endTime: {
          gt: input.startTime,
        },
      },
    }),
    app.prisma.oncallShift.findFirst({
      where: {
        userId: input.userId,
        id: input.excludeShiftId ? { not: input.excludeShiftId } : undefined,
        startTime: {
          lt: input.endTime,
        },
        endTime: {
          gt: input.startTime,
        },
      },
    }),
    ]);

  return {
    scheduleOverlap,
    userOverlap,
  };
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
      const schedule = await getScheduleWithDetails(app, scheduleId);

      if (!schedule) {
        return reply.code(404).send({
          message: "Schedule not found.",
        });
      }

      return {
        schedule,
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

  app.patch(
    "/:scheduleId/shifts/:shiftId",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const authUser = request.user as AuthTokenPayload;

      if (authUser.role !== UserRole.ADMIN) {
        return reply.code(403).send({
          message: "Only admins can override shifts.",
        });
      }

      const { scheduleId, shiftId } = scheduleShiftParamsSchema.parse(request.params);
      const body = updateShiftSchema.parse(request.body);
      const now = new Date();

      if (body.endTime <= body.startTime) {
        return reply.code(400).send({
          message: "Shift end time must be after the start time.",
        });
      }

      const [schedule, shift] = await Promise.all([
        app.prisma.schedule.findUnique({
          where: {
            id: scheduleId,
          },
          include: {
            members: true,
          },
        }),
        app.prisma.oncallShift.findUnique({
          where: {
            id: shiftId,
          },
        }),
      ]);

      if (!schedule) {
        return reply.code(404).send({
          message: "Schedule not found.",
        });
      }

      if (!shift || shift.scheduleId !== scheduleId) {
        return reply.code(404).send({
          message: "Shift not found for this schedule.",
        });
      }

      if (shift.startTime <= now) {
        return reply.code(400).send({
          message: "Only future shifts can be overridden.",
        });
      }

      if (!schedule.members.some((member) => member.userId === body.userId)) {
        return reply.code(400).send({
          message: "Shift overrides must target a current schedule member.",
        });
      }

      const overlap = await findShiftOverlap(app, {
        scheduleId,
        userId: body.userId,
        startTime: body.startTime,
        endTime: body.endTime,
        excludeShiftId: shiftId,
      });

      if (overlap.scheduleOverlap) {
        return reply.code(400).send({
          message: "This override would overlap another shift in the schedule.",
        });
      }

      if (overlap.userOverlap) {
        return reply.code(400).send({
          message: "This user already has an overlapping on-call shift.",
        });
      }

      await app.prisma.oncallShift.update({
        where: {
          id: shiftId,
        },
        data: {
          userId: body.userId,
          startTime: body.startTime,
          endTime: body.endTime,
        },
      });

      app.log.info(
        {
          scheduleId,
          shiftId,
          actorId: authUser.sub,
          userId: body.userId,
        },
        "Schedule shift overridden."
      );

      const updatedSchedule = await getScheduleWithDetails(app, scheduleId);

      return {
        schedule: updatedSchedule,
      };
    }
  );

  app.post(
    "/:scheduleId/shifts/swap",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const authUser = request.user as AuthTokenPayload;

      if (authUser.role !== UserRole.ADMIN) {
        return reply.code(403).send({
          message: "Only admins can swap shifts.",
        });
      }

      const { scheduleId } = scheduleParamsSchema.parse(request.params);
      const body = swapShiftsSchema.parse(request.body);
      const now = new Date();

      if (body.firstShiftId === body.secondShiftId) {
        return reply.code(400).send({
          message: "Choose two different shifts to swap.",
        });
      }

      const shifts = await app.prisma.oncallShift.findMany({
        where: {
          id: {
            in: [body.firstShiftId, body.secondShiftId],
          },
          scheduleId,
        },
      });

      if (shifts.length !== 2) {
        return reply.code(404).send({
          message: "One or both shifts could not be found for this schedule.",
        });
      }

      const [firstShift, secondShift] = shifts;

      if (firstShift.startTime <= now || secondShift.startTime <= now) {
        return reply.code(400).send({
          message: "Only future shifts can be swapped.",
        });
      }

      const firstOverlap = await findShiftOverlap(app, {
        scheduleId,
        userId: secondShift.userId,
        startTime: firstShift.startTime,
        endTime: firstShift.endTime,
        excludeShiftId: firstShift.id,
      });

      if (firstOverlap.userOverlap && firstOverlap.userOverlap.id !== secondShift.id) {
        return reply.code(400).send({
          message: "Swapping would create an overlapping shift for one engineer.",
        });
      }

      const secondOverlap = await findShiftOverlap(app, {
        scheduleId,
        userId: firstShift.userId,
        startTime: secondShift.startTime,
        endTime: secondShift.endTime,
        excludeShiftId: secondShift.id,
      });

      if (secondOverlap.userOverlap && secondOverlap.userOverlap.id !== firstShift.id) {
        return reply.code(400).send({
          message: "Swapping would create an overlapping shift for one engineer.",
        });
      }

      await app.prisma.$transaction([
        app.prisma.oncallShift.update({
          where: {
            id: firstShift.id,
          },
          data: {
            userId: secondShift.userId,
          },
        }),
        app.prisma.oncallShift.update({
          where: {
            id: secondShift.id,
          },
          data: {
            userId: firstShift.userId,
          },
        }),
      ]);

      app.log.info(
        {
          scheduleId,
          actorId: authUser.sub,
          firstShiftId: firstShift.id,
          secondShiftId: secondShift.id,
        },
        "Schedule shifts swapped."
      );

      const updatedSchedule = await getScheduleWithDetails(app, scheduleId);

      return {
        schedule: updatedSchedule,
      };
    }
  );
};
