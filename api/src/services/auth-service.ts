import { compare } from "bcryptjs";
import { FastifyInstance } from "fastify";
import { AuthTokenPayload } from "../types/auth";

export async function validateUserCredentials(
  app: FastifyInstance,
  email: string,
  password: string
) {
  const user = await app.prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    return null;
  }

  const isValid = await compare(password, user.passwordHash);

  if (!isValid) {
    return null;
  }

  return user;
}

export async function signAuthToken(
  app: FastifyInstance,
  payload: AuthTokenPayload
) {
  return app.jwt.sign(payload);
}
