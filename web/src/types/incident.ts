import { AuthUser } from "@/types/auth";

export interface Incident {
  id: string;
  title: string;
  description?: string | null;
  status: "TRIGGERED" | "ACKNOWLEDGED" | "RESOLVED";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  createdAt?: string;
  currentAssigneeId?: string | null;
  service?: {
    id: string;
    name: string;
    description?: string | null;
  };
  currentAssignee?: AuthUser | null;
  acknowledgedBy?: AuthUser | null;
  resolvedBy?: AuthUser | null;
  escalationStepIndex?: number;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  updatedAt?: string;
  events?: IncidentEvent[];
}

export interface IncidentNotificationPayload {
  incidentId: string;
  title: string;
  severity: Incident["severity"];
  serviceName: string;
}

export interface IncidentEvent {
  id: string;
  incidentId: string;
  actorId?: string | null;
  type:
    | "CREATED"
    | "NOTIFIED"
    | "ESCALATED"
    | "ACKNOWLEDGED"
    | "COMMENTED"
    | "RESOLVED";
  message: string;
  createdAt: string;
  actor?: AuthUser | null;
}
