/**
 * Business Cadence Calendar — Home Page
 * Design: Dark Navy Command Center — #0F2440 bg, #5EEAD4 teal accent
 * Fonts: Space Grotesk (display), Inter (body), JetBrains Mono (numbers)
 */

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { usePerson } from "@/contexts/PersonContext";
import { personScopeToBusinessSelection, type BusinessSelection } from "@/lib/businessScope";
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
import { DEFAULT_MEETING_TIMES, formatMeetingTime, type MeetingTimes } from "@shared/industryDefaults";

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
  if (!day) return <div className="h-11 rounded-md" style={{ backgroundColor: "rgba(255,255,255,0.03)" }} />;

  const isClosed = day.isClosed === true;
  const isHighlighted = highlightType ? day.meetings.includes(highlightType) : false;
  const hasMeetings = day.meetings.length > 0 && !day.isWeekend && !isClosed;
  const hasQuarterly = day.meetings.includes("quarterly");
  const hasMonthly = day.meetings.includes("monthly");
  const sortedMeetings = MEETING_ORDER.filter((t) => day.meetings.includes(t));

  let cellBg = "rgba(255,255,255,0.04)";
  if (isClosed) cellBg = "rgba(255,255,255,0.02)";
  else if (isSelected) cellBg = "rgba(94,234,212,0.15)";
  else if (hasQuarterly) cellBg = "rgba(244,63,94,0.15)";
  else if (hasMonthly) cellBg = "rgba(13,148,136,0.12)";
  else if (isHighlighted) cellBg = "rgba(255,255,255,0.08)";
  else if (hasMeetings) cellBg = "rgba(255,255,255,0.07)";
  else if (day.isWeekend) cellBg = "rgba(255,255,255,0.02)";

  let cellBorder = "1px solid rgba(255,255,255,0.07)";
  if (isClosed) cellBorder = "1px solid rgba(255,255,255,0.04)";
  else if (day.isToday) cellBorder = "1.5px solid #5EEAD4";
  else if (isSelected) cellBorder = "1.5px solid rgba(94,234,212,0.5)";
  else if (isHighlighted && highlightType) cellBorder = `1.5px solid ${MEETING_TYPES[highlightType].color}60`;
  else if (hasQuarterly) cellBorder = "1.5px solid rgba(244,63,94,0.4)";
  else if (hasMonthly) cellBorder = "1.5px solid rgba(13,148,136,0.35)";

  return (
    <div
      className={`h-11 rounded-md flex flex-col items-center justify-between py-1 px-0.5 relative transition-all duration-150
        ${hasMeetings ? "cursor-pointer hover:brightness-125" : ""}
        ${isClosed ? "opacity-40" : ""}
      `}
      style={{ backgroundColor: cellBg, border: cellBorder }}
      onClick={() => hasMeetings && onSelect(day)}
      title={isClosed ? "Closed day" : undefined}
    >
      <div className="relative w-full flex justify-center">
        <span
          className={`text-[10px] leading-none font-medium`}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            color: isClosed ? "rgba(255,255,255,0.2)"
              : day.isToday ? "#5EEAD4"
              : hasQuarterly ? "#FDA4AF"
              : hasMonthly ? "#5EEAD4"
              : day.isWeekend ? "rgba(255,255,255,0.2)"
              : "rgba(255,255,255,0.7)",
            fontWeight: day.isToday ? 700 : hasQuarterly || hasMonthly ? 600 : 400,
          }}
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
          <span className="absolute -top-0.5 -right-0.5 text-[8px] leading-none" style={{ color: "rgba(255,255,255,0.2)" }} title="Closed">✕</span>
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
  hideHeader,
}: {
  month: CalendarMonth;
  onSelectDay: (day: CalendarDay) => void;
  selectedDay: CalendarDay | null;
  highlightType: MeetingType | null;
  loggedDates: Set<string>;
  hideHeader?: boolean;
}) {
  const quarterlyDays = month.days.filter((d) => d && d.meetings.includes("quarterly")).length;
  const monthlyDays = month.days.filter((d) => d && d.meetings.includes("monthly")).length;

  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-2 overflow-hidden"
      style={{
        backgroundColor: "rgba(255,255,255,0.04)",
        border: quarterlyDays > 0
          ? "1.5px solid rgba(244,63,94,0.35)"
          : "1.5px solid rgba(255,255,255,0.08)",
        position: "relative",
        zIndex: 0,
      }}
    >
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <h3
            className="text-xs font-semibold tracking-wider uppercase"
            style={{ color: "rgba(255,255,255,0.8)", fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {month.name}
          </h3>
          <div className="flex gap-1">
            {quarterlyDays > 0 && (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                style={{ backgroundColor: "rgba(244,63,94,0.2)", color: "#FDA4AF", fontFamily: "'Space Grotesk', sans-serif" }}
              >
                OFFSITE
              </span>
            )}
            {monthlyDays > 0 && quarterlyDays === 0 && (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                style={{ backgroundColor: "rgba(13,148,136,0.2)", color: "#5EEAD4", fontFamily: "'Space Grotesk', sans-serif" }}
              >
                FINANCE
              </span>
            )}
          </div>
        </div>
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
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors"
        style={{ color: "inherit" }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)")}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
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
            <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>
              {block.startOffset}–{block.endOffset}
            </span>
            <span className="ml-auto text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>
              {completedCount}/{block.items.length}
            </span>
          </div>
          <p className="text-[10px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{block.focus}</p>
        </div>
        <span className="text-xs flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>{expanded ? "▲" : "▼"}</span>
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
                  <p className="text-[11px] leading-relaxed transition-colors flex-1"
                    style={{ color: isChecked ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.75)", textDecoration: isChecked ? "line-through" : "none" }}>
                    {item}
                  </p>
                </div>
                <div className="ml-6">
                  <input
                    type="text"
                    value={state.comment}
                    onChange={(e) => onCommentChange(itemKey, e.target.value)}
                    placeholder={isChecked ? "Add a note about this item…" : "Add context or a question…"}
                    className="w-full rounded px-2.5 py-1.5 text-[10px] focus:outline-none transition-colors"
                    style={{
                      backgroundColor: `${biz.color}10`,
                      border: `1px solid ${biz.color}20`,
                      color: "rgba(255,255,255,0.6)",
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

const BIZ_TO_DB: Record<string, "chiropractic" | "crossfit"> = {
  chiro: "chiropractic",
  crossfit: "crossfit",
};

// Map MeetingType to MeetingTimes key
const MEETING_TYPE_TO_TIME_KEY: Record<MeetingType, keyof MeetingTimes> = {
  daily: "ownerDaily",
  weekly: "ownerWeekly",
  monthly: "ownerMonthly",
  quarterly: "quarterly",
};

function MeetingSection({
  type, day, dateKey, businessContext, meetingTimes,
}: {
  type: MeetingType;
  day: CalendarDay;
  dateKey: string;
  businessContext: BusinessSelection;
  meetingTimes: MeetingTimes;
}) {
  const m = MEETING_TYPES[type];
  const [itemStates, setItemStates] = useState<Map<string, { completed: boolean; comment: string }>>(() => new Map());
  const [notes, setNotes] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryDate, setSummaryDate] = useState<Date | null>(null);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commentTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const templateQueries = m.timeBlocks.map((block) => {
    const dbBiz = BIZ_TO_DB[block.business] ?? "chiropractic";
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return trpc.agendaTemplate.get.useQuery(
      { business: dbBiz, meetingType: type as "daily" | "weekly" | "monthly" | "quarterly" },
      { staleTime: 60_000 }
    );
  });

  const effectiveBlocks = m.timeBlocks
    .map((block, i) => {
      const customItems = templateQueries[i]?.data?.items;
      if (customItems && customItems.length > 0) {
        return { ...block, items: customItems.map((ci: { label: string }) => ci.label) };
      }
      return block;
    })
    .filter((block) => {
      if (businessContext === "owner") return true;
      if (businessContext === "chiro") return block.business === "chiro";
      if (businessContext === "crossfit") return block.business === "crossfit";
      return true;
    });

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
    const existing = commentTimers.current.get(itemKey);
    if (existing) clearTimeout(existing);
    commentTimers.current.set(itemKey, setTimeout(() => {
      saveItemComment.mutate({ dateKey, meetingType: type, itemKey, comment });
    }, 800));
  }, [dateKey, type]);

  const handleGenerateSummary = useCallback(() => {
    const items: { label: string; completed: boolean; comment?: string }[] = [];
    effectiveBlocks.forEach(block => {
      const bizName = BUSINESSES[block.business as keyof typeof BUSINESSES].shortName;
      block.items.forEach((item, i) => {
        const itemKey = `${type}-${block.business}-${i}`;
        const state = itemStates.get(itemKey);
        items.push({ label: `${bizName}: ${item}`, completed: state?.completed ?? false, comment: state?.comment || undefined });
      });
    });
    m.sharedItems.forEach(item => { items.push({ label: item, completed: false }); });
    generateSummary.mutate(
      { dateKey, meetingType: type, notes, items, businessContext: m.label },
      { onSuccess: (data) => { setSummary(data.summary); setSummaryDate(new Date()); } }
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
      style={{ backgroundColor: "rgba(255,255,255,0.04)", border: `1px solid ${m.color}30` }}
    >
      <div className="px-4 pt-4 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: m.color, boxShadow: `0 0 6px ${m.color}80` }} />
          <span className="font-bold text-sm text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {m.label}
          </span>
          <span
            className="ml-auto text-[10px] px-2 py-0.5 rounded font-mono"
            style={{ backgroundColor: `${m.color}20`, color: m.color, fontFamily: "'JetBrains Mono', monospace" }}
          >
            {m.totalDuration}
          </span>
        </div>
        <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{m.overview}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>🕐</span>
          <span className="text-[10px] font-semibold" style={{ color: "rgba(94,234,212,0.7)" }}>
            {formatMeetingTime(meetingTimes[MEETING_TYPE_TO_TIME_KEY[type]])}
          </span>
          <span className="text-[10px] italic" style={{ color: "rgba(255,255,255,0.25)" }}>— {m.totalDuration}</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
            <div className="h-1 rounded-full transition-all duration-300" style={{ width: `${progressPct}%`, backgroundColor: m.color }} />
          </div>
          <span className="text-[10px] font-mono" style={{ color: m.color, fontFamily: "'JetBrains Mono', monospace" }}>
            {completedCount}/{totalItems}
          </span>
        </div>
      </div>

      <div className="px-3 flex flex-col gap-2">
        <p className="text-[9px] font-bold uppercase tracking-widest px-1" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Space Grotesk', sans-serif" }}>
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

      {m.sharedItems.length > 0 && (
        <div className="px-3 flex flex-col gap-1.5">
          <p className="text-[9px] font-bold uppercase tracking-widest px-1" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Space Grotesk', sans-serif" }}>
            All-Business Items
          </p>
          <div className="rounded-lg px-3 py-2.5 flex flex-col gap-1.5" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {m.sharedItems.map((item, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="flex-shrink-0 text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>›</span>
                <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-3 flex flex-col gap-1.5">
        <div className="flex items-center justify-between px-1">
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Space Grotesk', sans-serif" }}>
            Meeting Notes
          </p>
          {saveNotes.isPending && <span className="text-[9px] italic" style={{ color: "rgba(255,255,255,0.3)" }}>saving…</span>}
          {!saveNotes.isPending && notes.length > 0 && <span className="text-[9px]" style={{ color: "#5EEAD4" }}>✓ saved</span>}
        </div>
        <textarea
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Type your meeting notes here… decisions made, issues raised, action items…"
          rows={4}
          className="w-full rounded-lg px-3 py-2.5 text-[11px] resize-none focus:outline-none transition-colors"
          style={{
            backgroundColor: "rgba(255,255,255,0.05)",
            border: `1px solid ${m.color}25`,
            color: "rgba(255,255,255,0.75)",
            fontFamily: "'Inter', sans-serif",
            lineHeight: "1.6",
          }}
          onFocus={(e) => (e.target.style.borderColor = `${m.color}60`)}
          onBlur={(e) => (e.target.style.borderColor = `${m.color}25`)}
        />
      </div>

      <div className="px-3 flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Space Grotesk', sans-serif" }}>
            AI Summary
          </p>
          {summaryDate && (
            <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>
              {new Date(summaryDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>

        {summary ? (
          <div className="rounded-lg px-3 py-3 flex flex-col gap-2" style={{ backgroundColor: `${m.color}10`, border: `1px solid ${m.color}25` }}>
            <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>{summary}</p>
            <button
              onClick={handleGenerateSummary}
              disabled={generateSummary.isPending}
              className="self-start text-[10px] px-2.5 py-1 rounded transition-all hover:opacity-80 disabled:opacity-40"
              style={{ backgroundColor: `${m.color}20`, color: m.color, fontFamily: "'Space Grotesk', sans-serif" }}
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
              backgroundColor: `${m.color}10`,
              border: `1px dashed ${m.color}40`,
              color: m.color,
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

const CALENDAR_TO_BOARD_MEETING: Record<MeetingType, "daily_huddle" | "weekly_meeting" | "quarterly_review" | null> = {
  daily: "daily_huddle",
  weekly: "weekly_meeting",
  monthly: "weekly_meeting",
  quarterly: "quarterly_review",
};

const MEETING_TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  daily_huddle:     { label: "Daily Huddle",    icon: "🌅", color: "#0D9488" },
  weekly_meeting:   { label: "Weekly Meeting",  icon: "📅", color: "#7C3AED" },
  quarterly_review: { label: "Quarterly Review",icon: "📊", color: "#D97706" },
};

function BoardIssuesForMeeting({ meetingType, dateMs }: { meetingType: "daily_huddle" | "weekly_meeting" | "quarterly_review"; dateMs: number }) {
  const { data: boardData } = trpc.board.list.useQuery();
  const dayStart = new Date(dateMs); dayStart.setHours(0, 0, 0, 0);
  const dayEnd   = new Date(dateMs); dayEnd.setHours(23, 59, 59, 999);

  const issues = useMemo(() => {
    if (!boardData?.cards) return [];
    return boardData.cards.filter(c =>
      c.type === "issue" &&
      c.meetingType === meetingType &&
      (!c.scheduledDate || (c.scheduledDate >= dayStart.getTime() && c.scheduledDate <= dayEnd.getTime()))
    );
  }, [boardData, meetingType, dayStart, dayEnd]);

  if (issues.length === 0) return null;
  const meta = MEETING_TYPE_LABELS[meetingType];

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[9px] font-bold uppercase tracking-widest px-1" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Space Grotesk', sans-serif" }}>
        💬 Issues to Discuss
      </p>
      <div className="flex flex-col gap-1.5">
        {issues.map(issue => (
          <div key={issue.id} className="rounded-lg px-3 py-2.5 flex flex-col gap-1"
            style={{ backgroundColor: `${meta.color}10`, border: `1px solid ${meta.color}30` }}>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px]" style={{ color: meta.color }}>⚠️</span>
              <span className="text-[10px] font-semibold" style={{ color: meta.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                {issue.author}
              </span>
              {issue.scheduledDate && (
                <span className="text-[9px] ml-auto" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {new Date(issue.scheduledDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>{issue.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailPanel({ day, onClose, businessContext, meetingTimes }: { day: CalendarDay; onClose: () => void; businessContext: BusinessSelection; meetingTimes: MeetingTimes }) {
  const dateStr = day.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const dateKey = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, "0")}-${String(day.date.getDate()).padStart(2, "0")}`;
  const sortedMeetings = MEETING_ORDER.filter((t) => day.meetings.includes(t));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Space Grotesk', sans-serif" }}>
            Scheduled for
          </p>
          <h2 className="text-sm font-bold text-white leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {dateStr}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-xl leading-none w-6 h-6 flex items-center justify-center rounded transition-colors"
          style={{ color: "rgba(255,255,255,0.4)" }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)")}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
        >×</button>
      </div>

      {sortedMeetings.map((type) => {
        const boardMeetingType = CALENDAR_TO_BOARD_MEETING[type];
        return (
          <div key={type} className="flex flex-col gap-3">
            <MeetingSection type={type} day={day} dateKey={dateKey} businessContext={businessContext} meetingTimes={meetingTimes} />
            {boardMeetingType && (
              <div className="px-3">
                <BoardIssuesForMeeting meetingType={boardMeetingType} dateMs={day.date.getTime()} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


export default function Home() {
  const { person } = usePerson();
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [highlightType, setHighlightType] = useState<MeetingType | null>(null);
  const businessContext = personScopeToBusinessSelection(person?.businessScope);
  const accountId = person?.accountId ?? (() => {
    const stored = localStorage.getItem("bcc_account_id");
    return stored ? parseInt(stored, 10) : undefined;
  })();

  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());

  const { data: calendarData } = trpc.onboarding.generateCalendar.useQuery(
    { accountId: accountId ?? 0, year: viewYear },
    { enabled: accountId !== undefined, refetchOnWindowFocus: true }
  );

  const { data: profileStatus } = trpc.onboarding.getStatus.useQuery(
    { accountId: accountId ?? 0 },
    { enabled: accountId !== undefined, staleTime: 300_000 }
  );

  const meetingTimes = useMemo<MeetingTimes>(() => {
    if (profileStatus?.profile?.meetingTimes) {
      try {
        const parsed = JSON.parse(profileStatus.profile.meetingTimes);
        return { ...DEFAULT_MEETING_TIMES, ...parsed };
      } catch { /* fall through */ }
    }
    return { ...DEFAULT_MEETING_TIMES };
  }, [profileStatus]);

  const calendar = useMemo<CalendarMonth[]>(() => {
    if (calendarData?.meetings && calendarData.meetings.length > 0) {
      return buildCalendarFromSchedule(viewYear, calendarData.meetings, calendarData.closedDates ?? []);
    }
    const months: CalendarMonth[] = [];
    const today = new Date();
    const MONTH_NAMES_LOCAL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    for (let m = 0; m < 12; m++) {
      const firstDay = new Date(viewYear, m, 1);
      const lastDay = new Date(viewYear, m + 1, 0);
      const startDow = firstDay.getDay();
      const days: (CalendarDay | null)[] = [];
      for (let i = 0; i < startDow; i++) days.push(null);
      for (let d = 1; d <= lastDay.getDate(); d++) {
        const date = new Date(viewYear, m, d);
        const dow = date.getDay();
        const isWeekend = dow === 0 || dow === 6;
        const isToday = today.getFullYear() === viewYear && today.getMonth() === m && today.getDate() === d;
        const meetings: MeetingType[] = [];
        if (!isWeekend) {
          meetings.push("daily");
          if (dow === 2) {
            meetings.push("weekly");
            if (date.getDate() <= 7) meetings.push("monthly");
          }
          if (dow === 5 && date.getDate() <= 7 && [0, 3, 6, 9].includes(m)) meetings.push("quarterly");
        }
        days.push({ date, dayOfMonth: d, isWeekend, meetings, isToday });
      }
      months.push({ month: m, name: MONTH_NAMES_LOCAL[m], days });
    }
    return months;
  }, [calendarData, viewYear]);

  const { data: loggedDatesData } = trpc.meetingLog.getLoggedDates.useQuery(undefined, { staleTime: 60_000, refetchOnWindowFocus: true });
  const loggedDatesSet = useMemo(() => new Set<string>(loggedDatesData?.dates ?? []), [loggedDatesData]);

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
    setSelectedDay((prev) => prev && prev.date.getTime() === day.date.getTime() ? null : day);
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [viewMode, setViewMode] = useState<"month" | "year">(() => {
    try { return (localStorage.getItem("bcc_cal_view") as "month" | "year") ?? "month"; } catch { return "month"; }
  });
  const [viewMonthIndex, setViewMonthIndex] = useState(() => new Date().getMonth());

  const toggleViewMode = () => {
    setViewMode(prev => {
      const next = prev === "month" ? "year" : "month";
      try { localStorage.setItem("bcc_cal_view", next); } catch { /* ignore */ }
      return next;
    });
  };

  const goToPrevMonth = () => {
    if (viewMonthIndex === 0) { setViewYear(y => y - 1); setViewMonthIndex(11); }
    else { setViewMonthIndex(i => i - 1); }
  };
  const goToNextMonth = () => {
    if (viewMonthIndex === 11) { setViewYear(y => y + 1); setViewMonthIndex(0); }
    else { setViewMonthIndex(i => i + 1); }
  };
  const goToToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonthIndex(now.getMonth());
  };

  const todayMonthIndex = new Date().getMonth();
  const todayYear = new Date().getFullYear();
  const isViewingToday = viewMonthIndex === todayMonthIndex && viewYear === todayYear;

  return (
    <div style={{ backgroundColor: "#0F2440", fontFamily: "'Inter', sans-serif" }}>
      {/* Slim page title bar */}
      <div
        className="px-4 py-2.5 flex items-center justify-between flex-shrink-0 relative z-30"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", backgroundColor: "#0A1929" }}
      >
        <div className="flex items-center gap-2.5">
          <button
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg transition-all"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="4" width="12" height="1.5" rx="0.75" fill="rgba(255,255,255,0.7)" />
              <rect x="2" y="7.25" width="12" height="1.5" rx="0.75" fill="rgba(255,255,255,0.7)" />
              <rect x="2" y="10.5" width="12" height="1.5" rx="0.75" fill="rgba(255,255,255,0.7)" />
            </svg>
          </button>
          <span className="text-base">📅</span>
          <h1 className="text-sm font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Calendar</h1>
          <span className="text-xs font-mono font-bold ml-1" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>{viewYear}</span>
        </div>
        <div className="hidden md:flex items-center gap-3">
          {(["daily", "weekly", "monthly", "quarterly"] as MeetingType[]).map((t) => (
            <div key={t} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: MEETING_TYPES[t].color }} />
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>
                {MEETING_TYPES[t].shortLabel}
              </span>
            </div>
          ))}
        </div>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar */}
        <aside
          className={`flex-shrink-0 flex flex-col gap-4 p-4 overflow-y-auto transition-transform duration-300
            md:relative md:translate-x-0 md:w-60
            fixed top-0 left-0 h-full z-30 w-72
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
          style={{ borderRight: "1px solid rgba(255,255,255,0.08)", backgroundColor: "#0A1929" }}
        >
          <div className="flex items-center justify-between md:hidden mb-1">
            <span className="text-xs font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Menu</span>
            <button
              className="w-7 h-7 flex items-center justify-center rounded-lg"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
              onClick={() => setSidebarOpen(false)}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1L11 11M11 1L1 11" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Quick Nav */}
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1 px-1" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Space Grotesk', sans-serif" }}>
              Quick Access
            </p>
            <Link href="/app/board" className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-90"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)", fontFamily: "'Space Grotesk', sans-serif" }}>
              <span>📋</span> Owner Board
            </Link>
            <Link href="/app/goals" className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-90"
              style={{ background: "rgba(196,181,253,0.08)", border: "1px solid rgba(196,181,253,0.2)", color: "#C4B5FD", fontFamily: "'Space Grotesk', sans-serif" }}>
              <span>🎯</span> Goals
            </Link>
            <Link href="/app/reports" className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-90"
              style={{ background: "rgba(94,234,212,0.08)", border: "1px solid rgba(94,234,212,0.2)", color: "#5EEAD4", fontFamily: "'Space Grotesk', sans-serif" }}>
              <span>📊</span> Weekly Reports
            </Link>
            <Link href="/app/settings" className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-90"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}>
              <span>⚙️</span> Agenda Settings
            </Link>
          </div>



          {/* Manage Schedule */}
          <div className="flex flex-col gap-2">
            <Link href="/app/schedule" className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-90"
              style={{ background: "rgba(94,234,212,0.08)", border: "1px solid rgba(94,234,212,0.2)", color: "#5EEAD4", fontFamily: "'Space Grotesk', sans-serif" }}>
              <span>📆</span> Manage Schedule
            </Link>
          </div>

          {/* Golden Rule */}
          <div className="rounded-xl p-3.5" style={{ backgroundColor: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#FDA4AF", fontFamily: "'Space Grotesk', sans-serif" }}>
              ★ The Golden Rule
            </p>
            <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
              When an issue arises outside a meeting,{" "}
              <strong className="text-white">add it to the Issues List</strong> — don't discuss it. It waits for the next scheduled meeting.
            </p>
          </div>

          {/* Science note */}
          <div className="rounded-xl p-3.5" style={{ backgroundColor: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.2)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#7DD3FC", fontFamily: "'Space Grotesk', sans-serif" }}>
              Why This Works
            </p>
            <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
              APA research: unstructured task-switching costs up to{" "}
              <strong className="text-white">40% of productive time</strong>. Structured cadence eliminates that loss.
            </p>
          </div>
        </aside>

        {/* Main Calendar */}
        <main className="flex-1 p-3 sm:p-5 flex flex-col gap-3 sm:gap-4">
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
                    backgroundColor: "rgba(255,255,255,0.04)",
                    border: highlightType === type ? `1.5px solid ${m.color}` : `1.5px solid ${m.color}25`,
                    boxShadow: highlightType === type ? `0 0 0 3px ${m.color}15` : "none",
                  }}
                  onMouseEnter={() => setHighlightType(type)}
                  onMouseLeave={() => setHighlightType(null)}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                    <span className="text-[11px] font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {m.label}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-3xl font-bold text-white leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {count}
                    </span>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>per year</span>
                  </div>
                  <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{m.totalDuration} each session</span>
                </div>
              );
            })}
          </div>

          {/* Calendar Navigation Bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap" style={{ position: "relative", zIndex: 10 }}>
            {viewMode === "month" ? (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={goToPrevMonth}
                  className="w-9 h-9 flex items-center justify-center rounded-lg transition-all active:scale-95"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", flexShrink: 0 }}
                  aria-label="Previous month"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <h2 className="text-sm font-bold text-white text-center" style={{ fontFamily: "'Space Grotesk', sans-serif", minWidth: "110px" }}>
                  {calendar[viewMonthIndex]?.name ?? ""} {viewYear}
                </h2>
                <button
                  onClick={goToNextMonth}
                  className="w-9 h-9 flex items-center justify-center rounded-lg transition-all active:scale-95"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", flexShrink: 0 }}
                  aria-label="Next month"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            ) : (
              <h2 className="text-sm font-bold text-white flex-shrink-0" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {viewYear} — Full Year
              </h2>
            )}
            <div className="flex items-center gap-2 flex-shrink-0">
              {viewMode === "month" && !isViewingToday && (
                <button
                  onClick={goToToday}
                  className="text-[11px] font-semibold px-3 py-2 rounded-lg transition-all active:scale-95"
                  style={{ background: "rgba(94,234,212,0.1)", border: "1px solid rgba(94,234,212,0.25)", color: "#5EEAD4", minHeight: "36px" }}
                >
                  Today
                </button>
              )}
              <button
                onClick={toggleViewMode}
                className="text-[11px] font-semibold px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 active:scale-95"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", minHeight: "36px" }}
              >
                {viewMode === "month" ? (
                  <><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/><rect x="7" y="1" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="7" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/><rect x="7" y="7" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/></svg>Year</>
                ) : (
                  <><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>Month</>
                )}
              </button>
            </div>
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
                  hideHeader
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

        {/* Right Detail Panel */}
        {selectedDay && (
          <aside
            className="fixed inset-0 z-40 overflow-y-auto md:relative md:inset-auto md:w-80 md:flex-shrink-0 md:p-4"
            style={{ backgroundColor: "#0A1929", borderLeft: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="p-4">
              <DetailPanel day={selectedDay} onClose={() => setSelectedDay(null)} businessContext={businessContext} meetingTimes={meetingTimes} />
            </div>
          </aside>
        )}
      </div>

      {/* Footer */}
      <footer className="px-5 py-2.5 flex items-center justify-between flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono', monospace" }}>
          Framework: EOS Meeting Pulse + Rockefeller Habits
        </span>
        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono', monospace" }}>
          Hover legend to highlight · Click days to view full agenda
        </span>
      </footer>
    </div>
  );
}
