import { FastifyPluginAsync } from "fastify";

export const userRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/",
    {
      preHandler: app.authenticate,
    },
    async () => {
      const users = await app.prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        orderBy: [
          {
            role: "desc",
          },
          {
            name: "asc",
          },
        ],
      });

      return {
        users,
      };
    }
  );
};
