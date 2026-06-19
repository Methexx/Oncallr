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
}
