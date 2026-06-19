export interface Service {
  id: string;
  name: string;
  description?: string | null;
  webhookToken: string;
  createdAt: string;
  updatedAt?: string;
  escalationPolicy?: {
    id: string;
    timeoutMinutes: number;
    steps: unknown;
  } | null;
  incidents?: Array<{
    id: string;
    title: string;
    status: "TRIGGERED" | "ACKNOWLEDGED" | "RESOLVED";
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    createdAt: string;
  }>;
}
