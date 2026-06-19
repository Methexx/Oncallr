import fp from "fastify-plugin";
import IORedis from "ioredis";

export const redisPlugin = fp(async (app) => {
  const redis = new IORedis(app.config.redisUrl, {
    maxRetriesPerRequest: null,
  });

  app.decorate("redis", redis);

  app.addHook("onClose", async () => {
    await redis.quit();
  });
});
