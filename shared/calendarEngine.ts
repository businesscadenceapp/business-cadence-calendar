/**
 * Calendar Engine — generates meeting schedules from business profile settings.
 * Handles: work day filtering, closed period exclusions, auto-shifting to next available day.
 */

export type MeetingType = "daily" | "weekly" | "monthly" | "quarterly";

export interface MeetingDayPrefs {
  ownerDaily: number;    // 0=Sun, 1=Mon, ..., 6=Sat
  ownerWeekly: number;
  ownerMonthly: number;  // day of week for monthly (first occurrence of that day each month)
  teamDaily: number;
  teamWeekly: number;
}

export interface ClosedPeriod {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface ScheduledMeeting {
  date: string;         // YYYY-MM-DD
  meetingType: MeetingType;
  layer: "owner" | "team";
  isRescheduled: boolean;
  originalDate?: string; // if rescheduled, the original date
}

/** Format a Date as YYYY-MM-DD */
function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Parse YYYY-MM-DD into a local Date at midnight */
function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Add days to a date */
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Check if a date falls within any closed period */
function isClosed(dateKey: string, closedPeriods: ClosedPeriod[]): boolean {
  return closedPeriods.some(p => dateKey >= p.startDate && dateKey <= p.endDate);
}

/**
 * Find the next available date on or after `from` that:
 * 1. Falls on one of the allowed workDays
 * 2. Is NOT in any closed period
 * For quarterly: stays on Friday (day 5), shifts to next Friday if blocked
 */
function nextAvailableDate(
  from: Date,
  preferredDayOfWeek: number,
  workDays: number[],
  closedPeriods: ClosedPeriod[],
  isQuarterly = false
): { date: Date; rescheduled: boolean; originalDate: Date } {
  const originalDate = new Date(from);
  let current = new Date(from);
  let attempts = 0;

  while (attempts < 365) {
    const dow = current.getDay();
    const key = toDateKey(current);
    const dayOk = workDays.includes(dow);
    const notClosed = !isClosed(key, closedPeriods);

    if (dayOk && notClosed) {
      return {
        date: current,
        rescheduled: toDateKey(current) !== toDateKey(originalDate),
        originalDate,
      };
    }

    // Move to next occurrence of the preferred day of week
    // (for quarterly, preferred = Friday = 5)
    const targetDow = isQuarterly ? 5 : preferredDayOfWeek;
    let daysUntilNext = (targetDow - current.getDay() + 7) % 7;
    if (daysUntilNext === 0) daysUntilNext = 7; // always advance at least one week
    current = addDays(current, daysUntilNext);
    attempts++;
  }

  // Fallback: return original (shouldn't happen)
  return { date: originalDate, rescheduled: false, originalDate };
}

/**
 * Get all dates in a year that fall on a specific day of week.
 * e.g. all Mondays in 2026.
 */
function getAllDatesForDayOfWeek(year: number, dayOfWeek: number): Date[] {
  const dates: Date[] = [];
  const d = new Date(year, 0, 1);
  // Advance to first occurrence of dayOfWeek
  while (d.getDay() !== dayOfWeek) d.setDate(d.getDate() + 1);
  while (d.getFullYear() === year) {
    dates.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return dates;
}

/**
 * Get the first occurrence of a day-of-week in each month of the year.
 * Used for monthly meetings.
 */
function getFirstDayOfWeekEachMonth(year: number, dayOfWeek: number): Date[] {
  const dates: Date[] = [];
  for (let month = 0; month < 12; month++) {
    const d = new Date(year, month, 1);
    while (d.getDay() !== dayOfWeek) d.setDate(d.getDate() + 1);
    dates.push(new Date(d));
  }
  return dates;
}

/**
 * Get the first Friday of each quarter (Jan, Apr, Jul, Oct).
 * Used for quarterly offsites.
 */
function getQuarterlyFridays(year: number): Date[] {
  const quarterMonths = [0, 3, 6, 9]; // Jan, Apr, Jul, Oct
  return quarterMonths.map(month => {
    const d = new Date(year, month, 1);
    while (d.getDay() !== 5) d.setDate(d.getDate() + 1); // advance to first Friday
    return new Date(d);
  });
}

/**
 * Main calendar generation function.
 * Returns all scheduled meetings for a year, with rescheduling applied.
 */
export function generateMeetingSchedule(params: {
  year: number;
  workDays: number[];
  meetingDayPrefs: MeetingDayPrefs;
  closedPeriods: ClosedPeriod[];
}): ScheduledMeeting[] {
  const { year, workDays, meetingDayPrefs, closedPeriods } = params;
  const meetings: ScheduledMeeting[] = [];

  // ── Owner Daily Huddle (every work day on ownerDaily) ──────────────────────
  const allOwnerDailyDates = getAllDatesForDayOfWeek(year, meetingDayPrefs.ownerDaily);
  for (const rawDate of allOwnerDailyDates) {
    const { date, rescheduled, originalDate } = nextAvailableDate(
      rawDate, meetingDayPrefs.ownerDaily, workDays, closedPeriods
    );
    if (date.getFullYear() !== year) continue;
    meetings.push({
      date: toDateKey(date),
      meetingType: "daily",
      layer: "owner",
      isRescheduled: rescheduled,
      originalDate: rescheduled ? toDateKey(originalDate) : undefined,
    });
  }

  // ── Owner Weekly (every ownerWeekly day of week) ───────────────────────────
  const allOwnerWeeklyDates = getAllDatesForDayOfWeek(year, meetingDayPrefs.ownerWeekly);
  for (const rawDate of allOwnerWeeklyDates) {
    const { date, rescheduled, originalDate } = nextAvailableDate(
      rawDate, meetingDayPrefs.ownerWeekly, workDays, closedPeriods
    );
    if (date.getFullYear() !== year) continue;
    meetings.push({
      date: toDateKey(date),
      meetingType: "weekly",
      layer: "owner",
      isRescheduled: rescheduled,
      originalDate: rescheduled ? toDateKey(originalDate) : undefined,
    });
  }

  // ── Owner Monthly (first ownerMonthly day of each month) ──────────────────
  const ownerMonthlyDates = getFirstDayOfWeekEachMonth(year, meetingDayPrefs.ownerMonthly);
  for (const rawDate of ownerMonthlyDates) {
    const { date, rescheduled, originalDate } = nextAvailableDate(
      rawDate, meetingDayPrefs.ownerMonthly, workDays, closedPeriods
    );
    if (date.getFullYear() !== year) continue;
    meetings.push({
      date: toDateKey(date),
      meetingType: "monthly",
      layer: "owner",
      isRescheduled: rescheduled,
      originalDate: rescheduled ? toDateKey(originalDate) : undefined,
    });
  }

  // ── Owner Quarterly Offsite (first Friday of Jan, Apr, Jul, Oct) ──────────
  const quarterlyDates = getQuarterlyFridays(year);
  for (const rawDate of quarterlyDates) {
    const { date, rescheduled, originalDate } = nextAvailableDate(
      rawDate, 5 /* Friday */, workDays, closedPeriods, true
    );
    if (date.getFullYear() !== year) continue;
    meetings.push({
      date: toDateKey(date),
      meetingType: "quarterly",
      layer: "owner",
      isRescheduled: rescheduled,
      originalDate: rescheduled ? toDateKey(originalDate) : undefined,
    });
  }

  // ── Team Daily Standup (every teamDaily day of week) ──────────────────────
  const allTeamDailyDates = getAllDatesForDayOfWeek(year, meetingDayPrefs.teamDaily);
  for (const rawDate of allTeamDailyDates) {
    const { date, rescheduled, originalDate } = nextAvailableDate(
      rawDate, meetingDayPrefs.teamDaily, workDays, closedPeriods
    );
    if (date.getFullYear() !== year) continue;
    meetings.push({
      date: toDateKey(date),
      meetingType: "daily",
      layer: "team",
      isRescheduled: rescheduled,
      originalDate: rescheduled ? toDateKey(originalDate) : undefined,
    });
  }

  // ── Team Weekly (every teamWeekly day of week) ────────────────────────────
  const allTeamWeeklyDates = getAllDatesForDayOfWeek(year, meetingDayPrefs.teamWeekly);
  for (const rawDate of allTeamWeeklyDates) {
    const { date, rescheduled, originalDate } = nextAvailableDate(
      rawDate, meetingDayPrefs.teamWeekly, workDays, closedPeriods
    );
    if (date.getFullYear() !== year) continue;
    meetings.push({
      date: toDateKey(date),
      meetingType: "weekly",
      layer: "team",
      isRescheduled: rescheduled,
      originalDate: rescheduled ? toDateKey(originalDate) : undefined,
    });
  }

  // Deduplicate: if owner and team share the same date+type, keep both (they're separate meetings)
  return meetings;
}

/** Get all dates between start and end (inclusive) as YYYY-MM-DD strings */
export function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = parseDate(startDate);
  const end = parseDate(endDate);
  while (current <= end) {
    dates.push(toDateKey(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}
