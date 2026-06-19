import { FastifyPluginAsync } from "fastify";
import { authRoutes } from "./auth";
import { incidentRoutes } from "./incidents";
import { scheduleRoutes } from "./schedules";
import { serviceRoutes } from "./services";
import { userRoutes } from "./users";
import { webhookRoutes } from "./webhooks";

export const appRoutes: FastifyPluginAsync = async (app) => {
  await app.register(authRoutes, {
    prefix: "/api/auth",
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
