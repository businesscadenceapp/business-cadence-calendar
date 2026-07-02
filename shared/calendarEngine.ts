/**
 * Calendar Engine — generates meeting schedules from business profile settings.
 * Handles: work day filtering, closed period exclusions, auto-shifting to next available day.
 */

export type MeetingType = "daily" | "weekly" | "monthly" | "quarterly";

export interface MeetingDayPrefs {
  ownerDaily: number[];  // array of days 0=Sun..6=Sat (multi-day daily huddle)
  ownerWeekly: number;
  ownerMonthly: number;  // day of week for monthly (first occurrence of that day each month)
  quarterlyDay: number;  // day of week for quarterly offsite (first occurrence of that day in Jan/Apr/Jul/Oct)
  teamDaily: number[];  // multi-day selection
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
    const targetDow = preferredDayOfWeek;
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
 * Get the first occurrence of a day-of-week in each quarter start month (Jan, Apr, Jul, Oct).
 * Used for quarterly offsites.
 */
function getFirstDayOfWeekEachQuarter(year: number, dayOfWeek: number): Date[] {
  const quarterMonths = [0, 3, 6, 9]; // Jan, Apr, Jul, Oct
  return quarterMonths.map(month => {
    const d = new Date(year, month, 1);
    while (d.getDay() !== dayOfWeek) d.setDate(d.getDate() + 1);
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
  const ownerDailyDays = Array.isArray(meetingDayPrefs.ownerDaily)
    ? meetingDayPrefs.ownerDaily
    : [meetingDayPrefs.ownerDaily as unknown as number]; // backward compat
  const seenDailyOwnerDates = new Set<string>();
  for (const dayOfWeek of ownerDailyDays) {
    const allOwnerDailyDates = getAllDatesForDayOfWeek(year, dayOfWeek);
    for (const rawDate of allOwnerDailyDates) {
      const { date, rescheduled, originalDate } = nextAvailableDate(
        rawDate, dayOfWeek, workDays, closedPeriods
      );
      if (date.getFullYear() !== year) continue;
      const key = toDateKey(date);
      if (seenDailyOwnerDates.has(key)) continue;
      seenDailyOwnerDates.add(key);
      meetings.push({
        date: key,
        meetingType: "daily",
        layer: "owner",
        isRescheduled: rescheduled,
        originalDate: rescheduled ? toDateKey(originalDate) : undefined,
      });
    }
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
  const qDay = meetingDayPrefs.quarterlyDay ?? 5; // default to Friday if not set
  const quarterlyDates = getFirstDayOfWeekEachQuarter(year, qDay);
  for (const rawDate of quarterlyDates) {
    const { date, rescheduled, originalDate } = nextAvailableDate(
      rawDate, qDay, workDays, closedPeriods
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

  // ── Team Daily Huddle (every week on each selected teamDaily day) ──────────
  const teamDailyDays = Array.isArray(meetingDayPrefs.teamDaily)
    ? meetingDayPrefs.teamDaily
    : [meetingDayPrefs.teamDaily as unknown as number]; // backward compat
  const seenDailyTeamDates = new Set<string>();
  for (const dayOfWeek of teamDailyDays) {
    const allTeamDailyDates = getAllDatesForDayOfWeek(year, dayOfWeek);
    for (const rawDate of allTeamDailyDates) {
      const { date, rescheduled, originalDate } = nextAvailableDate(
        rawDate, dayOfWeek, workDays, closedPeriods
      );
      if (date.getFullYear() !== year) continue;
      const key = toDateKey(date);
      if (seenDailyTeamDates.has(key)) continue;
      seenDailyTeamDates.add(key);
      meetings.push({
        date: key,
        meetingType: "daily",
        layer: "team",
        isRescheduled: rescheduled,
        originalDate: rescheduled ? toDateKey(originalDate) : undefined,
      });
    }
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
