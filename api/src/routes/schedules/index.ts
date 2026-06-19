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
  members: z.array(scheduleMemberSchema).min(1),
});

function startOfNextHour(date: Date) {
  const value = new Date(date);
  value.setMinutes(0, 0, 0);
  value.setHours(value.getHours() + 1);
  return value;
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
            take: 6,
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
          data: uniqueMembers.map((member, index) => {
            const startTime = addDays(shiftStart, index * 7);
            const endTime = addDays(shiftStart, (index + 1) * 7);

            return {
              scheduleId: createdSchedule.id,
              userId: member.userId,
              startTime,
              endTime,
            };
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
              take: 6,
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
};
