import { useState, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface MetricDraft {
  id?: number;
  label: string;
  unit: string;
}

interface EmployeeDraft {
  id?: number;
  name: string;
  role: string;
  metrics: MetricDraft[];
  isEditing: boolean;
}

const UNIT_OPTIONS = ["#", "$", "%", "hrs", "pts", "visits", "claims"];

function getAccountId(): number | null {
  const raw = localStorage.getItem("bcc_account_id");
  return raw ? parseInt(raw, 10) : null;
}

export default function EmployeeSetup() {
  const accountId = getAccountId();

  const { data: existingEmployees, refetch } = trpc.weeklyReport.getEmployees.useQuery(
    { accountId: accountId ?? 0 },
    { enabled: !!accountId }
  );

  const saveEmployee = trpc.weeklyReport.saveEmployee.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Employee saved successfully.");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteEmployee = trpc.weeklyReport.deleteEmployee.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Employee removed.");
    },
    onError: (e) => toast.error(e.message),
  });

  const [drafts, setDrafts] = useState<EmployeeDraft[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDraft, setNewDraft] = useState<EmployeeDraft>({
    name: "",
    role: "",
    metrics: [{ label: "", unit: "#" }],
    isEditing: true,
  });

  // Sync existing employees into drafts (view mode)
  useEffect(() => {
    if (existingEmployees) {
      setDrafts(
        existingEmployees.map((e) => ({
          id: e.id,
          name: e.name,
          role: e.role,
          metrics: e.metrics.map((m) => ({ id: m.id, label: m.label, unit: m.unit ?? "#" })),
          isEditing: false,
        }))
      );
    }
  }, [existingEmployees]);

  function updateDraft(idx: number, patch: Partial<EmployeeDraft>) {
    setDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  }

  function updateMetric(draftIdx: number, metricIdx: number, patch: Partial<MetricDraft>) {
    setDrafts((prev) =>
      prev.map((d, i) =>
        i === draftIdx
          ? { ...d, metrics: d.metrics.map((m, j) => (j === metricIdx ? { ...m, ...patch } : m)) }
          : d
      )
    );
  }

  function addMetricToDraft(draftIdx: number) {
    setDrafts((prev) =>
      prev.map((d, i) =>
        i === draftIdx ? { ...d, metrics: [...d.metrics, { label: "", unit: "#" }] } : d
      )
    );
  }

  function removeMetricFromDraft(draftIdx: number, metricIdx: number) {
    setDrafts((prev) =>
      prev.map((d, i) =>
        i === draftIdx ? { ...d, metrics: d.metrics.filter((_, j) => j !== metricIdx) } : d
      )
    );
  }

  async function handleSaveDraft(idx: number) {
    const d = drafts[idx];
    if (!d.name.trim() || !d.role.trim()) {
      toast.error("Name and role are required.");
      return;
    }
    const validMetrics = d.metrics.filter((m) => m.label.trim());
    if (validMetrics.length === 0) {
      toast.error("Add at least one metric.");
      return;
    }
    await saveEmployee.mutateAsync({
      accountId: accountId!,
      id: d.id,
      name: d.name.trim(),
      role: d.role.trim(),
      sortOrder: idx,
      metrics: validMetrics.map((m, i) => ({ label: m.label.trim(), unit: m.unit, sortOrder: i })),
    });
    updateDraft(idx, { isEditing: false });
  }

  async function handleSaveNew() {
    if (!newDraft.name.trim() || !newDraft.role.trim()) {
      toast.error("Name and role are required.");
      return;
    }
    const validMetrics = newDraft.metrics.filter((m) => m.label.trim());
    if (validMetrics.length === 0) {
      toast.error("Add at least one metric.");
      return;
    }
    await saveEmployee.mutateAsync({
      accountId: accountId!,
      name: newDraft.name.trim(),
      role: newDraft.role.trim(),
      sortOrder: drafts.length,
      metrics: validMetrics.map((m, i) => ({ label: m.label.trim(), unit: m.unit, sortOrder: i })),
    });
    setNewDraft({ name: "", role: "", metrics: [{ label: "", unit: "#" }], isEditing: true });
    setShowAddForm(false);
  }

  if (!accountId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8F7F4" }}>
        <p className="text-slate-500">Please log in first.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#F8F7F4", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
        style={{ background: "#F8F7F4", borderBottom: "1px solid #E5E3DE" }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/app"
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            ← Back to Calendar
          </Link>
          <span className="text-slate-300">|</span>
          <h1 className="text-lg font-semibold text-slate-800">Employee Setup</h1>
        </div>
        <p className="text-sm text-slate-400">{drafts.length} employee{drafts.length !== 1 ? "s" : ""} configured</p>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Intro */}
        <div
          className="rounded-xl p-5"
          style={{ background: "rgba(13,148,136,0.06)", border: "1px solid rgba(13,148,136,0.2)" }}
        >
          <p className="text-sm text-slate-600 leading-relaxed">
            Define each employee's name, role, and the metrics they report every week. Owners enter
            numbers on their behalf — no spreadsheets needed. Reports appear inside the{" "}
            <strong className="text-teal-700">Team Weekly Review</strong> meeting on the calendar.
          </p>
        </div>

        {/* Existing employees */}
        {drafts.map((draft, idx) => (
          <div
            key={draft.id ?? `draft-${idx}`}
            className="rounded-xl overflow-hidden"
            style={{ background: "#FFFFFF", border: "1px solid #E5E3DE", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
          >
            {draft.isEditing ? (
              <div className="p-5 flex flex-col gap-4">
                {/* Name + Role row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                      Name
                    </label>
                    <input
                      className="w-full px-3 py-2 rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400"
                      value={draft.name}
                      onChange={(e) => updateDraft(idx, { name: e.target.value })}
                      placeholder="e.g. Colleen"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                      Role
                    </label>
                    <input
                      className="w-full px-3 py-2 rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400"
                      value={draft.role}
                      onChange={(e) => updateDraft(idx, { role: e.target.value })}
                      placeholder="e.g. Front Desk"
                    />
                  </div>
                </div>

                {/* Metrics */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                    Weekly Metrics
                  </label>
                  <div className="flex flex-col gap-2">
                    {draft.metrics.map((metric, mIdx) => (
                      <div key={mIdx} className="flex items-center gap-2">
                        <input
                          className="flex-1 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400"
                          value={metric.label}
                          onChange={(e) => updateMetric(idx, mIdx, { label: e.target.value })}
                          placeholder={`Metric ${mIdx + 1} (e.g. Adjustments this week)`}
                        />
                        <select
                          className="px-2 py-2 rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                          value={metric.unit}
                          onChange={(e) => updateMetric(idx, mIdx, { unit: e.target.value })}
                        >
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                        {draft.metrics.length > 1 && (
                          <button
                            onClick={() => removeMetricFromDraft(idx, mIdx)}
                            className="text-slate-300 hover:text-rose-400 transition-colors text-lg leading-none"
                            title="Remove metric"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => addMetricToDraft(idx)}
                    className="mt-2 text-xs text-teal-600 hover:text-teal-800 font-medium transition-colors"
                  >
                    + Add metric
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleSaveDraft(idx)}
                    disabled={saveEmployee.isPending}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all active:scale-95"
                    style={{ background: "#1E3A5F" }}
                  >
                    {saveEmployee.isPending ? "Saving…" : "Save Employee"}
                  </button>
                  <button
                    onClick={() => updateDraft(idx, { isEditing: false })}
                    className="px-4 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-semibold text-slate-800">{draft.name}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: "rgba(13,148,136,0.1)", color: "#0D9488" }}
                    >
                      {draft.role}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {draft.metrics.map((m, mIdx) => (
                      <span
                        key={mIdx}
                        className="text-xs px-2.5 py-1 rounded-full"
                        style={{ background: "#F1F0ED", color: "#64748B" }}
                      >
                        {m.label} <span className="text-slate-400">({m.unit})</span>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => updateDraft(idx, { isEditing: true })}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium text-slate-500 hover:text-slate-800 transition-colors"
                    style={{ border: "1px solid #E5E3DE" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${draft.name}? Their report history will be preserved.`)) {
                        deleteEmployee.mutate({ employeeId: draft.id!, accountId: accountId! });
                      }
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium text-rose-400 hover:text-rose-600 transition-colors"
                    style={{ border: "1px solid #FCA5A5" }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add new employee */}
        {showAddForm ? (
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "#FFFFFF", border: "1px solid #0D9488", boxShadow: "0 1px 4px rgba(13,148,136,0.1)" }}
          >
            <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid #E5E3DE", background: "rgba(13,148,136,0.04)" }}>
              <span className="text-sm font-semibold text-teal-700">New Employee</span>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Name</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    value={newDraft.name}
                    onChange={(e) => setNewDraft((d) => ({ ...d, name: e.target.value }))}
                    placeholder="e.g. Colleen"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Role</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    value={newDraft.role}
                    onChange={(e) => setNewDraft((d) => ({ ...d, role: e.target.value }))}
                    placeholder="e.g. Front Desk"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Weekly Metrics</label>
                <div className="flex flex-col gap-2">
                  {newDraft.metrics.map((metric, mIdx) => (
                    <div key={mIdx} className="flex items-center gap-2">
                      <input
                        className="flex-1 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400"
                        value={metric.label}
                        onChange={(e) =>
                          setNewDraft((d) => ({
                            ...d,
                            metrics: d.metrics.map((m, j) => (j === mIdx ? { ...m, label: e.target.value } : m)),
                          }))
                        }
                        placeholder={`Metric ${mIdx + 1} (e.g. New patients this week)`}
                      />
                      <select
                        className="px-2 py-2 rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                        value={metric.unit}
                        onChange={(e) =>
                          setNewDraft((d) => ({
                            ...d,
                            metrics: d.metrics.map((m, j) => (j === mIdx ? { ...m, unit: e.target.value } : m)),
                          }))
                        }
                      >
                        {UNIT_OPTIONS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                      {newDraft.metrics.length > 1 && (
                        <button
                          onClick={() =>
                            setNewDraft((d) => ({ ...d, metrics: d.metrics.filter((_, j) => j !== mIdx) }))
                          }
                          className="text-slate-300 hover:text-rose-400 transition-colors text-lg leading-none"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setNewDraft((d) => ({ ...d, metrics: [...d.metrics, { label: "", unit: "#" }] }))}
                  className="mt-2 text-xs text-teal-600 hover:text-teal-800 font-medium transition-colors"
                >
                  + Add metric
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleSaveNew}
                  disabled={saveEmployee.isPending}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all active:scale-95"
                  style={{ background: "#1E3A5F" }}
                >
                  {saveEmployee.isPending ? "Saving…" : "Add Employee"}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewDraft({ name: "", role: "", metrics: [{ label: "", unit: "#" }], isEditing: true });
                  }}
                  className="px-4 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
            style={{
              background: "rgba(13,148,136,0.08)",
              border: "2px dashed rgba(13,148,136,0.35)",
              color: "#0D9488",
            }}
          >
            + Add Employee
          </button>
        )}

        {drafts.length === 0 && !showAddForm && (
          <div className="text-center py-8 text-slate-400 text-sm">
            No employees set up yet. Add your first employee above.
          </div>
        )}
      </main>
    </div>
  );
}
