import type { PrismaClient } from "@prisma/client";
import type { Queue, Worker } from "bullmq";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { Redis } from "ioredis";
import type { Server as SocketIOServer } from "socket.io";
import type { AuthTokenPayload } from "./auth";

declare module "fastify" {
  interface FastifyInstance {
    config: {
      nodeEnv: string;
      host: string;
      port: number;
      webOrigins: string[];
      databaseUrl: string;
      redisUrl: string;
      jwtSecret: string;
      jwtExpiresIn: string;
      authCookieName: string;
      openaiApiKey?: string;
      openaiModel: string;
      smtpHost?: string;
      smtpPort?: number;
      smtpSecure: boolean;
      smtpUser?: string;
      smtpPass?: string;
      smtpFromEmail?: string;
      smtpFromName: string;
      databaseSslRejectUnauthorized: boolean;
    };
    prisma: PrismaClient;
    redis: Redis;
    queues: {
      escalation: Queue;
    };
    workers: {
      escalation: Worker;
    };
    io: SocketIOServer;
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }

  interface FastifyRequest {
    user: AuthTokenPayload;
  }
}
