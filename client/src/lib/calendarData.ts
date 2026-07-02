// ============================================================
// Business Cadence Calendar — Data & Logic
// Design: Swiss Command Center — Navy, functional color coding
// ============================================================

export const YEAR = 2026;

export type MeetingType = "daily" | "weekly" | "monthly" | "quarterly";
export type BusinessKey = "chiro" | "crossfit" | "realty";

export interface TimeBlock {
  business: BusinessKey;
  duration: string;        // e.g. "5 min"
  startOffset: string;     // e.g. "0:00"
  endOffset: string;       // e.g. "0:05"
  focus: string;           // one-line description of what to cover
  items: string[];         // agenda bullet points
}

export interface Meeting {
  type: MeetingType;
  label: string;
  shortLabel: string;
  totalDuration: string;
  suggestedTime: string;
  color: string;
  bgColor: string;
  textColor: string;
  overview: string;        // short description of the meeting's purpose
  timeBlocks: TimeBlock[]; // per-business breakdown
  sharedItems: string[];   // items that apply to all businesses (e.g. wrap-up)
}

export const BUSINESSES: Record<BusinessKey, { name: string; shortName: string; color: string; icon: string; tagline: string }> = {
  chiro: {
    name: "New Beginnings Chiropractic",
    shortName: "Chiropractic",
    color: "#10B981",
    icon: "🏥",
    tagline: "17+ years · Anchor business",
  },
  crossfit: {
    name: "Evolved CrossFit",
    shortName: "CrossFit",
    color: "#F59E0B",
    icon: "💪",
    tagline: "2 years · Turning profit",
  },
  realty: {
    name: "Bubbles Realty",
    shortName: "Realty",
    color: "#64748B",
    icon: "🏠",
    tagline: "Rental property · $8K net goal",
  },
};

export const MEETING_TYPES: Record<MeetingType, Meeting> = {
  // ─────────────────────────────────────────────
  // DAILY HUDDLE  (10–15 min, every weekday)
  // ─────────────────────────────────────────────
  daily: {
    type: "daily",
    label: "Daily Huddle",
    shortLabel: "Huddle",
    totalDuration: "10–15 min",
    suggestedTime: "8:00 AM — before the workday begins",
    color: "#8B5CF6",
    bgColor: "rgba(139,92,246,0.15)",
    textColor: "#C4B5FD",
    overview:
      "A quick tactical alignment to start the day. No problem-solving — if a topic takes more than 60 seconds, it goes on the Issues List for Tuesday's Weekly Review.",
    timeBlocks: [
      {
        business: "chiro",
        duration: "5 min",
        startOffset: "0:00",
        endOffset: "0:05",
        focus: "Patient flow & today's priorities",
        items: [
          "How many patients today? Any complex cases to flag?",
          "Any scheduling gaps or double-bookings to fix?",
          "Staff issues or supply needs for today?",
        ],
      },
      {
        business: "crossfit",
        duration: "3 min",
        startOffset: "0:05",
        endOffset: "0:08",
        focus: "Class schedule & member updates",
        items: [
          "Class attendance expected today?",
          "Any member concerns or equipment issues?",
          "Programming or coaching notes for today's class?",
        ],
      },
      {
        business: "realty",
        duration: "2 min",
        startOffset: "0:08",
        endOffset: "0:10",
        focus: "Active issues only (skip if nothing urgent)",
        items: [
          "Any renter communication needing a response today?",
          "Any maintenance or repair follow-up needed?",
          "(Skip entirely if no active issues — this is passive income)",
        ],
      },
    ],
    sharedItems: [
      "Rule: If any topic exceeds 60 seconds → write it on the Issues List. Do not discuss it now.",
      "End with: 'Anything blocking either of us today?' (30 sec)",
    ],
  },

  // ─────────────────────────────────────────────
  // WEEKLY REVIEW  (90 min, every Tuesday)
  // ─────────────────────────────────────────────
  weekly: {
    type: "weekly",
    label: "Weekly Review",
    shortLabel: "WR",
    totalDuration: "90 min",
    suggestedTime: "Tuesday at 1:00 PM — after morning patients, before afternoon",
    color: "#0EA5E9",
    bgColor: "rgba(14,165,233,0.15)",
    textColor: "#7DD3FC",
    overview:
      "Your core operational meeting. Same day, same time, every week — non-negotiable. Issues get solved permanently here, not just discussed. Pull from your shared Issues List.",
    timeBlocks: [
      {
        business: "chiro",
        duration: "45 min",
        startOffset: "0:15",
        endOffset: "1:00",
        focus: "Anchor business — deepest attention",
        items: [
          "Scorecard: New patients, retention rate, revenue vs. goal",
          "Rock Review: Progress on 90-day chiropractic goals",
          "Staff: Any performance, scheduling, or culture issues?",
          "Marketing: Referral pipeline, reviews, social presence",
          "IDS: Solve top 1–2 chiropractic issues from the Issues List",
          "Action items: Who does what by when?",
        ],
      },
      {
        business: "crossfit",
        duration: "30 min",
        startOffset: "1:00",
        endOffset: "1:30",
        focus: "Growing business — protect the profit",
        items: [
          "Scorecard: Active members, class attendance, monthly revenue",
          "Rock Review: Progress on CrossFit 90-day goals",
          "Programming & coaching: Any adjustments needed?",
          "Member retention: Anyone at risk of canceling?",
          "IDS: Solve top 1 CrossFit issue from the Issues List",
          "Action items: Who does what by when?",
        ],
      },
      {
        business: "realty",
        duration: "15 min",
        startOffset: "1:30",
        endOffset: "1:45",
        focus: "Passive asset — keep it simple",
        items: [
          "Rent received on time? Any late payments?",
          "Any maintenance requests or property issues?",
          "Tracking toward $8K net annual goal?",
          "Skip or shorten if no active issues this week",
        ],
      },
    ],
    sharedItems: [
      "Segue (0:00–0:05): Each share 1 personal win + 1 business win",
      "Scorecard overview (0:05–0:10): Are overall numbers on or off track?",
      "To-Do review (0:10–0:15): Did last week's action items get done?",
      "Wrap-up (1:45–1:30): Recap all action items, rate the meeting 1–10",
    ],
  },

  // ─────────────────────────────────────────────
  // MONTHLY FINANCIAL REVIEW  (60 min, first Tuesday)
  // ─────────────────────────────────────────────
  monthly: {
    type: "monthly",
    label: "Monthly Financial Review",
    shortLabel: "Finance",
    totalDuration: "60 min",
    suggestedTime: "First Tuesday of the month at 1:00 PM — replaces the regular Weekly Review",
    color: "#14B8A6",
    bgColor: "rgba(20,184,166,0.15)",
    textColor: "#5EEAD4",
    overview:
      "A dedicated money meeting. Keeps financial stress out of daily conversations by giving it a proper home once a month. Review the numbers, spot trends, make one financial decision per business.",
    timeBlocks: [
      {
        business: "chiro",
        duration: "25 min",
        startOffset: "0:00",
        endOffset: "0:25",
        focus: "Protect the foundation",
        items: [
          "Revenue vs. prior month & same month last year",
          "New patient count & patient retention rate",
          "Overhead review: staff, supplies, rent, insurance",
          "Accounts receivable: any outstanding insurance claims?",
          "Net profit this month — on track with annual goal?",
          "One financial decision: e.g. equipment, marketing spend, staffing",
        ],
      },
      {
        business: "crossfit",
        duration: "20 min",
        startOffset: "0:25",
        endOffset: "0:45",
        focus: "Nurture the profit",
        items: [
          "Monthly revenue vs. expenses — profit or loss?",
          "Member count: gains vs. cancellations this month",
          "Variable costs: programming, equipment, coaching hours",
          "Is the small profit growing, flat, or shrinking?",
          "One financial decision: e.g. pricing, membership drive, new class",
        ],
      },
      {
        business: "realty",
        duration: "15 min",
        startOffset: "0:45",
        endOffset: "1:00",
        focus: "Track the $8K net goal",
        items: [
          "Rent collected this month — on time?",
          "Any expenses: repairs, insurance, property tax installments?",
          "Running YTD net — are we on pace for $8K annual net?",
          "Lease renewal date — any action needed in next 90 days?",
          "One financial decision: e.g. rent increase, maintenance reserve",
        ],
      },
    ],
    sharedItems: [
      "Note: This meeting replaces the regular Weekly Review on the first Tuesday of the month",
      "Bring printed or screen-shared P&L for each business",
      "End with: 'What is the one financial move we must make this month?'",
    ],
  },

  // ─────────────────────────────────────────────
  // QUARTERLY STRATEGIC OFFSITE  (afternoon, first Friday of quarter)
  // ─────────────────────────────────────────────
  quarterly: {
    type: "quarterly",
    label: "Quarterly Strategic Offsite",
    shortLabel: "Offsite",
    totalDuration: "~4 hours (afternoon)",
    suggestedTime: "First Friday of Jan, Apr, Jul, Oct — after CrossFit class & clean-up",
    color: "#F43F5E",
    bgColor: "rgba(244,63,94,0.15)",
    textColor: "#FDA4AF",
    overview:
      "Step out of the day-to-day and look at the horizon. Get offsite — hotel lobby, coffee shop, rented space. Morning is yours (gym class + clean). Afternoon is strategic. This is the most important meeting of the quarter.",
    timeBlocks: [
      {
        business: "chiro",
        duration: "90 min",
        startOffset: "0:00",
        endOffset: "1:30",
        focus: "Protect & grow the anchor",
        items: [
          "Review last quarter: What went well? What didn't?",
          "Patient volume trend: growing, flat, or declining?",
          "Staff health: any retention risks or hiring needs?",
          "Set 2–3 'Rocks' (90-day goals) for Chiropractic",
          "Example Rocks: Launch referral program, hire part-time CA, hit X new patients/month",
          "Assign owner and deadline for each Rock",
        ],
      },
      {
        business: "crossfit",
        duration: "60 min",
        startOffset: "1:30",
        endOffset: "2:30",
        focus: "Scale the profit",
        items: [
          "Review last quarter: Revenue trend, member growth/loss",
          "What is working? What needs to change?",
          "Set 1–2 'Rocks' for CrossFit",
          "Example Rocks: Add Saturday open gym, reach X members, run a challenge event",
          "Assign owner and deadline for each Rock",
        ],
      },
      {
        business: "realty",
        duration: "30 min",
        startOffset: "2:30",
        endOffset: "3:00",
        focus: "Optimize the passive income",
        items: [
          "YTD net vs. $8K annual goal — on track?",
          "Any lease, maintenance, or capital improvement decisions?",
          "Set 1 'Rock' for Realty if needed (often none required)",
          "Example Rock: Raise rent at renewal, complete deferred maintenance",
        ],
      },
    ],
    sharedItems: [
      "Copreneur Check-In (3:00–3:30): How is the work-life balance feeling? Are the meeting boundaries working? What needs to change?",
      "Celebrate wins: Name one thing each of you is proud of from the last 90 days",
      "Preview next quarter: Any major events, vacations, or disruptions to plan around?",
      "End with dinner or something enjoyable — you earned it",
    ],
  },
};

export interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  isWeekend: boolean;
  meetings: MeetingType[];
  isToday: boolean;
  isClosed?: boolean;  // true if this day is in a closed period
}

export interface CalendarMonth {
  month: number;
  name: string;
  days: (CalendarDay | null)[];
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKLY_DAY = 2; // Tuesday

function isFirstTuesdayOfMonth(date: Date): boolean {
  if (date.getDay() !== 2) return false;
  return date.getDate() <= 7;
}

function isFirstFridayOfMonth(date: Date): boolean {
  if (date.getDay() !== 5) return false;
  return date.getDate() <= 7;
}

function isQuarterlyMonth(month: number): boolean {
  return [0, 3, 6, 9].includes(month);
}

export function generateCalendar(): CalendarMonth[] {
  const months: CalendarMonth[] = [];
  const today = new Date();

  for (let m = 0; m < 12; m++) {
    const firstDay = new Date(YEAR, m, 1);
    const lastDay = new Date(YEAR, m + 1, 0);
    const startDow = firstDay.getDay();

    const days: (CalendarDay | null)[] = [];

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
        meetings.push("daily");

        if (dow === WEEKLY_DAY) {
          meetings.push("weekly");
        }

        if (dow === WEEKLY_DAY && isFirstTuesdayOfMonth(date)) {
          meetings.push("monthly");
        }

        if (dow === 5 && isFirstFridayOfMonth(date) && isQuarterlyMonth(m)) {
          meetings.push("quarterly");
        }
      }

      days.push({ date, dayOfMonth: d, isWeekend, meetings, isToday });
    }

    months.push({ month: m, name: MONTH_NAMES[m], days });
  }

  return months;
}

/**
 * Build a CalendarMonth[] from server-generated schedule data.
 * `meetings` is the array of ScheduledMeeting from the tRPC generateCalendar query.
 * `closedDates` is the array of YYYY-MM-DD strings for closed days.
 */
export function buildCalendarFromSchedule(
  year: number,
  meetings: { date: string; meetingType: string; layer: string }[],
  closedDates: string[]
): CalendarMonth[] {
  const closedSet = new Set(closedDates);
  // Build a map of dateKey -> meeting types
  const meetingMap = new Map<string, MeetingType[]>();
  for (const m of meetings) {
    const key = m.date;
    if (!meetingMap.has(key)) meetingMap.set(key, []);
    meetingMap.get(key)!.push(m.meetingType as MeetingType);
  }

  const today = new Date();
  const months: CalendarMonth[] = [];
  const MONTH_NAMES_LOCAL = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  for (let mo = 0; mo < 12; mo++) {
    const firstDay = new Date(year, mo, 1);
    const lastDay = new Date(year, mo + 1, 0);
    const startDow = firstDay.getDay();
    const days: (CalendarDay | null)[] = [];

    for (let i = 0; i < startDow; i++) days.push(null);

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, mo, d);
      const dow = date.getDay();
      const isWeekend = dow === 0 || dow === 6;
      const isToday =
        today.getFullYear() === year &&
        today.getMonth() === mo &&
        today.getDate() === d;
      const dateKey = `${year}-${String(mo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isClosed = closedSet.has(dateKey);
      const meetings: MeetingType[] = meetingMap.get(dateKey) ?? [];
      days.push({ date, dayOfMonth: d, isWeekend, meetings, isToday, isClosed });
    }

    months.push({ month: mo, name: MONTH_NAMES_LOCAL[mo], days });
  }

  return months;
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
