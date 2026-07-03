/**
 * Business Cadence Calendar — Home Page
 * Design: Swiss Command Center — Deep Navy, functional color coding
 * Fonts: Space Grotesk (display), Inter (body), JetBrains Mono (numbers)
 */

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { getBusinessSelection, type BusinessSelection } from "./ClientLogin";
import { RecordMeeting } from "@/components/RecordMeeting";

import {
  generateCalendar,
  buildCalendarFromSchedule,
  MEETING_TYPES,
  BUSINESSES,
  type CalendarDay,
  type MeetingType,
  type CalendarMonth,
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
  if (!day) return <div className="h-11 rounded-md" style={{ backgroundColor: "#EEECE8" }} />;

  const isClosed = day.isClosed === true;
  const isHighlighted = highlightType ? day.meetings.includes(highlightType) : false;
  const hasMeetings = day.meetings.length > 0 && !day.isWeekend && !isClosed;
  const hasQuarterly = day.meetings.includes("quarterly");
  const hasMonthly = day.meetings.includes("monthly");
  const sortedMeetings = MEETING_ORDER.filter((t) => day.meetings.includes(t));

  // Determine cell background
  let cellBg = "#F1F0ED"; // default: every day gets a solid light card
  if (isClosed) cellBg = "#E8E6E1";
  else if (isSelected) cellBg = "rgba(30,58,95,0.13)";
  else if (hasQuarterly) cellBg = "rgba(244,63,94,0.12)";
  else if (hasMonthly) cellBg = "rgba(13,148,136,0.10)";
  else if (isHighlighted) cellBg = "rgba(30,58,95,0.09)";
  else if (hasMeetings) cellBg = "#EAE8E3";
  else if (day.isWeekend) cellBg = "#ECEAE6";

  let cellBorder = "1px solid rgba(30,58,95,0.08)";
  if (isClosed) cellBorder = "1px solid rgba(148,163,184,0.35)";
  else if (day.isToday) cellBorder = "1.5px solid #0D9488";
  else if (isSelected) cellBorder = "1.5px solid rgba(30,58,95,0.35)";
  else if (isHighlighted && highlightType) cellBorder = `1.5px solid ${MEETING_TYPES[highlightType].color}60`;
  else if (hasQuarterly) cellBorder = "1.5px solid rgba(244,63,94,0.35)";
  else if (hasMonthly) cellBorder = "1.5px solid rgba(13,148,136,0.30)";

  return (
    <div
      className={`h-11 rounded-md flex flex-col items-center justify-between py-1 px-0.5 relative transition-all duration-150
        ${hasMeetings ? "cursor-pointer hover:brightness-95" : ""}
        ${isClosed ? "opacity-60" : ""}
      `}
      style={{
        backgroundColor: cellBg,
        border: cellBorder,
        boxShadow: hasMeetings && !isClosed ? "0 1px 2px rgba(30,58,95,0.06)" : undefined,
      }}
      onClick={() => hasMeetings && onSelect(day)}
      title={isClosed ? "Closed day" : undefined}
    >
      <div className="relative w-full flex justify-center">
        <span
          className={`text-[10px] leading-none font-medium ${
            isClosed
              ? "text-[#94A3B8] line-through"
              : day.isToday
              ? "text-white font-bold bg-[#1E3A5F] rounded-sm px-0.5"
              : hasQuarterly
              ? "text-rose-600 font-semibold"
              : hasMonthly
              ? "text-teal-700 font-semibold"
              : day.isWeekend
              ? "text-[#94A3B8]"
              : "text-[#374151]"
          }`}
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {day.dayOfMonth}
        </span>
        {hasLog && !isClosed && (
          <span
            className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: "#22c55e", boxShadow: "0 0 3px #22c55e" }}
            title="Meeting logged"
          />
        )}
        {isClosed && (
          <span
            className="absolute -top-0.5 -right-0.5 text-[8px] text-[#94A3B8] leading-none"
            title="Closed"
          >✕</span>
        )}
      </div>
      {hasMeetings && sortedMeetings.length > 0 && (
        <div className="flex gap-0.5 items-center justify-center">
          {sortedMeetings.map((t) => (
            <MeetingDot key={t} type={t} />
          ))}
        </div>
      )}
      {!hasMeetings && !isClosed && !day.isWeekend && (
        <div className="h-2" />
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
        backgroundColor: "#FAFAF8",
        border: quarterlyDays > 0
          ? "1.5px solid rgba(244,63,94,0.45)"
          : "1.5px solid #C8C5BE",
        boxShadow: "0 2px 6px rgba(30,58,95,0.07)",
      }}
    >
      <div className="flex items-center justify-between">
        <h3
          className="text-xs font-semibold text-[#1E3A5F] tracking-wider uppercase"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {month.name}
        </h3>
        <div className="flex gap-1">
          {quarterlyDays > 0 && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
              style={{
                backgroundColor: "rgba(244,63,94,0.15)",
                color: "#E11D48",
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
                backgroundColor: "rgba(13,148,136,0.12)",
                color: "#0F766E",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              FINANCE
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {DOW_LABELS.map((d) => (
          <div
            key={d}
            className="text-center text-[9px] font-semibold text-[#64748B] pb-0.5"
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
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[#F1F0ED] transition-colors"
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
            <span className="text-[10px] text-[#94A3B8] font-mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {block.startOffset}–{block.endOffset}
            </span>
            <span className="ml-auto text-[10px] text-[#94A3B8]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {completedCount}/{block.items.length}
            </span>
          </div>
          <p className="text-[10px] text-[#64748B] mt-0.5 truncate">{block.focus}</p>
        </div>
        <span className="text-[#94A3B8] text-xs flex-shrink-0">{expanded ? "▲" : "▼"}</span>
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
                    isChecked ? "text-[#94A3B8] line-through" : "text-[#374151]"
                  }`}>{item}</p>
                </div>
                {/* Inline comment field — always visible, subtle */}
                <div className="ml-6">
                  <input
                    type="text"
                    value={state.comment}
                    onChange={(e) => onCommentChange(itemKey, e.target.value)}
                    placeholder={isChecked ? "Add a note about this item…" : "Add context or a question…"}
                    className="w-full rounded px-2.5 py-1.5 text-[10px] text-[#64748B] placeholder-[#CBD5E1] focus:outline-none transition-colors"
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

// Map calendarData BusinessKey to DB business enum
const BIZ_TO_DB: Record<string, "chiropractic" | "crossfit" | "realty"> = {
  chiro: "chiropractic",
  crossfit: "crossfit",
  realty: "realty",
};

function MeetingSection({
  type,
  day,
  dateKey,
  businessContext,
}: {
  type: MeetingType;
  day: CalendarDay;
  dateKey: string;
  businessContext: BusinessSelection;
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

  // Fetch custom templates for each business in this meeting type
  const templateQueries = m.timeBlocks.map((block) => {
    const dbBiz = BIZ_TO_DB[block.business] ?? "chiropractic";
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return trpc.agendaTemplate.get.useQuery(
      { business: dbBiz, meetingType: type as "daily" | "weekly" | "monthly" | "quarterly" },
      { staleTime: 60_000 }
    );
  });

  // Build effective blocks: use custom items if saved, otherwise use defaults
  // Then filter by businessContext so each account only sees their own business
  const effectiveBlocks = m.timeBlocks
    .map((block, i) => {
      const customItems = templateQueries[i]?.data?.items;
      if (customItems && customItems.length > 0) {
        return { ...block, items: customItems.map((ci: { label: string }) => ci.label) };
      }
      return block;
    })
    .filter((block) => {
      if (businessContext === "owner") return true; // owner sees all
      if (businessContext === "chiro") return block.business === "chiro";
      if (businessContext === "crossfit") return block.business === "crossfit";
      return true; // fallback: show all
    });

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
    // Build the full items list with completed state and comments using effectiveBlocks
    const items: { label: string; completed: boolean; comment?: string }[] = [];
    effectiveBlocks.forEach(block => {
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
  }, [dateKey, type, notes, itemStates, effectiveBlocks, m]);

  const totalItems = effectiveBlocks.reduce((acc, b) => acc + b.items.length, 0);
  const completedCount = effectiveBlocks.reduce((acc, b) =>
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
        <p className="text-[10px] text-[#64748B] leading-relaxed">{m.overview}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[9px] text-[#94A3B8]">🕐</span>
          <span className="text-[10px] text-[#94A3B8] italic">{m.suggestedTime}</span>
        </div>
        {/* Progress bar */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: "#E2E0DB" }}>
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
        <p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest px-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Time Breakdown by Business
        </p>
        {effectiveBlocks.map((block, i) => (
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
          <p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest px-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            All-Business Items
          </p>
          <div className="rounded-lg px-3 py-2.5 flex flex-col gap-1.5" style={{ backgroundColor: "#F8F7F4", border: "1px solid #E2E0DB" }}>
            {m.sharedItems.map((item, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-[#94A3B8] flex-shrink-0 text-xs mt-0.5">›</span>
                <p className="text-[11px] text-[#374151] leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes section */}
      <div className="px-3 flex flex-col gap-1.5">
        <div className="flex items-center justify-between px-1">
          <p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Meeting Notes
          </p>
          {saveNotes.isPending && (
            <span className="text-[9px] text-[#94A3B8] italic">saving…</span>
          )}
          {!saveNotes.isPending && notes.length > 0 && (
            <span className="text-[9px] text-[#0D9488]">✓ saved</span>
          )}
        </div>
        <textarea
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Type your meeting notes here… decisions made, issues raised, action items…"
          rows={4}
          className="w-full rounded-lg px-3 py-2.5 text-[11px] text-[#374151] placeholder-[#CBD5E1] resize-none focus:outline-none transition-colors"
          style={{
            backgroundColor: "#FFFFFF",
            border: `1px solid ${m.color}25`,
            fontFamily: "'Inter', sans-serif",
            lineHeight: "1.6",
          }}
          onFocus={(e) => (e.target.style.borderColor = `${m.color}60`)}
          onBlur={(e) => (e.target.style.borderColor = `${m.color}25`)}
        />
      </div>

      {/* AI Summary section */}
      <div className="px-3 flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            AI Summary
          </p>
          {summaryDate && (
            <span className="text-[9px] text-[#94A3B8]">
              {new Date(summaryDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>

        {summary ? (
          <div
            className="rounded-lg px-3 py-3 flex flex-col gap-2"
            style={{ backgroundColor: `${m.color}10`, border: `1px solid ${m.color}25` }}
          >
            <p className="text-[11px] text-[#374151] leading-relaxed">{summary}</p>
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

      {/* Meeting Recording section */}
      <div className="px-3 pb-4">
        <RecordMeeting
          dateKey={dateKey}
          meetingType={type as "daily" | "weekly" | "monthly" | "quarterly"}
          agendaItems={effectiveBlocks.flatMap(block =>
            block.items.map(item => `${BUSINESSES[block.business as keyof typeof BUSINESSES]?.shortName ?? block.business}: ${item}`)
          )}
        />
      </div>

    </div>
  );
}

function DetailPanel({
  day,
  onClose,
  businessContext,
}: {
  day: CalendarDay;
  onClose: () => void;
  businessContext: BusinessSelection;
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
          <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Scheduled for
          </p>
          <h2 className="text-sm font-bold text-[#1E3A5F] leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {dateStr}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-[#94A3B8] hover:text-[#1E3A5F] transition-colors text-xl leading-none w-6 h-6 flex items-center justify-center rounded hover:bg-[#F1F0ED]"
        >
          ×
        </button>
      </div>

      {/* Each meeting type as its own interactive section */}
      {sortedMeetings.map((type) => (
        <MeetingSection key={type} type={type} day={day} dateKey={dateKey} businessContext={businessContext} />
      ))}
    </div>
  );
}


export default function Home() {
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [highlightType, setHighlightType] = useState<MeetingType | null>(null);
  // Business context from the login portal — re-read on every mount so switching accounts works
  const [businessContext, setBusinessContext] = useState<BusinessSelection>(() => getBusinessSelection());
  const [accountId] = useState<number>(() => {
    const stored = localStorage.getItem("bcc_account_id");
    return stored ? parseInt(stored, 10) : 0;
  });
  useEffect(() => {
    setBusinessContext(getBusinessSelection());
  }, []);

  // Fetch the DB-driven calendar (respects closed days, work days, meeting prefs)
  const { data: calendarData } = trpc.onboarding.generateCalendar.useQuery(
    { accountId, year: YEAR },
    { enabled: accountId > 0, refetchOnWindowFocus: true }
  );

  // Build the calendar grid — use DB data when available, fall back to static
  const calendar = useMemo<CalendarMonth[]>(() => {
    if (calendarData?.meetings && calendarData.meetings.length > 0) {
      return buildCalendarFromSchedule(
        YEAR,
        calendarData.meetings,
        calendarData.closedDates ?? []
      );
    }
    return generateCalendar();
  }, [calendarData]);

  // Fetch all days that have saved meeting logs for the green indicator dot
  const { data: loggedDatesData } = trpc.meetingLog.getLoggedDates.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
  const loggedDatesSet = useMemo(
    () => new Set<string>(loggedDatesData?.dates ?? []),
    [loggedDatesData]
  );

  // Compute meeting counts from the live calendar (respects closed days)
  const meetingCounts = useMemo(() => {
    const counts: Record<MeetingType, number> = { daily: 0, weekly: 0, monthly: 0, quarterly: 0 };
    for (const month of calendar) {
      for (const day of month.days) {
        if (!day || day.isClosed) continue;
        for (const type of day.meetings) {
          if (type in counts) counts[type as MeetingType]++;
        }
      }
    }
    return counts;
  }, [calendar]);

  const handleSelectDay = (day: CalendarDay) => {
    setSelectedDay((prev) =>
      prev && prev.date.getTime() === day.date.getTime() ? null : day
    );
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Calendar view mode: "month" (default) or "year"
  const [viewMode, setViewMode] = useState<"month" | "year">(() => {
    try { return (localStorage.getItem("bcc_cal_view") as "month" | "year") ?? "month"; } catch { return "month"; }
  });
  // Currently viewed month index (0=Jan, 11=Dec) — defaults to current month
  const [viewMonthIndex, setViewMonthIndex] = useState(() => new Date().getMonth());

  const toggleViewMode = () => {
    setViewMode(prev => {
      const next = prev === "month" ? "year" : "month";
      try { localStorage.setItem("bcc_cal_view", next); } catch { /* ignore */ }
      return next;
    });
  };

  const goToPrevMonth = () => setViewMonthIndex(i => Math.max(0, i - 1));
  const goToNextMonth = () => setViewMonthIndex(i => Math.min(11, i + 1));
  const goToToday = () => setViewMonthIndex(new Date().getMonth());

  const todayMonthIndex = new Date().getMonth();
  const isViewingToday = viewMonthIndex === todayMonthIndex;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#F8F7F4", fontFamily: "'Inter', sans-serif" }}
    >
      {/* Header */}
      <header
        className="px-4 py-3 flex items-center justify-between flex-shrink-0 relative z-30"
        style={{ borderBottom: "1px solid #E2E0DB" }}
      >
        <div className="flex items-center gap-2.5">
          {/* Mobile sidebar toggle */}
          <button
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg transition-all"
            style={{ background: "rgba(30,58,95,0.06)", border: "1px solid rgba(30,58,95,0.12)" }}
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="4" width="12" height="1.5" rx="0.75" fill="#1E3A5F" />
              <rect x="2" y="7.25" width="12" height="1.5" rx="0.75" fill="#1E3A5F" />
              <rect x="2" y="10.5" width="12" height="1.5" rx="0.75" fill="#1E3A5F" />
            </svg>
          </button>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #10B981 0%, #0EA5E9 100%)",
              boxShadow: "0 0 12px rgba(16,185,129,0.3)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="2" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.95" />
              <rect x="10" y="2" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.65" />
              <rect x="2" y="10" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.65" />
              <rect x="10" y="10" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.35" />
            </svg>
          </div>
          <div>
            <h1
              className="text-sm font-bold text-[#1E3A5F] leading-tight tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Business Cadence
            </h1>
            <p className="text-[10px] text-[#64748B] truncate max-w-[160px] sm:max-w-none">
              {businessContext === "owner"
                ? "New Beginnings · CrossFit · Realty"
                : businessContext === "chiro"
                ? "New Beginnings Chiropractic"
                : businessContext === "crossfit"
                ? "Evolved CrossFit"
                : "Your Business"}
            </p>
          </div>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-3 mr-1">
            {(["daily", "weekly", "monthly", "quarterly"] as MeetingType[]).map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: MEETING_TYPES[t].color }} />
                <span className="text-[10px] text-[#94A3B8]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {MEETING_TYPES[t].shortLabel}
                </span>
              </div>
            ))}
          </div>
          <Link href="/app/board" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-90" style={{ background: "rgba(30,58,95,0.06)", border: "1px solid rgba(30,58,95,0.18)", color: "#1E3A5F", fontFamily: "'Space Grotesk', sans-serif" }}>
            <span>📋</span> Command Board
          </Link>
          <Link href="/app/reports" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-90" style={{ background: "rgba(13,148,136,0.08)", border: "1px solid rgba(13,148,136,0.25)", color: "#0D9488", fontFamily: "'Space Grotesk', sans-serif" }}>
            <span>📊</span> Weekly Reports
          </Link>
          <Link href="/app/settings" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-90" style={{ background: "rgba(30,58,95,0.05)", border: "1px solid rgba(30,58,95,0.15)", color: "#64748B", fontFamily: "'Space Grotesk', sans-serif" }}>
            <span>⚙️</span> Agenda Settings
          </Link>
          <span className="text-sm font-mono font-bold text-[#94A3B8] tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{YEAR}</span>
        </div>

        {/* Mobile right: year + hamburger menu */}
        <div className="flex md:hidden items-center gap-2">
          <span className="text-xs font-mono font-bold text-[#94A3B8]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{YEAR}</span>
          <div className="relative">
            <button
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
              style={{ background: mobileMenuOpen ? "rgba(30,58,95,0.10)" : "rgba(30,58,95,0.06)", border: "1px solid rgba(30,58,95,0.18)" }}
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Navigation menu"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="4" r="1.5" fill="#1E3A5F" />
                <circle cx="8" cy="8" r="1.5" fill="#1E3A5F" />
                <circle cx="8" cy="12" r="1.5" fill="#1E3A5F" />
              </svg>
            </button>
            {mobileMenuOpen && (
              <div
                className="absolute right-0 top-10 w-52 rounded-xl shadow-lg z-50 flex flex-col overflow-hidden"
                style={{ background: "#FFFFFF", border: "1px solid #E2E0DB" }}
              >
                <Link href="/app/board" className="flex items-center gap-2.5 px-4 py-3 text-[12px] font-semibold text-[#1E3A5F] hover:bg-[#F1F0ED] transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <span>📋</span> Command Board
                </Link>
                <Link href="/app/reports" className="flex items-center gap-2.5 px-4 py-3 text-[12px] font-semibold text-[#0D9488] hover:bg-[#F1F0ED] transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <span>📊</span> Weekly Reports
                </Link>
                <Link href="/app/settings" className="flex items-center gap-2.5 px-4 py-3 text-[12px] font-semibold text-[#64748B] hover:bg-[#F1F0ED] transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <span>⚙️</span> Agenda Settings
                </Link>
                <Link href="/app/schedule" className="flex items-center gap-2.5 px-4 py-3 text-[12px] font-semibold text-[#0D9488] hover:bg-[#F1F0ED] transition-colors border-t" style={{ borderColor: "#E2E0DB" }} onClick={() => setMobileMenuOpen(false)}>
                  <span>📆</span> Manage Schedule
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar — desktop: always visible, mobile: slide-in drawer */}
        <aside
          className={`flex-shrink-0 flex flex-col gap-4 p-4 overflow-y-auto transition-transform duration-300
            md:relative md:translate-x-0 md:w-60
            fixed top-0 left-0 h-full z-30 w-72 bg-[#F8F7F4]
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
          style={{ borderRight: "1px solid #E2E0DB" }}
        >
          {/* Mobile sidebar close button */}
          <div className="flex items-center justify-between md:hidden mb-1">
            <span className="text-xs font-bold text-[#1E3A5F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Menu</span>
            <button
              className="w-7 h-7 flex items-center justify-center rounded-lg"
              style={{ background: "rgba(30,58,95,0.06)", border: "1px solid rgba(30,58,95,0.12)" }}
              onClick={() => setSidebarOpen(false)}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1L11 11M11 1L1 11" stroke="#1E3A5F" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          {/* Quick Nav */}
          <div className="flex flex-col gap-2">
            <p
              className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1 px-1"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Quick Access
            </p>
            <Link
              href="/app/board"
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-90"
              style={{
                background: "rgba(30,58,95,0.06)",
                border: "1px solid rgba(30,58,95,0.18)",
                color: "#1E3A5F",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              <span>📋</span>
              Command Board
            </Link>
            <Link
              href="/app/reports"
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-90"
              style={{
                background: "rgba(13,148,136,0.06)",
                border: "1px solid rgba(13,148,136,0.20)",
                color: "#0D9488",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              <span>📊</span>
              Weekly Reports
            </Link>
            <Link
              href="/app/settings"
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-90"
              style={{
                background: "rgba(100,116,139,0.06)",
                border: "1px solid rgba(100,116,139,0.18)",
                color: "#64748B",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              <span>⚙️</span>
              Agenda Settings
            </Link>
          </div>

          {/* Businesses */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <p
                className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Your Businesses
              </p>
              {businessContext === "owner" && (
                <a
                  href="/login"
                  className="text-[9px] text-[#94A3B8] hover:text-[#64748B] transition-colors"
                >
                  Switch
                </a>
              )}
            </div>
            <div className="flex flex-col gap-1">
              {(Object.entries(BUSINESSES) as [keyof typeof BUSINESSES, typeof BUSINESSES[keyof typeof BUSINESSES]][]).filter(([key]) => {
                if (businessContext === "owner") return true;
                if (businessContext === "chiro") return key === "chiro";
                if (businessContext === "crossfit") return key === "crossfit";
                return false;
              }).map(([key, biz]) => {
                const isActive = true; // already filtered to only active businesses
                const isFiltered = false;
                const isSingleSelected = businessContext !== "owner";
                return (
                  <div
                    key={key}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-opacity"
                    style={{
                      backgroundColor: isActive ? "#F1F0ED" : "#F8F7F4",
                      opacity: isFiltered ? 0.35 : 1,
                      border: isSingleSelected ? `1px solid ${biz.color}40` : "1px solid transparent",
                    }}
                  >
                    <span className="text-base leading-none">{biz.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-medium text-[#1E3A5F]"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {biz.shortName}
                      </p>
                      <p className="text-[9px] text-[#94A3B8] truncate">{biz.tagline}</p>
                    </div>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: biz.color }} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Manage Schedule */}
          <div className="flex flex-col gap-2">
            <Link
              href="/app/schedule"
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-90"
              style={{
                background: "rgba(13,148,136,0.08)",
                border: "1px solid rgba(13,148,136,0.25)",
                color: "#0D9488",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              <span>📆</span>
              Manage Schedule
            </Link>

          </div>

          {/* Golden Rule */}
          <div
            className="rounded-xl p-3.5"
            style={{ backgroundColor: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)" }}
          >
            <p
              className="text-[10px] font-bold text-rose-300 uppercase tracking-wider mb-1.5"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              ★ The Golden Rule
            </p>
            <p className="text-[11px] text-[#374151] leading-relaxed">
              When an issue arises outside a meeting,{" "}
              <strong className="text-[#1E3A5F]">add it to the Issues List</strong> — don't discuss
              it. It waits for the next scheduled meeting.
            </p>
          </div>

          {/* Science note */}
          <div
            className="rounded-xl p-3.5"
            style={{ backgroundColor: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.18)" }}
          >
            <p
              className="text-[10px] font-bold text-sky-300 uppercase tracking-wider mb-1.5"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Why This Works
            </p>
            <p className="text-[11px] text-[#374151] leading-relaxed">
              APA research: unstructured task-switching costs up to{" "}
              <strong className="text-[#1E3A5F]">40% of productive time</strong>. Structured cadence
              eliminates that loss.
            </p>
          </div>
        </aside>

        {/* Main Calendar */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col gap-3 sm:gap-4">
          {/* Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {(["daily", "weekly", "monthly", "quarterly"] as MeetingType[]).map((type) => {
              const m = MEETING_TYPES[type];
              const count = meetingCounts[type];
              return (
                <div
                  key={type}
                  className="rounded-xl p-3.5 flex flex-col gap-1.5 cursor-pointer transition-all duration-150"
                  style={{
                    backgroundColor: m.bgColor,
                    border: highlightType === type ? `1.5px solid ${m.color}` : `1.5px solid ${m.color}35`,
                    boxShadow: highlightType === type ? `0 0 0 3px ${m.color}20` : "0 1px 4px rgba(30,58,95,0.06)",
                  }}
                  onMouseEnter={() => setHighlightType(type)}
                  onMouseLeave={() => setHighlightType(null)}
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
                      className="text-3xl font-bold text-[#1E3A5F] leading-none"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {count}
                    </span>
                    <span className="text-xs text-[#94A3B8]">per year</span>
                  </div>
                  <span className="text-[10px] text-[#94A3B8]">{m.totalDuration} each session</span>
                </div>
              );
            })}
          </div>

          {/* Calendar Navigation Bar */}
          <div className="flex items-center justify-between gap-2">
            {viewMode === "month" ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPrevMonth}
                  disabled={viewMonthIndex === 0}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-all disabled:opacity-30"
                  style={{ background: "rgba(30,58,95,0.06)", border: "1px solid rgba(30,58,95,0.12)", color: "#1E3A5F" }}
                  aria-label="Previous month"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <h2 className="text-sm font-bold text-[#1E3A5F] min-w-[120px] text-center" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {calendar[viewMonthIndex]?.name ?? ""} {YEAR}
                </h2>
                <button
                  onClick={goToNextMonth}
                  disabled={viewMonthIndex === 11}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-all disabled:opacity-30"
                  style={{ background: "rgba(30,58,95,0.06)", border: "1px solid rgba(30,58,95,0.12)", color: "#1E3A5F" }}
                  aria-label="Next month"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                {!isViewingToday && (
                  <button
                    onClick={goToToday}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all"
                    style={{ background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.25)", color: "#0D9488" }}
                  >
                    Today
                  </button>
                )}
              </div>
            ) : (
              <h2 className="text-sm font-bold text-[#1E3A5F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {YEAR} — Full Year
              </h2>
            )}
            <button
              onClick={toggleViewMode}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
              style={{ background: "rgba(30,58,95,0.06)", border: "1px solid rgba(30,58,95,0.15)", color: "#1E3A5F" }}
            >
              {viewMode === "month" ? (
                <><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/><rect x="7" y="1" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="7" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/><rect x="7" y="7" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/></svg>Year View</>
              ) : (
                <><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>Month View</>
              )}
            </button>
          </div>

          {/* Calendar Grid */}
          {viewMode === "month" ? (
            <div>
              {calendar[viewMonthIndex] && (
                <MonthGrid
                  month={calendar[viewMonthIndex]}
                  onSelectDay={handleSelectDay}
                  selectedDay={selectedDay}
                  highlightType={highlightType}
                  loggedDates={loggedDatesSet}
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
                    highlightType={highlightType}
                    loggedDates={loggedDatesSet}
                  />
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Right Detail Panel — full screen on mobile, side panel on desktop */}
        {selectedDay && (
          <aside
            className="fixed inset-0 z-40 overflow-y-auto md:relative md:inset-auto md:w-80 md:flex-shrink-0 md:p-4"
            style={{ backgroundColor: "#F8F7F4", borderLeft: "1px solid #E2E0DB" }}
          >
            <div className="p-4">
              <DetailPanel day={selectedDay} onClose={() => setSelectedDay(null)} businessContext={businessContext} />
            </div>
          </aside>
        )}
      </div>

      {/* Footer */}
      <footer
        className="px-5 py-2.5 flex items-center justify-between flex-shrink-0"
        style={{ borderTop: "1px solid #E2E0DB" }}
      >
        <span className="text-[10px] text-[#94A3B8]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          Framework: EOS Meeting Pulse + Rockefeller Habits
        </span>
        <span className="text-[10px] text-[#94A3B8]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          Hover legend to highlight · Click days to view full agenda
        </span>
      </footer>
    </div>
  );
}
