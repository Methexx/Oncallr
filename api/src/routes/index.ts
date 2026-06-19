import { FastifyPluginAsync } from "fastify";
import { authRoutes } from "./auth";
import { incidentRoutes } from "./incidents";
import { webhookRoutes } from "./webhooks";

export const appRoutes: FastifyPluginAsync = async (app) => {
  await app.register(authRoutes, {
    prefix: "/api/auth",
  });

  await app.register(incidentRoutes, {
    prefix: "/api/incidents",
  });

  await app.register(webhookRoutes, {
    prefix: "/api/webhooks",
  });
};
