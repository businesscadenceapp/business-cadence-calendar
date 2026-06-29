// ============================================================
// Business Cadence Calendar — Data & Logic
// Design: Swiss Command Center — Navy, functional color coding
// ============================================================

export const YEAR = 2026;

export type MeetingType = "daily" | "weekly" | "monthly" | "quarterly";
export type BusinessKey = "chiro" | "crossfit" | "realty" | "all";

export interface Meeting {
  type: MeetingType;
  businesses: BusinessKey[];
  label: string;
  shortLabel: string;
  duration: string;
  agenda: string[];
  color: string;
  bgColor: string;
  textColor: string;
}

export const MEETING_TYPES: Record<MeetingType, Meeting> = {
  daily: {
    type: "daily",
    businesses: ["all"],
    label: "Daily Huddle",
    shortLabel: "Huddle",
    duration: "10–15 min",
    agenda: [
      "What's up? (30 sec each — top focus for the day)",
      "Daily metrics check (patient count, class attendance)",
      "Where are you stuck? (blockers for next 24 hours)",
      "Rule: If a topic takes >2 min → Issues List for Weekly Meeting",
    ],
    color: "#8B5CF6",
    bgColor: "rgba(139,92,246,0.15)",
    textColor: "#C4B5FD",
  },
  weekly: {
    type: "weekly",
    businesses: ["chiro", "crossfit", "realty"],
    label: "Weekly Level 10",
    shortLabel: "L10",
    duration: "60–90 min",
    agenda: [
      "Segue: 1 personal win + 1 business win (5 min)",
      "Scorecard: Key weekly numbers on/off track (5 min)",
      "Rock Review: 90-day goal progress (5 min)",
      "Headlines: Staff & client updates (5 min)",
      "To-Do Review: Last week's action items (5 min)",
      "IDS — Identify, Discuss, Solve top 3 issues (35–65 min)",
    ],
    color: "#0EA5E9",
    bgColor: "rgba(14,165,233,0.15)",
    textColor: "#7DD3FC",
  },
  monthly: {
    type: "monthly",
    businesses: ["chiro", "crossfit", "realty"],
    label: "Monthly Financial Review",
    shortLabel: "Finance",
    duration: "60 min",
    agenda: [
      "New Beginnings Chiropractic P&L review",
      "Evolved CrossFit P&L — tracking small profit growth",
      "Bubbles Realty — tracking $8K net goal vs. actuals",
      "Cash flow & upcoming expenses across all three",
    ],
    color: "#14B8A6",
    bgColor: "rgba(20,184,166,0.15)",
    textColor: "#5EEAD4",
  },
  quarterly: {
    type: "quarterly",
    businesses: ["chiro", "crossfit", "realty"],
    label: "Quarterly Strategic Offsite",
    shortLabel: "Offsite",
    duration: "Half–Full Day",
    agenda: [
      "Review past 90 days: Wins & Learns for each business",
      "Set 3–7 'Rocks' (goals) for next 90 days per business",
      "Chiropractic: Longevity & growth strategy",
      "CrossFit: Profit growth plan",
      "Realty: Rental income optimization",
      "Copreneur Check-In: Work-life balance & boundaries",
    ],
    color: "#F43F5E",
    bgColor: "rgba(244,63,94,0.15)",
    textColor: "#FDA4AF",
  },
};

export const BUSINESSES = {
  chiro: { name: "New Beginnings Chiropractic", shortName: "Chiropractic", color: "#10B981", icon: "🏥" },
  crossfit: { name: "Evolved CrossFit", shortName: "CrossFit", color: "#F59E0B", icon: "💪" },
  realty: { name: "Bubbles Realty", shortName: "Realty", color: "#64748B", icon: "🏠" },
};

export interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  isWeekend: boolean;
  meetings: MeetingType[];
  isToday: boolean;
}

export interface CalendarMonth {
  month: number; // 0-indexed
  name: string;
  days: (CalendarDay | null)[];
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Weekly meeting day: Tuesday (2)
const WEEKLY_DAY = 2;
// Daily huddle: Mon-Fri (1-5)
// Monthly review: first Tuesday of each month
// Quarterly: Jan, Apr, Jul, Oct — first full week Tuesday

function isFirstTuesdayOfMonth(date: Date): boolean {
  if (date.getDay() !== 2) return false;
  return date.getDate() <= 7;
}

function isQuarterlyMonth(month: number): boolean {
  return [0, 3, 6, 9].includes(month); // Jan, Apr, Jul, Oct
}

export function generateCalendar(): CalendarMonth[] {
  const months: CalendarMonth[] = [];
  const today = new Date();

  for (let m = 0; m < 12; m++) {
    const firstDay = new Date(YEAR, m, 1);
    const lastDay = new Date(YEAR, m + 1, 0);
    const startDow = firstDay.getDay(); // 0=Sun

    const days: (CalendarDay | null)[] = [];

    // Pad start
    for (let i = 0; i < startDow; i++) {
      days.push(null);
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(YEAR, m, d);
      const dow = date.getDay();
      const isWeekend = dow === 0 || dow === 6;
      const isToday =
        today.getFullYear() === YEAR &&
        today.getMonth() === m &&
        today.getDate() === d;

      const meetings: MeetingType[] = [];

      if (!isWeekend) {
        // Daily huddle every weekday
        meetings.push("daily");

        // Weekly L10 on Tuesdays
        if (dow === WEEKLY_DAY) {
          meetings.push("weekly");
        }

        // Monthly review: first Tuesday of month
        if (dow === WEEKLY_DAY && isFirstTuesdayOfMonth(date)) {
          meetings.push("monthly");
        }

        // Quarterly offsite: first Tuesday of Jan, Apr, Jul, Oct
        if (dow === WEEKLY_DAY && isFirstTuesdayOfMonth(date) && isQuarterlyMonth(m)) {
          meetings.push("quarterly");
        }
      }

      days.push({ date, dayOfMonth: d, isWeekend, meetings, isToday });
    }

    months.push({ month: m, name: MONTH_NAMES[m], days });
  }

  return months;
}

export function getMeetingsForDay(day: CalendarDay): Meeting[] {
  return day.meetings.map((t) => MEETING_TYPES[t]);
}

export function countMeetingsInYear(type: MeetingType): number {
  const months = generateCalendar();
  let count = 0;
  for (const month of months) {
    for (const day of month.days) {
      if (day && day.meetings.includes(type)) count++;
    }
  }
  return count;
}
