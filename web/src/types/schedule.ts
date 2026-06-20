import { AuthUser } from "@/types/auth";

export interface Schedule {
  id: string;
  name: string;
  timeZone: string;
  rotationLengthDays: number;
  createdAt: string;
  updatedAt?: string;
  members: Array<{
    scheduleId: string;
    userId: string;
    rotationOrder: number;
    user: AuthUser;
  }>;
  oncallShifts: Array<{
    id: string;
    scheduleId: string;
    userId: string;
    startTime: string;
    endTime: string;
    user: AuthUser;
  }>;
  currentOnCall?: {
    id: string;
    scheduleId: string;
    userId: string;
    startTime: string;
    endTime: string;
    user: AuthUser;
  } | null;
}
