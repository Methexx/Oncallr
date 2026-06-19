import { FastifyInstance } from "fastify";
import { IncidentNotificationPayload } from "../types/escalation";

export function emitIncidentNotification(
  app: FastifyInstance,
  userId: string,
  payload: IncidentNotificationPayload
) {
  app.io.to(`user:${userId}`).emit("incident:new", payload);
}
