export interface HealthStatus {
  status: "ok" | "degraded";
  timestamp: string;
  services: {
    database: "ok" | "error";
    redis: "ok" | "error";
    queue: "ok" | "error";
    sockets: "ok" | "error";
    ai: "configured" | "not_configured";
    email: "configured" | "not_configured";
  };
}
