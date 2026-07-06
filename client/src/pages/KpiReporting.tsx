/**
 * KPI Reporting Page
 *
 * Employees: submit weekly numbers; see monthly running total and goal (if showGoalToStaff=true).
 * Owners/Co-owners: see monthly running totals per category with goal cross-reference,
 *   set monthly targets, and toggle whether staff can see the goal.
 */

import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { usePerson } from "@/contexts/PersonContext";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getCurrentWeekKey(): string {
  const now = new Date();
  const week = getISOWeek(now);
  return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatPeriod(key: string): string {
  if (key.includes("-W")) {
    const [year, week] = key.split("-W");
    return `Week ${week}, ${year}`;
  }
  const [year, month] = key.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/** Progress bar color based on pct: red <50, amber 50-80, green ≥80 */
function progressColor(pct: number): string {
  if (pct >= 100) return "#16A34A";
  if (pct >= 80) return "#059669";
  if (pct >= 50) return "#D97706";
  return "#DC2626";
}

// ─── Employee View ────────────────────────────────────────────────────────────

function EmployeeKpiView({ accountId, personId, businessScope }: {
  accountId: number;
  personId: string;
  businessScope: string;
}) {
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentWeekKey());
  const [values, setValues] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});

  const scopes = useMemo(() => {
    if (businessScope === "all") return ["chiropractic", "crossfit", "realty", "general"];
    try { return JSON.parse(businessScope) as string[]; } catch { return [businessScope]; }
  }, [businessScope]);

  const primarySlug = scopes[0] ?? "general";
  const currentMonthKey = getCurrentMonthKey();

  const categoriesQuery = trpc.kpi.listCategories.useQuery(
    { accountId, businessSlug: primarySlug },
    { staleTime: 60_000 }
  );

  const entriesQuery = trpc.kpi.getEntries.useQuery(
    { accountId, businessSlug: primarySlug, periodKey: selectedPeriod },
    { staleTime: 30_000 }
  );

  // Monthly totals so employee can see their running total for the month
  const monthlyTotalsQuery = trpc.kpi.getMonthlyTotals.useQuery(
    { accountId, businessSlug: primarySlug, yearMonth: currentMonthKey },
    { staleTime: 30_000 }
  );

  const submitEntry = trpc.kpi.submitEntry.useMutation({
    onSuccess: (_, vars) => {
      setSaving(s => ({ ...s, [vars.categoryId]: false }));
      toast.success("Number saved!");
      entriesQuery.refetch();
      monthlyTotalsQuery.refetch();
    },
    onError: (_, vars) => {
      setSaving(s => ({ ...s, [vars.categoryId]: false }));
      toast.error("Failed to save. Please try again.");
    },
  });

  const categories = categoriesQuery.data?.filter(c => c.isActive) ?? [];
  const entries = entriesQuery.data ?? [];
  const monthlyTotals = monthlyTotalsQuery.data ?? [];

  const existingValues = useMemo(() => {
    const map: Record<number, number> = {};
    for (const e of entries) {
      if (e.personId === personId) map[e.categoryId] = e.value;
    }
    return map;
  }, [entries, personId]);

  // Monthly total per category for this employee
  const myMonthlyTotals = useMemo(() => {
    const map: Record<number, { total: number; monthlyTarget: number | null; showGoalToStaff: boolean }> = {};
    for (const t of monthlyTotals) {
      if (t.personId === personId) {
        map[t.categoryId] = { total: t.total, monthlyTarget: t.monthlyTarget, showGoalToStaff: t.showGoalToStaff };
      }
    }
    return map;
  }, [monthlyTotals, personId]);

  const handleSave = (categoryId: number) => {
    const raw = values[categoryId];
    const num = parseFloat(raw ?? "");
    if (isNaN(num)) { toast.error("Please enter a valid number."); return; }
    setSaving(s => ({ ...s, [categoryId]: true }));
    submitEntry.mutate({ accountId, categoryId, personId, periodKey: selectedPeriod, value: num });
  };

  const weekOptions = useMemo(() => {
    const opts: string[] = [];
    const now = new Date();
    for (let i = 0; i < 8; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      opts.push(`${d.getFullYear()}-W${String(getISOWeek(d)).padStart(2, "0")}`);
    }
    return opts;
  }, []);

  if (categoriesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <span className="text-slate-400 text-sm animate-pulse">Loading your KPIs…</span>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="rounded-2xl p-10 text-center flex flex-col items-center gap-4" style={{ backgroundColor: "#FAFAF9", border: "1.5px dashed #CBD5E1" }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ backgroundColor: "#EDE9FE" }}>📊</div>
        <div>
          <p className="text-[14px] font-semibold text-[#1E3A5F]">No KPI categories set up yet</p>
          <p className="text-[12px] text-slate-400 mt-1">Your owner will configure your KPI categories soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Period selector */}
      <div className="flex items-center gap-3">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Period
        </label>
        <select
          value={selectedPeriod}
          onChange={e => setSelectedPeriod(e.target.value)}
          className="rounded-lg px-3 py-2 text-[12px] text-[#1E3A5F] focus:outline-none"
          style={{ backgroundColor: "#FFFFFF", border: "1.5px solid #E2E8F0", fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {weekOptions.map(w => (
            <option key={w} value={w}>{formatPeriod(w)}{w === getCurrentWeekKey() ? " (current)" : ""}</option>
          ))}
        </select>
      </div>

      {/* Monthly running total banner */}
      <div className="rounded-2xl p-4 flex flex-col gap-1" style={{ backgroundColor: "#EDE9FE", border: "1.5px solid #C4B5FD" }}>
        <p className="text-[11px] font-bold text-purple-700 uppercase tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {formatPeriod(currentMonthKey)} — Your Running Total
        </p>
        <div className="flex flex-wrap gap-4 mt-1">
          {categories.map(cat => {
            const mt = myMonthlyTotals[cat.id];
            const total = mt?.total ?? 0;
            const target = mt?.showGoalToStaff ? mt?.monthlyTarget : null;
            const pct = target ? Math.min(100, Math.round((total / target) * 100)) : null;
            return (
              <div key={cat.id} className="flex flex-col gap-0.5">
                <span className="text-[10px] text-purple-600 font-semibold">{cat.name}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-[18px] font-bold text-[#1E3A5F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{total}</span>
                  <span className="text-[11px] text-slate-500">{cat.unit}</span>
                  {target !== null && (
                    <span className="text-[11px] text-slate-500">/ {target} goal</span>
                  )}
                </div>
                {pct !== null && (
                  <div className="w-24 h-1.5 rounded-full bg-purple-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: progressColor(pct) }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* KPI input cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {categories.map(cat => {
          const existing = existingValues[cat.id];
          const inputVal = values[cat.id] ?? (existing !== undefined ? String(existing) : "");
          const isSaved = existing !== undefined && String(existing) === inputVal;

          return (
            <div
              key={cat.id}
              className="rounded-2xl p-5 flex flex-col gap-3"
              style={{
                backgroundColor: "#FFFFFF",
                border: `1.5px solid ${isSaved ? "#86EFAC" : "#E2E8F0"}`,
                boxShadow: "0 2px 12px rgba(30,58,95,0.04)",
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-bold text-[#1E3A5F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {cat.name}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 capitalize">
                    {cat.frequency} · unit: {cat.unit}
                  </p>
                </div>
                {isSaved && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#DCFCE7", color: "#166534" }}>
                    ✓ Saved
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={inputVal}
                  onChange={e => setValues(v => ({ ...v, [cat.id]: e.target.value }))}
                  placeholder={`Enter ${cat.unit === "#" ? "count" : cat.unit === "$" ? "amount" : "value"}…`}
                  className="flex-1 rounded-xl px-3 py-2.5 text-[14px] text-[#1E3A5F] font-bold focus:outline-none transition-all"
                  style={{ backgroundColor: "#F8F7F4", border: "1.5px solid #E2E0DB", fontFamily: "'Space Grotesk', sans-serif" }}
                  onFocus={e => (e.target.style.borderColor = "#7C3AED")}
                  onBlur={e => (e.target.style.borderColor = "#E2E0DB")}
                />
                <span className="text-[12px] text-slate-400 font-medium w-6 text-center">{cat.unit}</span>
                <button
                  onClick={() => handleSave(cat.id)}
                  disabled={saving[cat.id] || !inputVal.trim()}
                  className="px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-40"
                  style={{ backgroundColor: "#1E3A5F", color: "white", fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {saving[cat.id] ? "…" : "Save"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Owner Dashboard View ─────────────────────────────────────────────────────

function OwnerKpiDashboard({ accountId }: { accountId: number }) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [editingTarget, setEditingTarget] = useState<Record<number, string>>({});
  const [savingTarget, setSavingTarget] = useState<Record<number, boolean>>({});

  const businessesQuery = trpc.business.list.useQuery({ accountId }, { staleTime: 60_000 });
  const dbBusinesses = businessesQuery.data ?? [];
  const [selectedBusiness, setSelectedBusiness] = useState("");

  useEffect(() => {
    if (dbBusinesses.length > 0 && !selectedBusiness) {
      setSelectedBusiness(dbBusinesses[0].slug);
    }
  }, [dbBusinesses.length, selectedBusiness]);

  const categoriesQuery = trpc.kpi.listCategories.useQuery(
    { accountId, businessSlug: selectedBusiness },
    { staleTime: 60_000 }
  );

  const monthlyTotalsQuery = trpc.kpi.getMonthlyTotals.useQuery(
    { accountId, businessSlug: selectedBusiness, yearMonth: selectedMonth },
    { staleTime: 30_000 }
  );

  const personsQuery = trpc.person.list.useQuery({ accountId }, { staleTime: 60_000 });

  const currentWeekKey = getCurrentWeekKey();
  const weekEntriesQuery = trpc.kpi.getEntries.useQuery(
    { accountId, businessSlug: selectedBusiness, periodKey: currentWeekKey },
    { staleTime: 30_000 }
  );

  const updateCategory = trpc.kpi.updateCategory.useMutation({
    onSuccess: () => {
      categoriesQuery.refetch();
      monthlyTotalsQuery.refetch();
    },
    onError: () => toast.error("Failed to update category."),
  });

  const seedDefaults = trpc.kpi.seedDefaults.useMutation({
    onSuccess: (result) => {
      if (result.seeded) toast.success(`Seeded ${result.count} default KPI categories!`);
      else toast.info("Categories already exist — nothing seeded.");
      categoriesQuery.refetch();
    },
    onError: () => toast.error("Failed to seed defaults."),
  });

  const createCategory = trpc.kpi.createCategory.useMutation({
    onSuccess: () => {
      setNewCatName("");
      setShowAddCategory(false);
      toast.success("KPI category added!");
      categoriesQuery.refetch();
    },
    onError: () => toast.error("Failed to add category."),
  });

  const categories = categoriesQuery.data?.filter(c => c.isActive) ?? [];
  const persons = personsQuery.data ?? [];
  const weekEntries = weekEntriesQuery.data ?? [];
  const monthlyTotals = monthlyTotalsQuery.data ?? [];

  const personMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of persons) m[p.id] = p.name;
    return m;
  }, [persons]);

  const weekMatrix = useMemo(() => {
    const m: Record<number, Record<string, number>> = {};
    for (const e of weekEntries) {
      if (!m[e.categoryId]) m[e.categoryId] = {};
      m[e.categoryId][e.personId] = e.value;
    }
    return m;
  }, [weekEntries]);

  const employees = persons.filter(p => {
    if (p.role === "owner" || p.role === "coowner") return false;
    try {
      const scope = JSON.parse(p.businessScope) as string[];
      return scope.includes(selectedBusiness) || p.businessScope === "all";
    } catch { return false; }
  });

  // Group monthly totals by category (sum all persons)
  const categoryTotals = useMemo(() => {
    const m: Record<number, { total: number; monthlyTarget: number | null; showGoalToStaff: boolean; unit: string; name: string }> = {};
    for (const t of monthlyTotals) {
      if (!m[t.categoryId]) {
        m[t.categoryId] = { total: 0, monthlyTarget: t.monthlyTarget, showGoalToStaff: t.showGoalToStaff, unit: t.unit, name: t.categoryName };
      }
      m[t.categoryId].total += t.total;
    }
    // Also include categories with no submissions yet
    for (const cat of categories) {
      if (!m[cat.id]) {
        m[cat.id] = { total: 0, monthlyTarget: cat.monthlyTarget ?? null, showGoalToStaff: cat.showGoalToStaff, unit: cat.unit, name: cat.name };
      }
    }
    return m;
  }, [monthlyTotals, categories]);

  const businesses = dbBusinesses.map(b => ({ slug: b.slug, label: b.name, icon: b.icon || "🏢" }));

  const monthOptions = useMemo(() => {
    const opts: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return opts;
  }, []);

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatUnit, setNewCatUnit] = useState("#");
  const [newCatFrequency, setNewCatFrequency] = useState<"weekly" | "monthly">("weekly");

  const handleAddCategory = () => {
    if (!newCatName.trim()) { toast.error("Please enter a category name."); return; }
    createCategory.mutate({ accountId, businessSlug: selectedBusiness, name: newCatName.trim(), unit: newCatUnit, frequency: newCatFrequency, sortOrder: categories.length });
  };

  const handleSaveTarget = (catId: number) => {
    const raw = editingTarget[catId];
    const num = raw === "" || raw === undefined ? null : parseFloat(raw);
    if (num !== null && isNaN(num)) { toast.error("Please enter a valid number."); return; }
    setSavingTarget(s => ({ ...s, [catId]: true }));
    updateCategory.mutate({ id: catId, monthlyTarget: num }, {
      onSuccess: () => {
        setSavingTarget(s => ({ ...s, [catId]: false }));
        setEditingTarget(s => { const n = { ...s }; delete n[catId]; return n; });
        toast.success("Target saved!");
      },
      onError: () => setSavingTarget(s => ({ ...s, [catId]: false })),
    });
  };

  const handleToggleVisibility = (catId: number, current: boolean) => {
    updateCategory.mutate({ id: catId, showGoalToStaff: !current }, {
      onSuccess: () => toast.success(!current ? "Goal now visible to staff" : "Goal hidden from staff"),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Business selector */}
      <div className="flex gap-2 flex-wrap">
        {businesses.map(b => (
          <button
            key={b.slug}
            onClick={() => setSelectedBusiness(b.slug)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5"
            style={{
              backgroundColor: selectedBusiness === b.slug ? "#1E3A5F" : "#FFFFFF",
              color: selectedBusiness === b.slug ? "white" : "#475569",
              border: `1.5px solid ${selectedBusiness === b.slug ? "#1E3A5F" : "#E2E8F0"}`,
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            {b.icon} {b.label}
          </button>
        ))}
      </div>

      {/* Monthly Running Totals with Goal Cross-Reference */}
      <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ backgroundColor: "#FFFFFF", border: "1.5px solid #E2E8F0" }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-[14px] font-bold text-[#1E3A5F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Monthly Running Totals
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Running total of all weekly submissions vs. your monthly goals</p>
          </div>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-[12px] text-[#1E3A5F] focus:outline-none"
            style={{ backgroundColor: "#F8F7F4", border: "1.5px solid #E2E0DB", fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {monthOptions.map(m => (
              <option key={m} value={m}>{formatPeriod(m)}{m === getCurrentMonthKey() ? " (current)" : ""}</option>
            ))}
          </select>
        </div>

        {categories.length === 0 ? (
          <p className="text-[12px] text-slate-400 italic">No KPI categories configured yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => {
              const ct = categoryTotals[cat.id];
              const total = ct?.total ?? 0;
              const target = ct?.monthlyTarget ?? null;
              const pct = target ? Math.min(100, Math.round((total / target) * 100)) : null;
              const isEditing = cat.id in editingTarget;
              const targetDisplayVal = isEditing ? editingTarget[cat.id] : (target !== null ? String(target) : "");

              return (
                <div
                  key={cat.id}
                  className="rounded-2xl p-4 flex flex-col gap-3"
                  style={{
                    backgroundColor: "#F8F7F4",
                    border: `1.5px solid ${pct !== null && pct >= 100 ? "#86EFAC" : pct !== null && pct >= 80 ? "#FCD34D" : "#E2E0DB"}`,
                  }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[13px] font-bold text-[#1E3A5F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{cat.name}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{cat.frequency} · {cat.unit}</p>
                    </div>
                    {pct !== null && (
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: pct >= 100 ? "#DCFCE7" : pct >= 80 ? "#FEF3C7" : pct >= 50 ? "#FEF3C7" : "#FEE2E2",
                          color: pct >= 100 ? "#166534" : pct >= 80 ? "#92400E" : pct >= 50 ? "#92400E" : "#991B1B",
                        }}
                      >
                        {pct}%
                      </span>
                    )}
                  </div>

                  {/* Total vs Goal */}
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[28px] font-bold text-[#1E3A5F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{total}</span>
                    <span className="text-[12px] text-slate-400">{cat.unit}</span>
                    {target !== null && (
                      <span className="text-[12px] text-slate-500 ml-1">/ {target} goal this month</span>
                    )}
                  </div>

                  {/* Progress bar */}
                  {pct !== null && (
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: progressColor(pct) }}
                      />
                    </div>
                  )}

                  {/* Target editor */}
                  <div className="flex items-center gap-2 pt-1" style={{ borderTop: "1px solid #E2E0DB" }}>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex-shrink-0">Goal</span>
                    <input
                      type="number"
                      value={targetDisplayVal}
                      onChange={e => setEditingTarget(s => ({ ...s, [cat.id]: e.target.value }))}
                      placeholder="Set target…"
                      className="flex-1 rounded-lg px-2 py-1 text-[12px] text-[#1E3A5F] focus:outline-none"
                      style={{ backgroundColor: "#FFFFFF", border: "1.5px solid #E2E0DB", fontFamily: "'Space Grotesk', sans-serif" }}
                      onFocus={e => (e.target.style.borderColor = "#7C3AED")}
                      onBlur={e => (e.target.style.borderColor = "#E2E0DB")}
                    />
                    {isEditing && (
                      <button
                        onClick={() => handleSaveTarget(cat.id)}
                        disabled={savingTarget[cat.id]}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all hover:opacity-90 disabled:opacity-40"
                        style={{ backgroundColor: "#1E3A5F", color: "white", fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {savingTarget[cat.id] ? "…" : "Save"}
                      </button>
                    )}
                  </div>

                  {/* Visibility toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Show goal to staff</span>
                    <button
                      onClick={() => handleToggleVisibility(cat.id, cat.showGoalToStaff)}
                      className="relative w-9 h-5 rounded-full transition-all flex-shrink-0"
                      style={{ backgroundColor: cat.showGoalToStaff ? "#7C3AED" : "#CBD5E1" }}
                    >
                      <span
                        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                        style={{ left: cat.showGoalToStaff ? "18px" : "2px", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* This Week — per-employee matrix */}
      <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ backgroundColor: "#FFFFFF", border: "1.5px solid #E2E8F0" }}>
        <div>
          <h3 className="text-[14px] font-bold text-[#1E3A5F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            This Week — {formatPeriod(currentWeekKey)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Employee submissions for the current week</p>
        </div>

        {categories.length === 0 ? (
          <p className="text-[12px] text-slate-400 italic">No KPI categories configured for this business yet.</p>
        ) : employees.length === 0 ? (
          <p className="text-[12px] text-slate-400 italic">No employees assigned to this business yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr>
                  <th className="text-left py-2 pr-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Employee</th>
                  {categories.map(cat => (
                    <th key={cat.id} className="text-right py-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {cat.name}
                      <span className="ml-1 text-slate-300 normal-case font-normal">({cat.unit})</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} style={{ borderTop: "1px solid #F1F5F9" }}>
                    <td className="py-2.5 pr-4 font-semibold text-[#1E3A5F]">{emp.name}</td>
                    {categories.map(cat => {
                      const val = weekMatrix[cat.id]?.[emp.id];
                      return (
                        <td key={cat.id} className="py-2.5 px-3 text-right">
                          {val !== undefined ? (
                            <span className="font-bold text-[#1E3A5F]">{val}</span>
                          ) : (
                            <span className="text-slate-300 italic">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manage KPI Categories */}
      <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ backgroundColor: "#FFFFFF", border: "1.5px solid #E2E8F0" }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-bold text-[#1E3A5F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>KPI Categories</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Configure what employees track for this business</p>
          </div>
          <button
            onClick={() => setShowAddCategory(v => !v)}
            className="text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-90 active:scale-[0.97]"
            style={{ backgroundColor: "#EDE9FE", color: "#5B21B6", border: "1.5px solid #C4B5FD", fontFamily: "'Space Grotesk', sans-serif" }}
          >
            + Add Category
          </button>
        </div>

        {showAddCategory && (
          <div className="rounded-xl p-4 flex flex-col gap-3" style={{ backgroundColor: "#F8F7F4", border: "1px solid #E2E0DB" }}>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="e.g. New Patients, Adjustments…"
                className="flex-1 rounded-lg px-3 py-2 text-[12px] text-[#1E3A5F] focus:outline-none"
                style={{ backgroundColor: "#FFFFFF", border: "1.5px solid #E2E0DB" }}
                onFocus={e => (e.target.style.borderColor = "#7C3AED")}
                onBlur={e => (e.target.style.borderColor = "#E2E0DB")}
              />
              <select
                value={newCatUnit}
                onChange={e => setNewCatUnit(e.target.value)}
                className="rounded-lg px-2 py-2 text-[12px] text-[#1E3A5F] focus:outline-none"
                style={{ backgroundColor: "#FFFFFF", border: "1.5px solid #E2E0DB", minWidth: 60 }}
              >
                <option value="#">#</option>
                <option value="$">$</option>
                <option value="%">%</option>
              </select>
              <select
                value={newCatFrequency}
                onChange={e => setNewCatFrequency(e.target.value as "weekly" | "monthly")}
                className="rounded-lg px-2 py-2 text-[12px] text-[#1E3A5F] focus:outline-none"
                style={{ backgroundColor: "#FFFFFF", border: "1.5px solid #E2E0DB", minWidth: 80 }}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <button
                onClick={handleAddCategory}
                disabled={createCategory.isPending}
                className="px-4 py-2 rounded-lg text-[12px] font-bold transition-all hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: "#1E3A5F", color: "white", fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {createCategory.isPending ? "…" : "Add"}
              </button>
            </div>
          </div>
        )}

        {categories.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-[12px] text-slate-400 italic">No categories yet.</p>
            <button
              onClick={() => seedDefaults.mutate({ accountId, businessSlug: selectedBusiness })}
              disabled={seedDefaults.isPending || !selectedBusiness}
              className="px-4 py-2 rounded-lg text-[12px] font-semibold transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-40"
              style={{ backgroundColor: "#EDE9FE", color: "#5B21B6", border: "1.5px solid #C4B5FD", fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {seedDefaults.isPending ? "Seeding…" : "✨ Seed Default Categories"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {categories.map(cat => (
              <div
                key={cat.id}
                className="flex items-center gap-3 py-2 px-3 rounded-lg"
                style={{ backgroundColor: "#F8F7F4" }}
              >
                <span className="text-[13px] font-semibold text-[#1E3A5F] flex-1">{cat.name}</span>
                <span className="text-[11px] text-slate-400">{cat.unit} · {cat.frequency}</span>
                <button
                  onClick={() => updateCategory.mutate({ id: cat.id, isActive: false })}
                  className="text-[11px] text-slate-300 hover:text-red-400 transition-colors px-1"
                  title="Remove category"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function KpiReporting() {
  const { person } = usePerson();
  const accountId = person?.accountId || parseInt(localStorage.getItem("bcc_account_id") ?? "0", 10);
  const personId = person?.id ?? "";
  const role = person?.role ?? "employee";
  const businessScope = person?.businessScope ?? "[]";

  const isOwner = role === "owner" || role === "coowner";

  return (
    <div className="h-full overflow-y-auto" style={{ backgroundColor: "#F8F7F4" }}>
      <div className="max-w-5xl mx-auto px-5 py-6 flex flex-col gap-6">
        {/* Header */}
        <div>
          <h1 className="text-[22px] font-bold text-[#1E3A5F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            KPI Reporting
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            {isOwner
              ? "Monthly running totals vs. your goals — the heartbeat of your business."
              : "Submit your weekly numbers and track your running monthly total."}
          </p>
        </div>

        {isOwner ? (
          <OwnerKpiDashboard accountId={accountId} />
        ) : (
          <EmployeeKpiView accountId={accountId} personId={personId} businessScope={businessScope} />
        )}
      </div>
    </div>
  );
}
