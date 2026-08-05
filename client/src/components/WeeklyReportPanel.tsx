import { useState, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ─── ISO Week Utilities ──────────────────────────────────────────────────────

/** Returns ISO week key "YYYY-Www" for a given Date. */
function toWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7; // Mon=1 … Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - day); // Thursday of ISO week
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/** Subtract one ISO week from a weekKey. */
function prevWeekKey(wk: string): string {
  const [yearStr, wStr] = wk.split("-W");
  const year = parseInt(yearStr);
  const week = parseInt(wStr);
  if (week === 1) {
    // Last week of previous year — find it
    const dec28 = new Date(Date.UTC(year - 1, 11, 28));
    return toWeekKey(dec28);
  }
  // Build a date in the desired week: Jan 4 + (week-2)*7 days
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const target = new Date(jan4.getTime() + (week - 2) * 7 * 86400000);
  return toWeekKey(target);
}

/** Format weekKey to human-readable range, e.g. "Jun 23 – Jun 27" */
function weekKeyToRange(wk: string): string {
  const [yearStr, wStr] = wk.split("-W");
  const year = parseInt(yearStr);
  const week = parseInt(wStr);
  // ISO week 1 contains Jan 4
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4.getTime() + (1 - day + (week - 1) * 7) * 86400000);
  const friday = new Date(monday.getTime() + 4 * 86400000);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${fmt(monday)} – ${fmt(friday)}`;
}

// ─── Delta Badge ─────────────────────────────────────────────────────────────

function DeltaBadge({ current, previous }: { current?: number; previous?: number }) {
  if (current === undefined || previous === undefined) return null;
  const diff = current - previous;
  if (diff === 0) return <span className="text-xs text-slate-400">—</span>;
  const isUp = diff > 0;
  return (
    <span
      className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
      style={{
        background: isUp ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
        color: isUp ? "#059669" : "#DC2626",
      }}
    >
      {isUp ? "▲" : "▼"} {Math.abs(diff).toLocaleString()}
    </span>
  );
}

// ─── Entry Form for one employee ─────────────────────────────────────────────

interface EntryFormProps {
  employee: { id: number; name: string; role: string };
  metrics: Array<{ id: number; label: string; unit: string | null }>;
  weekKey: string;
  prevWeek: string;
  thisWeekValues: Record<number, number>;
  lastWeekValues: Record<number, number>;
  submitted: boolean;
  accountId: number;
  onSubmitted: () => void;
}

function EmployeeCard({
  employee,
  metrics,
  weekKey,
  prevWeek,
  thisWeekValues,
  lastWeekValues,
  submitted,
  accountId,
  onSubmitted,
}: EntryFormProps) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    for (const m of metrics) {
      init[m.id] = thisWeekValues[m.id] !== undefined ? String(thisWeekValues[m.id]) : "";
    }
    return init;
  });

  const submitReport = trpc.weeklyReport.submitReport.useMutation({
    onSuccess: () => {
      toast.success(`${employee.name}'s report submitted.`);
      setEditing(false);
      onSubmitted();
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit() {
    const entries = metrics
      .map((m) => ({ metricId: m.id, value: parseFloat(values[m.id] ?? "0") || 0 }));
    submitReport.mutate({
      employeeId: employee.id,
      weekKey,
      submittedByOwnerId: accountId,
      entries,
    });
  }

  // When not editing, show summary card
  if (!editing) {
    return (
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "#FFFFFF",
          border: submitted ? "1px solid rgba(37,220,249,0.25)" : "1px solid #E5E3DE",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        {/* Card header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            borderBottom: "1px solid #F1F0ED",
            background: submitted ? "rgba(37,220,249,0.04)" : "rgba(248,247,244,0.8)",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">{employee.name}</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: "rgba(30,58,95,0.08)", color: "#1E3A5F" }}
            >
              {employee.role}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {submitted ? (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(37,220,249,0.12)", color: "#25DCF9" }}
              >
                ✓ Submitted
              </span>
            ) : (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(245,158,11,0.12)", color: "#D97706" }}
              >
                ⏳ Pending
              </span>
            )}
            <button
              onClick={() => setEditing(true)}
              className="text-xs px-3 py-1 rounded-lg font-medium transition-colors"
              style={{ border: "1px solid #E5E3DE", color: "#64748B" }}
            >
              {submitted ? "Edit" : "Enter Numbers"}
            </button>
          </div>
        </div>

        {/* Metrics grid */}
        {submitted && metrics.length > 0 && (
          <div className="px-4 py-3 grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
            {metrics.map((m) => {
              const val = thisWeekValues[m.id];
              const prev = lastWeekValues[m.id];
              return (
                <div key={m.id} className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide font-medium truncate">
                    {m.label}
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold text-slate-800">
                      {val !== undefined ? val.toLocaleString() : "—"}
                    </span>
                    <span className="text-xs text-slate-400">{m.unit}</span>
                    <DeltaBadge current={val} previous={prev} />
                  </div>
                  {prev !== undefined && (
                    <span className="text-[10px] text-slate-300">
                      Last week: {prev.toLocaleString()}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!submitted && (
          <div className="px-4 py-3 text-sm text-slate-400 italic">
            No numbers submitted yet for this week.
          </div>
        )}
      </div>
    );
  }

  // Editing mode — number entry form
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "#FFFFFF", border: "1px solid #25DCF9", boxShadow: "0 2px 8px rgba(37,220,249,0.1)" }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid #E5E3DE", background: "rgba(37,220,249,0.04)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">{employee.name}</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: "rgba(30,58,95,0.08)", color: "#1E3A5F" }}
          >
            {employee.role}
          </span>
        </div>
        <span className="text-xs text-teal-600 font-medium">Entering numbers…</span>
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">
        {metrics.map((m) => (
          <div key={m.id} className="flex items-center gap-3">
            <label className="flex-1 text-sm text-slate-600 font-medium">{m.label}</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                step="any"
                className="w-24 px-3 py-1.5 rounded-lg text-sm text-right border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400 font-mono"
                value={values[m.id] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [m.id]: e.target.value }))}
                placeholder="0"
              />
              <span className="text-xs text-slate-400 w-8">{m.unit}</span>
            </div>
            {lastWeekValues[m.id] !== undefined && (
              <span className="text-xs text-slate-300 w-24 text-right">
                Last: {lastWeekValues[m.id].toLocaleString()}
              </span>
            )}
          </div>
        ))}

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={handleSubmit}
            disabled={submitReport.isPending}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all active:scale-95"
            style={{ background: "#1E3A5F" }}
          >
            {submitReport.isPending ? "Saving…" : "Submit Report"}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-4 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

interface WeeklyReportPanelProps {
  /** The date of the Team Weekly meeting being viewed (YYYY-MM-DD) */
  dateKey: string;
}

export default function WeeklyReportPanel({ dateKey }: WeeklyReportPanelProps) {
  const accountId = useMemo(() => {
    const raw = localStorage.getItem("bcc_account_id");
    return raw ? parseInt(raw, 10) : null;
  }, []);

  // Derive weekKey from the meeting date
  const weekKey = useMemo(() => toWeekKey(new Date(dateKey + "T12:00:00")), [dateKey]);
  const prevWeek = useMemo(() => prevWeekKey(weekKey), [weekKey]);

  const { data: summary, refetch, isLoading } = trpc.weeklyReport.getSummary.useQuery(
    { accountId: accountId ?? 0, weekKey, prevWeekKey: prevWeek },
    { enabled: !!accountId }
  );

  const { data: employees } = trpc.weeklyReport.getEmployees.useQuery(
    { accountId: accountId ?? 0 },
    { enabled: !!accountId }
  );

  if (!accountId) return null;

  const hasEmployees = employees && employees.length > 0;
  const submittedCount = summary?.filter((s) => s.submitted).length ?? 0;
  const totalCount = summary?.length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h3
            className="text-sm font-bold uppercase tracking-wider"
            style={{ color: "#25DCF9", fontFamily: "'Space Grotesk', sans-serif" }}
          >
            📊 Weekly Reports
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {weekKeyToRange(weekKey)} · Week {weekKey.split("-W")[1]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {totalCount > 0 && (
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{
                background: submittedCount === totalCount ? "rgba(37,220,249,0.12)" : "rgba(245,158,11,0.12)",
                color: submittedCount === totalCount ? "#25DCF9" : "#D97706",
              }}
            >
              {submittedCount}/{totalCount} submitted
            </span>
          )}
          <Link
            href="/app/employees"
            className="text-xs px-3 py-1 rounded-lg font-medium transition-colors"
            style={{ border: "1px solid #E5E3DE", color: "#64748B" }}
          >
            Manage Staff
          </Link>
        </div>
      </div>

      {/* No employees set up yet */}
      {!hasEmployees && (
        <div
          className="rounded-xl p-5 text-center"
          style={{ background: "rgba(37,220,249,0.04)", border: "1px dashed rgba(37,220,249,0.25)" }}
        >
          <p className="text-sm text-slate-500 mb-3">
            No employees set up yet. Add your staff and their weekly metrics to start tracking numbers here.
          </p>
          <Link
            href="/app/employees"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all active:scale-95"
            style={{ background: "#25DCF9" }}
          >
            + Set Up Employees
          </Link>
        </div>
      )}

      {/* Loading */}
      {isLoading && hasEmployees && (
        <div className="text-sm text-slate-400 py-4 text-center">Loading reports…</div>
      )}

      {/* Employee cards */}
      {!isLoading && summary && summary.map((row) => (
        <EmployeeCard
          key={row.employee.id}
          employee={row.employee}
          metrics={row.metrics}
          weekKey={weekKey}
          prevWeek={prevWeek}
          thisWeekValues={row.thisWeek}
          lastWeekValues={row.lastWeek}
          submitted={row.submitted}
          accountId={accountId}
          onSubmitted={refetch}
        />
      ))}
    </div>
  );
}
