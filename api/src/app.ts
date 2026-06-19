import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { getEnvConfig } from "./config/env";
import { authPlugin } from "./plugins/auth";
import { prismaPlugin } from "./plugins/prisma";
import { redisPlugin } from "./plugins/redis";
import { socketPlugin } from "./plugins/socket";
import { escalationQueuePlugin } from "./jobs/escalation-queue";
import { appRoutes } from "./routes";

export async function createApp() {
  const config = getEnvConfig();
  const app = Fastify({
    logger: true,
  });

  app.decorate("config", config);

  await app.register(cors, {
    origin: config.webOrigins,
    credentials: true,
  });

  await app.register(rateLimit, {
    global: false,
    keyGenerator: (request) => {
      const params = request.params as { webhookToken?: string } | undefined;
      return params?.webhookToken ?? request.ip;
    },
  });

  await app.register(authPlugin);
  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(socketPlugin);
  await app.register(escalationQueuePlugin);
  await app.register(appRoutes);

  app.get("/health", async () => {
    return {
      status: "ok",
    };
  });

  return app;
}
