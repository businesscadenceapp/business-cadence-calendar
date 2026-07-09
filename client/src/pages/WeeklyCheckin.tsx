/**
 * Weekly Check-in Page — Employee view
 *
 * Employees answer the owner-configured questions for the current week.
 * Answers are auto-saved per question (upsert). Shows a completion summary.
 * Dark navy theme: #0F2440 bg, #5EEAD4 teal accent, #C4B5FD purple accent
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WeeklyCheckin() {
  const { person } = usePerson();
  const today = useMemo(() => new Date(), []);
  const currentWeekKey = useMemo(() => getWeekKey(today), [today]);
  const [selectedWeek, setSelectedWeek] = useState(currentWeekKey);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [saved, setSaved] = useState<Record<number, boolean>>({});

  const accountId = person?.accountId ?? (() => {
    const stored = localStorage.getItem("bcc_account_id");
    return stored ? parseInt(stored, 10) : undefined;
  })();
  const personId = person?.id ?? "";

  // Determine which business IDs this employee belongs to
  const businessesQuery = trpc.business.list.useQuery(
    { accountId: accountId ?? 0 },
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
    { accountId: accountId ?? 0 },
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
    { accountId: accountId ?? 0, weekKey: selectedWeek },
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
    submitAnswer.mutate({ questionId, personId, accountId: accountId ?? 0, weekKey: selectedWeek, answer: text });
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
      <div className="flex items-center justify-center h-full" style={{ background: "linear-gradient(135deg, #0A1929 0%, #0F2440 100%)" }}>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Please sign in to submit your check-in.</p>
      </div>
    );
  }

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ background: "linear-gradient(135deg, #0A1929 0%, #0F2440 100%)", fontFamily: "'Inter', sans-serif" }}
    >
      <div className="max-w-2xl mx-auto px-3 sm:px-5 py-4 sm:py-6">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
              style={{ backgroundColor: "rgba(196,181,253,0.15)", border: "1px solid rgba(196,181,253,0.3)" }}>
              📝
            </div>
            <h1
              className="text-2xl font-bold text-white"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Weekly Check-in
            </h1>
          </div>
          <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            Answer your weekly questions and share your progress with the team.
          </p>
        </div>

        {/* Week selector */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => shiftWeek(-1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 text-lg"
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.6)",
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)")}
          >
            ‹
          </button>
          <div className="flex-1 text-center">
            <p className="text-base font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {formatWeekRange(selectedWeek)}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
              Week {selectedWeek.split("-W")[1]}{isCurrentWeek ? " · Current Week" : ""}
            </p>
          </div>
          <button
            onClick={() => shiftWeek(1)}
            disabled={isCurrentWeek}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed text-lg"
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.6)",
            }}
            onMouseEnter={e => { if (!isCurrentWeek) (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)"); }}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)")}
          >
            ›
          </button>
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'Space Grotesk', sans-serif" }}>
                Progress
              </span>
              <span className="text-[11px] font-bold" style={{ color: allDone ? "#5EEAD4" : "rgba(255,255,255,0.5)", fontFamily: "'JetBrains Mono', monospace" }}>
                {answeredCount}/{totalCount}
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: totalCount > 0 ? `${(answeredCount / totalCount) * 100}%` : "0%",
                  background: allDone
                    ? "linear-gradient(90deg, #5EEAD4, #2DD4BF)"
                    : "linear-gradient(90deg, #C4B5FD, #A78BFA)",
                }}
              />
            </div>
          </div>
        )}

        {/* Loading */}
        {(questionsQuery.isLoading || businessesQuery.isLoading) && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 animate-spin"
              style={{ borderColor: "rgba(196,181,253,0.3)", borderTopColor: "#C4B5FD" }} />
          </div>
        )}

        {/* No questions configured */}
        {!questionsQuery.isLoading && relevantQuestions.length === 0 && (
          <div
            className="rounded-2xl p-10 text-center"
            style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1.5px dashed rgba(255,255,255,0.1)" }}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
              style={{ backgroundColor: "rgba(196,181,253,0.1)" }}>
              📝
            </div>
            <p className="text-[14px] font-semibold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              No check-in questions yet
            </p>
            <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.35)" }}>
              Your owner hasn't configured any questions yet. Check back soon!
            </p>
          </div>
        )}

        {/* All done celebration */}
        {allDone && (
          <div
            className="rounded-2xl p-5 text-center mb-6"
            style={{ backgroundColor: "rgba(94,234,212,0.08)", border: "1.5px solid rgba(94,234,212,0.25)" }}
          >
            <p className="text-[15px] font-bold" style={{ color: "#5EEAD4", fontFamily: "'Space Grotesk', sans-serif" }}>
              ✓ All questions answered for this week!
            </p>
            <p className="text-[12px] mt-1" style={{ color: "rgba(94,234,212,0.7)" }}>
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
                    backgroundColor: "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${isSaved ? "rgba(94,234,212,0.25)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  {/* Question header */}
                  <div className="flex items-start gap-3">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5"
                      style={{
                        backgroundColor: isSaved ? "rgba(94,234,212,0.15)" : "rgba(196,181,253,0.15)",
                        color: isSaved ? "#5EEAD4" : "#C4B5FD",
                      }}
                    >
                      {isSaved ? "✓" : idx + 1}
                    </span>
                    <p className="text-[14px] font-semibold text-white flex-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
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
                    className="w-full rounded-xl px-4 py-3 text-[13px] resize-none focus:outline-none transition-all"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.05)",
                      border: `1.5px solid ${isSaved ? "rgba(94,234,212,0.2)" : "rgba(255,255,255,0.1)"}`,
                      color: "rgba(255,255,255,0.85)",
                      fontFamily: "'Inter', sans-serif",
                    }}
                    onFocus={e => { if (!isSaved) e.target.style.borderColor = "rgba(196,181,253,0.5)"; }}
                    onBlur={e => { if (!isSaved) e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
                  />

                  {/* Save button */}
                  <div className="flex items-center justify-between">
                    {isSaved ? (
                      <span className="text-[11px] font-semibold" style={{ color: "#5EEAD4" }}>✓ Saved</span>
                    ) : (
                      <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>Unsaved changes</span>
                    )}
                    <button
                      onClick={() => handleSave(q.id)}
                      disabled={isSaving || !hasText}
                      className="px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-40"
                      style={{
                        backgroundColor: isSaved ? "rgba(94,234,212,0.1)" : "#C4B5FD",
                        color: isSaved ? "#5EEAD4" : "#0F2440",
                        border: isSaved ? "1px solid rgba(94,234,212,0.25)" : "none",
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      {isSaving ? "Saving…" : isSaved ? "✓ Saved" : "Save"}
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
                  background: "linear-gradient(135deg, #C4B5FD 0%, #A78BFA 100%)",
                  color: "#0F2440",
                  boxShadow: "0 4px 16px rgba(196,181,253,0.2)",
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
