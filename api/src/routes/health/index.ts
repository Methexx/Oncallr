import { FastifyInstance, FastifyPluginAsync } from "fastify";

export async function buildHealthStatus(app: FastifyInstance) {
  let databaseStatus: "ok" | "error" = "ok";
  let redisStatus: "ok" | "error" = "ok";

  try {
    await app.prisma.$queryRawUnsafe("SELECT 1");
  } catch (error) {
    databaseStatus = "error";
    app.log.error({ err: error }, "Health check database probe failed.");
  }

  try {
    await app.redis.ping();
  } catch (error) {
    redisStatus = "error";
    app.log.error({ err: error }, "Health check redis probe failed.");
  }

  const queueStatus =
    app.queues?.escalation && redisStatus === "ok" ? "ok" : "error";
  const socketStatus = app.io ? "ok" : "error";
  const aiStatus = app.config.openaiApiKey ? "configured" : "not_configured";
  const emailStatus =
    app.config.smtpHost &&
    app.config.smtpPort &&
    app.config.smtpUser &&
    app.config.smtpPass &&
    app.config.smtpFromEmail
      ? "configured"
      : "not_configured";

  const status =
    databaseStatus === "ok" &&
    redisStatus === "ok" &&
    queueStatus === "ok" &&
    socketStatus === "ok"
      ? "ok"
      : "degraded";

  return {
    status,
    timestamp: new Date().toISOString(),
    services: {
      database: databaseStatus,
      redis: redisStatus,
      queue: queueStatus,
      sockets: socketStatus,
      ai: aiStatus,
      email: emailStatus,
    },
  };
}

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (_request, reply) => {
    const health = await buildHealthStatus(app);

    if (health.status === "degraded") {
      reply.code(503);
    }

    return health;
  });
};
