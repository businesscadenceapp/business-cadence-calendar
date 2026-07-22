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
  businessSlug: string;
  metrics: MetricDraft[];
  isEditing: boolean;
}

const UNIT_OPTIONS = ["#", "$", "%", "hrs", "pts", "visits", "claims"];

function getAccountId(): number | null {
  const raw = localStorage.getItem("bcc_account_id");
  return raw ? parseInt(raw, 10) : null;
}

// Shared input style for dark navy theme
const inputStyle: React.CSSProperties = {
  backgroundColor: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "rgba(255,255,255,0.85)",
  borderRadius: "8px",
  padding: "8px 12px",
  fontSize: "14px",
  outline: "none",
  width: "100%",
  fontFamily: "'Inter', sans-serif",
};

const selectStyle: React.CSSProperties = {
  backgroundColor: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "rgba(255,255,255,0.85)",
  borderRadius: "8px",
  padding: "8px 8px",
  fontSize: "14px",
  outline: "none",
  fontFamily: "'Inter', sans-serif",
};

export default function EmployeeSetup() {
  const accountId = getAccountId();

  const { data: existingEmployees, refetch } = trpc.weeklyReport.getEmployees.useQuery(
    { accountId: accountId ?? 0 },
    { enabled: !!accountId }
  );

  const { data: dbBusinesses = [] } = trpc.business.list.useQuery(
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

  const defaultBizSlug = dbBusinesses[0]?.slug ?? "";

  const [drafts, setDrafts] = useState<EmployeeDraft[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDraft, setNewDraft] = useState<EmployeeDraft>({
    name: "",
    role: "",
    businessSlug: defaultBizSlug,
    metrics: [{ label: "", unit: "#" }],
    isEditing: true,
  });

  // Sync default biz slug into newDraft once businesses load
  useEffect(() => {
    if (defaultBizSlug && !newDraft.businessSlug) {
      setNewDraft((d) => ({ ...d, businessSlug: defaultBizSlug }));
    }
  }, [defaultBizSlug]);

  useEffect(() => {
    if (existingEmployees) {
      setDrafts(
        existingEmployees.map((e) => ({
          id: e.id,
          name: e.name,
          role: e.role,
          businessSlug: e.businessSlug ?? defaultBizSlug,
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
    if (!d.businessSlug) {
      toast.error("Please assign this employee to a business.");
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
      businessSlug: d.businessSlug,
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
    if (!newDraft.businessSlug) {
      toast.error("Please assign this employee to a business.");
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
      businessSlug: newDraft.businessSlug,
      sortOrder: drafts.length,
      metrics: validMetrics.map((m, i) => ({ label: m.label.trim(), unit: m.unit, sortOrder: i })),
    });
    setNewDraft({ name: "", role: "", businessSlug: defaultBizSlug, metrics: [{ label: "", unit: "#" }], isEditing: true });
    setShowAddForm(false);
  }

  // Business selector field reused in both edit and new forms
  function BusinessSelector({
    value,
    onChange,
  }: {
    value: string;
    onChange: (slug: string) => void;
  }) {
    return (
      <div>
        <label className="block text-xs font-semibold mb-1 uppercase tracking-wide"
          style={{ color: "rgba(255,255,255,0.4)" }}>
          Business
        </label>
        <select
          style={selectStyle}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="" style={{ backgroundColor: "#0F2440" }}>— Select business —</option>
          {dbBusinesses.map((b) => (
            <option key={b.slug} value={b.slug} style={{ backgroundColor: "#0F2440" }}>
              {b.icon} {b.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (!accountId) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #0A1929 0%, #0F2440 100%)" }}>
        <p style={{ color: "rgba(255,255,255,0.4)" }}>Please log in first.</p>
      </div>
    );
  }

  // Group employees by business for display
  const empsByBiz = dbBusinesses.map((b) => ({
    biz: b,
    emps: drafts.filter((d) => d.businessSlug === b.slug),
  }));
  const unassigned = drafts.filter((d) => !d.businessSlug || !dbBusinesses.find((b) => b.slug === d.businessSlug));

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #0A1929 0%, #0F2440 100%)", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
        style={{ background: "rgba(10,25,41,0.95)", borderBottom: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/app"
            className="text-sm transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            ← Back to Calendar
          </Link>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
              style={{ backgroundColor: "rgba(94,234,212,0.15)", border: "1px solid rgba(94,234,212,0.3)" }}>
              👥
            </div>
            <h1 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Employee Setup
            </h1>
          </div>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)" }}>
          {drafts.length} employee{drafts.length !== 1 ? "s" : ""} configured
        </span>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Intro */}
        <div
          className="rounded-xl p-5"
          style={{ background: "rgba(94,234,212,0.06)", border: "1px solid rgba(94,234,212,0.2)" }}
        >
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
            Define each employee's name, role, business assignment, and the metrics they report every week. Owners enter
            numbers on their behalf — no spreadsheets needed. Reports appear inside the{" "}
            <strong style={{ color: "#5EEAD4" }}>Team Weekly Review</strong> meeting on the calendar.
          </p>
        </div>

        {/* Employees grouped by business */}
        {empsByBiz.map(({ biz, emps }) => (
          emps.length > 0 && (
            <div key={biz.slug}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{biz.icon}</span>
                <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {biz.name}
                </h2>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
              </div>
              <div className="flex flex-col gap-4">
                {emps.map((draft) => {
                  const idx = drafts.indexOf(draft);
                  return (
                    <div
                      key={draft.id ?? `draft-${idx}`}
                      className="rounded-xl overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      {draft.isEditing ? (
                        <div className="p-5 flex flex-col gap-4">
                          {/* Name + Role + Business row */}
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-semibold mb-1 uppercase tracking-wide"
                                style={{ color: "rgba(255,255,255,0.4)" }}>Name</label>
                              <input
                                style={inputStyle}
                                value={draft.name}
                                onChange={(e) => updateDraft(idx, { name: e.target.value })}
                                placeholder="e.g. Colleen"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold mb-1 uppercase tracking-wide"
                                style={{ color: "rgba(255,255,255,0.4)" }}>Role</label>
                              <input
                                style={inputStyle}
                                value={draft.role}
                                onChange={(e) => updateDraft(idx, { role: e.target.value })}
                                placeholder="e.g. Front Desk"
                              />
                            </div>
                            <BusinessSelector
                              value={draft.businessSlug}
                              onChange={(slug) => updateDraft(idx, { businessSlug: slug })}
                            />
                          </div>

                          {/* Metrics */}
                          <div>
                            <label className="block text-xs font-semibold mb-2 uppercase tracking-wide"
                              style={{ color: "rgba(255,255,255,0.4)" }}>Weekly Metrics</label>
                            <div className="flex flex-col gap-2">
                              {draft.metrics.map((metric, mIdx) => (
                                <div key={mIdx} className="flex items-center gap-2">
                                  <input
                                    style={{ ...inputStyle, flex: 1 }}
                                    value={metric.label}
                                    onChange={(e) => updateMetric(idx, mIdx, { label: e.target.value })}
                                    placeholder={`Metric ${mIdx + 1} (e.g. Adjustments this week)`}
                                  />
                                  <select
                                    style={selectStyle}
                                    value={metric.unit}
                                    onChange={(e) => updateMetric(idx, mIdx, { unit: e.target.value })}
                                  >
                                    {UNIT_OPTIONS.map((u) => (
                                      <option key={u} value={u} style={{ backgroundColor: "#0F2440" }}>{u}</option>
                                    ))}
                                  </select>
                                  {draft.metrics.length > 1 && (
                                    <button
                                      onClick={() => removeMetricFromDraft(idx, mIdx)}
                                      className="text-lg leading-none transition-colors"
                                      style={{ color: "rgba(255,255,255,0.25)" }}
                                      onMouseEnter={e => (e.currentTarget.style.color = "#F87171")}
                                      onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
                                      title="Remove metric"
                                    >×</button>
                                  )}
                                </div>
                              ))}
                            </div>
                            <button
                              onClick={() => addMetricToDraft(idx)}
                              className="mt-2 text-xs font-medium transition-colors"
                              style={{ color: "#5EEAD4" }}
                            >+ Add metric</button>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => handleSaveDraft(idx)}
                              disabled={saveEmployee.isPending}
                              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95"
                              style={{ background: "linear-gradient(135deg, #5EEAD4, #2DD4BF)", color: "#0F2440" }}
                            >
                              {saveEmployee.isPending ? "Saving…" : "Save Employee"}
                            </button>
                            <button
                              onClick={() => updateDraft(idx, { isEditing: false })}
                              className="px-4 py-2 rounded-lg text-sm transition-colors"
                              style={{ color: "rgba(255,255,255,0.4)" }}
                            >Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-5 flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-base font-semibold text-white">{draft.name}</span>
                              <span
                                className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{ background: "rgba(94,234,212,0.12)", color: "#5EEAD4", border: "1px solid rgba(94,234,212,0.2)" }}
                              >{draft.role}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {draft.metrics.map((m, mIdx) => (
                                <span
                                  key={mIdx}
                                  className="text-xs px-2.5 py-1 rounded-full"
                                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
                                >
                                  {m.label} <span style={{ color: "rgba(255,255,255,0.3)" }}>({m.unit})</span>
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => updateDraft(idx, { isEditing: true })}
                              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                              style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}
                              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.85)")}
                              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
                            >Edit</button>
                            <button
                              onClick={() => {
                                if (confirm(`Remove ${draft.name}? Their report history will be preserved.`)) {
                                  deleteEmployee.mutate({ employeeId: draft.id!, accountId: accountId! });
                                }
                              }}
                              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                              style={{ border: "1px solid rgba(248,113,113,0.3)", color: "#F87171" }}
                              onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(248,113,113,0.6)")}
                              onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(248,113,113,0.3)")}
                            >Remove</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ))}

        {/* Unassigned employees (legacy / empty businessSlug) */}
        {unassigned.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "rgba(255,165,0,0.7)" }}>
                ⚠ Unassigned
              </h2>
              <div className="flex-1 h-px" style={{ background: "rgba(255,165,0,0.15)" }} />
            </div>
            <p className="text-xs mb-3" style={{ color: "rgba(255,165,0,0.6)" }}>
              These employees have no business assigned. Edit them to assign a business.
            </p>
            <div className="flex flex-col gap-4">
              {unassigned.map((draft) => {
                const idx = drafts.indexOf(draft);
                return (
                  <div
                    key={draft.id ?? `draft-${idx}`}
                    className="rounded-xl overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,165,0,0.2)" }}
                  >
                    <div className="p-5 flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base font-semibold text-white">{draft.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: "rgba(94,234,212,0.12)", color: "#5EEAD4", border: "1px solid rgba(94,234,212,0.2)" }}>
                            {draft.role}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => updateDraft(idx, { isEditing: true })}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium"
                        style={{ border: "1px solid rgba(255,165,0,0.4)", color: "rgba(255,165,0,0.8)" }}
                      >Assign Business</button>
                    </div>
                    {draft.isEditing && (
                      <div className="p-5 pt-0 flex flex-col gap-4">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-semibold mb-1 uppercase tracking-wide"
                              style={{ color: "rgba(255,255,255,0.4)" }}>Name</label>
                            <input style={inputStyle} value={draft.name}
                              onChange={(e) => updateDraft(idx, { name: e.target.value })} />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold mb-1 uppercase tracking-wide"
                              style={{ color: "rgba(255,255,255,0.4)" }}>Role</label>
                            <input style={inputStyle} value={draft.role}
                              onChange={(e) => updateDraft(idx, { role: e.target.value })} />
                          </div>
                          <BusinessSelector value={draft.businessSlug}
                            onChange={(slug) => updateDraft(idx, { businessSlug: slug })} />
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleSaveDraft(idx)} disabled={saveEmployee.isPending}
                            className="px-4 py-2 rounded-lg text-sm font-semibold active:scale-95"
                            style={{ background: "linear-gradient(135deg, #5EEAD4, #2DD4BF)", color: "#0F2440" }}>
                            {saveEmployee.isPending ? "Saving…" : "Save"}
                          </button>
                          <button onClick={() => updateDraft(idx, { isEditing: false })}
                            className="px-4 py-2 rounded-lg text-sm"
                            style={{ color: "rgba(255,255,255,0.4)" }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add new employee */}
        {showAddForm ? (
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(94,234,212,0.3)" }}
          >
            <div className="px-5 py-3 flex items-center gap-2"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(94,234,212,0.05)" }}>
              <span className="text-sm font-semibold" style={{ color: "#5EEAD4" }}>New Employee</span>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wide"
                    style={{ color: "rgba(255,255,255,0.4)" }}>Name</label>
                  <input
                    style={inputStyle}
                    value={newDraft.name}
                    onChange={(e) => setNewDraft((d) => ({ ...d, name: e.target.value }))}
                    placeholder="e.g. Colleen"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wide"
                    style={{ color: "rgba(255,255,255,0.4)" }}>Role</label>
                  <input
                    style={inputStyle}
                    value={newDraft.role}
                    onChange={(e) => setNewDraft((d) => ({ ...d, role: e.target.value }))}
                    placeholder="e.g. Front Desk"
                  />
                </div>
                <BusinessSelector
                  value={newDraft.businessSlug}
                  onChange={(slug) => setNewDraft((d) => ({ ...d, businessSlug: slug }))}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wide"
                  style={{ color: "rgba(255,255,255,0.4)" }}>Weekly Metrics</label>
                <div className="flex flex-col gap-2">
                  {newDraft.metrics.map((metric, mIdx) => (
                    <div key={mIdx} className="flex items-center gap-2">
                      <input
                        style={{ ...inputStyle, flex: 1 }}
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
                        style={selectStyle}
                        value={metric.unit}
                        onChange={(e) =>
                          setNewDraft((d) => ({
                            ...d,
                            metrics: d.metrics.map((m, j) => (j === mIdx ? { ...m, unit: e.target.value } : m)),
                          }))
                        }
                      >
                        {UNIT_OPTIONS.map((u) => (
                          <option key={u} value={u} style={{ backgroundColor: "#0F2440" }}>{u}</option>
                        ))}
                      </select>
                      {newDraft.metrics.length > 1 && (
                        <button
                          onClick={() =>
                            setNewDraft((d) => ({ ...d, metrics: d.metrics.filter((_, j) => j !== mIdx) }))
                          }
                          className="text-lg leading-none transition-colors"
                          style={{ color: "rgba(255,255,255,0.25)" }}
                          onMouseEnter={e => (e.currentTarget.style.color = "#F87171")}
                          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
                        >×</button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setNewDraft((d) => ({ ...d, metrics: [...d.metrics, { label: "", unit: "#" }] }))}
                  className="mt-2 text-xs font-medium transition-colors"
                  style={{ color: "#5EEAD4" }}
                >+ Add metric</button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleSaveNew}
                  disabled={saveEmployee.isPending}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95"
                  style={{ background: "linear-gradient(135deg, #5EEAD4, #2DD4BF)", color: "#0F2440" }}
                >
                  {saveEmployee.isPending ? "Saving…" : "Add Employee"}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewDraft({ name: "", role: "", businessSlug: defaultBizSlug, metrics: [{ label: "", unit: "#" }], isEditing: true });
                  }}
                  className="px-4 py-2 rounded-lg text-sm transition-colors"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >Cancel</button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
            style={{
              background: "rgba(94,234,212,0.06)",
              border: "2px dashed rgba(94,234,212,0.3)",
              color: "#5EEAD4",
            }}
          >
            + Add Employee
          </button>
        )}

        {drafts.length === 0 && !showAddForm && (
          <div className="text-center py-8 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
            No employees set up yet. Add your first employee above.
          </div>
        )}
      </main>
    </div>
  );
}
