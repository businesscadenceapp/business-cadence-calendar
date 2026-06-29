/**
 * Business Cadence Calendar — Home Page
 * Design: Swiss Command Center — Deep Navy, functional color coding
 * Fonts: Space Grotesk (display), Inter (body), JetBrains Mono (numbers)
 */

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
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
  hasLog,
}: {
  day: CalendarDay | null;
  onSelect: (day: CalendarDay) => void;
  isSelected: boolean;
  highlightType: MeetingType | null;
  hasLog?: boolean;
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
      <div className="relative w-full flex justify-center">
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
        {hasLog && (
          <span
            className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: "#22c55e", boxShadow: "0 0 3px #22c55e" }}
            title="Meeting logged"
          />
        )}
      </div>
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
  loggedDates,
}: {
  month: CalendarMonth;
  onSelectDay: (day: CalendarDay) => void;
  selectedDay: CalendarDay | null;
  highlightType: MeetingType | null;
  loggedDates: Set<string>;
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
        {month.days.map((day, idx) => {
          const dateKey = day
            ? `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, "0")}-${String(day.date.getDate()).padStart(2, "0")}`
            : "";
          return (
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
              hasLog={day ? loggedDates.has(dateKey) : false}
            />
          );
        })}
      </div>
    </div>
  );
}

function BusinessBlock({
  block,
  meetingColor,
  meetingType,
  itemStates,
  onToggle,
  onCommentChange,
}: {
  block: { business: string; duration: string; startOffset: string; endOffset: string; focus: string; items: string[] };
  meetingColor: string;
  meetingType: MeetingType;
  itemStates: Map<string, { completed: boolean; comment: string }>;
  onToggle: (itemKey: string, completed: boolean) => void;
  onCommentChange: (itemKey: string, comment: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const biz = BUSINESSES[block.business as keyof typeof BUSINESSES];
  const completedCount = block.items.filter((_, i) => itemStates.get(`${meetingType}-${block.business}-${i}`)?.completed).length;

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
            <span className="text-xs font-bold" style={{ color: biz.color, fontFamily: "'Space Grotesk', sans-serif" }}>
              {biz.shortName}
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-mono"
              style={{ backgroundColor: `${biz.color}20`, color: biz.color, fontFamily: "'JetBrains Mono', monospace" }}
            >
              {block.duration}
            </span>
            <span className="text-[10px] text-white/30 font-mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {block.startOffset}–{block.endOffset}
            </span>
            <span className="ml-auto text-[10px] text-white/25" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {completedCount}/{block.items.length}
            </span>
          </div>
          <p className="text-[10px] text-white/45 mt-0.5 truncate">{block.focus}</p>
        </div>
        <span className="text-white/30 text-xs flex-shrink-0">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 flex flex-col gap-3">
          <div className="w-full h-px" style={{ backgroundColor: `${biz.color}20` }} />
          {block.items.map((item: string, i: number) => {
            const itemKey = `${meetingType}-${block.business}-${i}`;
            const state = itemStates.get(itemKey) ?? { completed: false, comment: "" };
            const isChecked = state.completed;
            return (
              <div key={i} className="flex flex-col gap-1.5">
                {/* Checkbox row */}
                <div className="flex gap-2.5 items-start">
                  <button
                    type="button"
                    onClick={() => onToggle(itemKey, !isChecked)}
                    className="flex-shrink-0 mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center transition-all"
                    style={{
                      borderColor: isChecked ? biz.color : `${biz.color}50`,
                      backgroundColor: isChecked ? biz.color : "transparent",
                    }}
                  >
                    {isChecked && (
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                  <p className={`text-[11px] leading-relaxed transition-colors flex-1 ${
                    isChecked ? "text-white/35 line-through" : "text-white/75"
                  }`}>{item}</p>
                </div>
                {/* Inline comment field — always visible, subtle */}
                <div className="ml-6">
                  <input
                    type="text"
                    value={state.comment}
                    onChange={(e) => onCommentChange(itemKey, e.target.value)}
                    placeholder={isChecked ? "Add a note about this item…" : "Add context or a question…"}
                    className="w-full rounded px-2.5 py-1.5 text-[10px] text-white/60 placeholder-white/20 focus:outline-none transition-colors"
                    style={{
                      backgroundColor: `${biz.color}10`,
                      border: `1px solid ${biz.color}20`,
                      fontFamily: "'Inter', sans-serif",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = `${biz.color}50`)}
                    onBlur={(e) => (e.target.style.borderColor = `${biz.color}20`)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MeetingSection({
  type,
  day,
  dateKey,
}: {
  type: MeetingType;
  day: CalendarDay;
  dateKey: string;
}) {
  const m = MEETING_TYPES[type];
  // itemStates: key = itemKey, value = { completed, comment }
  const [itemStates, setItemStates] = useState<Map<string, { completed: boolean; comment: string }>>(() => new Map());
  const [notes, setNotes] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryDate, setSummaryDate] = useState<Date | null>(null);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commentTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Load existing log data
  const { data: logData } = trpc.meetingLog.get.useQuery(
    { dateKey, meetingType: type },
    { staleTime: 30_000 }
  );

  useEffect(() => {
    if (logData && !notesLoaded) {
      setNotes(logData.log?.notes ?? "");
      setSummary(logData.log?.aiSummary ?? null);
      setSummaryDate(logData.log?.summaryGeneratedAt ?? null);
      const newMap = new Map<string, { completed: boolean; comment: string }>();
      logData.agendaItems.forEach(a => {
        newMap.set(a.itemKey, { completed: a.completed, comment: (a as any).comment ?? "" });
      });
      setItemStates(newMap);
      setNotesLoaded(true);
    }
  }, [logData, notesLoaded]);

  const saveNotes = trpc.meetingLog.saveNotes.useMutation();
  const toggleItem = trpc.meetingLog.toggleItem.useMutation();
  const saveItemComment = trpc.meetingLog.saveItemComment.useMutation();
  const generateSummary = trpc.meetingLog.generateSummary.useMutation();

  const handleNotesChange = useCallback((val: string) => {
    setNotes(val);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveNotes.mutate({ dateKey, meetingType: type, notes: val });
    }, 800);
  }, [dateKey, type]);

  const handleToggle = useCallback((itemKey: string, completed: boolean) => {
    setItemStates(prev => {
      const next = new Map(prev);
      const cur = next.get(itemKey) ?? { completed: false, comment: "" };
      next.set(itemKey, { ...cur, completed });
      return next;
    });
    toggleItem.mutate({ dateKey, meetingType: type, itemKey, completed });
  }, [dateKey, type]);

  const handleCommentChange = useCallback((itemKey: string, comment: string) => {
    setItemStates(prev => {
      const next = new Map(prev);
      const cur = next.get(itemKey) ?? { completed: false, comment: "" };
      next.set(itemKey, { ...cur, comment });
      return next;
    });
    // Debounce save
    const existing = commentTimers.current.get(itemKey);
    if (existing) clearTimeout(existing);
    commentTimers.current.set(itemKey, setTimeout(() => {
      saveItemComment.mutate({ dateKey, meetingType: type, itemKey, comment });
    }, 800));
  }, [dateKey, type]);

  const handleGenerateSummary = useCallback(() => {
    // Build the full items list with completed state and comments
    const items: { label: string; completed: boolean; comment?: string }[] = [];
    m.timeBlocks.forEach(block => {
      const bizName = BUSINESSES[block.business as keyof typeof BUSINESSES].shortName;
      block.items.forEach((item, i) => {
        const itemKey = `${type}-${block.business}-${i}`;
        const state = itemStates.get(itemKey);
        items.push({
          label: `${bizName}: ${item}`,
          completed: state?.completed ?? false,
          comment: state?.comment || undefined,
        });
      });
    });
    m.sharedItems.forEach(item => {
      items.push({ label: item, completed: false });
    });
    generateSummary.mutate(
      { dateKey, meetingType: type, notes, items, businessContext: m.label },
      {
        onSuccess: (data) => {
          setSummary(data.summary);
          setSummaryDate(new Date());
        },
      }
    );
  }, [dateKey, type, notes, itemStates, m]);

  const totalItems = m.timeBlocks.reduce((acc, b) => acc + b.items.length, 0);
  const completedCount = m.timeBlocks.reduce((acc, b) =>
    acc + b.items.filter((_, i) => itemStates.get(`${type}-${b.business}-${i}`)?.completed === true).length, 0
  );
  const progressPct = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  return (
    <div
      className="rounded-xl flex flex-col gap-3"
      style={{ backgroundColor: m.bgColor, border: `1px solid ${m.color}30` }}
    >
      {/* Meeting header */}
      <div className="px-4 pt-4 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: m.color, boxShadow: `0 0 6px ${m.color}80` }} />
          <span className="font-bold text-sm" style={{ color: m.textColor, fontFamily: "'Space Grotesk', sans-serif" }}>
            {m.label}
          </span>
          <span
            className="ml-auto text-[10px] px-2 py-0.5 rounded font-mono"
            style={{ backgroundColor: `${m.color}20`, color: m.textColor, fontFamily: "'JetBrains Mono', monospace" }}
          >
            {m.totalDuration}
          </span>
        </div>
        <p className="text-[10px] text-white/40 leading-relaxed">{m.overview}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[9px] text-white/25">🕐</span>
          <span className="text-[10px] text-white/35 italic">{m.suggestedTime}</span>
        </div>
        {/* Progress bar */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: "oklch(1 0 0 / 8%)" }}>
            <div
              className="h-1 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%`, backgroundColor: m.color }}
            />
          </div>
          <span className="text-[10px] font-mono" style={{ color: m.color, fontFamily: "'JetBrains Mono', monospace" }}>
            {completedCount}/{totalItems}
          </span>
        </div>
      </div>

      {/* Per-business time blocks with checkboxes */}
      <div className="px-3 flex flex-col gap-2">
        <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest px-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Time Breakdown by Business
        </p>
        {m.timeBlocks.map((block, i) => (
          <BusinessBlock
            key={i}
            block={block}
            meetingColor={m.color}
            meetingType={type}
            itemStates={itemStates}
            onToggle={handleToggle}
            onCommentChange={handleCommentChange}
          />
        ))}
      </div>

      {/* Shared items */}
      {m.sharedItems.length > 0 && (
        <div className="px-3 flex flex-col gap-1.5">
          <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest px-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            All-Business Items
          </p>
          <div className="rounded-lg px-3 py-2.5 flex flex-col gap-1.5" style={{ backgroundColor: "oklch(1 0 0 / 5%)", border: "1px solid oklch(1 0 0 / 8%)" }}>
            {m.sharedItems.map((item, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-white/30 flex-shrink-0 text-xs mt-0.5">›</span>
                <p className="text-[11px] text-white/60 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes section */}
      <div className="px-3 flex flex-col gap-1.5">
        <div className="flex items-center justify-between px-1">
          <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Meeting Notes
          </p>
          {saveNotes.isPending && (
            <span className="text-[9px] text-white/20 italic">saving…</span>
          )}
          {!saveNotes.isPending && notes.length > 0 && (
            <span className="text-[9px] text-white/20">✓ saved</span>
          )}
        </div>
        <textarea
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Type your meeting notes here… decisions made, issues raised, action items…"
          rows={4}
          className="w-full rounded-lg px-3 py-2.5 text-[11px] text-white/75 placeholder-white/20 resize-none focus:outline-none transition-colors"
          style={{
            backgroundColor: "oklch(1 0 0 / 5%)",
            border: `1px solid ${m.color}25`,
            fontFamily: "'Inter', sans-serif",
            lineHeight: "1.6",
          }}
          onFocus={(e) => (e.target.style.borderColor = `${m.color}60`)}
          onBlur={(e) => (e.target.style.borderColor = `${m.color}25`)}
        />
      </div>

      {/* AI Summary section */}
      <div className="px-3 pb-4 flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            AI Summary
          </p>
          {summaryDate && (
            <span className="text-[9px] text-white/20">
              {new Date(summaryDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>

        {summary ? (
          <div
            className="rounded-lg px-3 py-3 flex flex-col gap-2"
            style={{ backgroundColor: `${m.color}10`, border: `1px solid ${m.color}25` }}
          >
            <p className="text-[11px] text-white/70 leading-relaxed">{summary}</p>
            <button
              onClick={handleGenerateSummary}
              disabled={generateSummary.isPending}
              className="self-start text-[10px] px-2.5 py-1 rounded transition-all hover:opacity-80 disabled:opacity-40"
              style={{ backgroundColor: `${m.color}20`, color: m.textColor, fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {generateSummary.isPending ? "Regenerating…" : "↺ Regenerate"}
            </button>
          </div>
        ) : (
          <button
            onClick={handleGenerateSummary}
            disabled={generateSummary.isPending}
            className="w-full rounded-lg px-3 py-3 text-[11px] font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{
              backgroundColor: `${m.color}15`,
              border: `1px dashed ${m.color}40`,
              color: m.textColor,
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            {generateSummary.isPending ? (
              <><span className="animate-spin">⟳</span> Generating AI Summary…</>
            ) : (
              <>✦ Generate AI Summary</>
            )}
          </button>
        )}
      </div>
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

  const dateKey = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, "0")}-${String(day.date.getDate()).padStart(2, "0")}`;
  const sortedMeetings = MEETING_ORDER.filter((t) => day.meetings.includes(t));

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] text-white/35 uppercase tracking-widest mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Scheduled for
          </p>
          <h2 className="text-sm font-bold text-white leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
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

      {/* Each meeting type as its own interactive section */}
      {sortedMeetings.map((type) => (
        <MeetingSection key={type} type={type} day={day} dateKey={dateKey} />
      ))}
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

  // Fetch all days that have saved meeting logs for the green indicator dot
  const { data: loggedDatesData } = trpc.meetingLog.getLoggedDates.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
  const loggedDatesSet = useMemo(
    () => new Set<string>(loggedDatesData?.dates ?? []),
    [loggedDatesData]
  );

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
          <Link
            href="/board"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, rgba(59,130,246,0.20), rgba(236,72,153,0.15))",
              border: "1px solid rgba(59,130,246,0.30)",
              color: "#93C5FD",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            <span>📋</span>
            Command Board
          </Link>
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
                loggedDates={loggedDatesSet}
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
