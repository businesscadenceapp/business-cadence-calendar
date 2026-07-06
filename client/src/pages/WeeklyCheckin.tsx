/**
 * Weekly Check-in Page — Employee view
 *
 * Employees answer the owner-configured questions for the current week.
 * Answers are auto-saved per question (upsert). Shows a completion summary.
 */

import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { usePerson } from "@/contexts/PersonContext";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function getWeekRange(weekKey: string): { start: Date; end: Date } {
  const [year, week] = weekKey.split("-W").map(Number);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7));
  const start = new Date(startOfWeek1);
  start.setUTCDate(startOfWeek1.getUTCDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start, end };
}

function formatWeekRange(weekKey: string): string {
  const { start, end } = getWeekRange(weekKey);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

function getPrevWeekKey(weekKey: string): string {
  const { start } = getWeekRange(weekKey);
  const prev = new Date(start);
  prev.setUTCDate(start.getUTCDate() - 7);
  return getWeekKey(prev);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WeeklyCheckin() {
  const { person } = usePerson();
  const today = useMemo(() => new Date(), []);
  const currentWeekKey = useMemo(() => getWeekKey(today), [today]);
  const [selectedWeek, setSelectedWeek] = useState(currentWeekKey);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [saved, setSaved] = useState<Record<number, boolean>>({});

  const accountId = person?.accountId || Number(localStorage.getItem("bcc_account_id") ?? "0");
  const personId = person?.id ?? "";

  // Determine which business IDs this employee belongs to
  const businessesQuery = trpc.business.list.useQuery(
    { accountId },
    { enabled: accountId !== undefined }
  );
  const dbBusinesses = businessesQuery.data ?? [];

  // Parse employee's business scope to get relevant business IDs
  const employeeBusinessIds = useMemo(() => {
    if (!person) return [];
    if (person.role === "owner" || person.role === "coowner") {
      return dbBusinesses.map(b => b.id);
    }
    try {
      const scope = JSON.parse(person.businessScope) as string[];
      if (scope.includes("all")) return dbBusinesses.map(b => b.id);
      return dbBusinesses.filter(b => scope.includes(b.slug)).map(b => b.id);
    } catch {
      return dbBusinesses.map(b => b.id);
    }
  }, [person, dbBusinesses]);

  // Load questions: "all businesses" (businessId=0) + employee's specific businesses
  const questionsQuery = trpc.report.listQuestions.useQuery(
    { accountId },
    { enabled: accountId !== undefined }
  );

  // Filter questions relevant to this employee
  const allQuestions = questionsQuery.data ?? [];
  const relevantQuestions = useMemo(() => {
    return allQuestions.filter(q =>
      q.businessId === 0 || employeeBusinessIds.includes(q.businessId)
    );
  }, [allQuestions, employeeBusinessIds]);

  // Load existing answers for selected week
  const answersQuery = trpc.report.getWeekAnswers.useQuery(
    { accountId, weekKey: selectedWeek },
    { enabled: accountId !== undefined }
  );

  // Pre-fill answers from DB
  useEffect(() => {
    if (!answersQuery.data || !personId) return;
    const myAnswers = answersQuery.data.filter(a => a.personId === personId);
    const filled: Record<number, string> = {};
    const alreadySaved: Record<number, boolean> = {};
    for (const a of myAnswers) {
      filled[a.questionId] = a.answer;
      alreadySaved[a.questionId] = true;
    }
    setAnswers(prev => ({ ...filled, ...prev }));
    setSaved(alreadySaved);
  }, [answersQuery.data, personId]);

  const submitAnswer = trpc.report.submitAnswer.useMutation({
    onSuccess: (_, vars) => {
      setSaving(s => ({ ...s, [vars.questionId]: false }));
      setSaved(s => ({ ...s, [vars.questionId]: true }));
    },
    onError: (_, vars) => {
      setSaving(s => ({ ...s, [vars.questionId]: false }));
      toast.error("Failed to save answer. Please try again.");
    },
  });

  const handleSave = (questionId: number) => {
    const text = answers[questionId]?.trim();
    if (!text) { toast.error("Please write an answer before saving."); return; }
    setSaving(s => ({ ...s, [questionId]: true }));
    setSaved(s => ({ ...s, [questionId]: false }));
    submitAnswer.mutate({ questionId, personId, accountId, weekKey: selectedWeek, answer: text });
  };

  const handleSaveAll = () => {
    const unsaved = relevantQuestions.filter(q => answers[q.id]?.trim() && !saved[q.id]);
    if (unsaved.length === 0) { toast.info("All answers already saved!"); return; }
    for (const q of unsaved) handleSave(q.id);
  };

  function shiftWeek(delta: number) {
    const { start } = getWeekRange(selectedWeek);
    const next = new Date(start);
    next.setUTCDate(start.getUTCDate() + delta * 7);
    const newKey = getWeekKey(next);
    setSelectedWeek(newKey);
    setAnswers({});
    setSaved({});
  }

  const isCurrentWeek = selectedWeek === currentWeekKey;
  const answeredCount = relevantQuestions.filter(q => saved[q.id]).length;
  const totalCount = relevantQuestions.length;
  const allDone = answeredCount === totalCount && totalCount > 0;

  if (!person) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-400 text-sm">Please sign in to submit your check-in.</p>
      </div>
    );
  }

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ backgroundColor: "#F8F7F4", fontFamily: "'Inter', sans-serif" }}
    >
      <div className="max-w-2xl mx-auto px-5 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1
            className="text-2xl font-bold text-[#1E3A5F] mb-1"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Weekly Check-in
          </h1>
          <p className="text-[13px] text-slate-500">
            Answer your weekly questions and share your progress with the team.
          </p>
        </div>

        {/* Week selector */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => shiftWeek(-1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-[#E2E0DB] active:scale-95 text-lg text-[#64748B]"
            style={{ border: "1px solid #E2E0DB" }}
          >
            ‹
          </button>
          <div className="flex-1 text-center">
            <p className="text-base font-bold text-[#1E3A5F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {formatWeekRange(selectedWeek)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Week {selectedWeek.split("-W")[1]}{isCurrentWeek ? " · Current Week" : ""}
            </p>
          </div>
          <button
            onClick={() => shiftWeek(1)}
            disabled={isCurrentWeek}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-[#E2E0DB] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed text-lg text-[#64748B]"
            style={{ border: "1px solid #E2E0DB" }}
          >
            ›
          </button>
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Progress
              </span>
              <span className="text-[11px] font-bold" style={{ color: allDone ? "#059669" : "#64748B", fontFamily: "'JetBrains Mono', monospace" }}>
                {answeredCount}/{totalCount}
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#E2E0DB" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: totalCount > 0 ? `${(answeredCount / totalCount) * 100}%` : "0%",
                  background: allDone ? "linear-gradient(90deg, #059669, #34D399)" : "linear-gradient(90deg, #7C3AED, #A78BFA)",
                }}
              />
            </div>
          </div>
        )}

        {/* Loading */}
        {(questionsQuery.isLoading || businessesQuery.isLoading) && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-purple-300 border-t-purple-600 animate-spin" />
          </div>
        )}

        {/* No questions configured */}
        {!questionsQuery.isLoading && relevantQuestions.length === 0 && (
          <div
            className="rounded-2xl p-10 text-center"
            style={{ backgroundColor: "#FFFFFF", border: "1.5px dashed #E2E0DB" }}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4" style={{ backgroundColor: "#EDE9FE" }}>
              📝
            </div>
            <p className="text-[14px] font-semibold text-[#1E3A5F] mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              No check-in questions yet
            </p>
            <p className="text-[12px] text-slate-400">
              Your owner hasn't configured any questions yet. Check back soon!
            </p>
          </div>
        )}

        {/* All done celebration */}
        {allDone && (
          <div
            className="rounded-2xl p-5 text-center mb-6"
            style={{ backgroundColor: "#F0FDF4", border: "1.5px solid #86EFAC" }}
          >
            <p className="text-[15px] font-bold text-[#065F46]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              ✓ All questions answered for this week!
            </p>
            <p className="text-[12px] text-[#059669] mt-1">
              Great work. Your responses have been saved.
            </p>
          </div>
        )}

        {/* Question cards */}
        {!questionsQuery.isLoading && relevantQuestions.length > 0 && (
          <div className="flex flex-col gap-4">
            {relevantQuestions.map((q, idx) => {
              const isSaved = saved[q.id];
              const isSaving = saving[q.id];
              const hasText = (answers[q.id] ?? "").trim().length > 0;

              return (
                <div
                  key={q.id}
                  className="rounded-2xl p-5 flex flex-col gap-3 transition-all"
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: `1.5px solid ${isSaved ? "#86EFAC" : "#E2E0DB"}`,
                    boxShadow: "0 2px 12px rgba(30,58,95,0.04)",
                  }}
                >
                  {/* Question header */}
                  <div className="flex items-start gap-3">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: isSaved ? "#DCFCE7" : "#EDE9FE", color: isSaved ? "#166534" : "#5B21B6" }}
                    >
                      {isSaved ? "✓" : idx + 1}
                    </span>
                    <p className="text-[14px] font-semibold text-[#1E3A5F] flex-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {q.question}
                    </p>
                  </div>

                  {/* Answer textarea */}
                  <textarea
                    value={answers[q.id] ?? ""}
                    onChange={e => {
                      setAnswers(a => ({ ...a, [q.id]: e.target.value }));
                      if (saved[q.id]) setSaved(s => ({ ...s, [q.id]: false }));
                    }}
                    placeholder="Type your answer here…"
                    rows={3}
                    className="w-full rounded-xl px-4 py-3 text-[13px] text-[#1E3A5F] placeholder-[#94A3B8] resize-none focus:outline-none transition-all"
                    style={{
                      backgroundColor: "#F8F7F4",
                      border: `1.5px solid ${isSaved ? "#86EFAC" : "#E2E0DB"}`,
                      fontFamily: "'Inter', sans-serif",
                    }}
                    onFocus={e => { if (!isSaved) e.target.style.borderColor = "#7C3AED"; }}
                    onBlur={e => { if (!isSaved) e.target.style.borderColor = "#E2E0DB"; }}
                  />

                  {/* Save button */}
                  <div className="flex items-center justify-between">
                    {isSaved ? (
                      <span className="text-[11px] font-semibold text-[#059669]">✓ Saved</span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Unsaved changes</span>
                    )}
                    <button
                      onClick={() => handleSave(q.id)}
                      disabled={isSaving || !hasText}
                      className="px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-40"
                      style={{
                        backgroundColor: isSaved ? "#F0FDF4" : "#7C3AED",
                        color: isSaved ? "#059669" : "white",
                        border: isSaved ? "1px solid #86EFAC" : "none",
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      {isSaving ? "Saving…" : isSaved ? "Update" : "Save"}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Save All button */}
            {relevantQuestions.length > 1 && !allDone && (
              <button
                onClick={handleSaveAll}
                className="w-full py-3 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] mt-2"
                style={{
                  background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)",
                  boxShadow: "0 4px 16px rgba(124,58,237,0.25)",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                Save All Answers →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
