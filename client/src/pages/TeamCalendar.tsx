/**
 * Team Calendar — employee-facing calendar view
 * Shows only the meeting types the owner has enabled for team visibility.
 * Design: Dark Navy Command Center — matches Owner Calendar style.
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { usePerson } from "@/contexts/PersonContext";
import {
  buildCalendarFromSchedule,
  MEETING_TYPES,
  type CalendarDay,
  type MeetingType,
  type CalendarMonth,
} from "@/lib/calendarData";

const DOW_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// ─── Meeting dot ────────────────────────────────────────────────────────────
function MeetingDot({ type }: { type: MeetingType }) {
  const m = MEETING_TYPES[type];
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: m.color }}
      title={m.label}
    />
  );
}

// ─── Day cell ───────────────────────────────────────────────────────────────
function DayCell({
  day,
  onSelect,
  isSelected,
  visibleTypes,
}: {
  day: CalendarDay | null;
  onSelect: (day: CalendarDay) => void;
  isSelected: boolean;
  visibleTypes: Set<MeetingType>;
}) {
  if (!day) {
    return <div className="aspect-square" />;
  }

  const today = new Date();
  const isToday =
    day.date.getDate() === today.getDate() &&
    day.date.getMonth() === today.getMonth() &&
    day.date.getFullYear() === today.getFullYear();

  const visibleMeetings = day.meetings.filter((m) => visibleTypes.has(m));
  const hasMeetings = visibleMeetings.length > 0;

  return (
    <button
      onClick={() => onSelect(day)}
      className="aspect-square rounded-lg flex flex-col items-center justify-between p-0.5 transition-all"
      style={{
        backgroundColor: isSelected
          ? "rgba(94,234,212,0.2)"
          : isToday
          ? "rgba(94,234,212,0.08)"
          : hasMeetings
          ? "rgba(255,255,255,0.05)"
          : "transparent",
        border: isSelected
          ? "1.5px solid rgba(94,234,212,0.6)"
          : isToday
          ? "1.5px solid rgba(94,234,212,0.3)"
          : "1.5px solid transparent",
      }}
    >
      <span
        className="text-[10px] font-semibold leading-none mt-0.5"
        style={{
          color: isToday
            ? "#5EEAD4"
            : isSelected
            ? "#fff"
            : hasMeetings
            ? "rgba(255,255,255,0.9)"
            : "rgba(255,255,255,0.35)",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {day.date.getDate()}
      </span>
      <div className="flex gap-0.5 flex-wrap justify-center mb-0.5">
        {visibleMeetings.map((m) => (
          <MeetingDot key={m} type={m} />
        ))}
      </div>
    </button>
  );
}

// ─── Month grid ─────────────────────────────────────────────────────────────
function MonthGrid({
  month,
  onSelectDay,
  selectedDay,
  visibleTypes,
  hideHeader,
}: {
  month: CalendarMonth;
  onSelectDay: (day: CalendarDay) => void;
  selectedDay: CalendarDay | null;
  visibleTypes: Set<MeetingType>;
  hideHeader?: boolean;
}) {
  const hasQuarterly = month.days.some(
    (d) => d && d.meetings.includes("quarterly") && visibleTypes.has("quarterly")
  );

  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-2 overflow-hidden"
      style={{
        backgroundColor: "rgba(255,255,255,0.04)",
        border: hasQuarterly
          ? "1.5px solid rgba(244,63,94,0.35)"
          : "1.5px solid rgba(255,255,255,0.08)",
      }}
    >
      {!hideHeader && (
        <h3
          className="text-xs font-semibold tracking-wider uppercase"
          style={{ color: "rgba(255,255,255,0.8)", fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {month.name}
        </h3>
      )}
      <div className="grid grid-cols-7 gap-1">
        {DOW_LABELS.map((d) => (
          <div
            key={d}
            className="text-center text-[9px] font-semibold pb-0.5"
            style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {d}
          </div>
        ))}
        {month.days.map((day, idx) => (
          <DayCell
            key={idx}
            day={day}
            onSelect={onSelectDay}
            isSelected={
              selectedDay !== null &&
              day !== null &&
              selectedDay.date.getTime() === day.date.getTime()
            }
            visibleTypes={visibleTypes}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Day detail panel ────────────────────────────────────────────────────────
function DayDetail({
  day,
  visibleTypes,
  onClose,
}: {
  day: CalendarDay;
  visibleTypes: Set<MeetingType>;
  onClose: () => void;
}) {
  const visibleMeetings = day.meetings.filter((m) => visibleTypes.has(m));
  const dateStr = day.date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
    >
      <div className="flex items-center justify-between">
        <h3
          className="text-sm font-bold text-white"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {dateStr}
        </h3>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1L9 9M9 1L1 9" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {visibleMeetings.length === 0 ? (
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          No meetings scheduled for this day.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {visibleMeetings.map((type) => {
            const m = MEETING_TYPES[type];
            return (
              <div
                key={type}
                className="rounded-lg p-3"
                style={{ backgroundColor: "rgba(255,255,255,0.04)", border: `1px solid ${m.color}33` }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: m.color }}
                  />
                  <span
                    className="text-xs font-bold"
                    style={{ color: m.color, fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {m.label}
                  </span>
                  <span
                    className="text-[10px] ml-auto"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    {m.totalDuration}
                  </span>
                </div>
                <p
                  className="text-[11px] leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  {m.overview}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function TeamCalendar() {
  const { person } = usePerson();
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "year">(() => {
    try { return (localStorage.getItem("bcc_team_cal_view") as "month" | "year") ?? "month"; } catch { return "month"; }
  });
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonthIndex, setViewMonthIndex] = useState(() => new Date().getMonth());

  const accountId = person?.accountId ?? (() => {
    const stored = localStorage.getItem("bcc_account_id");
    return stored ? parseInt(stored, 10) : undefined;
  })();

  // Fetch calendar schedule
  const { data: calendarData } = trpc.onboarding.generateCalendar.useQuery(
    { accountId: accountId ?? 0, year: viewYear },
    { enabled: accountId !== undefined, refetchOnWindowFocus: true }
  );

  // Fetch team calendar visibility settings
  const { data: settings } = trpc.teamCalendar.getSettings.useQuery(
    { accountId: accountId ?? 0 },
    { enabled: accountId !== undefined, staleTime: 60_000 }
  );

  const visibleTypes = useMemo<Set<MeetingType>>(() => {
    const s = settings ?? { showDaily: true, showWeekly: true, showMonthly: true, showQuarterly: true };
    const types: MeetingType[] = [];
    if (s.showDaily) types.push("daily");
    if (s.showWeekly) types.push("weekly");
    if (s.showMonthly) types.push("monthly");
    if (s.showQuarterly) types.push("quarterly");
    return new Set(types);
  }, [settings]);

  const calendar = useMemo<CalendarMonth[]>(() => {
    if (calendarData?.meetings && calendarData.meetings.length > 0) {
      return buildCalendarFromSchedule(viewYear, calendarData.meetings, calendarData.closedDates ?? []);
    }
    return [];
  }, [calendarData, viewYear]);

  const handleSelectDay = (day: CalendarDay) => {
    setSelectedDay((prev) =>
      prev && prev.date.getTime() === day.date.getTime() ? null : day
    );
  };

  const toggleViewMode = () => {
    setViewMode((prev) => {
      const next = prev === "month" ? "year" : "month";
      try { localStorage.setItem("bcc_team_cal_view", next); } catch { /* ignore */ }
      return next;
    });
  };

  const goToPrevMonth = () => {
    if (viewMonthIndex === 0) { setViewYear((y) => y - 1); setViewMonthIndex(11); }
    else { setViewMonthIndex((i) => i - 1); }
  };
  const goToNextMonth = () => {
    if (viewMonthIndex === 11) { setViewYear((y) => y + 1); setViewMonthIndex(0); }
    else { setViewMonthIndex((i) => i + 1); }
  };
  const goToToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonthIndex(now.getMonth());
  };

  const isViewingToday =
    viewMonthIndex === new Date().getMonth() && viewYear === new Date().getFullYear();

  const currentMonthName = calendar[viewMonthIndex]?.name ?? "";

  return (
    <div style={{ backgroundColor: "#0F2440", fontFamily: "'Inter', sans-serif" }}>
      {/* Page title bar */}
      <div
        className="px-4 py-2.5 flex items-center justify-between flex-shrink-0 relative z-30"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", backgroundColor: "#0A1929" }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base">📅</span>
          <h1
            className="text-sm font-bold text-white"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Team Schedule
          </h1>
          <span
            className="text-xs font-mono font-bold ml-1"
            style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}
          >
            {viewYear}
          </span>
        </div>

        {/* Legend — visible meeting types only */}
        <div className="hidden sm:flex items-center gap-3">
          {(["daily", "weekly", "monthly", "quarterly"] as MeetingType[]).map((t) => {
            if (!visibleTypes.has(t)) return null;
            const m = MEETING_TYPES[t];
            return (
              <div key={t} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>{m.shortLabel}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Calendar nav bar */}
      <div
        className="px-4 py-2 flex items-center gap-2 flex-shrink-0 sticky top-0 z-20"
        style={{ backgroundColor: "#0F2440", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Prev / month name / next */}
        <button
          onClick={goToPrevMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M7.5 2L3.5 6L7.5 10" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <span
          className="text-sm font-bold text-white flex-1 text-center"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {viewMode === "month" ? currentMonthName : `${viewYear} Overview`}
        </span>

        <button
          onClick={goToNextMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4.5 2L8.5 6L4.5 10" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Today + Year/Month toggle */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {!isViewingToday && (
            <button
              onClick={goToToday}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold"
              style={{ background: "rgba(94,234,212,0.12)", border: "1px solid rgba(94,234,212,0.3)", color: "#5EEAD4", fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Today
            </button>
          )}
          <button
            onClick={toggleViewMode}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {viewMode === "month" ? "Year" : "Month"}
          </button>
        </div>
      </div>

      {/* Calendar content */}
      <div className="p-3 sm:p-5 flex flex-col gap-3">
        {calendar.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-4xl">📅</span>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              Calendar loading...
            </p>
          </div>
        ) : viewMode === "month" ? (
          <div className="flex flex-col gap-3">
            {calendar[viewMonthIndex] && (
              <MonthGrid
                month={calendar[viewMonthIndex]}
                onSelectDay={handleSelectDay}
                selectedDay={selectedDay}
                visibleTypes={visibleTypes}
                hideHeader
              />
            )}
            {selectedDay && (
              <DayDetail
                day={selectedDay}
                visibleTypes={visibleTypes}
                onClose={() => setSelectedDay(null)}
              />
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 xl:grid-cols-4">
            {calendar.map((month) => (
              <div key={month.month}>
                <MonthGrid
                  month={month}
                  onSelectDay={handleSelectDay}
                  selectedDay={selectedDay}
                  visibleTypes={visibleTypes}
                />
              </div>
            ))}
          </div>
        )}

        {/* Meeting type legend on mobile */}
        <div
          className="sm:hidden rounded-xl p-3 flex flex-wrap gap-3"
          style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {(["daily", "weekly", "monthly", "quarterly"] as MeetingType[]).map((t) => {
            if (!visibleTypes.has(t)) return null;
            const m = MEETING_TYPES[t];
            return (
              <div key={t} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
