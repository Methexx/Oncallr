import fp from "fastify-plugin";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import { AuthTokenPayload } from "../types/auth";

export const authPlugin = fp(async (app) => {
  await app.register(cookie);
  await app.register(jwt, {
    secret: app.config.jwtSecret,
    cookie: {
      cookieName: app.config.authCookieName,
      signed: false,
    },
    sign: {
      expiresIn: app.config.jwtExpiresIn,
    },
  });

  app.decorate("authenticate", async (request, reply) => {
    try {
      const payload = await request.jwtVerify<AuthTokenPayload>();
      request.user = payload;
    } catch {
      return reply.code(401).send({
        message: "Authentication required.",
      });
    }
  });
});
