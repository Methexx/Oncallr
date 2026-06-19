import { Service } from "@/types/service";

export interface EscalationPolicyStep {
  type: "USER" | "SCHEDULE";
  userId?: string;
  scheduleId?: string;
  label?: string;
}

export interface EscalationPolicy {
  id: string;
  serviceId: string;
  timeoutMinutes: number;
  steps: EscalationPolicyStep[];
  createdAt: string;
  updatedAt: string;
  service: Service;
}
