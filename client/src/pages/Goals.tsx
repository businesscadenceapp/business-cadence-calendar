/**
 * Goals — Quarterly & Annual goal tracking per business.
 * Owners can set, track, and mark goals as achieved/missed/deferred.
 * Goals are organized by year → period (Annual / Q1–Q4) → business.
 *
 * Design: premium, warm off-white palette matching the rest of the app.
 * Matt = Blue, Lynn = Rose, Both = Teal
 */
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getBusinessSelection } from "./ClientLogin";

type Business = "chiropractic" | "crossfit" | "realty" | "general";
type Period = "annual" | "quarterly";
type Status = "active" | "achieved" | "missed" | "deferred";
type Owner = "Matt" | "Lynn" | "both";

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_QUARTER = Math.ceil((new Date().getMonth() + 1) / 3) as 1 | 2 | 3 | 4;

const BUSINESS_CONFIG: Record<Business, { label: string; icon: string; color: string; bg: string; border: string }> = {
  chiropractic: { label: "Chiropractic",  icon: "🦴", color: "#065F46", bg: "#D1FAE5", border: "#6EE7B7" },
  crossfit:     { label: "CrossFit",      icon: "💪", color: "#92400E", bg: "#FEF3C7", border: "#FCD34D" },
  realty:       { label: "Realty",        icon: "🏠", color: "#5B21B6", bg: "#EDE9FE", border: "#C4B5FD" },
  general:      { label: "General",       icon: "📋", color: "#475569", bg: "#F1F5F9", border: "#CBD5E1" },
};

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; border: string; icon: string }> = {
  active:   { label: "Active",    color: "#1D4ED8", bg: "#DBEAFE", border: "#93C5FD", icon: "🎯" },
  achieved: { label: "Achieved",  color: "#065F46", bg: "#D1FAE5", border: "#6EE7B7", icon: "✅" },
  missed:   { label: "Missed",    color: "#9F1239", bg: "#FFE4E6", border: "#FDA4AF", icon: "❌" },
  deferred: { label: "Deferred",  color: "#92400E", bg: "#FEF3C7", border: "#FCD34D", icon: "⏸️" },
};

const OWNER_CONFIG: Record<Owner, { label: string; color: string; bg: string }> = {
  Matt: { label: "Matt",  color: "#1D4ED8", bg: "#DBEAFE" },
  Lynn: { label: "Lynn",  color: "#BE123C", bg: "#FFE4E6" },
  both: { label: "Both",  color: "#0F766E", bg: "#CCFBF1" },
};

const QUARTER_LABELS: Record<number, string> = { 1: "Q1", 2: "Q2", 3: "Q3", 4: "Q4" };

// ─── Edit Goal Form ───────────────────────────────────────────────────────────

function EditGoalForm({
  goal,
  businessScope,
  onClose,
  onUpdated,
}: {
  goal: { id: number; title: string; description: string | null; status: Status; owner: Owner; business: Business; period: Period; quarter: number | null; year: number };
  businessScope: ReturnType<typeof getBusinessSelection>;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description ?? "");
  const [period, setPeriod] = useState<Period>(goal.period);
  const [quarter, setQuarter] = useState<number>(goal.quarter ?? CURRENT_QUARTER);
  const [year, setYear] = useState(goal.year);
  const [business, setBusiness] = useState<Business>(goal.business);
  const [owner, setOwner] = useState<Owner>(goal.owner);
  const [status, setStatus] = useState<Status>(goal.status);

  const visibleBusinesses = useMemo<Business[]>(() => {
    if (businessScope === "chiro") return ["chiropractic"];
    if (businessScope === "crossfit") return ["crossfit"];
    return ["chiropractic", "crossfit", "realty", "general"];
  }, [businessScope]);

  const updateGoal = trpc.goals.update.useMutation({
    onSuccess: () => { toast.success("Goal updated!"); onUpdated(); onClose(); },
    onError: () => toast.error("Failed to update goal."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    updateGoal.mutate({
      id: goal.id,
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      owner,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 flex flex-col gap-5"
        style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E0DB", boxShadow: "0 20px 60px rgba(30,58,95,0.15)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1E3A5F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Edit Goal</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-400">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#1E3A5F]">Goal</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm text-[#1A1A2E] focus:outline-none transition-all" style={{ backgroundColor: "#F8F7F4", border: "1.5px solid #E2E0DB" }} onFocus={e => (e.target.style.borderColor = "#7C3AED")} onBlur={e => (e.target.style.borderColor = "#E2E0DB")} autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#1E3A5F]">Details <span className="font-normal text-slate-400">(optional)</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full rounded-xl px-4 py-3 text-sm text-[#1A1A2E] focus:outline-none transition-all resize-none" style={{ backgroundColor: "#F8F7F4", border: "1.5px solid #E2E0DB" }} onFocus={e => (e.target.style.borderColor = "#7C3AED")} onBlur={e => (e.target.style.borderColor = "#E2E0DB")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#1E3A5F]">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as Status)} className="rounded-xl px-3 py-2.5 text-sm text-[#1A1A2E] focus:outline-none" style={{ backgroundColor: "#F8F7F4", border: "1.5px solid #E2E0DB" }}>
                {(["active", "achieved", "missed", "deferred"] as Status[]).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].icon} {STATUS_CONFIG[s].label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#1E3A5F]">Owner</label>
              <select value={owner} onChange={e => setOwner(e.target.value as Owner)} className="rounded-xl px-3 py-2.5 text-sm text-[#1A1A2E] focus:outline-none" style={{ backgroundColor: "#F8F7F4", border: "1.5px solid #E2E0DB" }}>
                <option value="both">Both</option>
                <option value="Matt">Matt</option>
                <option value="Lynn">Lynn</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#1E3A5F]">Period</label>
              <select value={period} onChange={e => setPeriod(e.target.value as Period)} className="rounded-xl px-3 py-2.5 text-sm text-[#1A1A2E] focus:outline-none" style={{ backgroundColor: "#F8F7F4", border: "1.5px solid #E2E0DB" }}>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            {period === "quarterly" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#1E3A5F]">Quarter</label>
                <select value={quarter} onChange={e => setQuarter(Number(e.target.value))} className="rounded-xl px-3 py-2.5 text-sm text-[#1A1A2E] focus:outline-none" style={{ backgroundColor: "#F8F7F4", border: "1.5px solid #E2E0DB" }}>
                  {[1,2,3,4].map(q => <option key={q} value={q}>Q{q}</option>)}
                </select>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#1E3A5F]">Year</label>
              <select value={year} onChange={e => setYear(Number(e.target.value))} className="rounded-xl px-3 py-2.5 text-sm text-[#1A1A2E] focus:outline-none" style={{ backgroundColor: "#F8F7F4", border: "1.5px solid #E2E0DB" }}>
                {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all hover:bg-slate-50" style={{ border: "1.5px solid #E2E0DB", color: "#64748B" }}>Cancel</button>
            <button type="submit" disabled={!title.trim() || updateGoal.isPending} className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40" style={{ backgroundColor: "#7C3AED" }}>
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
  accountId,
  businessScope,
  onClose,
  onCreated,
}: {
  accountId: number;
  businessScope: ReturnType<typeof getBusinessSelection>;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [period, setPeriod] = useState<Period>("quarterly");
  const [quarter, setQuarter] = useState<number>(CURRENT_QUARTER);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [business, setBusiness] = useState<Business>(
    businessScope === "chiro" ? "chiropractic" : businessScope === "crossfit" ? "crossfit" : "general"
  );
  const [owner, setOwner] = useState<Owner>("both");

  const visibleBusinesses = useMemo<Business[]>(() => {
    if (businessScope === "chiro") return ["chiropractic"];
    if (businessScope === "crossfit") return ["crossfit"];
    return ["chiropractic", "crossfit", "realty", "general"];
  }, [businessScope]);

  const createGoal = trpc.goals.create.useMutation({
    onSuccess: () => {
      toast.success("Goal added!");
      onCreated();
      onClose();
    },
    onError: () => toast.error("Failed to add goal. Please try again."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createGoal.mutate({
      accountId,
      business,
      period,
      quarter: period === "quarterly" ? quarter : undefined,
      year,
      title: title.trim(),
      description: description.trim() || undefined,
      status: "active",
      owner,
      sortOrder: 0,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 flex flex-col gap-5"
        style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E0DB", boxShadow: "0 20px 60px rgba(30,58,95,0.15)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1E3A5F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Add New Goal
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-400">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#1E3A5F]">Goal</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Reach 200 active patients"
              className="w-full rounded-xl px-4 py-3 text-sm text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none transition-all"
              style={{ backgroundColor: "#F8F7F4", border: "1.5px solid #E2E0DB" }}
              onFocus={e => (e.target.style.borderColor = "#7C3AED")}
              onBlur={e => (e.target.style.borderColor = "#E2E0DB")}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#1E3A5F]">Details <span className="font-normal text-slate-400">(optional)</span></label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What does success look like?"
              rows={2}
              className="w-full rounded-xl px-4 py-3 text-sm text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none transition-all resize-none"
              style={{ backgroundColor: "#F8F7F4", border: "1.5px solid #E2E0DB" }}
              onFocus={e => (e.target.style.borderColor = "#7C3AED")}
              onBlur={e => (e.target.style.borderColor = "#E2E0DB")}
            />
          </div>

          {/* Period + Quarter + Year */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#1E3A5F]">Period</label>
              <select
                value={period}
                onChange={e => setPeriod(e.target.value as Period)}
                className="rounded-xl px-3 py-2.5 text-sm text-[#1A1A2E] focus:outline-none"
                style={{ backgroundColor: "#F8F7F4", border: "1.5px solid #E2E0DB" }}
              >
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            {period === "quarterly" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#1E3A5F]">Quarter</label>
                <select
                  value={quarter}
                  onChange={e => setQuarter(Number(e.target.value))}
                  className="rounded-xl px-3 py-2.5 text-sm text-[#1A1A2E] focus:outline-none"
                  style={{ backgroundColor: "#F8F7F4", border: "1.5px solid #E2E0DB" }}
                >
                  {[1, 2, 3, 4].map(q => <option key={q} value={q}>Q{q}</option>)}
                </select>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#1E3A5F]">Year</label>
              <select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="rounded-xl px-3 py-2.5 text-sm text-[#1A1A2E] focus:outline-none"
                style={{ backgroundColor: "#F8F7F4", border: "1.5px solid #E2E0DB" }}
              >
                {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Business + Owner */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#1E3A5F]">Business</label>
              <select
                value={business}
                onChange={e => setBusiness(e.target.value as Business)}
                className="rounded-xl px-3 py-2.5 text-sm text-[#1A1A2E] focus:outline-none"
                style={{ backgroundColor: "#F8F7F4", border: "1.5px solid #E2E0DB" }}
              >
                {visibleBusinesses.map(b => (
                  <option key={b} value={b}>{BUSINESS_CONFIG[b].icon} {BUSINESS_CONFIG[b].label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#1E3A5F]">Owner</label>
              <select
                value={owner}
                onChange={e => setOwner(e.target.value as Owner)}
                className="rounded-xl px-3 py-2.5 text-sm text-[#1A1A2E] focus:outline-none"
                style={{ backgroundColor: "#F8F7F4", border: "1.5px solid #E2E0DB" }}
              >
                <option value="both">Both</option>
                <option value="Matt">Matt</option>
                <option value="Lynn">Lynn</option>
              </select>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!title.trim() || createGoal.isPending}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
            style={{ backgroundColor: "#7C3AED", boxShadow: "0 4px 16px rgba(124,58,237,0.25)" }}
          >
            {createGoal.isPending ? "Adding…" : "Add Goal →"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Goal Card ─────────────────────────────────────────────────────────────────

function GoalCard({
  goal,
  onStatusChange,
  onDelete,
  onEdit,
}: {
  goal: {
    id: number;
    title: string;
    description: string | null;
    status: Status;
    owner: Owner;
    business: Business;
    period: Period;
    quarter: number | null;
    year: number;
  };
  onStatusChange: (id: number, status: Status) => void;
  onDelete: (id: number) => void;
  onEdit: (goal: { id: number; title: string; description: string | null; status: Status; owner: Owner; business: Business; period: Period; quarter: number | null; year: number }) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const statusCfg = STATUS_CONFIG[goal.status];
  const ownerCfg = OWNER_CONFIG[goal.owner];
  const bizCfg = BUSINESS_CONFIG[goal.business];

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3 transition-all group relative"
      style={{
        backgroundColor: goal.status === "achieved" ? "#F0FDF4" : "#FFFFFF",
        border: `1.5px solid ${goal.status === "achieved" ? "#86EFAC" : "#E2E0DB"}`,
        boxShadow: "0 1px 4px rgba(30,58,95,0.06)",
        opacity: goal.status === "missed" || goal.status === "deferred" ? 0.7 : 1,
      }}
    >
      {/* Top row: status icon + title + menu */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => {
            const next: Status = goal.status === "active" ? "achieved"
              : goal.status === "achieved" ? "active"
              : goal.status === "missed" ? "active"
              : "active";
            onStatusChange(goal.id, next);
          }}
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-all hover:scale-110"
          style={{
            backgroundColor: statusCfg.bg,
            border: `2px solid ${statusCfg.border}`,
          }}
          title={`Mark as ${goal.status === "active" ? "achieved" : "active"}`}
        >
          {goal.status === "achieved" && <span className="text-[10px]">✓</span>}
          {goal.status === "active" && <span className="text-[10px] opacity-0 group-hover:opacity-100">✓</span>}
        </button>

        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold text-[#1E3A5F] leading-snug"
            style={{
              textDecoration: goal.status === "missed" ? "line-through" : "none",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            {goal.title}
          </p>
          {goal.description && (
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{goal.description}</p>
          )}
        </div>

        {/* Overflow menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowMenu(v => !v)}
            className="w-6 h-6 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-100"
            style={{ color: "#94A3B8" }}
          >
            ···
          </button>
          {showMenu && (
            <div
              className="absolute right-0 top-7 w-44 rounded-xl shadow-lg z-20 flex flex-col overflow-hidden"
              style={{ background: "#FFFFFF", border: "1px solid #E2E0DB" }}
            >
              {(["active", "achieved", "missed", "deferred"] as Status[]).filter(s => s !== goal.status).map(s => (
                <button
                  key={s}
                  onClick={() => { onStatusChange(goal.id, s); setShowMenu(false); }}
                  className="flex items-center gap-2 px-3 py-2.5 text-[12px] font-medium hover:bg-[#F8F7F4] transition-colors text-left"
                  style={{ color: STATUS_CONFIG[s].color }}
                >
                  <span>{STATUS_CONFIG[s].icon}</span> Mark {STATUS_CONFIG[s].label}
                </button>
              ))}
              <button
                onClick={() => { onEdit(goal); setShowMenu(false); }}
                className="flex items-center gap-2 px-3 py-2.5 text-[12px] font-medium hover:bg-[#F8F7F4] transition-colors text-left"
                style={{ color: "#1E3A5F" }}
              >
                ✏️ Edit
              </button>
              <div className="border-t" style={{ borderColor: "#E2E0DB" }} />
              <button
                onClick={() => { onDelete(goal.id); setShowMenu(false); }}
                className="flex items-center gap-2 px-3 py-2.5 text-[12px] font-medium hover:bg-red-50 transition-colors text-left text-red-500"
              >
                🗑️ Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ backgroundColor: bizCfg.bg, color: bizCfg.color, border: `1px solid ${bizCfg.border}` }}
        >
          {bizCfg.icon} {bizCfg.label}
        </span>
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ backgroundColor: ownerCfg.bg, color: ownerCfg.color }}
        >
          {ownerCfg.label}
        </span>
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ backgroundColor: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}
        >
          {statusCfg.icon} {statusCfg.label}
        </span>
      </div>
    </div>
  );
}

// ─── Main Goals Page ───────────────────────────────────────────────────────────

export default function Goals() {
  const businessScope = getBusinessSelection();
  const accountId = Number(localStorage.getItem("bcc_account_id") ?? "0");
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<typeof goalsData[0] | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: goalsData = [], refetch } = trpc.goals.list.useQuery(
    { accountId, year: selectedYear },
    { enabled: accountId > 0 }
  );

  const updateGoal = trpc.goals.update.useMutation({
    onSuccess: () => refetch(),
    onError: () => toast.error("Failed to update goal."),
  });

  const deleteGoal = trpc.goals.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Goal deleted."); },
    onError: () => toast.error("Failed to delete goal."),
  });

  const handleStatusChange = (id: number, status: Status) => {
    updateGoal.mutate({ id, status });
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this goal?")) deleteGoal.mutate({ id });
  };

  // Group goals: Annual first, then Q1–Q4
  const annualGoals = goalsData.filter(g => g.period === "annual");
  const quarterlyGoals = [1, 2, 3, 4].map(q => ({
    quarter: q,
    goals: goalsData.filter(g => g.period === "quarterly" && g.quarter === q),
  }));

  // Stats
  const total = goalsData.length;
  const achieved = goalsData.filter(g => g.status === "achieved").length;
  const active = goalsData.filter(g => g.status === "active").length;
  const pct = total > 0 ? Math.round((achieved / total) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8F7F4", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header
        className="px-4 sm:px-5 py-3 flex items-center justify-between flex-shrink-0 gap-3"
        style={{ borderBottom: "1px solid #E2E8F0", backgroundColor: "#FFFFFF" }}
      >
        {/* Logo + title */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
            style={{ background: "linear-gradient(135deg, #7C3AED 0%, #0D9488 100%)", boxShadow: "0 2px 8px rgba(124,58,237,0.25)" }}
          >
            🎯
          </div>
          <div>
            <h1 className="text-base font-bold text-[#1E3A5F] leading-tight tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Goals
            </h1>
            <p className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">Quarterly & annual targets</p>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1.5">
          <Link href="/app/board" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:bg-[#F1F5F9]" style={{ color: "#1E3A5F", fontFamily: "'Space Grotesk', sans-serif" }}>
            <span>📋</span> Board
          </Link>
          <Link href="/app/reports" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:bg-[#F1F5F9]" style={{ color: "#0D9488", fontFamily: "'Space Grotesk', sans-serif" }}>
            <span>📊</span> Reports
          </Link>
          <Link href="/app/calendar" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:bg-[#F1F5F9]" style={{ color: "#64748B", fontFamily: "'Space Grotesk', sans-serif" }}>
            <span>📅</span> Calendar
          </Link>
          <Link href="/app/settings" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:bg-[#F1F5F9]" style={{ color: "#94A3B8", fontFamily: "'Space Grotesk', sans-serif" }}>
            <span>⚙️</span> Settings
          </Link>
        </nav>

        {/* Right side: year selector + add + mobile menu */}
        <div className="flex items-center gap-2">
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="rounded-lg px-2 py-1.5 text-xs font-semibold text-[#1E3A5F] focus:outline-none"
            style={{ backgroundColor: "#F1F5F9", border: "1px solid #CBD5E1" }}
          >
            {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white transition-all hover:opacity-90 active:scale-[0.97]"
            style={{ backgroundColor: "#7C3AED", boxShadow: "0 2px 8px rgba(124,58,237,0.25)" }}
          >
            + Add Goal
          </button>
          {/* Mobile menu */}
          <div className="relative md:hidden">
            <button
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
              style={{ background: "rgba(30,58,95,0.06)", border: "1px solid rgba(30,58,95,0.15)" }}
              onClick={() => setMobileMenuOpen(v => !v)}
              aria-label="Navigation menu"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="3" r="1.3" fill="#1E3A5F" />
                <circle cx="7" cy="7" r="1.3" fill="#1E3A5F" />
                <circle cx="7" cy="11" r="1.3" fill="#1E3A5F" />
              </svg>
            </button>
            {mobileMenuOpen && (
              <div
                className="absolute right-0 top-10 w-48 rounded-xl shadow-lg z-50 flex flex-col overflow-hidden"
                style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}
              >
                <Link href="/app/board" className="flex items-center gap-2.5 px-4 py-3 text-[12px] font-semibold hover:bg-[#F8F7F4] transition-colors" style={{ color: "#1E3A5F" }} onClick={() => setMobileMenuOpen(false)}>📋 Board</Link>
                <Link href="/app/reports" className="flex items-center gap-2.5 px-4 py-3 text-[12px] font-semibold hover:bg-[#F8F7F4] transition-colors" style={{ color: "#0D9488" }} onClick={() => setMobileMenuOpen(false)}>📊 Reports</Link>
                <Link href="/app/calendar" className="flex items-center gap-2.5 px-4 py-3 text-[12px] font-semibold hover:bg-[#F8F7F4] transition-colors" style={{ color: "#64748B" }} onClick={() => setMobileMenuOpen(false)}>📅 Calendar</Link>
                <Link href="/app/settings" className="flex items-center gap-2.5 px-4 py-3 text-[12px] font-semibold hover:bg-[#F8F7F4] transition-colors" style={{ color: "#94A3B8" }} onClick={() => setMobileMenuOpen(false)}>⚙️ Settings</Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Stats bar */}
      {total > 0 && (
        <div
          className="px-5 py-3 flex items-center gap-6 flex-shrink-0"
          style={{ borderBottom: "1px solid #E2E0DB", backgroundColor: "#FAFAF9" }}
        >
          <div className="flex items-center gap-2">
            <div className="h-2 rounded-full overflow-hidden flex-shrink-0" style={{ width: 120, backgroundColor: "#E2E0DB" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#10B981" : "#7C3AED" }}
              />
            </div>
            <span className="text-xs font-semibold text-[#1E3A5F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {pct}% achieved
            </span>
          </div>
          <span className="text-xs text-slate-500">{achieved} of {total} goals</span>
          {active > 0 && <span className="text-xs text-[#1D4ED8] font-medium">{active} active</span>}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {total === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{ backgroundColor: "#EDE9FE" }}>
              🎯
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-[#1E3A5F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                No goals for {selectedYear} yet
              </p>
              <p className="text-sm text-slate-500 mt-1">Set your first quarterly or annual goal to get started.</p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.97]"
              style={{ backgroundColor: "#7C3AED", boxShadow: "0 4px 16px rgba(124,58,237,0.2)" }}
            >
              + Add Your First Goal
            </button>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto flex flex-col gap-8">
            {/* Annual goals */}
            {(annualGoals.length > 0 || true) && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">🗓️</span>
                  <h2 className="text-sm font-bold text-[#1E3A5F] uppercase tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Annual — {selectedYear}
                  </h2>
                  <span className="text-xs text-slate-400 ml-auto">{annualGoals.length} goal{annualGoals.length !== 1 ? "s" : ""}</span>
                </div>
                {annualGoals.length === 0 ? (
                  <div
                    className="rounded-xl p-4 text-center"
                    style={{ backgroundColor: "#FAFAF9", border: "1.5px dashed #E2E0DB" }}
                  >
                    <p className="text-xs text-slate-400">No annual goals yet — <button onClick={() => setShowAddForm(true)} className="text-[#7C3AED] font-medium hover:underline">add one</button></p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {annualGoals.map(g => (
                      <GoalCard
                        key={g.id}
                        goal={g as { id: number; title: string; description: string | null; status: Status; owner: Owner; business: Business; period: Period; quarter: number | null; year: number }}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                        onEdit={g2 => setEditingGoal(g2 as typeof goalsData[0])}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Quarterly goals */}
            {quarterlyGoals.map(({ quarter, goals: qGoals }) => {
              const isCurrentQ = selectedYear === CURRENT_YEAR && quarter === CURRENT_QUARTER;
              return (
                <section key={quarter}>
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: isCurrentQ ? "#7C3AED" : "#F1F5F9",
                        color: isCurrentQ ? "#FFFFFF" : "#64748B",
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      {QUARTER_LABELS[quarter]}
                    </span>
                    <h2 className="text-sm font-bold text-[#1E3A5F] uppercase tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {isCurrentQ ? "Current Quarter" : `Quarter ${quarter}`}
                    </h2>
                    <span className="text-xs text-slate-400 ml-auto">{qGoals.length} goal{qGoals.length !== 1 ? "s" : ""}</span>
                  </div>
                  {qGoals.length === 0 ? (
                    <div
                      className="rounded-xl p-4 text-center"
                      style={{ backgroundColor: "#FAFAF9", border: "1.5px dashed #E2E0DB" }}
                    >
                      <p className="text-xs text-slate-400">No Q{quarter} goals — <button onClick={() => setShowAddForm(true)} className="text-[#7C3AED] font-medium hover:underline">add one</button></p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {qGoals.map(g => (
                        <GoalCard
                          key={g.id}
                          goal={g as { id: number; title: string; description: string | null; status: Status; owner: Owner; business: Business; period: Period; quarter: number | null; year: number }}
                          onStatusChange={handleStatusChange}
                          onDelete={handleDelete}
                          onEdit={g2 => setEditingGoal(g2 as typeof goalsData[0])}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Goal Modal */}
      {showAddForm && (
        <AddGoalForm
          accountId={accountId}
          businessScope={businessScope}
          onClose={() => setShowAddForm(false)}
          onCreated={() => refetch()}
        />
      )}

      {/* Edit Goal Modal */}
      {editingGoal && (
        <EditGoalForm
          goal={editingGoal as { id: number; title: string; description: string | null; status: Status; owner: Owner; business: Business; period: Period; quarter: number | null; year: number }}
          businessScope={businessScope}
          onClose={() => setEditingGoal(null)}
          onUpdated={() => refetch()}
        />
      )}
    </div>
  );
}
