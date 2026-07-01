/**
 * ManageSchedule — lets owners mark closed days and weeks.
 * Meetings on closed dates are automatically shifted to the next available day.
 */

import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  monday.setDate(d.getDate() - ((day + 6) % 7)); // go back to Monday
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
  month: number; // 0-indexed
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
          <div key={d} className="text-center text-[10px] font-semibold text-slate-400 py-1">{d}</div>
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
              className={cn(
                "h-8 w-full rounded-lg text-xs font-medium transition-all duration-100",
                isClosed
                  ? "bg-red-100 text-red-600 border border-red-200 hover:bg-red-200"
                  : "hover:bg-teal-50 hover:text-teal-700 text-slate-700",
                isToday && !isClosed && "ring-1 ring-teal-400 font-bold"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
    { enabled: accountId > 0 }
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

  // Build a set of all closed dates for the calendar highlight
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

  const handleDateSelect = (dateStr: string) => {
    setPendingDate(dateStr);
  };

  const handleAdd = () => {
    if (!pendingDate || !accountId) return;
    const { start, end } = mode === "week" ? getWeekBounds(pendingDate) : { start: pendingDate, end: pendingDate };
    addPeriod.mutate({
      accountId,
      startDate: start,
      endDate: end,
      label: label.trim() || undefined,
      periodType: mode,
    });
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
    <div className="min-h-screen bg-[#F8F7F4]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/app")}
            className="text-slate-400 hover:text-navy transition-colors text-sm flex items-center gap-1"
          >
            ← Back to Calendar
          </button>
          <span className="text-slate-300">|</span>
          <h1 className="text-lg font-bold text-navy">Manage Schedule</h1>
        </div>
        <Badge variant="outline" className="text-xs text-slate-500">
          {periods.length} closed period{periods.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Left: Add closed period */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-5">
          <div>
            <h2 className="text-base font-bold text-navy mb-1">Mark Closed Days</h2>
            <p className="text-sm text-slate-500">
              Meetings on closed dates will automatically shift to the next available work day.
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-xl overflow-hidden border border-slate-200">
            <button
              onClick={() => { setMode("day"); setPendingDate(null); }}
              className={cn(
                "flex-1 py-2 text-sm font-semibold transition-colors",
                mode === "day" ? "bg-navy text-white" : "bg-white text-slate-500 hover:bg-slate-50"
              )}
            >
              Single Day
            </button>
            <button
              onClick={() => { setMode("week"); setPendingDate(null); }}
              className={cn(
                "flex-1 py-2 text-sm font-semibold transition-colors",
                mode === "week" ? "bg-navy text-white" : "bg-white text-slate-500 hover:bg-slate-50"
              )}
            >
              Full Week
            </button>
          </div>

          {/* Calendar navigation */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevMonth} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500">‹</button>
              <span className="text-sm font-semibold text-navy">{MONTH_NAMES[calMonth]} {calYear}</span>
              <button onClick={nextMonth} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500">›</button>
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
            <div className="bg-teal-50 rounded-xl p-3 border border-teal-100">
              <p className="text-sm font-medium text-teal-800">
                {mode === "day"
                  ? `Selected: ${formatDate(pendingDate)}`
                  : `Week of: ${formatWeek(getWeekBounds(pendingDate).start, getWeekBounds(pendingDate).end)}`}
              </p>
            </div>
          )}

          {/* Label input */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-slate-500">Label (optional)</Label>
            <Input
              placeholder='e.g. "Christmas Week", "Staff Vacation"'
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="text-sm"
            />
          </div>

          <Button
            onClick={handleAdd}
            disabled={!pendingDate || addPeriod.isPending}
            className="bg-navy hover:bg-navy/90 text-white"
          >
            {addPeriod.isPending ? "Saving…" : `Mark as Closed`}
          </Button>
        </div>

        {/* Right: List of closed periods */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4">
          <div>
            <h2 className="text-base font-bold text-navy mb-1">Closed Periods</h2>
            <p className="text-sm text-slate-500">
              Removing a period will restore meetings to their original scheduled dates.
            </p>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
              Loading…
            </div>
          )}

          {!isLoading && periods.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <span className="text-3xl">📅</span>
              <p className="text-sm text-slate-400">No closed periods yet.</p>
              <p className="text-xs text-slate-300">Select a day or week on the calendar to get started.</p>
            </div>
          )}

          {!isLoading && periods.length > 0 && (
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[480px] pr-1">
              {[...periods]
                .sort((a, b) => a.startDate.localeCompare(b.startDate))
                .map(period => (
                  <div
                    key={period.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50 transition-colors"
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            period.periodType === "week"
                              ? "border-orange-200 text-orange-600 bg-orange-50"
                              : "border-red-200 text-red-600 bg-red-50"
                          )}
                        >
                          {period.periodType === "week" ? "Week" : "Day"}
                        </Badge>
                        <span className="text-sm font-medium text-navy">
                          {period.periodType === "week"
                            ? formatWeek(period.startDate, period.endDate)
                            : formatDate(period.startDate)}
                        </span>
                      </div>
                      {period.label && (
                        <span className="text-xs text-slate-400 ml-0.5">{period.label}</span>
                      )}
                    </div>
                    <button
                      onClick={() => removePeriod.mutate({ id: period.id, accountId })}
                      disabled={removePeriod.isPending}
                      className="w-7 h-7 rounded-lg hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-slate-300 transition-colors text-lg leading-none"
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
    </div>
  );
}
