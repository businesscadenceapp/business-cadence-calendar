/**
 * Weekly Reports — dark navy theme (#0F2440 bg, #5EEAD4 teal accent)
 */
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { usePerson } from "@/contexts/PersonContext";

// ── helpers ──────────────────────────────────────────────────────────────────

function getWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function getPrevWeekKey(weekKey: string): string {
  const { start } = getWeekRange(weekKey);
  const prev = new Date(start);
  prev.setUTCDate(start.getUTCDate() - 7);
  return getWeekKey(prev);
}

function getWeekRange(weekKey: string): { start: Date; end: Date } {
  const [year, week] = weekKey.split("-W").map(Number);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7));
  const start = new Date(startOfWeek1);
  start.setUTCDate(startOfWeek1.getUTCDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 4);
  return { start, end };
}

function formatWeekRange(weekKey: string): string {
  const { start, end } = getWeekRange(weekKey);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

function deltaColor(delta: number | null): string {
  if (delta === null) return "";
  if (delta > 0) return "#6EE7B7";
  if (delta < 0) return "#FDA4AF";
  return "rgba(255,255,255,0.3)";
}

function deltaLabel(delta: number | null): string {
  if (delta === null || delta === 0) return "—";
  return delta > 0 ? `▲ ${delta}` : `▼ ${Math.abs(delta)}`;
}

// ── types ─────────────────────────────────────────────────────────────────────

interface Metric {
  id: number;
  label: string;
  unit: string | null;
  sortOrder: number;
  employeeId: number;
  createdAt: Date;
}

interface EmployeeRow {
  id: number;
  name: string;
  role: string;
  accountId: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  metrics: Metric[];
}

interface SummaryRow {
  employee: EmployeeRow;
  metrics: Metric[];
  thisWeek: Record<number, number>;
  lastWeek: Record<number, number>;
  submitted: boolean;
}

// ── EntryForm ─────────────────────────────────────────────────────────────────

function EntryForm({ row, weekKey, onSaved }: { row: SummaryRow; weekKey: string; onSaved: () => void }) {
  const accountId = parseInt(localStorage.getItem("bcc_account_id") ?? "0", 10);
  const [values, setValues] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    row.metrics.forEach((m) => {
      const existing = row.thisWeek[m.id];
      init[m.id] = existing !== undefined ? String(existing) : "";
    });
    return init;
  });

  const submitMutation = trpc.weeklyReport.submitReport.useMutation({
    onSuccess: () => { toast.success(`${row.employee.name}'s numbers saved`); onSaved(); },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    const entries = row.metrics
      .filter((m) => values[m.id] !== "" && !isNaN(Number(values[m.id])))
      .map((m) => ({ metricId: m.id, value: parseFloat(values[m.id]) }));
    if (entries.length === 0) { toast.error("Enter at least one number before submitting."); return; }
    submitMutation.mutate({ employeeId: row.employee.id, weekKey, entries, submittedByOwnerId: accountId });
  };

  return (
    <div className="space-y-3">
      {row.metrics.map((m) => (
        <div key={m.id} className="flex items-center gap-3">
          <span className="flex-1 text-sm" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "'Inter', sans-serif" }}>
            {m.label}
          </span>
          <div className="flex items-center gap-1.5">
            <input
              type="number" min={0} step="any"
              value={values[m.id] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [m.id]: e.target.value }))}
              placeholder="0"
              className="w-24 px-3 py-1.5 rounded-lg text-sm text-right font-mono focus:outline-none transition-colors placeholder-white/30"
              style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", color: "white" }}
              onFocus={e => (e.target.style.borderColor = "#5EEAD4")}
              onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
            />
            {m.unit && (
              <span className="text-xs w-8" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'JetBrains Mono', monospace" }}>
                {m.unit}
              </span>
            )}
          </div>
        </div>
      ))}
      <button
        onClick={handleSubmit}
        disabled={submitMutation.isPending}
        className="w-full mt-2 py-2 rounded-lg text-sm font-semibold transition-all active:scale-[0.98]"
        style={{
          background: submitMutation.isPending ? "rgba(13,148,136,0.4)" : "#0D9488",
          color: "#fff",
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        {submitMutation.isPending ? "Saving…" : "Submit Numbers"}
      </button>
    </div>
  );
}

// ── EmployeeCard ──────────────────────────────────────────────────────────────

function EmployeeCard({ row, weekKey, onRefresh }: { row: SummaryRow; weekKey: string; onRefresh: () => void }) {
  const [entering, setEntering] = useState(false);
  const { employee, metrics, thisWeek, lastWeek, submitted } = row;

  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4 transition-all"
      style={{
        background: submitted ? "rgba(5,150,105,0.06)" : "rgba(255,255,255,0.04)",
        border: submitted ? "1px solid rgba(13,148,136,0.35)" : "1px solid rgba(255,255,255,0.1)",
      }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-base font-bold text-white leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {employee.name}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif" }}>
            {employee.role}
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{
            background: submitted ? "rgba(13,148,136,0.15)" : "rgba(255,255,255,0.06)",
            color: submitted ? "#5EEAD4" : "rgba(255,255,255,0.4)",
            fontFamily: "'Space Grotesk', sans-serif",
          }}>
          {submitted ? "✓ Submitted" : "⏳ Pending"}
        </span>
      </div>

      {submitted && !entering && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider mb-1"
            style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Space Grotesk', sans-serif" }}>
            <span>Metric</span>
            <div className="flex items-center gap-6">
              <span>This Week</span>
              <span className="w-14 text-right">vs Last</span>
            </div>
          </div>
          {metrics.map((m) => {
            const val = thisWeek[m.id] ?? null;
            const last = lastWeek[m.id] ?? null;
            const delta = val !== null && last !== null ? val - last : null;
            return (
              <div key={m.id} className="flex items-center justify-between gap-2">
                <span className="text-xs flex-1 truncate" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}>
                  {m.label}
                </span>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-sm font-bold text-white tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {val !== null ? val.toLocaleString() : "—"}
                    {m.unit ? <span className="text-xs ml-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{m.unit}</span> : null}
                  </span>
                  <span className="text-xs font-semibold w-14 text-right tabular-nums"
                    style={{ color: deltaColor(delta), fontFamily: "'JetBrains Mono', monospace" }}>
                    {deltaLabel(delta)}
                  </span>
                </div>
              </div>
            );
          })}
          <button onClick={() => setEntering(true)}
            className="text-xs transition-colors mt-1"
            style={{ color: "rgba(94,234,212,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#5EEAD4")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(94,234,212,0.5)")}>
            Edit numbers
          </button>
        </div>
      )}

      {!submitted && !entering && (
        <div className="flex flex-col items-center gap-3 py-2">
          <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif" }}>
            No numbers submitted yet for this week.
          </p>
          <button onClick={() => setEntering(true)}
            className="px-5 py-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]"
            style={{
              background: "rgba(13,148,136,0.1)",
              border: "1px solid rgba(13,148,136,0.3)",
              color: "#5EEAD4",
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
            Enter Numbers
          </button>
        </div>
      )}

      {entering && (
        <div>
          <EntryForm row={row} weekKey={weekKey} onSaved={() => { setEntering(false); onRefresh(); }} />
          <button onClick={() => setEntering(false)}
            className="text-xs transition-colors mt-2"
            style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Space Grotesk', sans-serif" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ── Check-ins Summary ─────────────────────────────────────────────────────────

function CheckinsSummary({ accountId, weekKey }: { accountId: number; weekKey: string }) {
  const answersQuery = trpc.report.getWeekAnswers.useQuery({ accountId, weekKey }, { enabled: accountId !== undefined });
  const personsQuery = trpc.person.list.useQuery({ accountId }, { enabled: accountId !== undefined });

  const answers = answersQuery.data ?? [];
  const persons = personsQuery.data ?? [];

  const personMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of persons) m[p.id] = p.name;
    return m;
  }, [persons]);

  const byPerson = useMemo(() => {
    const m: Record<string, typeof answers> = {};
    for (const a of answers) {
      if (!m[a.personId]) m[a.personId] = [];
      m[a.personId].push(a);
    }
    return m;
  }, [answers]);

  const personIds = Object.keys(byPerson);

  if (answersQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 rounded-full border-2 border-purple-400/30 border-t-purple-400 animate-spin" />
      </div>
    );
  }

  if (personIds.length === 0) {
    return (
      <div className="rounded-2xl p-10 text-center"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.12)" }}>
        <p className="text-2xl mb-3">📝</p>
        <p className="text-base font-semibold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          No check-ins submitted yet
        </p>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif" }}>
          Employees haven't submitted their weekly check-in answers for this week.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {personIds.map(pid => {
        const personAnswers = byPerson[pid];
        const name = personMap[pid] ?? pid;
        return (
          <div key={pid} className="rounded-2xl p-5 flex flex-col gap-4"
            style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ backgroundColor: "#7C3AED" }}>
                {name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-[14px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{name}</p>
                <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>{personAnswers.length} answer{personAnswers.length !== 1 ? "s" : ""}</p>
              </div>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: "rgba(5,150,105,0.2)", color: "#6EE7B7" }}>
                ✓ Submitted
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {personAnswers.map(a => (
                <div key={a.id} className="rounded-xl p-4" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-2"
                    style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>
                    {a.questionText}
                  </p>
                  <p className="text-[13px] text-white leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {a.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WeeklyReports() {
  const { person } = usePerson();
  const accountId = person?.accountId ?? (() => {
    const stored = localStorage.getItem("bcc_account_id");
    return stored ? parseInt(stored, 10) : undefined;
  })();
  const today = useMemo(() => new Date(), []);
  const currentWeekKey = useMemo(() => getWeekKey(today), [today]);
  const [selectedWeek, setSelectedWeek] = useState(currentWeekKey);
  const prevWeekKey = useMemo(() => getPrevWeekKey(selectedWeek), [selectedWeek]);
  const [activeTab, setActiveTab] = useState<"metrics" | "checkins">("metrics");

  const summaryQuery = trpc.weeklyReport.getSummary.useQuery(
    { accountId: accountId ?? 0, weekKey: selectedWeek, prevWeekKey },
    { enabled: accountId !== undefined }
  );

  const rows: SummaryRow[] = (summaryQuery.data as SummaryRow[] | undefined) ?? [];
  const submittedCount = rows.filter((r) => r.submitted).length;
  const totalCount = rows.length;

  function shiftWeek(delta: number) {
    const { start } = getWeekRange(selectedWeek);
    const next = new Date(start);
    next.setUTCDate(start.getUTCDate() + delta * 7);
    setSelectedWeek(getWeekKey(next));
  }

  const weekNum = selectedWeek.split("-W")[1];
  const isCurrentWeek = selectedWeek === currentWeekKey;

  if (person === undefined) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "#0F2440" }}>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: "#0F2440" }}>
      {/* Page title bar */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-3 border-b flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-3">
          <span className="text-base">📊</span>
          <h1 className="text-sm font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Weekly Reports</h1>
          <div className="flex gap-1 ml-2">
            <button onClick={() => setActiveTab("metrics")}
              className="text-xs px-3 py-1 rounded-lg font-semibold transition-all"
              style={{
                backgroundColor: activeTab === "metrics" ? "#1E3A5F" : "transparent",
                color: activeTab === "metrics" ? "white" : "rgba(255,255,255,0.5)",
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
              Metrics
            </button>
            <button onClick={() => setActiveTab("checkins")}
              className="text-xs px-3 py-1 rounded-lg font-semibold transition-all"
              style={{
                backgroundColor: activeTab === "checkins" ? "#7C3AED" : "transparent",
                color: activeTab === "checkins" ? "white" : "rgba(255,255,255,0.5)",
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
              ✅ Check-ins
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === "metrics" && totalCount > 0 && (
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'JetBrains Mono', monospace" }}>
              {submittedCount}/{totalCount} submitted
            </span>
          )}
          <Link href="/app/employees"
            className="text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", fontFamily: "'Space Grotesk', sans-serif" }}>
            👥 Manage Staff
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-8 w-full">
        {/* Check-ins tab */}
        {activeTab === "checkins" && (
          <>
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => shiftWeek(-1)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 text-lg"
                style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", backgroundColor: "rgba(255,255,255,0.04)" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)")}>
                ‹
              </button>
              <div className="flex-1 text-center">
                <p className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {formatWeekRange(selectedWeek)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'JetBrains Mono', monospace" }}>
                  Week {weekNum}{isCurrentWeek ? " · Current Week" : ""}
                </p>
              </div>
              <button onClick={() => shiftWeek(1)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 text-lg"
                style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", backgroundColor: "rgba(255,255,255,0.04)" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)")}>
                ›
              </button>
            </div>
            {!isCurrentWeek && (
              <div className="flex justify-center mb-4">
                <button onClick={() => setSelectedWeek(currentWeekKey)}
                  className="text-xs px-3 py-1 rounded-lg font-semibold transition-all"
                  style={{ background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.25)", color: "#5EEAD4", fontFamily: "'Space Grotesk', sans-serif" }}>
                  Today
                </button>
              </div>
            )}
            <CheckinsSummary accountId={accountId ?? 0} weekKey={selectedWeek} />
          </>
        )}

        {/* Metrics tab */}
        {activeTab === "metrics" && (
          <>
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => shiftWeek(-1)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 text-lg"
                style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", backgroundColor: "rgba(255,255,255,0.04)" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)")}>
                ‹
              </button>
              <div className="flex-1 text-center">
                <p className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {formatWeekRange(selectedWeek)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'JetBrains Mono', monospace" }}>
                  Week {weekNum}{isCurrentWeek ? " · Current Week" : ""}
                </p>
              </div>
              <button onClick={() => shiftWeek(1)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 text-lg"
                style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", backgroundColor: "rgba(255,255,255,0.04)" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)")}>
                ›
              </button>
            </div>
            {!isCurrentWeek && (
              <div className="flex justify-center mb-4">
                <button onClick={() => setSelectedWeek(currentWeekKey)}
                  className="text-xs px-3 py-1 rounded-lg font-semibold transition-all"
                  style={{ background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.25)", color: "#5EEAD4", fontFamily: "'Space Grotesk', sans-serif" }}>
                  Today
                </button>
              </div>
            )}

            {summaryQuery.isLoading && (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 rounded-full border-2 border-teal-400/30 border-t-teal-400 animate-spin" />
              </div>
            )}

            {!summaryQuery.isLoading && rows.length === 0 && (
              <div className="rounded-2xl p-10 text-center"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.12)" }}>
                <p className="text-2xl mb-3">👥</p>
                <p className="text-base font-semibold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  No staff set up yet
                </p>
                <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif" }}>
                  Add your team members and their metrics to start tracking weekly numbers.
                </p>
                <Link href="/app/employees"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]"
                  style={{ background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.3)", color: "#5EEAD4", fontFamily: "'Space Grotesk', sans-serif" }}>
                  Set Up Staff →
                </Link>
              </div>
            )}

            {!summaryQuery.isLoading && rows.length > 0 && (
              <>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>
                      Submission Progress
                    </span>
                    <span className="text-xs font-semibold"
                      style={{ color: submittedCount === totalCount ? "#5EEAD4" : "rgba(255,255,255,0.5)", fontFamily: "'JetBrains Mono', monospace" }}>
                      {submittedCount} of {totalCount}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: totalCount > 0 ? `${(submittedCount / totalCount) * 100}%` : "0%",
                        background: "linear-gradient(90deg, #0D9488, #5EEAD4)",
                      }} />
                  </div>
                </div>

                <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
                  {rows.map((row) => (
                    <EmployeeCard key={row.employee.id} row={row} weekKey={selectedWeek} onRefresh={() => summaryQuery.refetch()} />
                  ))}
                </div>

                {submittedCount === totalCount && totalCount > 0 && (
                  <div className="mt-8 rounded-2xl p-5 text-center"
                    style={{ background: "rgba(13,148,136,0.07)", border: "1px solid rgba(13,148,136,0.22)" }}>
                    <p className="text-sm font-semibold" style={{ color: "#5EEAD4", fontFamily: "'Space Grotesk', sans-serif" }}>
                      ✓ All reports submitted for this week
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
