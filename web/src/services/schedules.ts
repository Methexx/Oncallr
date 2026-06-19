import { apiClient } from "@/lib/api-client";
import { Schedule } from "@/types/schedule";

interface SchedulesResponse {
  schedules: Schedule[];
}

interface ScheduleResponse {
  schedule: Schedule;
}

interface CreateScheduleInput {
  name: string;
  timeZone: string;
  members: Array<{
    userId: string;
  }>;
}

export async function getSchedules() {
  const { data } = await apiClient.get<SchedulesResponse>("/schedules");
  return data.schedules;
}

export async function createSchedule(input: CreateScheduleInput) {
  const { data } = await apiClient.post<ScheduleResponse>("/schedules", input);
  return data.schedule;
}
