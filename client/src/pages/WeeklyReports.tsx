/**
 * Reports — in-app summary hub with 4 tabs:
 *   Weekly  → KPI numbers this week vs last, check-in answers
 *   Monthly → 3-month KPI trend table, current quarter goal progress
 *   Quarterly → all goals for current quarter with status, KPI sparklines
 *   Goals   → all active goals grouped by period
 *
 * Dark navy theme (#0F2440 bg, #5EEAD4 teal accent)
 */
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { usePerson } from "@/contexts/PersonContext";
import { useActiveBusiness } from "@/components/BusinessSwitcher";

// ── Week helpers ──────────────────────────────────────────────────────────────

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

function getCurrentQuarter(): number {
  return Math.floor(new Date().getMonth() / 3) + 1;
}

function formatYearMonth(ym: string): string {
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// ── Shared style helpers ──────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  active:   { label: "Active",    color: "#93C5FD", bg: "rgba(147,197,253,0.12)" },
  achieved: { label: "Achieved",  color: "#6EE7B7", bg: "rgba(110,231,183,0.12)" },
  missed:   { label: "Missed",    color: "#FDA4AF", bg: "rgba(253,164,175,0.12)" },
  deferred: { label: "Deferred",  color: "#FCD34D", bg: "rgba(252,211,77,0.12)"  },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.active;
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: meta.bg, color: meta.color, fontFamily: "'Space Grotesk', sans-serif" }}>
      {meta.label}
    </span>
  );
}

function deltaColor(delta: number | null): string {
  if (delta === null) return "rgba(255,255,255,0.3)";
  if (delta > 0) return "#6EE7B7";
  if (delta < 0) return "#FDA4AF";
  return "rgba(255,255,255,0.3)";
}
function deltaLabel(delta: number | null): string {
  if (delta === null || delta === 0) return "—";
  return delta > 0 ? `▲ ${delta}` : `▼ ${Math.abs(delta)}`;
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h2>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif" }}>{subtitle}</p>}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ icon, title, body, cta }: { icon: string; title: string; body: string; cta?: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-10 text-center"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.12)" }}>
      <p className="text-2xl mb-3">{icon}</p>
      <p className="text-base font-semibold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</p>
      <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif" }}>{body}</p>
      {cta}
    </div>
  );
}

// ── Week navigator ────────────────────────────────────────────────────────────

function WeekNav({ selectedWeek, currentWeekKey, onShift }: {
  selectedWeek: string;
  currentWeekKey: string;
  onShift: (delta: number) => void;
}) {
  const weekNum = selectedWeek.split("-W")[1];
  const isCurrentWeek = selectedWeek === currentWeekKey;
  return (
    <div className="flex items-center gap-4 mb-6">
      <button onClick={() => onShift(-1)}
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 text-lg"
        style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", backgroundColor: "rgba(255,255,255,0.04)" }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)")}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)")}>‹</button>
      <div className="flex-1 text-center">
        <p className="text-base font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {formatWeekRange(selectedWeek)}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'JetBrains Mono', monospace" }}>
          Week {weekNum}{isCurrentWeek ? " · Current Week" : ""}
        </p>
      </div>
      <button onClick={() => onShift(1)}
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 text-lg"
        style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", backgroundColor: "rgba(255,255,255,0.04)" }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)")}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)")}>›</button>
    </div>
  );
}

// ── WEEKLY TAB ────────────────────────────────────────────────────────────────

interface Metric { id: number; label: string; unit: string | null; sortOrder: number; employeeId: number; createdAt: Date; }
interface EmployeeRow { id: number; name: string; role: string; accountId: number; isActive: boolean; sortOrder: number; createdAt: Date; updatedAt: Date; metrics: Metric[]; }
interface SummaryRow { employee: EmployeeRow; metrics: Metric[]; thisWeek: Record<number, number>; lastWeek: Record<number, number>; submitted: boolean; }

function EntryForm({ row, weekKey, onSaved }: { row: SummaryRow; weekKey: string; onSaved: () => void }) {
  const accountId = parseInt(localStorage.getItem("bcc_account_id") ?? "0", 10);
  const [values, setValues] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    row.metrics.forEach((m) => { init[m.id] = row.thisWeek[m.id] !== undefined ? String(row.thisWeek[m.id]) : ""; });
    return init;
  });
  const submitMutation = trpc.weeklyReport.submitReport.useMutation({
    onSuccess: () => { toast.success(`${row.employee.name}'s numbers saved`); onSaved(); },
    onError: (err) => toast.error(err.message),
  });
  const handleSubmit = () => {
    const entries = row.metrics.filter((m) => values[m.id] !== "" && !isNaN(Number(values[m.id]))).map((m) => ({ metricId: m.id, value: parseFloat(values[m.id]) }));
    if (entries.length === 0) { toast.error("Enter at least one number before submitting."); return; }
    submitMutation.mutate({ employeeId: row.employee.id, weekKey, entries, submittedByOwnerId: accountId });
  };
  return (
    <div className="space-y-3">
      {row.metrics.map((m) => (
        <div key={m.id} className="flex items-center gap-3">
          <span className="flex-1 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{m.label}</span>
          <div className="flex items-center gap-1.5">
            <input type="number" min={0} step="any" value={values[m.id] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [m.id]: e.target.value }))} placeholder="0"
              className="w-24 px-3 py-1.5 rounded-lg text-sm text-right font-mono focus:outline-none transition-colors placeholder-white/30"
              style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", color: "white" }}
              onFocus={e => (e.target.style.borderColor = "#5EEAD4")} onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
            {m.unit && <span className="text-xs w-8" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'JetBrains Mono', monospace" }}>{m.unit}</span>}
          </div>
        </div>
      ))}
      <button onClick={handleSubmit} disabled={submitMutation.isPending}
        className="w-full mt-2 py-2 rounded-lg text-sm font-semibold transition-all active:scale-[0.98]"
        style={{ background: submitMutation.isPending ? "rgba(13,148,136,0.4)" : "#0D9488", color: "#fff" }}>
        {submitMutation.isPending ? "Saving…" : "Submit Numbers"}
      </button>
    </div>
  );
}

function EmployeeCard({ row, weekKey, onRefresh }: { row: SummaryRow; weekKey: string; onRefresh: () => void }) {
  const [entering, setEntering] = useState(false);
  const { employee, metrics, thisWeek, lastWeek, submitted } = row;
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4 transition-all"
      style={{ background: submitted ? "rgba(5,150,105,0.06)" : "rgba(255,255,255,0.04)", border: submitted ? "1px solid rgba(13,148,136,0.35)" : "1px solid rgba(255,255,255,0.1)" }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-base font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{employee.name}</p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{employee.role}</p>
        </div>
        <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ background: submitted ? "rgba(13,148,136,0.15)" : "rgba(255,255,255,0.06)", color: submitted ? "#5EEAD4" : "rgba(255,255,255,0.4)" }}>
          {submitted ? "✓ Submitted" : "⏳ Pending"}
        </span>
      </div>
      {submitted && !entering && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>
            <span>Metric</span>
            <div className="flex items-center gap-6"><span>This Week</span><span className="w-14 text-right">vs Last</span></div>
          </div>
          {metrics.map((m) => {
            const val = thisWeek[m.id] ?? null;
            const last = lastWeek[m.id] ?? null;
            const delta = val !== null && last !== null ? val - last : null;
            return (
              <div key={m.id} className="flex items-center justify-between gap-2">
                <span className="text-xs flex-1 truncate" style={{ color: "rgba(255,255,255,0.5)" }}>{m.label}</span>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-sm font-bold text-white tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {val !== null ? val.toLocaleString() : "—"}{m.unit ? <span className="text-xs ml-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{m.unit}</span> : null}
                  </span>
                  <span className="text-xs font-semibold w-14 text-right tabular-nums" style={{ color: deltaColor(delta), fontFamily: "'JetBrains Mono', monospace" }}>{deltaLabel(delta)}</span>
                </div>
              </div>
            );
          })}
          <button onClick={() => setEntering(true)} className="text-xs transition-colors mt-1" style={{ color: "rgba(94,234,212,0.5)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#5EEAD4")} onMouseLeave={e => (e.currentTarget.style.color = "rgba(94,234,212,0.5)")}>Edit numbers</button>
        </div>
      )}
      {!submitted && !entering && (
        <div className="flex flex-col items-center gap-3 py-2">
          <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.4)" }}>No numbers submitted yet for this week.</p>
          <button onClick={() => setEntering(true)} className="px-5 py-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]"
            style={{ background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.3)", color: "#5EEAD4" }}>Enter Numbers</button>
        </div>
      )}
      {entering && (
        <div>
          <EntryForm row={row} weekKey={weekKey} onSaved={() => { setEntering(false); onRefresh(); }} />
          <button onClick={() => setEntering(false)} className="text-xs transition-colors mt-2" style={{ color: "rgba(255,255,255,0.3)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")} onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}>Cancel</button>
        </div>
      )}
    </div>
  );
}

function CheckinsSummary({ accountId, weekKey }: { accountId: number; weekKey: string }) {
  const answersQuery = trpc.report.getWeekAnswers.useQuery({ accountId, weekKey }, { enabled: accountId !== undefined });
  const personsQuery = trpc.person.list.useQuery({ accountId }, { enabled: accountId !== undefined });
  const answers = answersQuery.data ?? [];
  const persons = personsQuery.data ?? [];
  const personMap = useMemo(() => { const m: Record<string, string> = {}; for (const p of persons) m[p.id] = p.name; return m; }, [persons]);
  const byPerson = useMemo(() => { const m: Record<string, typeof answers> = {}; for (const a of answers) { if (!m[a.personId]) m[a.personId] = []; m[a.personId].push(a); } return m; }, [answers]);
  const personIds = Object.keys(byPerson);
  if (answersQuery.isLoading) return <div className="flex items-center justify-center py-16"><div className="w-8 h-8 rounded-full border-2 border-purple-400/30 border-t-purple-400 animate-spin" /></div>;
  if (personIds.length === 0) return <EmptyState icon="📝" title="No check-ins submitted yet" body="Employees haven't submitted their weekly check-in answers for this week." />;
  return (
    <div className="flex flex-col gap-6">
      {personIds.map(pid => {
        const personAnswers = byPerson[pid];
        const name = personMap[pid] ?? pid;
        return (
          <div key={pid} className="rounded-2xl p-5 flex flex-col gap-4" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ backgroundColor: "#7C3AED" }}>{name.charAt(0).toUpperCase()}</div>
              <div>
                <p className="text-[14px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{name}</p>
                <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>{personAnswers.length} answer{personAnswers.length !== 1 ? "s" : ""}</p>
              </div>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: "rgba(5,150,105,0.2)", color: "#6EE7B7" }}>✓ Submitted</span>
            </div>
            <div className="flex flex-col gap-3">
              {personAnswers.map(a => (
                <div key={a.id} className="rounded-xl p-4" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>{a.questionText}</p>
                  <p className="text-[13px] text-white leading-relaxed">{a.answer}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeeklyTab({ accountId, forcedBusiness }: { accountId: number; forcedBusiness?: string | null }) {
  const today = useMemo(() => new Date(), []);
  const currentWeekKey = useMemo(() => getWeekKey(today), [today]);
  const [selectedWeek, setSelectedWeek] = useState(currentWeekKey);
  const prevWeekKey = useMemo(() => getPrevWeekKey(selectedWeek), [selectedWeek]);
  const [subTab, setSubTab] = useState<"metrics" | "checkins">("metrics");

  const summaryQuery = trpc.weeklyReport.getSummary.useQuery(
    { accountId, weekKey: selectedWeek, prevWeekKey },
    { enabled: accountId !== undefined }
  );
  const rows: SummaryRow[] = (summaryQuery.data as SummaryRow[] | undefined) ?? [];
  const submittedCount = rows.filter(r => r.submitted).length;
  const totalCount = rows.length;

  function shiftWeek(delta: number) {
    const { start } = getWeekRange(selectedWeek);
    const next = new Date(start);
    next.setUTCDate(start.getUTCDate() + delta * 7);
    setSelectedWeek(getWeekKey(next));
  }

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
        {(["metrics", "checkins"] as const).map(t => (
          <button key={t} onClick={() => setSubTab(t)}
            className="text-xs px-4 py-1.5 rounded-lg font-semibold transition-all capitalize"
            style={{
              backgroundColor: subTab === t ? "#1E3A5F" : "transparent",
              color: subTab === t ? "white" : "rgba(255,255,255,0.5)",
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
            {t === "metrics" ? "📊 KPI Numbers" : "✅ Check-ins"}
          </button>
        ))}
      </div>

      <WeekNav selectedWeek={selectedWeek} currentWeekKey={currentWeekKey} onShift={shiftWeek} />

      {selectedWeek !== currentWeekKey && (
        <div className="flex justify-center mb-4">
          <button onClick={() => setSelectedWeek(currentWeekKey)}
            className="text-xs px-3 py-1 rounded-lg font-semibold transition-all"
            style={{ background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.25)", color: "#5EEAD4" }}>
            Jump to Current Week
          </button>
        </div>
      )}

      {subTab === "checkins" && <CheckinsSummary accountId={accountId} weekKey={selectedWeek} />}

      {subTab === "metrics" && (
        <>
          {summaryQuery.isLoading && <div className="flex items-center justify-center py-16"><div className="w-8 h-8 rounded-full border-2 border-teal-400/30 border-t-teal-400 animate-spin" /></div>}
          {!summaryQuery.isLoading && rows.length === 0 && (
            <EmptyState icon="👥" title="No staff set up yet" body="Add your team members and their metrics to start tracking weekly numbers."
              cta={<Link href="/app/employees" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.3)", color: "#5EEAD4" }}>Set Up Staff →</Link>} />
          )}
          {!summaryQuery.isLoading && rows.length > 0 && (
            <>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Submission Progress</span>
                  <span className="text-xs font-semibold" style={{ color: submittedCount === totalCount ? "#5EEAD4" : "rgba(255,255,255,0.5)", fontFamily: "'JetBrains Mono', monospace" }}>{submittedCount} of {totalCount}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: totalCount > 0 ? `${(submittedCount / totalCount) * 100}%` : "0%", background: "linear-gradient(90deg, #0D9488, #5EEAD4)" }} />
                </div>
              </div>
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
                {rows.map(row => <EmployeeCard key={row.employee.id} row={row} weekKey={selectedWeek} onRefresh={() => summaryQuery.refetch()} />)}
              </div>
              {submittedCount === totalCount && totalCount > 0 && (
                <div className="mt-8 rounded-2xl p-5 text-center" style={{ background: "rgba(13,148,136,0.07)", border: "1px solid rgba(13,148,136,0.22)" }}>
                  <p className="text-sm font-semibold" style={{ color: "#5EEAD4" }}>✓ All reports submitted for this week</p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── MONTHLY TAB ───────────────────────────────────────────────────────────────

function MonthlyTab({ accountId, forcedBusiness }: { accountId: number; forcedBusiness?: string | null }) {
  const businessesQuery = trpc.business.list.useQuery({ accountId }, { enabled: accountId !== undefined });
  const businesses = businessesQuery.data ?? [];
  const [selectedBiz, setSelectedBiz] = useState<string>("");
  const bizSlug = forcedBusiness || selectedBiz || businesses[0]?.slug || "";

  const trendQuery = trpc.kpi.getMultiMonthTrend.useQuery(
    { accountId, businessSlug: bizSlug, months: 3 },
    { enabled: accountId !== undefined && bizSlug !== "" }
  );
  const trendData = trendQuery.data ?? [];

  const currentYear = new Date().getFullYear();
  const goalsQuery = trpc.goalsSummary.get.useQuery({ accountId, year: currentYear }, { enabled: accountId !== undefined });
  const currentQ = getCurrentQuarter();
  const qGoals = goalsQuery.data?.quarterly.find(q => q.quarter === currentQ);

  // Build category list from trend data
  const categoryNames = useMemo(() => {
    const names = new Set<string>();
    for (const month of trendData) {
      for (const t of month.totals) names.add(t.categoryName);
    }
    return Array.from(names);
  }, [trendData]);

  const months = trendData.map(d => d.yearMonth);

  return (
    <div>
      {/* Business selector */}
      {businesses.length > 1 && (
        <div className="flex gap-2 mb-6">
          {businesses.map(b => (
            <button key={b.slug} onClick={() => setSelectedBiz(b.slug)}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
              style={{
                backgroundColor: (selectedBiz || businesses[0]?.slug) === b.slug ? "#1E3A5F" : "rgba(255,255,255,0.05)",
                color: (selectedBiz || businesses[0]?.slug) === b.slug ? "white" : "rgba(255,255,255,0.5)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}>
              {b.name}
            </button>
          ))}
        </div>
      )}

      {/* KPI 3-month trend table */}
      <SectionHeader title="KPI Trend — Last 3 Months" subtitle="Monthly totals across all team members" />
      {trendQuery.isLoading && <div className="flex items-center justify-center py-10"><div className="w-7 h-7 rounded-full border-2 border-teal-400/30 border-t-teal-400 animate-spin" /></div>}
      {!trendQuery.isLoading && categoryNames.length === 0 && (
        <EmptyState icon="📈" title="No KPI data yet" body="Start tracking KPIs in the KPI Reporting page to see trends here." />
      )}
      {!trendQuery.isLoading && categoryNames.length > 0 && (
        <div className="rounded-2xl overflow-hidden mb-10" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>KPI</th>
                {months.map(ym => (
                  <th key={ym} className="text-right px-4 py-3 text-xs font-semibold" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>{formatYearMonth(ym)}</th>
                ))}
                <th className="text-right px-4 py-3 text-xs font-semibold" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>Trend</th>
              </tr>
            </thead>
            <tbody>
              {categoryNames.map((catName, idx) => {
                const monthTotals = months.map(ym => {
                  const monthData = trendData.find(d => d.yearMonth === ym);
                  const entries = (monthData?.totals ?? []).filter(t => t.categoryName === catName);
                  return entries.reduce((sum, e) => sum + e.total, 0);
                });
                const unit = trendData.flatMap(d => d.totals).find(t => t.categoryName === catName)?.unit ?? "";
                const trend = monthTotals.length >= 2 ? monthTotals[monthTotals.length - 1] - monthTotals[monthTotals.length - 2] : null;
                return (
                  <tr key={catName} style={{ borderBottom: idx < categoryNames.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none", backgroundColor: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                    <td className="px-4 py-3 font-medium text-white text-sm">{catName}</td>
                    {monthTotals.map((val, i) => (
                      <td key={i} className="px-4 py-3 text-right tabular-nums" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "'JetBrains Mono', monospace" }}>
                        {val > 0 ? `${val.toLocaleString()}${unit ? ` ${unit}` : ""}` : <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums" style={{ color: deltaColor(trend), fontFamily: "'JetBrains Mono', monospace" }}>
                      {deltaLabel(trend)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Current quarter goal progress */}
      <SectionHeader title={`Q${currentQ} Goal Progress`} subtitle="How this quarter's goals are tracking" />
      {goalsQuery.isLoading && <div className="flex items-center justify-center py-10"><div className="w-7 h-7 rounded-full border-2 border-teal-400/30 border-t-teal-400 animate-spin" /></div>}
      {!goalsQuery.isLoading && (!qGoals || qGoals.goals.length === 0) && (
        <EmptyState icon="🎯" title={`No Q${currentQ} goals set`} body="Add quarterly goals in the Goals page to track them here."
          cta={<Link href="/app/goals" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.3)", color: "#5EEAD4" }}>Set Goals →</Link>} />
      )}
      {!goalsQuery.isLoading && qGoals && qGoals.goals.length > 0 && (
        <div className="flex flex-col gap-3">
          {/* Status summary bar */}
          <div className="flex gap-3 mb-2 flex-wrap">
            {[["active","Active"],["achieved","Achieved"],["missed","Missed"],["deferred","Deferred"]].map(([s, label]) => {
              const count = qGoals.counts[s as keyof typeof qGoals.counts] ?? 0;
              if (count === 0) return null;
              const meta = STATUS_META[s];
              return (
                <div key={s} className="flex items-center gap-1.5 text-xs" style={{ color: meta.color }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
                  <span className="font-semibold">{count}</span>
                  <span style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>
                </div>
              );
            })}
          </div>
          {qGoals.goals.map(g => (
            <div key={g.id} className="rounded-xl p-4 flex items-start justify-between gap-3"
              style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{g.title}</p>
                {g.description && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "rgba(255,255,255,0.4)" }}>{g.description}</p>}
              </div>
              <StatusBadge status={g.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── QUARTERLY TAB ─────────────────────────────────────────────────────────────

function QuarterlyTab({ accountId, forcedBusiness }: { accountId: number; forcedBusiness?: string | null }) {
  const currentYear = new Date().getFullYear();
  const currentQ = getCurrentQuarter();
  const [viewQ, setViewQ] = useState(currentQ);

  const goalsQuery = trpc.goalsSummary.get.useQuery({ accountId, year: currentYear }, { enabled: accountId !== undefined });
  const rawQData = goalsQuery.data?.quarterly.find(q => q.quarter === viewQ);
  const qData = useMemo(() => {
    if (!rawQData || !forcedBusiness) return rawQData;
    const filtered = rawQData.goals.filter(g => g.business === forcedBusiness || g.business === "general");
    return {
      ...rawQData,
      goals: filtered,
      counts: {
        total: filtered.length,
        active: filtered.filter(g => g.status === "active").length,
        achieved: filtered.filter(g => g.status === "achieved").length,
        missed: filtered.filter(g => g.status === "missed").length,
        deferred: filtered.filter(g => g.status === "deferred").length,
      },
    };
  }, [rawQData, forcedBusiness]);

  const businessesQuery = trpc.business.list.useQuery({ accountId }, { enabled: accountId !== undefined });
  const businesses = businessesQuery.data ?? [];
  const [selectedBiz, setSelectedBiz] = useState<string>("");
  const bizSlug = forcedBusiness || selectedBiz || businesses[0]?.slug || "";

  const trendQuery = trpc.kpi.getMultiMonthTrend.useQuery(
    { accountId, businessSlug: bizSlug, months: 3 },
    { enabled: accountId !== undefined && bizSlug !== "" }
  );
  const trendData = trendQuery.data ?? [];

  const categoryNames = useMemo(() => {
    const names = new Set<string>();
    for (const month of trendData) for (const t of month.totals) names.add(t.categoryName);
    return Array.from(names);
  }, [trendData]);

  return (
    <div>
      {/* Quarter selector */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4].map(q => (
          <button key={q} onClick={() => setViewQ(q)}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
            style={{
              backgroundColor: viewQ === q ? "#1E3A5F" : "rgba(255,255,255,0.05)",
              color: viewQ === q ? "white" : "rgba(255,255,255,0.5)",
              border: viewQ === q ? "1px solid rgba(94,234,212,0.3)" : "1px solid rgba(255,255,255,0.1)",
            }}>
            Q{q}{q === currentQ ? " ·  Now" : ""}
          </button>
        ))}
      </div>

      {/* Goals for this quarter */}
      <SectionHeader title={`Q${viewQ} ${currentYear} Goals`} subtitle={viewQ === currentQ ? "Current quarter — update status as goals progress" : "Historical quarter"} />
      {goalsQuery.isLoading && <div className="flex items-center justify-center py-10"><div className="w-7 h-7 rounded-full border-2 border-teal-400/30 border-t-teal-400 animate-spin" /></div>}
      {!goalsQuery.isLoading && (!qData || qData.goals.length === 0) && (
        <EmptyState icon="🎯" title={`No Q${viewQ} goals`} body="Goals set for this quarter will appear here."
          cta={<Link href="/app/goals" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.3)", color: "#5EEAD4" }}>Add Goals →</Link>} />
      )}
      {!goalsQuery.isLoading && qData && qData.goals.length > 0 && (
        <>
          {/* Status summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[["active","Active","📋"],["achieved","Achieved","✅"],["missed","Missed","❌"],["deferred","Deferred","⏸"]].map(([s, label, icon]) => {
              const count = qData.counts[s as keyof typeof qData.counts] ?? 0;
              const meta = STATUS_META[s];
              return (
                <div key={s} className="rounded-xl p-3 text-center" style={{ backgroundColor: meta.bg, border: `1px solid ${meta.color}30` }}>
                  <p className="text-xl mb-1">{icon}</p>
                  <p className="text-2xl font-bold" style={{ color: meta.color, fontFamily: "'Space Grotesk', sans-serif" }}>{count}</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</p>
                </div>
              );
            })}
          </div>
          <div className="flex flex-col gap-3 mb-10">
            {qData.goals.map(g => (
              <div key={g.id} className="rounded-xl p-4 flex items-start justify-between gap-3"
                style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{g.title}</p>
                  {g.description && <p className="text-xs mt-1 leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{g.description}</p>}
                  <p className="text-[10px] mt-1.5 uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.25)" }}>Owner: {g.owner}</p>
                </div>
                <StatusBadge status={g.status} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* KPI sparklines (3-month trend) */}
      <SectionHeader title="KPI Snapshot — Last 3 Months" subtitle="How your key numbers have moved this quarter" />
      {businesses.length > 1 && (
        <div className="flex gap-2 mb-4">
          {businesses.map(b => (
            <button key={b.slug} onClick={() => setSelectedBiz(b.slug)}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
              style={{ backgroundColor: (selectedBiz || businesses[0]?.slug) === b.slug ? "#1E3A5F" : "rgba(255,255,255,0.05)", color: (selectedBiz || businesses[0]?.slug) === b.slug ? "white" : "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
              {b.name}
            </button>
          ))}
        </div>
      )}
      {trendQuery.isLoading && <div className="flex items-center justify-center py-10"><div className="w-7 h-7 rounded-full border-2 border-teal-400/30 border-t-teal-400 animate-spin" /></div>}
      {!trendQuery.isLoading && categoryNames.length === 0 && <EmptyState icon="📈" title="No KPI data yet" body="KPI entries will appear here once submitted." />}
      {!trendQuery.isLoading && categoryNames.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categoryNames.map(catName => {
            const months = trendData.map(d => d.yearMonth);
            const vals = months.map(ym => {
              const md = trendData.find(d => d.yearMonth === ym);
              return (md?.totals ?? []).filter(t => t.categoryName === catName).reduce((s, e) => s + e.total, 0);
            });
            const unit = trendData.flatMap(d => d.totals).find(t => t.categoryName === catName)?.unit ?? "";
            const latest = vals[vals.length - 1] ?? 0;
            const prev = vals[vals.length - 2] ?? null;
            const trend = prev !== null ? latest - prev : null;
            return (
              <div key={catName} className="rounded-2xl p-4" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <p className="text-xs font-semibold mb-3" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}>{catName}</p>
                <div className="flex items-end gap-1 h-12 mb-3">
                  {vals.map((v, i) => {
                    const max = Math.max(...vals, 1);
                    const h = Math.max((v / max) * 100, 4);
                    return (
                      <div key={i} className="flex-1 rounded-sm transition-all" title={`${formatYearMonth(months[i])}: ${v}`}
                        style={{ height: `${h}%`, backgroundColor: i === vals.length - 1 ? "#5EEAD4" : "rgba(94,234,212,0.3)" }} />
                    );
                  })}
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{latest.toLocaleString()}<span className="text-xs ml-1" style={{ color: "rgba(255,255,255,0.4)" }}>{unit}</span></span>
                  <span className="text-xs font-semibold" style={{ color: deltaColor(trend) }}>{deltaLabel(trend)}</span>
                </div>
                <div className="flex justify-between mt-1">
                  {months.map(ym => <span key={ym} className="text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>{formatYearMonth(ym).split(" ")[0]}</span>)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── GOALS TAB ─────────────────────────────────────────────────────────────────

function GoalsTab({ accountId, forcedBusiness }: { accountId: number; forcedBusiness?: string | null }) {
  const currentYear = new Date().getFullYear();
  const [viewYear, setViewYear] = useState(currentYear);
  const goalsQuery = trpc.goalsSummary.get.useQuery({ accountId, year: viewYear }, { enabled: accountId !== undefined });
  const rawData = goalsQuery.data;

  // Filter goals by active business
  const data = useMemo(() => {
    if (!rawData || !forcedBusiness) return rawData;
    const filterGoals = (goals: typeof rawData.all) => goals.filter(g => g.business === forcedBusiness || g.business === "general");
    const filteredAll = filterGoals(rawData.all);
    const countStatuses = (goals: typeof rawData.all) => ({
      total: goals.length,
      active: goals.filter(g => g.status === "active").length,
      achieved: goals.filter(g => g.status === "achieved").length,
      missed: goals.filter(g => g.status === "missed").length,
      deferred: goals.filter(g => g.status === "deferred").length,
    });
    return {
      all: filteredAll,
      totalCounts: countStatuses(filteredAll),
      annual: {
        goals: filterGoals(rawData.annual.goals),
        counts: countStatuses(filterGoals(rawData.annual.goals)),
      },
      quarterly: rawData.quarterly.map(q => ({
        ...q,
        goals: filterGoals(q.goals),
        counts: countStatuses(filterGoals(q.goals)),
      })),
    };
  }, [rawData, forcedBusiness]);

  return (
    <div>
      {/* Year selector */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setViewYear(y => y - 1)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
          style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", backgroundColor: "rgba(255,255,255,0.04)" }}>‹</button>
        <span className="text-base font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{viewYear}</span>
        <button onClick={() => setViewYear(y => y + 1)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
          style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", backgroundColor: "rgba(255,255,255,0.04)" }}>›</button>
        {viewYear !== currentYear && (
          <button onClick={() => setViewYear(currentYear)} className="text-xs px-2.5 py-1 rounded-lg font-semibold transition-all"
            style={{ background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.25)", color: "#5EEAD4" }}>This Year</button>
        )}
      </div>

      {goalsQuery.isLoading && <div className="flex items-center justify-center py-16"><div className="w-8 h-8 rounded-full border-2 border-teal-400/30 border-t-teal-400 animate-spin" /></div>}

      {!goalsQuery.isLoading && data && data.all.length === 0 && (
        <EmptyState icon="🎯" title="No goals yet" body="Set your annual and quarterly goals to track progress here."
          cta={<Link href="/app/goals" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.3)", color: "#5EEAD4" }}>Add Goals →</Link>} />
      )}

      {!goalsQuery.isLoading && data && data.all.length > 0 && (
        <>
          {/* Overall status summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[["active","Active","📋"],["achieved","Achieved","✅"],["missed","Missed","❌"],["deferred","Deferred","⏸"]].map(([s, label, icon]) => {
              const count = data.totalCounts[s as keyof typeof data.totalCounts] ?? 0;
              const meta = STATUS_META[s];
              return (
                <div key={s} className="rounded-xl p-3 text-center" style={{ backgroundColor: meta.bg, border: `1px solid ${meta.color}30` }}>
                  <p className="text-xl mb-1">{icon}</p>
                  <p className="text-2xl font-bold" style={{ color: meta.color, fontFamily: "'Space Grotesk', sans-serif" }}>{count}</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</p>
                </div>
              );
            })}
          </div>

          {/* Annual goals */}
          {data.annual.goals.length > 0 && (
            <div className="mb-8">
              <SectionHeader title={`Annual Goals — ${viewYear}`} subtitle={`${data.annual.counts.achieved} of ${data.annual.counts.total} achieved`} />
              <div className="flex flex-col gap-3">
                {data.annual.goals.map(g => (
                  <div key={g.id} className="rounded-xl p-4 flex items-start justify-between gap-3"
                    style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{g.title}</p>
                      {g.description && <p className="text-xs mt-1 leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{g.description}</p>}
                      <p className="text-[10px] mt-1.5 uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.25)" }}>Owner: {g.owner}</p>
                    </div>
                    <StatusBadge status={g.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quarterly goals grouped by quarter */}
          {data.quarterly.map(({ quarter, goals, counts }) => (
            <div key={quarter} className="mb-8">
              <SectionHeader
                title={`Q${quarter} Goals`}
                subtitle={`${counts.achieved} achieved · ${counts.active} active · ${counts.missed} missed`}
              />
              <div className="flex flex-col gap-3">
                {goals.map(g => (
                  <div key={g.id} className="rounded-xl p-4 flex items-start justify-between gap-3"
                    style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{g.title}</p>
                      {g.description && <p className="text-xs mt-1 leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{g.description}</p>}
                      <p className="text-[10px] mt-1.5 uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.25)" }}>Owner: {g.owner}</p>
                    </div>
                    <StatusBadge status={g.status} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

type ReportsTab = "weekly" | "monthly" | "quarterly" | "goals";

const TAB_META: { id: ReportsTab; label: string; icon: string; hint: string }[] = [
  { id: "weekly",    label: "Weekly",    icon: "📊", hint: "Use before Weekly Review" },
  { id: "monthly",   label: "Monthly",   icon: "📅", hint: "Use before Monthly Finance" },
  { id: "quarterly", label: "Quarterly", icon: "🗓",  hint: "Use before Quarterly Offsite" },
  { id: "goals",     label: "Goals",     icon: "🎯", hint: "All goals at a glance" },
];

export default function WeeklyReports() {
  const { person } = usePerson();
  const accountId = person?.accountId ?? (() => {
    const stored = localStorage.getItem("bcc_account_id");
    return stored ? parseInt(stored, 10) : undefined;
  })();

  const [activeTab, setActiveTab] = useState<ReportsTab>(() => {
    try { return (localStorage.getItem("bcc_reports_tab") as ReportsTab) ?? "weekly"; } catch { return "weekly"; }
  });

  function switchTab(t: ReportsTab) {
    setActiveTab(t);
    try { localStorage.setItem("bcc_reports_tab", t); } catch { /* ignore */ }
  }

  if (person === undefined) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "#0F2440" }}>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Loading...</p>
      </div>
    );
  }

  const aid = accountId ?? 0;
  const { activeBusiness } = useActiveBusiness(person?.businessScope);
  const activeDbSlug = activeBusiness === "chiro" ? "chiropractic" : activeBusiness === "crossfit" ? "crossfit" : null;

  return (
    <div className="h-full flex flex-col" style={{ background: "#0F2440" }}>
      {/* Page header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2">
          <span className="text-base">📋</span>
          <h1 className="text-sm font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Reports</h1>
        </div>
        <Link href="/app/employees"
          className="text-xs px-3 py-1.5 rounded-lg transition-all"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
          👥 Manage Staff
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 px-4 sm:px-6 pt-4">
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
          {TAB_META.map(t => (
            <button key={t.id} onClick={() => switchTab(t.id)}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-semibold transition-all"
              style={{
                backgroundColor: activeTab === t.id ? "#1E3A5F" : "transparent",
                color: activeTab === t.id ? "white" : "rgba(255,255,255,0.5)",
                border: activeTab === t.id ? "1px solid rgba(94,234,212,0.25)" : "1px solid transparent",
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
        {/* Hint for current tab */}
        <p className="text-[10px] mt-1.5 mb-0" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Inter', sans-serif" }}>
          {TAB_META.find(t => t.id === activeTab)?.hint}
        </p>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 max-w-5xl w-full mx-auto">
        {activeTab === "weekly"    && <WeeklyTab    accountId={aid} forcedBusiness={activeDbSlug} />}
        {activeTab === "monthly"   && <MonthlyTab   accountId={aid} forcedBusiness={activeDbSlug} />}
        {activeTab === "quarterly" && <QuarterlyTab accountId={aid} forcedBusiness={activeDbSlug} />}
        {activeTab === "goals"     && <GoalsTab     accountId={aid} forcedBusiness={activeDbSlug} />}
      </div>
    </div>
  );
}
