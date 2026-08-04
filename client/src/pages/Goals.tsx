/**
 * Goals — Quarterly & Annual goal tracking per business.
 * Dark navy theme: #0F2440 bg, #5EEAD4 teal accent, white text
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { usePerson } from "@/contexts/PersonContext";
import { useActiveBusiness } from "@/components/BusinessSwitcher";

type Period = "annual" | "quarterly";
type Status = "active" | "achieved" | "missed" | "deferred";
type Owner = string;

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_QUARTER = Math.ceil((new Date().getMonth() + 1) / 3) as 1 | 2 | 3 | 4;

// Dark-theme biz color pool
const BIZ_COLOR_POOL = [
  { color: "#6EE7B7", bg: "rgba(5,150,105,0.15)", border: "rgba(5,150,105,0.3)" },
  { color: "#FCD34D", bg: "rgba(217,119,6,0.15)", border: "rgba(217,119,6,0.3)" },
  { color: "#C4B5FD", bg: "rgba(124,58,237,0.15)", border: "rgba(124,58,237,0.3)" },
  { color: "#93C5FD", bg: "rgba(37,99,235,0.15)", border: "rgba(37,99,235,0.3)" },
  { color: "#FDA4AF", bg: "rgba(225,29,72,0.15)", border: "rgba(225,29,72,0.3)" },
  { color: "#5EEAD4", bg: "rgba(20,184,166,0.15)", border: "rgba(20,184,166,0.3)" },
];

function getBizStyle(idx: number) {
  return BIZ_COLOR_POOL[idx % BIZ_COLOR_POOL.length];
}

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; border: string; icon: string }> = {
  active:   { label: "Active",    color: "#93C5FD", bg: "rgba(37,99,235,0.15)", border: "rgba(37,99,235,0.3)", icon: "🎯" },
  achieved: { label: "Achieved",  color: "#6EE7B7", bg: "rgba(5,150,105,0.15)", border: "rgba(5,150,105,0.3)", icon: "✅" },
  missed:   { label: "Missed",    color: "#FDA4AF", bg: "rgba(225,29,72,0.15)", border: "rgba(225,29,72,0.3)", icon: "❌" },
  deferred: { label: "Deferred",  color: "#FCD34D", bg: "rgba(217,119,6,0.15)", border: "rgba(217,119,6,0.3)", icon: "⏸️" },
};

const OWNER_COLORS = [
  { color: "#93C5FD", bg: "rgba(37,99,235,0.15)" },
  { color: "#FDA4AF", bg: "rgba(225,29,72,0.15)" },
  { color: "#6EE7B7", bg: "rgba(5,150,105,0.15)" },
  { color: "#FCD34D", bg: "rgba(217,119,6,0.15)" },
  { color: "#C4B5FD", bg: "rgba(124,58,237,0.15)" },
];
function getOwnerStyle(owner: string, ownerNames: string[]): { label: string; color: string; bg: string } {
  if (owner === "both") return { label: "Both", color: "#5EEAD4", bg: "rgba(20,184,166,0.15)" };
  const idx = ownerNames.indexOf(owner);
  const style = OWNER_COLORS[(idx >= 0 ? idx : 0) % OWNER_COLORS.length];
  return { label: owner, color: style.color, bg: style.bg };
}

const QUARTER_LABELS: Record<number, string> = { 1: "Q1", 2: "Q2", 3: "Q3", 4: "Q4" };

interface DbBusiness {
  id: number;
  slug: string;
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
}

function bizConfig(b: DbBusiness, idx: number) {
  const style = getBizStyle(idx);
  return { label: b.name, icon: b.icon || "🏢", color: style.color, bg: style.bg, border: style.border };
}

// Shared dark input style
const darkInput = {
  backgroundColor: "rgba(255,255,255,0.06)",
  border: "1.5px solid rgba(255,255,255,0.12)",
  color: "white",
};
const darkSelect = {
  backgroundColor: "rgba(255,255,255,0.06)",
  border: "1.5px solid rgba(255,255,255,0.12)",
  color: "white",
};

// ─── Edit Goal Form ───────────────────────────────────────────────────────────

function EditGoalForm({
  goal, businesses, ownerNames, onClose, onUpdated,
}: {
  goal: { id: number; title: string; description: string | null; status: Status; owner: Owner; business: string; period: Period; quarter: number | null; year: number };
  businesses: DbBusiness[];
  ownerNames: string[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description ?? "");
  const [status, setStatus] = useState<Status>(goal.status);
  const [owner, setOwner] = useState<string>(goal.owner);

  const updateGoal = trpc.goals.update.useMutation({
    onSuccess: () => { toast.success("Goal updated!"); onUpdated(); onClose(); },
    onError: () => toast.error("Failed to update goal."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    updateGoal.mutate({ id: goal.id, title: title.trim(), description: description.trim() || undefined, status, owner });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 flex flex-col gap-5"
        style={{ backgroundColor: "#0D2035", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Edit Goal</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors" style={{ color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
          >✕</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-white/70">Goal</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all placeholder-white/30"
              style={darkInput}
              onFocus={e => (e.target.style.borderColor = "#C4B5FD")}
              onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
              autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-white/70">Details <span className="font-normal text-white/30">(optional)</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all resize-none placeholder-white/30"
              style={darkInput}
              onFocus={e => (e.target.style.borderColor = "#C4B5FD")}
              onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/70">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as Status)}
                className="rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                style={darkSelect}>
                {(["active", "achieved", "missed", "deferred"] as Status[]).map(s =>
                  <option key={s} value={s}>{STATUS_CONFIG[s].icon} {STATUS_CONFIG[s].label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/70">Owner</label>
              <select value={owner} onChange={e => setOwner(e.target.value)}
                className="rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                style={darkSelect}>
                <option value="both">Both</option>
                {ownerNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ border: "1.5px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)", backgroundColor: "transparent" }}>Cancel</button>
            <button type="submit" disabled={!title.trim() || updateGoal.isPending}
              className="flex-1 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
              style={{ backgroundColor: "#C4B5FD", color: "#0F2440" }}>
              {updateGoal.isPending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Add Goal Form ─────────────────────────────────────────────────────────────

function AddGoalForm({
  accountId, businesses, ownerNames, onClose, onCreated, personId,
}: {
  accountId: number;
  businesses: DbBusiness[];
  ownerNames: string[];
  onClose: () => void;
  onCreated: () => void;
  personId?: string;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [period, setPeriod] = useState<Period>("quarterly");
  const [quarter, setQuarter] = useState<number>(CURRENT_QUARTER);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [businessSlug, setBusinessSlug] = useState<string>(businesses[0]?.slug ?? "general");
  const [owner, setOwner] = useState<string>("both");

  const createGoal = trpc.goals.create.useMutation({
    onSuccess: () => { toast.success("Goal added!"); onCreated(); onClose(); },
    onError: () => toast.error("Failed to add goal. Please try again."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createGoal.mutate({
      accountId,
      business: (businessSlug || "general") as "chiropractic" | "crossfit" | "general",
      period,
      quarter: period === "quarterly" ? quarter : undefined,
      year,
      title: title.trim(),
      description: description.trim() || undefined,
      status: "active",
      owner,
      sortOrder: 0,
      personId: personId,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 flex flex-col gap-5"
        style={{ backgroundColor: "#0D2035", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Add New Goal</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors" style={{ color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
          >✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-white/70">Goal</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Reach 200 active patients"
              className="w-full rounded-xl px-4 py-3 text-sm placeholder-white/30 focus:outline-none transition-all"
              style={darkInput}
              onFocus={e => (e.target.style.borderColor = "#C4B5FD")}
              onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
              autoFocus />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-white/70">Details <span className="font-normal text-white/30">(optional)</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What does success look like?" rows={2}
              className="w-full rounded-xl px-4 py-3 text-sm placeholder-white/30 focus:outline-none transition-all resize-none"
              style={darkInput}
              onFocus={e => (e.target.style.borderColor = "#C4B5FD")}
              onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/70">Period</label>
              <select value={period} onChange={e => setPeriod(e.target.value as Period)}
                className="rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                style={darkSelect}>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            {period === "quarterly" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-white/70">Quarter</label>
                <select value={quarter} onChange={e => setQuarter(Number(e.target.value))}
                  className="rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  style={darkSelect}>
                  {[1,2,3,4].map(q => <option key={q} value={q}>Q{q}</option>)}
                </select>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/70">Year</label>
              <select value={year} onChange={e => setYear(Number(e.target.value))}
                className="rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                style={darkSelect}>
                {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/70">Business</label>
              <select value={businessSlug} onChange={e => setBusinessSlug(e.target.value)}
                className="rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                style={darkSelect}>
                {businesses.map(b => (
                  <option key={b.slug} value={b.slug}>{b.icon} {b.name}</option>
                ))}
                <option value="general">📋 General</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/70">Owner</label>
              <select value={owner} onChange={e => setOwner(e.target.value)}
                className="rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                style={darkSelect}>
                <option value="both">Both</option>
                {ownerNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <button type="submit" disabled={!title.trim() || createGoal.isPending}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
            style={{ backgroundColor: "#C4B5FD", color: "#0F2440", boxShadow: "0 4px 16px rgba(196,181,253,0.2)" }}>
            {createGoal.isPending ? "Adding…" : "Add Goal →"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Goal Card ─────────────────────────────────────────────────────────────────

function GoalCard({
  goal, bizStyleMap, ownerNames, onStatusChange, onDelete, onEdit,
}: {
  goal: {
    id: number; title: string; description: string | null; status: Status; owner: Owner;
    business: string; period: Period; quarter: number | null; year: number;
  };
  bizStyleMap: Record<string, { label: string; icon: string; color: string; bg: string; border: string }>;
  ownerNames: string[];
  onStatusChange: (id: number, status: Status) => void;
  onDelete: (id: number) => void;
  onEdit: (goal: any) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const statusCfg = STATUS_CONFIG[goal.status];
  const ownerCfg = getOwnerStyle(goal.owner, ownerNames);
  const bizCfg = bizStyleMap[goal.business] ?? { label: goal.business, icon: "🏢", color: "rgba(255,255,255,0.5)", bg: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.15)" };

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3 transition-all group relative"
      style={{
        backgroundColor: goal.status === "achieved" ? "rgba(5,150,105,0.08)" : "rgba(255,255,255,0.04)",
        border: `1.5px solid ${goal.status === "achieved" ? "rgba(5,150,105,0.25)" : "rgba(255,255,255,0.1)"}`,
        opacity: goal.status === "missed" || goal.status === "deferred" ? 0.6 : 1,
      }}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => {
            const next: Status = goal.status === "active" ? "achieved"
              : goal.status === "achieved" ? "active"
              : "active";
            onStatusChange(goal.id, next);
          }}
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-all hover:scale-110"
          style={{ backgroundColor: statusCfg.bg, border: `2px solid ${statusCfg.border}` }}
          title={`Mark as ${goal.status === "active" ? "achieved" : "active"}`}
        >
          {goal.status === "achieved" && <span className="text-[10px]" style={{ color: statusCfg.color }}>✓</span>}
          {goal.status === "active" && <span className="text-[10px] opacity-0 group-hover:opacity-100" style={{ color: statusCfg.color }}>✓</span>}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-snug"
            style={{ textDecoration: goal.status === "missed" ? "line-through" : "none", fontFamily: "'Space Grotesk', sans-serif" }}>
            {goal.title}
          </p>
          {goal.description && (
            <p className="text-xs mt-1 leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{goal.description}</p>
          )}
        </div>

        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowMenu(v => !v)}
            className="w-6 h-6 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
          >···</button>
          {showMenu && (
            <div className="absolute right-0 top-7 w-44 rounded-xl shadow-lg z-20 flex flex-col overflow-hidden"
              style={{ background: "#0D2035", border: "1px solid rgba(255,255,255,0.12)" }}>
              {(["active", "achieved", "missed", "deferred"] as Status[]).filter(s => s !== goal.status).map(s => (
                <button key={s} onClick={() => { onStatusChange(goal.id, s); setShowMenu(false); }}
                  className="flex items-center gap-2 px-3 py-2.5 text-[12px] font-medium transition-colors text-left"
                  style={{ color: STATUS_CONFIG[s].color }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <span>{STATUS_CONFIG[s].icon}</span> Mark {STATUS_CONFIG[s].label}
                </button>
              ))}
              <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }} />
              <button onClick={() => { onEdit(goal); setShowMenu(false); }}
                className="flex items-center gap-2 px-3 py-2.5 text-[12px] font-medium transition-colors text-left"
                style={{ color: "rgba(255,255,255,0.7)" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                ✏️ Edit
              </button>
              <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }} />
              <button onClick={() => { onDelete(goal.id); setShowMenu(false); }}
                className="flex items-center gap-2 px-3 py-2.5 text-[12px] font-medium transition-colors text-left text-red-400"
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.1)")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                🗑️ Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ backgroundColor: bizCfg.bg, color: bizCfg.color, border: `1px solid ${bizCfg.border}` }}>
          {bizCfg.icon} {bizCfg.label}
        </span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ backgroundColor: ownerCfg.bg, color: ownerCfg.color }}>
          {ownerCfg.label}
        </span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ backgroundColor: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}>
          {statusCfg.icon} {statusCfg.label}
        </span>
      </div>
    </div>
  );
}

// ─── Main Goals Page ───────────────────────────────────────────────────────────

export default function Goals() {
  const { person } = usePerson();
  const [, navigate] = useLocation();
  const accountId = person?.accountId ?? (() => {
    const stored = localStorage.getItem("bcc_account_id");
    return stored ? parseInt(stored, 10) : undefined;
  })();
  const personScope = person?.businessScope ?? "all";
  const { activeBusiness } = useActiveBusiness(personScope);

  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<typeof goalsData[0] | null>(null);

  const { data: dbBusinesses = [] } = trpc.business.list.useQuery(
    { accountId: accountId ?? 0 },
    { enabled: accountId !== undefined }
  );

  const { data: personsData = [] } = trpc.person.list.useQuery(
    { accountId: accountId ?? 0 },
    { enabled: accountId !== undefined }
  );
  const ownerNames = useMemo(
    () => personsData.filter(p => p.role === "owner" || p.role === "coowner").map(p => p.name),
    [personsData]
  );

  const allowedBusinesses = useMemo<DbBusiness[]>(() => {
    if (!dbBusinesses.length) return [];
    if (personScope === "all") return dbBusinesses;
    const scopes = personScope.split(",").map(s => s.trim());
    return dbBusinesses.filter(b => scopes.includes(b.slug));
  }, [dbBusinesses, personScope]);

  const bizStyleMap = useMemo(() => {
    const map: Record<string, { label: string; icon: string; color: string; bg: string; border: string }> = {
      general: { label: "General", icon: "📋", color: "rgba(255,255,255,0.5)", bg: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.15)" },
    };
    dbBusinesses.forEach((b, idx) => { map[b.slug] = bizConfig(b, idx); });
    return map;
  }, [dbBusinesses]);

  const { data: goalsData = [], refetch } = trpc.goals.list.useQuery(
    { accountId: accountId ?? 0, year: selectedYear, personId: person?.id },
    { enabled: accountId !== undefined }
  );

  const updateGoal = trpc.goals.update.useMutation({
    onSuccess: () => refetch(),
    onError: () => toast.error("Failed to update goal."),
  });

  const deleteGoal = trpc.goals.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Goal deleted."); },
    onError: () => toast.error("Failed to delete goal."),
  });

  const handleStatusChange = (id: number, status: Status) => updateGoal.mutate({ id, status });
  const handleDelete = (id: number) => { if (confirm("Delete this goal?")) deleteGoal.mutate({ id }); };

  // Filter goals by active business from sidebar switcher
  const activeDbSlug = activeBusiness === "chiro" ? "chiropractic" : activeBusiness === "crossfit" ? "crossfit" : null;
  const filteredGoals = activeDbSlug
    ? goalsData.filter(g => g.business === activeDbSlug)
    : goalsData;

  const annualGoals = filteredGoals.filter(g => g.period === "annual");
  const quarterlyGoals = [1, 2, 3, 4].map(q => ({
    quarter: q,
    goals: filteredGoals.filter(g => g.period === "quarterly" && g.quarter === q),
  }));

  const total = filteredGoals.length;
  const achieved = filteredGoals.filter(g => g.status === "achieved").length;
  const active = filteredGoals.filter(g => g.status === "active").length;
  const pct = total > 0 ? Math.round((achieved / total) * 100) : 0;

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: "#0F2440", fontFamily: "'Inter', sans-serif" }}>
      {/* Page title bar */}
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", backgroundColor: "#0A1929" }}>
        <div className="flex items-center gap-2.5">
          <span className="text-lg">🎯</span>
          <h1 className="text-base font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Goals</h1>
          <span className="text-[10px] hidden sm:block" style={{ color: "rgba(255,255,255,0.35)" }}>Quarterly & annual targets</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/app/board")}
            className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all active:scale-[0.97]"
            style={{ color: "#5EEAD4", backgroundColor: "rgba(94,234,212,0.1)", border: "1px solid rgba(94,234,212,0.25)" }}
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Hub
          </button>
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
            className="rounded-lg px-2 py-1.5 text-xs font-semibold focus:outline-none"
            style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "white" }}>
            {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:opacity-90 active:scale-[0.97]"
            style={{ backgroundColor: "#C4B5FD", color: "#0F2440", boxShadow: "0 2px 8px rgba(196,181,253,0.2)" }}>
            + Add Goal
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {total > 0 && (
        <div className="px-5 py-3 flex items-center gap-4 flex-wrap flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", backgroundColor: "#0D2035" }}>
          <div className="flex items-center gap-2">
            <div className="h-2 rounded-full overflow-hidden flex-shrink-0" style={{ width: 120, backgroundColor: "rgba(255,255,255,0.1)" }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#6EE7B7" : "#C4B5FD" }} />
            </div>
            <span className="text-xs font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {pct}% achieved
            </span>
          </div>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{achieved} of {total} goals</span>
          {active > 0 && <span className="text-xs font-medium" style={{ color: "#93C5FD" }}>{active} active</span>}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{ backgroundColor: "rgba(196,181,253,0.15)" }}>🎯</div>
            <div className="text-center">
              <p className="text-base font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>No goals for {selectedYear} yet</p>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Set your first quarterly or annual goal to get started.</p>
            </div>
            <button onClick={() => setShowAddForm(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-[0.97]"
              style={{ backgroundColor: "#C4B5FD", color: "#0F2440", boxShadow: "0 4px 16px rgba(196,181,253,0.2)" }}>
              + Add Your First Goal
            </button>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto flex flex-col gap-8">
            {/* Annual goals */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🗓️</span>
                <h2 className="text-sm font-bold text-white uppercase tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Annual — {selectedYear}
                </h2>
                <span className="text-xs ml-auto" style={{ color: "rgba(255,255,255,0.35)" }}>{annualGoals.length} goal{annualGoals.length !== 1 ? "s" : ""}</span>
              </div>
              {annualGoals.length === 0 ? (
                <div className="rounded-xl p-4 text-center" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1.5px dashed rgba(255,255,255,0.12)" }}>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>No annual goals yet — <button onClick={() => setShowAddForm(true)} className="font-medium hover:underline" style={{ color: "#C4B5FD" }}>add one</button></p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {annualGoals.map(g => (
                    <GoalCard key={g.id} goal={g as any} bizStyleMap={bizStyleMap} ownerNames={ownerNames}
                      onStatusChange={handleStatusChange} onDelete={handleDelete}
                      onEdit={g2 => setEditingGoal(g2 as any)} />
                  ))}
                </div>
              )}
            </section>

            {/* Quarterly goals */}
            {quarterlyGoals.map(({ quarter, goals: qGoals }) => {
              const isCurrentQ = selectedYear === CURRENT_YEAR && quarter === CURRENT_QUARTER;
              return (
                <section key={quarter}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: isCurrentQ ? "#C4B5FD" : "rgba(255,255,255,0.08)", color: isCurrentQ ? "#0F2440" : "rgba(255,255,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}>
                      {QUARTER_LABELS[quarter]}
                    </span>
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {isCurrentQ ? "Current Quarter" : `Quarter ${quarter}`}
                    </h2>
                    <span className="text-xs ml-auto" style={{ color: "rgba(255,255,255,0.35)" }}>{qGoals.length} goal{qGoals.length !== 1 ? "s" : ""}</span>
                  </div>
                  {qGoals.length === 0 ? (
                    <div className="rounded-xl p-4 text-center" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1.5px dashed rgba(255,255,255,0.12)" }}>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>No Q{quarter} goals — <button onClick={() => setShowAddForm(true)} className="font-medium hover:underline" style={{ color: "#C4B5FD" }}>add one</button></p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {qGoals.map(g => (
                        <GoalCard key={g.id} goal={g as any} bizStyleMap={bizStyleMap} ownerNames={ownerNames}
                          onStatusChange={handleStatusChange} onDelete={handleDelete}
                          onEdit={g2 => setEditingGoal(g2 as any)} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {showAddForm && (
        <AddGoalForm accountId={accountId ?? 0} businesses={allowedBusinesses} ownerNames={ownerNames}
          onClose={() => setShowAddForm(false)} onCreated={() => refetch()} personId={person?.id} />
      )}

      {editingGoal && (
        <EditGoalForm goal={editingGoal as any} businesses={allowedBusinesses} ownerNames={ownerNames}
          onClose={() => setEditingGoal(null)} onUpdated={() => refetch()} />
      )}
    </div>
  );
}
