import type { ScheduledMeeting } from "./calendarEngine";

export type MeetingImportance = "essential" | "important" | "optional";
export type MeetingAttendanceStatus = "held" | "rescheduled" | "not_held";

export type MeetingImportanceMap = Record<"daily" | "weekly" | "monthly" | "quarterly", MeetingImportance>;

export const DEFAULT_MEETING_IMPORTANCE: MeetingImportanceMap = {
  daily: "important",
  weekly: "essential",
  monthly: "essential",
  quarterly: "essential",
};

export function dateKeyForLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getMeetingImportance(
  savedImportance: Partial<MeetingImportanceMap> | undefined,
  type: keyof MeetingImportanceMap,
): MeetingImportance {
  return savedImportance?.[type] ?? DEFAULT_MEETING_IMPORTANCE[type];
}

export function getUnloggedOwnerMeetings(
  meetings: ScheduledMeeting[],
  attendanceByKey: Map<string, MeetingAttendanceStatus>,
  todayKey: string,
): ScheduledMeeting[] {
  return meetings
    .filter((meeting) => meeting.layer === "owner" && meeting.date < todayKey)
    .filter((meeting) => {
      const status = attendanceByKey.get(`${meeting.date}:${meeting.meetingType}`);
      return status !== "held" && status !== "rescheduled";
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function shouldShowCadenceCheckIn(unloggedCount: number): boolean {
  return unloggedCount >= 3;
}
