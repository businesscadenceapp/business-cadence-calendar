/**
 * Business Cadence Calendar — Home Page
 * Design: Swiss Command Center — Deep Navy, functional color coding
 * Fonts: Space Grotesk (display), Inter (body), JetBrains Mono (numbers)
 */

import { useState, useMemo } from "react";
import {
  generateCalendar,
  MEETING_TYPES,
  BUSINESSES,
  type CalendarDay,
  type MeetingType,
  type CalendarMonth,
  countMeetingsInYear,
  YEAR,
} from "@/lib/calendarData";

const DOW_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MEETING_ORDER: MeetingType[] = ["quarterly", "monthly", "weekly", "daily"];

function MeetingDot({ type }: { type: MeetingType }) {
  const m = MEETING_TYPES[type];
  const isQuarterly = type === "quarterly";
  return (
    <span
      className={`inline-block rounded-full flex-shrink-0 ${isQuarterly ? "w-2 h-2" : "w-1.5 h-1.5"}`}
      style={{
        backgroundColor: m.color,
        boxShadow: isQuarterly ? `0 0 4px ${m.color}` : undefined,
      }}
      title={m.label}
    />
  );
}

function DayCell({
  day,
  onSelect,
  isSelected,
  highlightType,
}: {
  day: CalendarDay | null;
  onSelect: (day: CalendarDay) => void;
  isSelected: boolean;
  highlightType: MeetingType | null;
}) {
  if (!day) return <div className="h-10" />;

  const isHighlighted = highlightType ? day.meetings.includes(highlightType) : false;
  const hasMeetings = day.meetings.length > 0 && !day.isWeekend;
  const hasQuarterly = day.meetings.includes("quarterly");
  const hasMonthly = day.meetings.includes("monthly");
  const sortedMeetings = MEETING_ORDER.filter((t) => day.meetings.includes(t));

  return (
    <div
      className={`h-10 rounded-md flex flex-col items-center justify-between py-1 px-0.5 relative transition-all duration-150
        ${day.isWeekend ? "opacity-30" : ""}
        ${day.isToday ? "ring-1 ring-white/50" : ""}
        ${isSelected ? "ring-1 ring-white/60" : ""}
        ${hasMeetings ? "cursor-pointer" : ""}
        ${isHighlighted ? "ring-1" : ""}
      `}
      style={{
        backgroundColor: isSelected
          ? "oklch(1 0 0 / 12%)"
          : hasQuarterly
          ? "rgba(244,63,94,0.12)"
          : hasMonthly
          ? "rgba(20,184,166,0.08)"
          : isHighlighted
          ? "oklch(1 0 0 / 7%)"
          : hasMeetings
          ? "oklch(1 0 0 / 3%)"
          : "transparent",
        borderColor:
          isHighlighted && highlightType
            ? MEETING_TYPES[highlightType].color + "50"
            : undefined,
      }}
      onClick={() => hasMeetings && onSelect(day)}
    >
      <span
        className={`text-[10px] leading-none ${
          day.isToday
            ? "text-white font-bold"
            : hasQuarterly
            ? "text-rose-300 font-semibold"
            : hasMonthly
            ? "text-teal-300 font-medium"
            : "text-white/45"
        }`}
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {day.dayOfMonth}
      </span>
      {hasMeetings && sortedMeetings.length > 0 && (
        <div className="flex gap-0.5 items-center justify-center">
          {sortedMeetings.map((t) => (
            <MeetingDot key={t} type={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function MonthGrid({
  month,
  onSelectDay,
  selectedDay,
  highlightType,
}: {
  month: CalendarMonth;
  onSelectDay: (day: CalendarDay) => void;
  selectedDay: CalendarDay | null;
  highlightType: MeetingType | null;
}) {
  const quarterlyDays = month.days.filter((d) => d && d.meetings.includes("quarterly")).length;
  const monthlyDays = month.days.filter((d) => d && d.meetings.includes("monthly")).length;

  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-2"
      style={{
        backgroundColor: "oklch(0.17 0.022 240)",
        border: quarterlyDays > 0
          ? "1px solid rgba(244,63,94,0.25)"
          : "1px solid oklch(1 0 0 / 6%)",
      }}
    >
      <div className="flex items-center justify-between">
        <h3
          className="text-xs font-semibold text-white/80 tracking-wider uppercase"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {month.name}
        </h3>
        <div className="flex gap-1">
          {quarterlyDays > 0 && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
              style={{
                backgroundColor: "rgba(244,63,94,0.2)",
                color: "#FDA4AF",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              OFFSITE
            </span>
          )}
          {monthlyDays > 0 && quarterlyDays === 0 && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
              style={{
                backgroundColor: "rgba(20,184,166,0.15)",
                color: "#5EEAD4",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              FINANCE
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {DOW_LABELS.map((d) => (
          <div
            key={d}
            className="text-center text-[9px] font-medium text-white/25 pb-1"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
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
            highlightType={highlightType}
          />
        ))}
      </div>
    </div>
  );
}

function BusinessBlock({
  block,
  meetingColor,
}: {
  block: { business: string; duration: string; startOffset: string; endOffset: string; focus: string; items: string[] };
  meetingColor: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const biz = BUSINESSES[block.business as keyof typeof BUSINESSES];

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: `1px solid ${biz.color}30`, backgroundColor: `${biz.color}08` }}
    >
      <button
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-base leading-none flex-shrink-0">{biz.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold"
              style={{ color: biz.color, fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {biz.shortName}
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-mono"
              style={{
                backgroundColor: `${biz.color}20`,
                color: biz.color,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {block.duration}
            </span>
            <span className="text-[10px] text-white/30 font-mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {block.startOffset}–{block.endOffset}
            </span>
          </div>
          <p className="text-[10px] text-white/45 mt-0.5 truncate">{block.focus}</p>
        </div>
        <span className="text-white/30 text-xs flex-shrink-0">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 flex flex-col gap-1.5">
          <div className="w-full h-px mb-1" style={{ backgroundColor: `${biz.color}20` }} />
          {block.items.map((item: string, i: number) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="flex-shrink-0 mt-0.5" style={{ color: biz.color, fontSize: "10px" }}>›</span>
              <p className="text-[11px] text-white/65 leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailPanel({
  day,
  onClose,
}: {
  day: CalendarDay;
  onClose: () => void;
}) {
  const dateStr = day.date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const sortedMeetings = MEETING_ORDER.filter((t) => day.meetings.includes(t));

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p
            className="text-[10px] text-white/35 uppercase tracking-widest mb-1"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Scheduled for
          </p>
          <h2
            className="text-sm font-bold text-white leading-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {dateStr}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-white/30 hover:text-white/70 transition-colors text-xl leading-none w-6 h-6 flex items-center justify-center rounded hover:bg-white/10"
        >
          ×
        </button>
      </div>

      {/* Each meeting type */}
      {sortedMeetings.map((type) => {
        const m = MEETING_TYPES[type];
        return (
          <div
            key={type}
            className="rounded-xl flex flex-col gap-3"
            style={{ backgroundColor: m.bgColor, border: `1px solid ${m.color}30` }}
          >
            {/* Meeting header */}
            <div className="px-4 pt-4 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: m.color, boxShadow: `0 0 6px ${m.color}80` }}
                />
                <span
                  className="font-bold text-sm"
                  style={{ color: m.textColor, fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {m.label}
                </span>
                <span
                  className="ml-auto text-[10px] px-2 py-0.5 rounded font-mono"
                  style={{
                    backgroundColor: `${m.color}20`,
                    color: m.textColor,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {m.totalDuration}
                </span>
              </div>
              <p className="text-[10px] text-white/40 leading-relaxed">{m.overview}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] text-white/25">🕐</span>
                <span className="text-[10px] text-white/35 italic">{m.suggestedTime}</span>
              </div>
            </div>

            {/* Per-business time blocks */}
            <div className="px-3 flex flex-col gap-2">
              <p
                className="text-[9px] font-bold text-white/25 uppercase tracking-widest px-1"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Time Breakdown by Business
              </p>
              {m.timeBlocks.map((block, i) => (
                <BusinessBlock key={i} block={block} meetingColor={m.color} />
              ))}
            </div>

            {/* Shared items */}
            {m.sharedItems.length > 0 && (
              <div className="px-3 pb-4 flex flex-col gap-1.5">
                <p
                  className="text-[9px] font-bold text-white/25 uppercase tracking-widest px-1"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  All-Business Items
                </p>
                <div
                  className="rounded-lg px-3 py-2.5 flex flex-col gap-1.5"
                  style={{ backgroundColor: "oklch(1 0 0 / 5%)", border: "1px solid oklch(1 0 0 / 8%)" }}
                >
                  {m.sharedItems.map((item, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-white/30 flex-shrink-0 text-xs mt-0.5">›</span>
                      <p className="text-[11px] text-white/60 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LegendItem({
  type,
  isActive,
  onHover,
  onLeave,
}: {
  type: MeetingType;
  isActive: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  const m = MEETING_TYPES[type];
  const count = countMeetingsInYear(type);

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-150"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{
        backgroundColor: isActive ? m.bgColor : "transparent",
        border: isActive ? `1px solid ${m.color}40` : "1px solid transparent",
      }}
    >
      <span
        className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5"
        style={{
          backgroundColor: m.color,
          boxShadow: isActive ? `0 0 6px ${m.color}` : undefined,
        }}
      />
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-xs font-semibold text-white/85"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {m.label}
          </span>
          <span
            className="text-[10px] text-white/35 flex-shrink-0"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            ×{count}/yr
          </span>
        </div>
        <span className="text-[10px] text-white/35">{m.totalDuration}</span>
      </div>
    </div>
  );
}

export default function Home() {
  const calendar = useMemo(() => generateCalendar(), []);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [highlightType, setHighlightType] = useState<MeetingType | null>(null);

  const handleSelectDay = (day: CalendarDay) => {
    setSelectedDay((prev) =>
      prev && prev.date.getTime() === day.date.getTime() ? null : day
    );
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "oklch(0.13 0.025 240)", fontFamily: "'Inter', sans-serif" }}
    >
      {/* Header */}
      <header
        className="px-5 py-3.5 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: "1px solid oklch(1 0 0 / 8%)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #10B981 0%, #0EA5E9 100%)",
              boxShadow: "0 0 16px rgba(16,185,129,0.3)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="2" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.95" />
              <rect x="10" y="2" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.65" />
              <rect x="2" y="10" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.65" />
              <rect x="10" y="10" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.35" />
            </svg>
          </div>
          <div>
            <h1
              className="text-base font-bold text-white leading-tight tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Business Cadence Calendar
            </h1>
            <p className="text-[11px] text-white/35 mt-0.5">
              New Beginnings Chiropractic · Evolved CrossFit · Bubbles Realty
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3">
            {(["daily", "weekly", "monthly", "quarterly"] as MeetingType[]).map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: MEETING_TYPES[t].color }} />
                <span className="text-[10px] text-white/40" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {MEETING_TYPES[t].shortLabel}
                </span>
              </div>
            ))}
          </div>
          <span
            className="text-sm font-mono font-bold text-white/25 tracking-widest"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {YEAR}
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside
          className="w-60 flex-shrink-0 flex flex-col gap-4 p-4 overflow-y-auto"
          style={{ borderRight: "1px solid oklch(1 0 0 / 8%)" }}
        >
          <div>
            <p
              className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-1 px-1"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Meeting Types
            </p>
            <p className="text-[10px] text-white/20 px-1 mb-2 leading-relaxed">
              Hover to highlight · Click day for full breakdown
            </p>
            <div className="flex flex-col gap-0.5">
              {(["quarterly", "monthly", "weekly", "daily"] as MeetingType[]).map((type) => (
                <LegendItem
                  key={type}
                  type={type}
                  isActive={highlightType === type}
                  onHover={() => setHighlightType(type)}
                  onLeave={() => setHighlightType(null)}
                />
              ))}
            </div>
          </div>

          {/* Businesses */}
          <div>
            <p
              className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-2 px-1"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Your Businesses
            </p>
            <div className="flex flex-col gap-1">
              {(Object.entries(BUSINESSES) as [keyof typeof BUSINESSES, typeof BUSINESSES[keyof typeof BUSINESSES]][]).map(([key, biz]) => (
                <div
                  key={key}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                  style={{ backgroundColor: "oklch(0.17 0.022 240)" }}
                >
                  <span className="text-base leading-none">{biz.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-medium text-white/75"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {biz.shortName}
                    </p>
                    <p className="text-[9px] text-white/30 truncate">{biz.tagline}</p>
                  </div>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: biz.color }} />
                </div>
              ))}
            </div>
          </div>

          {/* Golden Rule */}
          <div
            className="rounded-xl p-3.5"
            style={{ backgroundColor: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)" }}
          >
            <p
              className="text-[10px] font-bold text-rose-300 uppercase tracking-wider mb-1.5"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              ★ The Golden Rule
            </p>
            <p className="text-[11px] text-white/55 leading-relaxed">
              When an issue arises outside a meeting,{" "}
              <strong className="text-white/80">add it to the Issues List</strong> — don't discuss
              it. It waits for the next scheduled meeting.
            </p>
          </div>

          {/* Science note */}
          <div
            className="rounded-xl p-3.5"
            style={{ backgroundColor: "rgba(14,165,233,0.07)", border: "1px solid rgba(14,165,233,0.15)" }}
          >
            <p
              className="text-[10px] font-bold text-sky-300 uppercase tracking-wider mb-1.5"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Why This Works
            </p>
            <p className="text-[11px] text-white/50 leading-relaxed">
              APA research: unstructured task-switching costs up to{" "}
              <strong className="text-white/75">40% of productive time</strong>. Structured cadence
              eliminates that loss.
            </p>
          </div>
        </aside>

        {/* Main Calendar */}
        <main className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {/* Summary Strip */}
          <div className="grid grid-cols-4 gap-3">
            {(["daily", "weekly", "monthly", "quarterly"] as MeetingType[]).map((type) => {
              const m = MEETING_TYPES[type];
              const count = countMeetingsInYear(type);
              return (
                <div
                  key={type}
                  className="rounded-xl p-3.5 flex flex-col gap-1.5"
                  style={{ backgroundColor: m.bgColor, border: `1px solid ${m.color}20` }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                    <span
                      className="text-[11px] font-semibold"
                      style={{ color: m.textColor, fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {m.label}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span
                      className="text-3xl font-bold text-white leading-none"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {count}
                    </span>
                    <span className="text-xs text-white/35">per year</span>
                  </div>
                  <span className="text-[10px] text-white/30">{m.totalDuration} each session</span>
                </div>
              );
            })}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-3 gap-3 xl:grid-cols-4">
            {calendar.map((month) => (
              <MonthGrid
                key={month.month}
                month={month}
                onSelectDay={handleSelectDay}
                selectedDay={selectedDay}
                highlightType={highlightType}
              />
            ))}
          </div>
        </main>

        {/* Right Detail Panel */}
        {selectedDay && (
          <aside
            className="w-80 flex-shrink-0 p-4 overflow-y-auto"
            style={{ borderLeft: "1px solid oklch(1 0 0 / 8%)" }}
          >
            <DetailPanel day={selectedDay} onClose={() => setSelectedDay(null)} />
          </aside>
        )}
      </div>

      {/* Footer */}
      <footer
        className="px-5 py-2.5 flex items-center justify-between flex-shrink-0"
        style={{ borderTop: "1px solid oklch(1 0 0 / 8%)" }}
      >
        <span className="text-[10px] text-white/20" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          Framework: EOS Meeting Pulse + Rockefeller Habits
        </span>
        <span className="text-[10px] text-white/20" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          Hover legend to highlight · Click days to view full agenda
        </span>
      </footer>
    </div>
  );
}
