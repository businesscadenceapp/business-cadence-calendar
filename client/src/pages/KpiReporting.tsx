/**
 * KPI Reporting Page — dark navy theme (#0F2440 bg, #5EEAD4 teal accent)
 */

import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { usePerson } from "@/contexts/PersonContext";
import { useActiveBusiness } from "@/components/BusinessSwitcher";
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

const darkInput = {
  backgroundColor: "rgba(255,255,255,0.06)",
  border: "1.5px solid rgba(255,255,255,0.12)",
  color: "white",
};

// ─── Employee View ────────────────────────────────────────────────────────────

function EmployeeKpiView({ accountId, personId, businessScope, forcedBusiness }: {
  accountId: number;
  personId: string;
  businessScope: string;
  forcedBusiness?: string | null;
}) {
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentWeekKey());
  const [values, setValues] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});

  const businessesQuery = trpc.business.list.useQuery({ accountId }, { staleTime: 60_000 });
  const dbBusinessSlugs = useMemo(() => (businessesQuery.data ?? []).map(b => b.slug), [businessesQuery.data]);
  const scopes = useMemo(() => {
    if (businessScope === "all") return dbBusinessSlugs.length > 0 ? dbBusinessSlugs : ["general"];
    try { return JSON.parse(businessScope) as string[]; } catch { return [businessScope]; }
  }, [businessScope, dbBusinessSlugs]);

  const primarySlug = forcedBusiness ?? scopes[0] ?? "general";
  const currentMonth = getCurrentMonthKey();

  const categoriesQuery = trpc.kpi.listCategories.useQuery(
    { accountId, businessSlug: primarySlug },
    { staleTime: 60_000 }
  );

  const entriesQuery = trpc.kpi.getEntries.useQuery(
    { accountId, businessSlug: primarySlug, periodKey: selectedPeriod },
    { staleTime: 30_000 }
  );

  const monthlyTotalsQuery = trpc.kpi.getMonthlyTotals.useQuery(
    { accountId, businessSlug: primarySlug, yearMonth: currentMonth },
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

  const myMonthlyTotals = useMemo(() => {
    const map: Record<number, number> = {};
    for (const t of monthlyTotals) {
      if (t.personId === personId) map[t.categoryId] = t.total;
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
        <span className="text-sm animate-pulse" style={{ color: "rgba(255,255,255,0.4)" }}>Loading your KPIs…</span>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="rounded-2xl p-10 text-center flex flex-col items-center gap-4"
        style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1.5px dashed rgba(255,255,255,0.12)" }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
          style={{ backgroundColor: "rgba(124,58,237,0.2)" }}>📊</div>
        <div>
          <p className="text-[14px] font-semibold text-white">No KPI categories set up yet</p>
          <p className="text-[12px] mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Your owner will configure your KPI categories soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Period selector */}
      <div className="flex items-center gap-3">
        <label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>
          Period
        </label>
        <select
          value={selectedPeriod}
          onChange={e => setSelectedPeriod(e.target.value)}
          className="rounded-lg px-3 py-2 text-[12px] focus:outline-none"
          style={{ ...darkInput, fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {weekOptions.map(w => (
            <option key={w} value={w}>{formatPeriod(w)}{w === getCurrentWeekKey() ? " (current)" : ""}</option>
          ))}
        </select>
      </div>

      {/* KPI input cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {categories.map(cat => {
          const existing = existingValues[cat.id];
          const inputVal = values[cat.id] ?? (existing !== undefined ? String(existing) : "");
          const isSaved = existing !== undefined && String(existing) === inputVal;
          const myTotal = myMonthlyTotals[cat.id] ?? 0;
          const target = (cat as any).monthlyTarget as number | null;
          const showGoal = (cat as any).showGoalToStaff as boolean;

          return (
            <div key={cat.id} className="rounded-2xl p-5 flex flex-col gap-3"
              style={{
                backgroundColor: isSaved ? "rgba(5,150,105,0.08)" : "rgba(255,255,255,0.04)",
                border: `1.5px solid ${isSaved ? "rgba(5,150,105,0.4)" : "rgba(255,255,255,0.1)"}`,
              }}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[14px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {cat.name}
                  </p>
                  <p className="text-[11px] mt-0.5 capitalize" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {cat.frequency} · unit: {cat.unit}
                  </p>
                </div>
                {isSaved && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: "rgba(5,150,105,0.2)", color: "#6EE7B7" }}>
                    ✓ Saved
                  </span>
                )}
              </div>

              {/* Monthly running total + goal */}
              {showGoal && target !== null && (
                <div className="rounded-xl px-3 py-2.5 flex items-center justify-between"
                  style={{ backgroundColor: "rgba(5,150,105,0.1)", border: "1px solid rgba(5,150,105,0.25)" }}>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#6EE7B7" }}>This Month</p>
                    <p className="text-[18px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {myTotal}
                      <span className="text-[11px] font-normal ml-1" style={{ color: "rgba(255,255,255,0.5)" }}>/ Goal: {target} {cat.unit}</span>
                    </p>
                  </div>
                  <div className="w-20 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.round((myTotal / target) * 100))}%`,
                        backgroundColor: myTotal >= target ? "#10B981" : "#34D399",
                      }} />
                  </div>
                </div>
              )}

              {!showGoal && (
                <div className="rounded-xl px-3 py-2 flex items-center gap-2"
                  style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>Month Total</p>
                  <p className="text-[16px] font-bold text-white ml-auto" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {myTotal} <span className="text-[11px] font-normal" style={{ color: "rgba(255,255,255,0.4)" }}>{cat.unit}</span>
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={inputVal}
                  onChange={e => setValues(v => ({ ...v, [cat.id]: e.target.value }))}
                  placeholder={`Enter ${cat.unit === "#" ? "count" : cat.unit === "$" ? "amount" : "value"}…`}
                  className="flex-1 rounded-xl px-3 py-2.5 text-[14px] font-bold focus:outline-none transition-all placeholder-white/30"
                  style={{ ...darkInput, fontFamily: "'Space Grotesk', sans-serif" }}
                  onFocus={e => (e.target.style.borderColor = "#C4B5FD")}
                  onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                />
                <span className="text-[12px] font-medium w-6 text-center" style={{ color: "rgba(255,255,255,0.4)" }}>{cat.unit}</span>
                <button
                  onClick={() => handleSave(cat.id)}
                  disabled={saving[cat.id] || !inputVal.trim()}
                  className="px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-40"
                  style={{ backgroundColor: "#1E3A5F", color: "white", fontFamily: "'Space Grotesk', sans-serif" }}>
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

// ─── Category Editor Row ──────────────────────────────────────────────────────

function CategoryEditorRow({ cat, onUpdated }: {
  cat: { id: number; name: string; unit: string; frequency: string; isActive: boolean; monthlyTarget?: number | null; showGoalToStaff?: boolean };
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState(cat.monthlyTarget != null ? String(cat.monthlyTarget) : "");
  const [showGoal, setShowGoal] = useState(cat.showGoalToStaff ?? false);
  const [saving, setSaving] = useState(false);

  const updateCategory = trpc.kpi.updateCategory.useMutation({
    onSuccess: () => { setSaving(false); setEditing(false); toast.success("Category updated!"); onUpdated(); },
    onError: () => { setSaving(false); toast.error("Failed to update category."); },
  });

  const handleSave = () => {
    setSaving(true);
    const numTarget = target.trim() ? parseFloat(target) : null;
    updateCategory.mutate({ id: cat.id, monthlyTarget: isNaN(numTarget as number) ? null : numTarget, showGoalToStaff: showGoal });
  };

  const toggleActive = () => {
    updateCategory.mutate({ id: cat.id, isActive: !cat.isActive });
    onUpdated();
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1.5px solid rgba(255,255,255,0.1)", opacity: cat.isActive ? 1 : 0.5 }}>
      <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {cat.name}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            {cat.unit} · {cat.frequency}
            {cat.monthlyTarget != null && (
              <span className="ml-2 font-semibold" style={{ color: "#6EE7B7" }}>
                Goal: {cat.monthlyTarget} {cat.unit}/mo
                {cat.showGoalToStaff ? " · visible to staff" : " · owner only"}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setEditing(v => !v)}
          className="text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all hover:opacity-80"
          style={{ backgroundColor: "rgba(124,58,237,0.2)", color: "#C4B5FD", border: "1px solid rgba(124,58,237,0.3)" }}>
          {editing ? "Cancel" : "Edit Goal"}
        </button>
        <button
          onClick={toggleActive}
          className="text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all hover:opacity-80"
          style={{
            backgroundColor: cat.isActive ? "rgba(239,68,68,0.1)" : "rgba(5,150,105,0.1)",
            color: cat.isActive ? "#FDA4AF" : "#6EE7B7",
            border: `1px solid ${cat.isActive ? "rgba(239,68,68,0.25)" : "rgba(5,150,105,0.25)"}`,
          }}>
          {cat.isActive ? "Deactivate" : "Activate"}
        </button>
      </div>

      {editing && (
        <div className="px-4 py-4 flex flex-col gap-3" style={{ backgroundColor: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
                Monthly Goal ({cat.unit})
              </label>
              <input
                type="number"
                value={target}
                onChange={e => setTarget(e.target.value)}
                placeholder="e.g. 36"
                className="rounded-lg px-3 py-2 text-[13px] font-bold focus:outline-none w-28 placeholder-white/30"
                style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", color: "white" }}
                onFocus={e => (e.target.style.borderColor = "#C4B5FD")}
                onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
                Show Goal to Staff
              </label>
              <button
                onClick={() => setShowGoal(v => !v)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold transition-all"
                style={{
                  backgroundColor: showGoal ? "rgba(5,150,105,0.1)" : "rgba(255,255,255,0.05)",
                  border: `1.5px solid ${showGoal ? "rgba(5,150,105,0.3)" : "rgba(255,255,255,0.12)"}`,
                  color: showGoal ? "#6EE7B7" : "rgba(255,255,255,0.5)",
                }}>
                <span className="w-8 h-4 rounded-full relative transition-all"
                  style={{ backgroundColor: showGoal ? "#10B981" : "rgba(255,255,255,0.2)" }}>
                  <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
                    style={{ left: showGoal ? "calc(100% - 14px)" : "2px" }} />
                </span>
                {showGoal ? "Visible to staff" : "Owner only"}
              </button>
            </div>

            <div className="flex flex-col gap-1 justify-end" style={{ paddingTop: 18 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-[12px] font-bold transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-40"
                style={{ backgroundColor: "#1E3A5F", color: "white", fontFamily: "'Space Grotesk', sans-serif" }}>
                {saving ? "Saving…" : "Save Goal"}
              </button>
            </div>
          </div>

          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            {showGoal
              ? "Staff will see their running monthly total alongside this goal when submitting numbers."
              : "Only owners and co-owners will see this goal. Staff will see their running total without the target."}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Owner Dashboard View ─────────────────────────────────────────────────────

function OwnerKpiDashboard({ accountId, forcedBusiness }: { accountId: number; forcedBusiness?: string | null }) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());

  const businessesQuery = trpc.business.list.useQuery({ accountId }, { staleTime: 60_000 });
  const dbBusinesses = businessesQuery.data ?? [];
  const [selectedBusiness, setSelectedBusiness] = useState("");

  // Sync with sidebar business switcher
  useEffect(() => {
    if (forcedBusiness && dbBusinesses.some(b => b.slug === forcedBusiness)) {
      setSelectedBusiness(forcedBusiness);
    } else if (dbBusinesses.length > 0 && !selectedBusiness) {
      setSelectedBusiness(dbBusinesses[0].slug);
    }
  }, [forcedBusiness, dbBusinesses.length, selectedBusiness]);

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

  const categories = categoriesQuery.data?.filter(c => c.isActive) ?? [];
  const allCategories = categoriesQuery.data ?? [];
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

  const categoryTotals = useMemo(() => {
    const m: Record<number, number> = {};
    for (const t of monthlyTotals) m[t.categoryId] = (m[t.categoryId] ?? 0) + t.total;
    return m;
  }, [monthlyTotals]);

  const categoryGoalMeta = useMemo(() => {
    const m: Record<number, { monthlyTarget: number | null; showGoalToStaff: boolean }> = {};
    for (const t of monthlyTotals) {
      if (!m[t.categoryId]) m[t.categoryId] = { monthlyTarget: (t as any).monthlyTarget ?? null, showGoalToStaff: (t as any).showGoalToStaff ?? false };
    }
    for (const cat of categories) {
      if (!m[cat.id]) m[cat.id] = { monthlyTarget: (cat as any).monthlyTarget ?? null, showGoalToStaff: (cat as any).showGoalToStaff ?? false };
    }
    return m;
  }, [monthlyTotals, categories]);

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatUnit, setNewCatUnit] = useState("#");
  const [newCatFrequency, setNewCatFrequency] = useState<"weekly" | "monthly">("weekly");

  const seedDefaults = trpc.kpi.seedDefaults.useMutation({
    onSuccess: (result) => {
      if (result.seeded) toast.success(`Seeded ${result.count} default KPI categories!`);
      else toast.info("Categories already exist — nothing seeded.");
      categoriesQuery.refetch();
    },
    onError: () => toast.error("Failed to seed defaults."),
  });

  const createCategory = trpc.kpi.createCategory.useMutation({
    onSuccess: () => { setNewCatName(""); setShowAddCategory(false); toast.success("KPI category added!"); categoriesQuery.refetch(); },
    onError: () => toast.error("Failed to add category."),
  });

  const handleAddCategory = () => {
    if (!newCatName.trim()) { toast.error("Please enter a category name."); return; }
    createCategory.mutate({ accountId, businessSlug: selectedBusiness, name: newCatName.trim(), unit: newCatUnit, frequency: newCatFrequency, sortOrder: categories.length });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Business selector */}
      {businesses.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {businesses.map(b => (
            <button key={b.slug} onClick={() => setSelectedBusiness(b.slug)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5"
              style={{
                backgroundColor: selectedBusiness === b.slug ? "#1E3A5F" : "rgba(255,255,255,0.05)",
                color: selectedBusiness === b.slug ? "white" : "rgba(255,255,255,0.5)",
                border: `1.5px solid ${selectedBusiness === b.slug ? "#5EEAD4" : "rgba(255,255,255,0.1)"}`,
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
              {b.icon} {b.label}
            </button>
          ))}
        </div>
      )}

      {/* Monthly Totals vs Goals */}
      <div className="rounded-2xl p-5 flex flex-col gap-4"
        style={{ background: "linear-gradient(135deg, rgba(94,234,212,0.07) 0%, rgba(94,234,212,0.03) 100%)", border: "1.5px solid rgba(94,234,212,0.2)", boxShadow: "0 4px 24px rgba(94,234,212,0.06)" }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(94,234,212,0.18)", border: "1px solid rgba(94,234,212,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📈</div>
            <div>
              <h3 className="text-[15px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Monthly Totals</h3>
              <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Running totals for the month, compared to your goals</p>
            </div>
          </div>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-[12px] focus:outline-none"
            style={{ ...darkInput, fontFamily: "'Space Grotesk', sans-serif" }}>
            {monthOptions.map(m => (
              <option key={m} value={m}>{formatPeriod(m)}{m === getCurrentMonthKey() ? " (current)" : ""}</option>
            ))}
          </select>
        </div>

        {categories.length === 0 ? (
          <p className="text-[12px] italic" style={{ color: "rgba(255,255,255,0.3)" }}>No KPI categories configured for this business yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map(cat => {
              const total = categoryTotals[cat.id] ?? 0;
              const meta = categoryGoalMeta[cat.id];
              const target = meta?.monthlyTarget ?? null;
              const pct = target ? Math.min(100, Math.round((total / target) * 100)) : null;
              const onTrack = target !== null && total >= target;

              return (
                <div key={cat.id} className="rounded-xl p-4 flex flex-col gap-2"
                  style={{
                    backgroundColor: onTrack ? "rgba(5,150,105,0.08)" : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${onTrack ? "rgba(5,150,105,0.3)" : "rgba(255,255,255,0.08)"}`,
                  }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>
                    {cat.name}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[28px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{total}</span>
                    <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>{cat.unit}</span>
                    {target !== null && (
                      <span className="text-[12px] font-semibold ml-auto" style={{ color: onTrack ? "#6EE7B7" : "rgba(255,255,255,0.5)" }}>
                        / {target} goal
                      </span>
                    )}
                  </div>
                  {pct !== null && (
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: onTrack ? "#10B981" : pct >= 75 ? "#F59E0B" : "#7C3AED" }} />
                    </div>
                  )}
                  {target !== null && (
                    <p className="text-[10px]" style={{ color: meta?.showGoalToStaff ? "#6EE7B7" : "rgba(255,255,255,0.3)" }}>
                      {meta?.showGoalToStaff ? "👁 Goal visible to staff" : "🔒 Owner only"}
                    </p>
                  )}
                  {target === null && (
                    <p className="text-[10px] italic" style={{ color: "rgba(255,255,255,0.3)" }}>No goal set — click Edit Goal below</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* This Week — per-employee matrix */}
      <div className="rounded-2xl p-5 flex flex-col gap-4"
        style={{ background: "linear-gradient(135deg, rgba(56,189,248,0.07) 0%, rgba(56,189,248,0.03) 100%)", border: "1.5px solid rgba(56,189,248,0.2)", boxShadow: "0 4px 24px rgba(56,189,248,0.06)" }}>
        <div className="flex items-center gap-3">
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(56,189,248,0.18)", border: "1px solid rgba(56,189,248,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📅</div>
          <div>
            <h3 className="text-[15px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>This Week — {formatPeriod(currentWeekKey)}</h3>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Employee submissions for the current week</p>
          </div>
        </div>

        {categories.length === 0 ? (
          <p className="text-[12px] italic" style={{ color: "rgba(255,255,255,0.3)" }}>No KPI categories configured for this business yet.</p>
        ) : employees.length === 0 ? (
          <p className="text-[12px] italic" style={{ color: "rgba(255,255,255,0.3)" }}>No employees assigned to this business yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr>
                  <th className="text-left py-2 pr-4 text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Space Grotesk', sans-serif" }}>Employee</th>
                  {categories.map(cat => (
                    <th key={cat.id} className="text-right py-2 px-3 text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Space Grotesk', sans-serif" }}>
                      {cat.name}
                      <span className="ml-1 normal-case font-normal" style={{ color: "rgba(255,255,255,0.2)" }}>({cat.unit})</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <td className="py-2.5 pr-4 font-semibold text-white">{emp.name}</td>
                    {categories.map(cat => {
                      const val = weekMatrix[cat.id]?.[emp.id];
                      return (
                        <td key={cat.id} className="py-2.5 px-3 text-right">
                          {val !== undefined ? (
                            <span className="font-bold text-white">{val}</span>
                          ) : (
                            <span className="italic" style={{ color: "rgba(255,255,255,0.2)" }}>—</span>
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
      <div className="rounded-2xl p-5 flex flex-col gap-4"
        style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(124,58,237,0.04) 100%)", border: "1.5px solid rgba(124,58,237,0.22)", boxShadow: "0 4px 24px rgba(124,58,237,0.08)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🎯</div>
            <div>
              <h3 className="text-[15px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>KPI Categories &amp; Goals</h3>
              <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Set monthly targets and control what staff can see</p>
            </div>
          </div>
          <button onClick={() => setShowAddCategory(v => !v)}
            className="text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-90 active:scale-[0.97]"
            style={{ backgroundColor: "rgba(124,58,237,0.2)", color: "#C4B5FD", border: "1.5px solid rgba(124,58,237,0.3)", fontFamily: "'Space Grotesk', sans-serif" }}>
            + Add Category
          </button>
        </div>

        {showAddCategory && (
          <div className="rounded-xl p-4 flex flex-col gap-3"
            style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex gap-2 flex-wrap">
              <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)}
                placeholder="e.g. New Patients, Adjustments…"
                className="flex-1 rounded-lg px-3 py-2 text-[12px] focus:outline-none min-w-40 placeholder-white/30"
                style={darkInput}
                onFocus={e => (e.target.style.borderColor = "#C4B5FD")}
                onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
              <select value={newCatUnit} onChange={e => setNewCatUnit(e.target.value)}
                className="rounded-lg px-2 py-2 text-[12px] focus:outline-none"
                style={{ ...darkInput, minWidth: 60 }}>
                <option value="#">#</option>
                <option value="$">$</option>
                <option value="%">%</option>
              </select>
              <select value={newCatFrequency} onChange={e => setNewCatFrequency(e.target.value as "weekly" | "monthly")}
                className="rounded-lg px-2 py-2 text-[12px] focus:outline-none"
                style={{ ...darkInput, minWidth: 80 }}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <button onClick={handleAddCategory} disabled={createCategory.isPending}
                className="px-4 py-2 rounded-lg text-[12px] font-bold transition-all hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: "#1E3A5F", color: "white", fontFamily: "'Space Grotesk', sans-serif" }}>
                {createCategory.isPending ? "…" : "Add"}
              </button>
            </div>
          </div>
        )}

        {allCategories.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-[12px] italic" style={{ color: "rgba(255,255,255,0.3)" }}>No categories yet.</p>
            <button
              onClick={() => seedDefaults.mutate({ accountId, businessSlug: selectedBusiness })}
              disabled={seedDefaults.isPending || !selectedBusiness}
              className="px-4 py-2 rounded-lg text-[12px] font-semibold transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-40"
              style={{ backgroundColor: "rgba(124,58,237,0.2)", color: "#C4B5FD", border: "1.5px solid rgba(124,58,237,0.3)", fontFamily: "'Space Grotesk', sans-serif" }}>
              {seedDefaults.isPending ? "Seeding…" : "✨ Seed Default Categories"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {allCategories.map(cat => (
              <CategoryEditorRow key={cat.id} cat={cat as any} onUpdated={() => categoriesQuery.refetch()} />
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

  if (!person) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Please sign in to view KPI reports.</p>
      </div>
    );
  }

  const accountId = person.accountId ?? (() => {
    const stored = localStorage.getItem("bcc_account_id");
    return stored ? parseInt(stored, 10) : 0;
  })();
  const isOwner = person.role === "owner" || person.role === "coowner";
  const { activeBusiness } = useActiveBusiness(person.businessScope);
  // Map switcher key to DB slug
  const activeDbSlug = activeBusiness === "chiro" ? "chiropractic" : activeBusiness === "crossfit" ? "crossfit" : null;

  return (
    <div className="h-full overflow-y-auto" style={{ backgroundColor: "#0A1929", fontFamily: "'Inter', sans-serif" }}>
      {/* Hero header */}
      <div style={{
        background: "linear-gradient(135deg, #0D2035 0%, #0F2440 50%, #0D1F38 100%)",
        borderBottom: "1px solid rgba(196,181,253,0.15)",
        padding: "24px 20px 20px",
        position: "relative",
        overflow: "hidden",
      }}>
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg mb-3 transition-all active:scale-[0.97]"
          style={{ color: "#5EEAD4", backgroundColor: "rgba(94,234,212,0.1)", border: "1px solid rgba(94,234,212,0.25)" }}
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back to Hub
        </button>
        <div style={{
          position: "absolute", top: "-40px", right: "-40px",
          width: "200px", height: "200px",
          background: "radial-gradient(circle, rgba(196,181,253,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div className="flex items-center gap-2.5 mb-1.5">
          <div style={{
            width: 32, height: 32, borderRadius: "10px",
            background: "linear-gradient(135deg, rgba(196,181,253,0.25) 0%, rgba(196,181,253,0.1) 100%)",
            border: "1px solid rgba(196,181,253,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "16px", boxShadow: "0 0 12px rgba(196,181,253,0.15)",
          }}>📊</div>
          <span className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: "#C4B5FD", fontFamily: "'Space Grotesk', sans-serif" }}>
            {isOwner ? "KPI Dashboard" : "My KPIs"}
          </span>
        </div>
        <h1 className="text-[22px] font-black text-white leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
          {isOwner ? "Numbers at a Glance" : "Track Your Numbers"}
        </h1>
        <p className="text-[12px] mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
          {isOwner
            ? "Monthly running totals, goals, and weekly employee submissions."
            : "Submit your weekly numbers and track your progress toward monthly goals."}
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-5 py-4 sm:py-6">
        {isOwner ? (
          <OwnerKpiDashboard accountId={accountId} forcedBusiness={activeDbSlug} />
        ) : (
          <EmployeeKpiView accountId={accountId} personId={person.id} businessScope={person.businessScope} forcedBusiness={activeDbSlug} />
        )}
      </div>
    </div>
  );
}
