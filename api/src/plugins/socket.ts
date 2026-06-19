import fp from "fastify-plugin";
import { parse as parseCookie } from "cookie";
import { Server as SocketIOServer } from "socket.io";
import { AuthTokenPayload } from "../types/auth";

export const socketPlugin = fp(async (app) => {
  const io = new SocketIOServer(app.server, {
    cors: {
      origin: app.config.webOrigins,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const cookies = parseCookie(socket.handshake.headers.cookie ?? "");
      const token = cookies[app.config.authCookieName];

      if (!token) {
        return next(new Error("Missing auth cookie"));
      }

      const payload = await app.jwt.verify<AuthTokenPayload>(token);
      socket.data.user = payload;

      return next();
    } catch (error) {
      return next(error as Error);
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as AuthTokenPayload | undefined;

    if (!user) {
      socket.disconnect();
      return;
    }

    socket.join(`user:${user.sub}`);
  });

  app.decorate("io", io);

  app.addHook("onClose", async () => {
    await io.close();
  });
});
