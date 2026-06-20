import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { signAuthToken, validateUserCredentials } from "../../services/auth-service";
import { exchangeSupabaseAccessToken } from "../../services/supabase-auth-service";
import { AuthTokenPayload } from "../../types/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const exchangeSchema = z.object({
  accessToken: z.string().min(1),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const user = await validateUserCredentials(app, body.email, body.password);

    if (!user) {
      return reply.code(401).send({
        message: "Invalid email or password.",
      });
    }

    const token = await signAuthToken(app, {
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    reply.setCookie(app.config.authCookieName, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: app.config.nodeEnv === "production",
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  });

  app.post("/exchange", async (request, reply) => {
    const body = exchangeSchema.parse(request.body);
    const user = await exchangeSupabaseAccessToken(app, body.accessToken);

    if (!user) {
      return reply.code(401).send({
        message: "This Supabase account is not allowed to access OnCallr.",
      });
    }

    const token = await signAuthToken(app, {
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    reply.setCookie(app.config.authCookieName, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: app.config.nodeEnv === "production",
    });

    return {
      user,
    };
  });

  app.get(
    "/me",
    {
      preHandler: app.authenticate,
    },
    async (request) => {
      const authUser = request.user as AuthTokenPayload;
      const user = await app.prisma.user.findUnique({
        where: {
          id: authUser.sub,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      return {
        user,
      };
    }
  );

  app.post("/logout", async (_request, reply) => {
    reply.clearCookie(app.config.authCookieName, {
      path: "/",
    });

    return {
      success: true,
    };
  });
};
