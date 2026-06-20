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
  rotationLengthDays: number;
  members: Array<{
    userId: string;
  }>;
}

interface UpdateScheduleInput extends CreateScheduleInput {
  scheduleId: string;
}

interface UpdateShiftInput {
  scheduleId: string;
  shiftId: string;
  userId: string;
  startTime: string;
  endTime: string;
}

interface SwapShiftsInput {
  scheduleId: string;
  firstShiftId: string;
  secondShiftId: string;
}

export async function getSchedules() {
  const { data } = await apiClient.get<SchedulesResponse>("/schedules");
  return data.schedules;
}

export async function createSchedule(input: CreateScheduleInput) {
  const { data } = await apiClient.post<ScheduleResponse>("/schedules", input);
  return data.schedule;
}

export async function getScheduleDetails(scheduleId: string) {
  const { data } = await apiClient.get<ScheduleResponse>(`/schedules/${scheduleId}`);
  return data.schedule;
}

export async function updateSchedule(input: UpdateScheduleInput) {
  const { data } = await apiClient.put<ScheduleResponse>(
    `/schedules/${input.scheduleId}`,
    {
      name: input.name,
      timeZone: input.timeZone,
      rotationLengthDays: input.rotationLengthDays,
      members: input.members,
    }
  );
  return data.schedule;
}

export async function updateScheduleShift(input: UpdateShiftInput) {
  const { data } = await apiClient.patch<ScheduleResponse>(
    `/schedules/${input.scheduleId}/shifts/${input.shiftId}`,
    {
      userId: input.userId,
      startTime: input.startTime,
      endTime: input.endTime,
    }
  );
  return data.schedule;
}

export async function swapScheduleShifts(input: SwapShiftsInput) {
  const { data } = await apiClient.post<ScheduleResponse>(
    `/schedules/${input.scheduleId}/shifts/swap`,
    {
      firstShiftId: input.firstShiftId,
      secondShiftId: input.secondShiftId,
    }
  );
  return data.schedule;
}
