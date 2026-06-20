import { FastifyInstance } from "fastify";
import {
  IncidentNotificationPayload,
  IncidentUpdatePayload,
} from "../types/escalation";

export function emitIncidentNotification(
  app: FastifyInstance,
  userId: string,
  payload: IncidentNotificationPayload
) {
  app.io.to(`user:${userId}`).emit("incident:new", payload);
}

export function hasActiveUserSocket(app: FastifyInstance, userId: string) {
  const room = app.io.sockets.adapter.rooms.get(`user:${userId}`);
  return Boolean(room && room.size > 0);
}

export function emitIncidentUpdate(
  app: FastifyInstance,
  payload: IncidentUpdatePayload,
  options?: {
    userIds?: Array<string | null | undefined>;
    includeAdmins?: boolean;
  }
) {
  const userIds = new Set(
    (options?.userIds ?? []).filter((userId): userId is string => Boolean(userId))
  );

  for (const userId of userIds) {
    app.io.to(`user:${userId}`).emit("incident:update", payload);
  }

  if (options?.includeAdmins) {
    app.io.to("admins").emit("incident:update", payload);
  }
}
