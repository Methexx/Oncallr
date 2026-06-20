import fp from "fastify-plugin";
import IORedis from "ioredis";

export const redisPlugin = fp(async (app) => {
  const redis = new IORedis(app.config.redisUrl, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

  redis.on("error", (error) => {
    app.log.error({ err: error }, "Redis connection error.");
  });

  try {
    await redis.connect();
    await redis.ping();
  } catch (error) {
    await redis.quit().catch(() => undefined);
    throw new Error(
      `Unable to connect to Redis at ${app.config.redisUrl}. Start Redis and try again.`
    );
  }

  app.decorate("redis", redis);

  app.addHook("onClose", async () => {
    await redis.quit();
  });
});
