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
}
