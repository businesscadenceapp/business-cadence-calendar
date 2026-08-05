/**
 * ManageSchedule — lets owners mark closed days and weeks.
 * Meetings on closed dates are automatically shifted to the next available day.
 * Dark navy theme: #0F2440 bg, #3B9EE8 teal accent
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TIME_OPTIONS, DEFAULT_MEETING_TIMES, formatMeetingTime } from "@shared/industryDefaults";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getWeekBounds(dateStr: string): { start: string; end: string } {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: toDateKey(monday), end: toDateKey(sunday) };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatWeek(startStr: string, endStr: string): string {
  const s = new Date(startStr + "T00:00:00");
  const e = new Date(endStr + "T00:00:00");
  return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

// Mini calendar for picking a single date or week
function MiniCalendar({
  year,
  month,
  mode,
  closedDates,
  onSelect,
}: {
  year: number;
  month: number;
  mode: "day" | "week";
  closedDates: Set<string>;
  onSelect: (dateStr: string) => void;
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);
  while (cells.length % 7 !== 0) cells.push(null);

  const today = toDateKey(new Date());

  return (
    <div className="select-none">
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
          <div key={d} className="text-center text-[10px] font-semibold py-1" style={{ color: "rgba(255,255,255,0.3)" }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isClosed = closedDates.has(dateStr);
          const isToday = dateStr === today;

          return (
            <button
              key={i}
              onClick={() => onSelect(dateStr)}
              className="h-8 w-full rounded-lg text-xs font-medium transition-all duration-100"
              style={{
                backgroundColor: isClosed ? "rgba(225,29,72,0.2)" : "transparent",
                color: isClosed ? "#F87171" : isToday ? "#3B9EE8" : "rgba(255,255,255,0.7)",
                border: isToday && !isClosed ? "1px solid rgba(59,158,232,0.4)" : "1px solid transparent",
                fontWeight: isToday ? "700" : "500",
              }}
              onMouseEnter={e => {
                if (!isClosed) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(59,158,232,0.1)";
              }}
              onMouseLeave={e => {
                if (!isClosed) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Meeting Schedule Helpers ────────────────────────────────────────────────
const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function MiniDayPickerMulti({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(d => (
        <button key={d} type="button"
          onClick={() => onChange(value.includes(d) ? value.filter(x => x !== d) : [...value, d].sort())}
          className="w-8 h-8 rounded-md text-[11px] font-semibold transition-all"
          style={{
            backgroundColor: value.includes(d) ? "#3B9EE8" : "rgba(255,255,255,0.08)",
            color: value.includes(d) ? "#0F2440" : "rgba(255,255,255,0.5)",
          }}
        >{DAY_NAMES_SHORT[d]}</button>
      ))}
    </div>
  );
}

function MiniDayPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(d => (
        <button key={d} type="button" onClick={() => onChange(d)}
          className="w-8 h-8 rounded-md text-[11px] font-semibold transition-all"
          style={{
            backgroundColor: value === d ? "#3B9EE8" : "rgba(255,255,255,0.08)",
            color: value === d ? "#0F2440" : "rgba(255,255,255,0.5)",
          }}
        >{DAY_NAMES_SHORT[d]}</button>
      ))}
    </div>
  );
}

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onToggle(!enabled)}
      className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200"
      style={{ backgroundColor: enabled ? "#3B9EE8" : "rgba(255,255,255,0.15)" }}
      role="switch" aria-checked={enabled}>
      <span className={cn("pointer-events-none inline-block h-4 w-4 rounded-full shadow transform transition-transform duration-200",
        enabled ? "translate-x-4" : "translate-x-0")}
        style={{ backgroundColor: enabled ? "#0F2440" : "rgba(255,255,255,0.6)" }} />
    </button>
  );
}

type MeetingPrefs = {
  ownerDaily: number[]; ownerWeekly: number; ownerMonthly: number; quarterlyDay: number;
  teamDaily: number[]; teamWeekly: number;
  ownerDailyEnabled: boolean; ownerWeeklyEnabled: boolean; ownerMonthlyEnabled: boolean;
  quarterlyEnabled: boolean; teamDailyEnabled: boolean; teamWeeklyEnabled: boolean;
};

type MeetingTimes = {
  ownerDaily: string; ownerWeekly: string; ownerMonthly: string;
  quarterly: string; teamDaily: string; teamWeekly: string;
};

function MeetingScheduleSection({ accountId }: { accountId: number }) {
  const utils = trpc.useUtils();
  const { data: statusData, refetch } = trpc.onboarding.getStatus.useQuery({ accountId }, { enabled: accountId !== undefined });
  const updatePrefs = trpc.onboarding.updateMeetingPrefs.useMutation({
    onSuccess: () => {
      toast.success("Meeting schedule saved.");
      refetch();
      utils.onboarding.generateCalendar.invalidate();
    },
    onError: (err) => toast.error(err.message ?? "Save failed."),
  });
  const [prefs, setPrefs] = useState<MeetingPrefs | null>(null);
  const [times, setTimes] = useState<MeetingTimes>({ ...DEFAULT_MEETING_TIMES });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (statusData?.profile?.meetingDayPrefs) {
      const raw = JSON.parse(statusData.profile.meetingDayPrefs);
      setPrefs({
        ownerDaily: raw.ownerDaily ?? [1, 2, 3, 4],
        ownerWeekly: raw.ownerWeekly ?? 5,
        ownerMonthly: raw.ownerMonthly ?? 5,
        quarterlyDay: raw.quarterlyDay ?? 5,
        teamDaily: raw.teamDaily ?? [1],
        teamWeekly: raw.teamWeekly ?? 3,
        ownerDailyEnabled: raw.ownerDailyEnabled !== false,
        ownerWeeklyEnabled: raw.ownerWeeklyEnabled !== false,
        ownerMonthlyEnabled: raw.ownerMonthlyEnabled !== false,
        quarterlyEnabled: raw.quarterlyEnabled !== false,
        teamDailyEnabled: raw.teamDailyEnabled !== false,
        teamWeeklyEnabled: raw.teamWeeklyEnabled !== false,
      });
      // Load saved meeting times if present
      if (statusData.profile.meetingTimes) {
        try {
          const rawTimes = JSON.parse(statusData.profile.meetingTimes);
          setTimes({ ...DEFAULT_MEETING_TIMES, ...rawTimes });
        } catch { /* use defaults */ }
      }
      setDirty(false);
    }
  }, [statusData]);

  const upd = useCallback((patch: Partial<MeetingPrefs>) => {
    setPrefs(prev => prev ? { ...prev, ...patch } : prev);
    setDirty(true);
  }, []);

  const updTime = useCallback((key: keyof MeetingTimes, value: string) => {
    setTimes(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  // Inline time picker component
  const TimePicker = ({ timeKey }: { timeKey: keyof MeetingTimes }) => (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.35)" }}>Start time</span>
      <select
        value={times[timeKey]}
        onChange={e => updTime(timeKey, e.target.value)}
        style={{
          backgroundColor: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(59,158,232,0.25)",
          color: "#3B9EE8",
          borderRadius: "6px",
          padding: "3px 8px",
          fontSize: "12px",
          fontWeight: "600",
          outline: "none",
          cursor: "pointer",
        }}
      >
        {TIME_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value} style={{ backgroundColor: "#0F2440", color: "white" }}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );

  if (!prefs) return <div className="text-sm p-4" style={{ color: "rgba(255,255,255,0.4)" }}>Loading…</div>;

  const MeetingRow = ({ label, desc, enabledKey, children }: { label: string; desc: string; enabledKey: keyof MeetingPrefs; children: React.ReactNode }) => (
    <div className="rounded-xl p-3 transition-all"
      style={{
        backgroundColor: prefs[enabledKey] ? "rgba(59,158,232,0.06)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${prefs[enabledKey] ? "rgba(59,158,232,0.2)" : "rgba(255,255,255,0.08)"}`,
      }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-white">{label}</p>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>{desc}</p>
        </div>
        <ToggleSwitch enabled={!!prefs[enabledKey]} onToggle={v => upd({ [enabledKey]: v } as Partial<MeetingPrefs>)} />
      </div>
      {prefs[enabledKey] && (
        <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-base font-bold text-white mb-1">Owner Meetings</h3>
        <p className="text-sm mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>Toggle off any meeting type you don't want on your calendar.</p>
        <div className="flex flex-col gap-2">
          <MeetingRow label="Daily Huddle" desc="Quick daily sync — 10–15 min" enabledKey="ownerDailyEnabled">
            <p className="text-[11px] mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Which days?</p>
            <MiniDayPickerMulti value={prefs.ownerDaily} onChange={v => upd({ ownerDaily: v })} />
            <TimePicker timeKey="ownerDaily" />
          </MeetingRow>
          <MeetingRow label="Weekly Review" desc="Weekly business review — 60–90 min" enabledKey="ownerWeeklyEnabled">
            <p className="text-[11px] mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Which day?</p>
            <MiniDayPicker value={prefs.ownerWeekly} onChange={v => upd({ ownerWeekly: v })} />
            <TimePicker timeKey="ownerWeekly" />
          </MeetingRow>
          <MeetingRow label="Monthly Finance Review" desc="Monthly financial deep-dive — 60 min" enabledKey="ownerMonthlyEnabled">
            <p className="text-[11px] mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Which day? (1st occurrence each month)</p>
            <MiniDayPicker value={prefs.ownerMonthly} onChange={v => upd({ ownerMonthly: v })} />
            <TimePicker timeKey="ownerMonthly" />
          </MeetingRow>
          <MeetingRow label="Quarterly Offsite Meeting" desc="Quarterly strategic offsite — ~4 hrs" enabledKey="quarterlyEnabled">
            <p className="text-[11px] mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Which day? (first occurring day in Jan, Apr, Jul, Oct)</p>
            <MiniDayPicker value={prefs.quarterlyDay} onChange={v => upd({ quarterlyDay: v })} />
            <TimePicker timeKey="quarterly" />
          </MeetingRow>
        </div>
      </div>
      <div>
        <h3 className="text-base font-bold text-white mb-1">Team Meetings</h3>
        <p className="text-sm mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>Meetings that include your full team.</p>
        <div className="flex flex-col gap-2">
          <MeetingRow label="Team Daily Huddle" desc="Quick daily sync with the team — 10–15 min" enabledKey="teamDailyEnabled">
            <p className="text-[11px] mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Which days?</p>
            <MiniDayPickerMulti value={prefs.teamDaily} onChange={v => upd({ teamDaily: v })} />
            <TimePicker timeKey="teamDaily" />
          </MeetingRow>
          <MeetingRow label="Team Weekly Meeting" desc="Weekly all-hands or team review — 30–60 min" enabledKey="teamWeeklyEnabled">
            <p className="text-[11px] mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Which day?</p>
            <MiniDayPicker value={prefs.teamWeekly} onChange={v => upd({ teamWeekly: v })} />
            <TimePicker timeKey="teamWeekly" />
          </MeetingRow>
        </div>
      </div>
      {dirty && (
        <button onClick={() => { if (prefs) { updatePrefs.mutate({ accountId, meetingDayPrefs: prefs, meetingTimes: times }); setDirty(false); } }}
          disabled={updatePrefs.isPending}
          className="self-start px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          style={{ backgroundColor: "#3B9EE8", color: "#0F2440" }}>
          {updatePrefs.isPending ? "Saving…" : "Save Meeting Schedule"}
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ManageSchedule() {
  const [, navigate] = useLocation();
  const accountId = Number(localStorage.getItem("bcc_account_id") ?? "0");
  const currentYear = new Date().getFullYear();
  const [mode, setMode] = useState<"day" | "week">("day");
  const [label, setLabel] = useState("");
  const [calYear, setCalYear] = useState(currentYear);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [pendingDate, setPendingDate] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: periodsData, isLoading } = trpc.schedule.getClosedPeriods.useQuery(
    { accountId },
    { enabled: accountId !== undefined }
  );

  const addPeriod = trpc.schedule.addClosedPeriod.useMutation({
    onSuccess: () => {
      utils.schedule.getClosedPeriods.invalidate();
      utils.onboarding.generateCalendar.invalidate();
      setPendingDate(null);
      setLabel("");
      toast.success(mode === "day" ? "Day marked as closed." : "Week marked as closed.");
    },
    onError: () => toast.error("Could not save. Please try again."),
  });

  const removePeriod = trpc.schedule.removeClosedPeriod.useMutation({
    onSuccess: () => {
      utils.schedule.getClosedPeriods.invalidate();
      utils.onboarding.generateCalendar.invalidate();
      toast.success("Closed period removed.");
    },
    onError: () => toast.error("Could not remove. Please try again."),
  });

  const closedDates = useMemo(() => {
    const set = new Set<string>();
    if (!periodsData?.periods) return set;
    for (const p of periodsData.periods) {
      const start = new Date(p.startDate + "T00:00:00");
      const end = new Date(p.endDate + "T00:00:00");
      const cur = new Date(start);
      while (cur <= end) {
        set.add(toDateKey(cur));
        cur.setDate(cur.getDate() + 1);
      }
    }
    return set;
  }, [periodsData]);

  const handleDateSelect = (dateStr: string) => setPendingDate(dateStr);

  const handleAdd = () => {
    if (!pendingDate || !accountId) return;
    const { start, end } = mode === "week" ? getWeekBounds(pendingDate) : { start: pendingDate, end: pendingDate };
    addPeriod.mutate({ accountId, startDate: start, endDate: end, label: label.trim() || undefined, periodType: mode });
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const periods = periodsData?.periods ?? [];

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #0A1929 0%, #0F2440 100%)", fontFamily: "'Inter', sans-serif" }}>
      {/* Hero Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.02)" }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/app")}
              className="text-sm flex items-center gap-1 transition-colors"
              style={{ color: "rgba(255,255,255,0.4)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#3B9EE8")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
            >
              ← Back to Command Center
            </button>
            <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                style={{ backgroundColor: "rgba(59,158,232,0.15)", border: "1px solid rgba(59,158,232,0.3)" }}>
                📅
              </div>
              <h1 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Manage Schedule
              </h1>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full"
            style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)" }}>
            {periods.length} closed period{periods.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Left: Add closed period */}
        <div className="rounded-2xl p-6 flex flex-col gap-5"
          style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(59,158,232,0.15)" }}>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs"
                style={{ backgroundColor: "rgba(225,29,72,0.15)", border: "1px solid rgba(225,29,72,0.3)" }}>🚫</div>
              <h2 className="text-base font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Mark Closed Days
              </h2>
            </div>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              Meetings on closed dates will automatically shift to the next available work day.
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
            <button
              onClick={() => { setMode("day"); setPendingDate(null); }}
              className="flex-1 py-2 text-sm font-semibold transition-colors"
              style={{
                backgroundColor: mode === "day" ? "#3B9EE8" : "transparent",
                color: mode === "day" ? "#0F2440" : "rgba(255,255,255,0.5)",
              }}
            >
              Single Day
            </button>
            <button
              onClick={() => { setMode("week"); setPendingDate(null); }}
              className="flex-1 py-2 text-sm font-semibold transition-colors"
              style={{
                backgroundColor: mode === "week" ? "#3B9EE8" : "transparent",
                color: mode === "week" ? "#0F2440" : "rgba(255,255,255,0.5)",
              }}
            >
              Full Week
            </button>
          </div>

          {/* Calendar navigation */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevMonth}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: "rgba(255,255,255,0.5)", backgroundColor: "rgba(255,255,255,0.05)" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)")}
              >‹</button>
              <span className="text-sm font-semibold text-white">{MONTH_NAMES[calMonth]} {calYear}</span>
              <button onClick={nextMonth}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: "rgba(255,255,255,0.5)", backgroundColor: "rgba(255,255,255,0.05)" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)")}
              >›</button>
            </div>
            <MiniCalendar
              year={calYear}
              month={calMonth}
              mode={mode}
              closedDates={closedDates}
              onSelect={handleDateSelect}
            />
          </div>

          {/* Selected date preview */}
          {pendingDate && (
            <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(59,158,232,0.08)", border: "1px solid rgba(59,158,232,0.2)" }}>
              <p className="text-sm font-medium" style={{ color: "#3B9EE8" }}>
                {mode === "day"
                  ? `Selected: ${formatDate(pendingDate)}`
                  : `Week of: ${formatWeek(getWeekBounds(pendingDate).start, getWeekBounds(pendingDate).end)}`}
              </p>
            </div>
          )}

          {/* Label input */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>Label (optional)</Label>
            <Input
              placeholder='e.g. "Christmas Week", "Staff Vacation"'
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="text-sm text-white placeholder-white/30 border-white/10 bg-white/5 focus:border-teal-400"
            />
          </div>

          <button
            onClick={handleAdd}
            disabled={!pendingDate || addPeriod.isPending}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #3B9EE8, #2980c9)", color: "#0F2440" }}
          >
            {addPeriod.isPending ? "Saving…" : `Mark as Closed`}
          </button>
        </div>

        {/* Right: List of closed periods */}
        <div className="rounded-2xl p-6 flex flex-col gap-4"
          style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs"
                style={{ backgroundColor: "rgba(251,146,60,0.15)", border: "1px solid rgba(251,146,60,0.3)" }}>📋</div>
              <h2 className="text-base font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Closed Periods
              </h2>
            </div>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              Removing a period will restore meetings to their original scheduled dates.
            </p>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-8 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
              Loading…
            </div>
          )}

          {!isLoading && periods.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <span className="text-3xl opacity-40">📅</span>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>No closed periods yet.</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>Select a day or week on the calendar to get started.</p>
            </div>
          )}

          {!isLoading && periods.length > 0 && (
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[480px] pr-1">
              {[...periods]
                .sort((a, b) => a.startDate.localeCompare(b.startDate))
                .map(period => (
                  <div
                    key={period.id}
                    className="flex items-center justify-between p-3 rounded-xl transition-colors"
                    style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                          style={{
                            backgroundColor: period.periodType === "week" ? "rgba(251,146,60,0.15)" : "rgba(225,29,72,0.15)",
                            color: period.periodType === "week" ? "#FB923C" : "#F87171",
                            border: `1px solid ${period.periodType === "week" ? "rgba(251,146,60,0.3)" : "rgba(225,29,72,0.3)"}`,
                          }}>
                          {period.periodType === "week" ? "Week" : "Day"}
                        </span>
                        <span className="text-sm font-medium text-white">
                          {period.periodType === "week"
                            ? formatWeek(period.startDate, period.endDate)
                            : formatDate(period.startDate)}
                        </span>
                      </div>
                      {period.label && (
                        <span className="text-xs ml-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{period.label}</span>
                      )}
                    </div>
                    <button
                      onClick={() => removePeriod.mutate({ id: period.id, accountId })}
                      disabled={removePeriod.isPending}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-lg leading-none transition-colors"
                      style={{ color: "rgba(255,255,255,0.25)" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#F87171"; (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(225,29,72,0.1)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.25)"; (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Meeting Schedule section — full width below */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        <div className="rounded-2xl p-6"
          style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(196,181,253,0.2)" }}>
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs"
                style={{ backgroundColor: "rgba(196,181,253,0.15)", border: "1px solid rgba(196,181,253,0.3)" }}>🗓</div>
              <h2 className="text-base font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Meeting Schedule
              </h2>
            </div>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              Choose which meetings appear on your calendar and which days they occur.
            </p>
          </div>
          <MeetingScheduleSection accountId={accountId} />
        </div>
      </div>
    </div>
  );
}
