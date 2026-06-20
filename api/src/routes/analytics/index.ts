import { UserRole } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AuthTokenPayload } from "../../types/auth";

const analyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
  serviceId: z.string().uuid().optional(),
});

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function minutesBetween(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

function bucketDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export const analyticsRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/overview",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const authUser = request.user as AuthTokenPayload;

      if (authUser.role !== UserRole.ADMIN) {
        return reply.code(403).send({
          message: "Only admins can view analytics.",
        });
      }

      const { days, serviceId } = analyticsQuerySchema.parse(request.query);
      const from = new Date();
      from.setDate(from.getDate() - days);

      const incidents = await app.prisma.incident.findMany({
        where: {
          createdAt: {
            gte: from,
          },
          ...(serviceId ? { serviceId } : {}),
        },
        include: {
          service: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      const shifts = await app.prisma.oncallShift.findMany({
        where: {
          endTime: {
            gt: from,
          },
        },
        include: {
          schedule: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      const mttaValues = incidents
        .filter((incident) => incident.acknowledgedAt)
        .map((incident) =>
          minutesBetween(incident.createdAt, incident.acknowledgedAt!)
        );
      const mttrValues = incidents
        .filter((incident) => incident.resolvedAt)
        .map((incident) =>
          minutesBetween(incident.createdAt, incident.resolvedAt!)
        );

      const volumeByServiceMap = new Map<string, { serviceName: string; count: number }>();
      const incidentsOverTimeMap = new Map<string, number>();
      const severityBreakdownMap = new Map<string, number>();
      const busiestOnCallMap = new Map<
        string,
        { scheduleName: string; userName: string; count: number }
      >();

      for (const incident of incidents) {
        const serviceKey = incident.serviceId;
        const existingServiceCount = volumeByServiceMap.get(serviceKey);
        volumeByServiceMap.set(serviceKey, {
          serviceName: incident.service.name,
          count: (existingServiceCount?.count ?? 0) + 1,
        });

        const bucket = bucketDate(incident.createdAt);
        incidentsOverTimeMap.set(bucket, (incidentsOverTimeMap.get(bucket) ?? 0) + 1);
        severityBreakdownMap.set(
          incident.severity,
          (severityBreakdownMap.get(incident.severity) ?? 0) + 1
        );

        const matchingShift = shifts.find(
          (shift) =>
            shift.userId === incident.currentAssigneeId &&
            shift.startTime <= incident.createdAt &&
            shift.endTime > incident.createdAt
        );

        if (matchingShift) {
          const onCallKey = `${matchingShift.scheduleId}:${matchingShift.userId}`;
          const existingOnCall = busiestOnCallMap.get(onCallKey);
          busiestOnCallMap.set(onCallKey, {
            scheduleName: matchingShift.schedule.name,
            userName: matchingShift.user.name,
            count: (existingOnCall?.count ?? 0) + 1,
          });
        }
      }

      const summary = {
        days,
        serviceFilter:
          serviceId && incidents[0]
            ? {
                id: incidents[0].serviceId,
                name: incidents[0].service.name,
              }
            : null,
        totals: {
          incidents: incidents.length,
          triggered: incidents.filter((incident) => incident.status === "TRIGGERED").length,
          acknowledged: incidents.filter((incident) => incident.status === "ACKNOWLEDGED").length,
          resolved: incidents.filter((incident) => incident.status === "RESOLVED").length,
        },
        mttaMinutes: average(mttaValues),
        mttrMinutes: average(mttrValues),
        averageIncidentsPerDay: incidents.length / days,
        volumeByService: Array.from(volumeByServiceMap.values()).sort(
          (left, right) => right.count - left.count
        ),
        incidentsOverTime: Array.from(incidentsOverTimeMap.entries())
          .map(([date, count]) => ({ date, count }))
          .sort((left, right) => left.date.localeCompare(right.date)),
        severityBreakdown: Array.from(severityBreakdownMap.entries())
          .map(([severity, count]) => ({ severity, count }))
          .sort((left, right) => right.count - left.count),
        busiestOnCall: Array.from(busiestOnCallMap.values())
          .sort((left, right) => right.count - left.count)
          .slice(0, 5),
      };

      return {
        summary,
      };
    }
  );
};
