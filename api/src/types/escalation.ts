import { EscalationTargetType, IncidentSeverity } from "@prisma/client";

export interface EscalationStep {
  type: EscalationTargetType;
  userId?: string;
  scheduleId?: string;
  label?: string;
}

export interface IncidentNotificationPayload {
  incidentId: string;
  title: string;
  severity: IncidentSeverity;
  serviceName: string;
}
