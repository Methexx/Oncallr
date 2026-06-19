import { FastifyPluginAsync } from "fastify";
import { analyticsRoutes } from "./analytics";
import { authRoutes } from "./auth";
import { escalationPolicyRoutes } from "./escalation-policies";
import { incidentRoutes } from "./incidents";
import { scheduleRoutes } from "./schedules";
import { serviceRoutes } from "./services";
import { userRoutes } from "./users";
import { webhookRoutes } from "./webhooks";

export const appRoutes: FastifyPluginAsync = async (app) => {
  await app.register(authRoutes, {
    prefix: "/api/auth",
  });

  await app.register(analyticsRoutes, {
    prefix: "/api/analytics",
  });

  await app.register(escalationPolicyRoutes, {
    prefix: "/api/escalation-policies",
  });

  await app.register(incidentRoutes, {
    prefix: "/api/incidents",
  });

  await app.register(userRoutes, {
    prefix: "/api/users",
  });

  await app.register(serviceRoutes, {
    prefix: "/api/services",
  });

  await app.register(scheduleRoutes, {
    prefix: "/api/schedules",
  });

  await app.register(webhookRoutes, {
    prefix: "/api/webhooks",
  });
};
