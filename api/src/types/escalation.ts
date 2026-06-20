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

export interface IncidentUpdatePayload extends IncidentNotificationPayload {
  status: "TRIGGERED" | "ACKNOWLEDGED" | "RESOLVED";
  currentAssigneeId?: string | null;
  currentAssigneeName?: string | null;
  escalationStepIndex?: number;
  updateType:
    | "CREATED"
    | "ESCALATED"
    | "ACKNOWLEDGED"
    | "RESOLVED"
    | "COMMENTED";
}
