import fp from "fastify-plugin";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

export const prismaPlugin = fp(async (app) => {
  const adapter = new PrismaPg(
    {
      connectionString: app.config.databaseUrl,
      ssl: {
        rejectUnauthorized: app.config.databaseSslRejectUnauthorized,
      },
    },
    {
      schema: "public",
    }
  );

  const prisma = new PrismaClient({
    adapter,
  });
  await prisma.$connect();

  app.decorate("prisma", prisma);

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
});
