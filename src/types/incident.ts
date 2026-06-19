export interface Incident {
  id: string;
  title: string;
  status: "triggered" | "acknowledged" | "resolved";
  severity: "critical" | "high" | "medium" | "low";
}
