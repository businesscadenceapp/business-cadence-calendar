import { useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  INDUSTRY_TYPES,
  INDUSTRY_MEETING_DAY_DEFAULTS,
  INDUSTRY_SUGGESTED_GOALS,
  INDUSTRY_KPI_DEFAULTS,
  MEETING_TYPE_INFO,
  DEFAULT_MEETING_TIMES,
  TIME_OPTIONS,
  formatMeetingTime,
  type IndustryType,
  type SuggestedGoal,
  type KpiDefault,
} from "@shared/industryDefaults";
import { generateMeetingSchedule } from "@shared/calendarEngine";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GoalDraft {
  label: string;
  metric: string;
  unit: string;
  targetValue: string;
  period: "quarterly" | "annual";
}

interface KpiDraft {
  name: string;
  unit: string;
  frequency: "weekly" | "monthly";
  description: string;
}

interface EmployeeDraft {
  name: string;
  email: string;
  role: "employee" | "coowner";
}

interface OnboardingData {
  businessName: string;
  industry: IndustryType;
  // Logo
  logoBase64: string;   // base64-encoded image data (without data: prefix)
  logoMimeType: string; // e.g. "image/png"
  logoPreviewUrl: string; // local object URL for preview
  ownerCount: number;
  employeeCount: number;
  workDays: number[];
  // Co-owner invite
  coOwnerName: string;
  coOwnerEmail: string;
  coOwnerBusinesses: string[]; // business slugs they have access to
  // Business hours
  bhWorkDays: number[];
  bhStartTime: string;
  bhEndTime: string;
  bhTimezone: string;
  meetingDayPrefs: {
    ownerDaily: number[];
    ownerWeekly: number;
    ownerMonthly: number;
    quarterlyDay: number;
    teamDaily: number[];
    teamWeekly: number;
    ownerDailyEnabled: boolean;
    ownerWeeklyEnabled: boolean;
    ownerMonthlyEnabled: boolean;
    quarterlyEnabled: boolean;
    teamDailyEnabled: boolean;
    teamWeeklyEnabled: boolean;
  };
  meetingTimes: {
    ownerDaily: string;
    ownerWeekly: string;
    ownerMonthly: string;
    quarterly: string;
    teamDaily: string;
    teamWeekly: string;
  };
  goals: GoalDraft[];
  kpis: KpiDraft[];
  employees: EmployeeDraft[];
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TOTAL_STEPS = 13;

// ─── Shared styles ────────────────────────────────────────────────────────────

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
  padding: "8px 10px",
  fontSize: "14px",
  outline: "none",
  fontFamily: "'Inter', sans-serif",
};

// ─── Shared sub-components ────────────────────────────────────────────────────

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4 text-sm leading-relaxed"
      style={{ backgroundColor: "rgba(94,234,212,0.07)", border: "1px solid rgba(94,234,212,0.2)", color: "rgba(255,255,255,0.6)" }}>
      <span style={{ color: "#5EEAD4" }}>💡 </span>{children}
    </div>
  );
}

function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-white mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h2>
      <p className="text-base" style={{ color: "rgba(255,255,255,0.5)" }}>{subtitle}</p>
    </div>
  );
}

function NavButtons({
  onBack,
  onNext,
  canProceed = true,
  nextLabel = "Continue →",
  onSkip,
  skipLabel = "Skip for now",
}: {
  onBack: () => void;
  onNext: () => void;
  canProceed?: boolean;
  nextLabel?: string;
  onSkip?: () => void;
  skipLabel?: string;
}) {
  return (
    <div className="flex items-center gap-3 mt-6 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <button
        onClick={onBack}
        className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
        style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", backgroundColor: "rgba(255,255,255,0.04)" }}
      >
        ← Back
      </button>
      <button
        onClick={onNext}
        disabled={!canProceed}
        className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-40"
        style={{ background: "linear-gradient(135deg, #5EEAD4, #2DD4BF)", color: "#0F2440" }}
      >
        {nextLabel}
      </button>
      {onSkip && (
        <button
          onClick={onSkip}
          className="px-4 py-2.5 rounded-xl text-sm transition-all"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          {skipLabel}
        </button>
      )}
    </div>
  );
}

// ─── Step 1: Welcome ──────────────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
        style={{ backgroundColor: "rgba(94,234,212,0.1)", border: "1px solid rgba(94,234,212,0.2)" }}>
        📅
      </div>
      <div>
        <h1 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Welcome to BusinessCadence
        </h1>
        <p className="text-lg max-w-md" style={{ color: "rgba(255,255,255,0.5)" }}>
          Let's set up your business in about 5 minutes. We'll build your meeting rhythm,
          set your goals, configure your KPIs, and get your team ready to go.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm mt-2">
        {[
          { icon: "📅", label: "Meeting cadence", sub: "Smart defaults for your industry" },
          { icon: "🎯", label: "Business goals", sub: "Quarterly & annual targets" },
          { icon: "📊", label: "KPI tracking", sub: "The numbers that matter most" },
          { icon: "👥", label: "Team access", sub: "Invite employees right now" },
        ].map(item => (
          <div key={item.label} className="rounded-xl p-3 text-left"
            style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="text-xl mb-1">{item.icon}</div>
            <div className="text-sm font-semibold text-white">{item.label}</div>
            <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{item.sub}</div>
          </div>
        ))}
      </div>
      <button
        onClick={onNext}
        className="mt-2 px-10 py-3 rounded-xl font-bold text-base transition-all hover:opacity-90 active:scale-[0.98]"
        style={{ background: "linear-gradient(135deg, #5EEAD4, #2DD4BF)", color: "#0F2440" }}
      >
        Let's Get Started →
      </button>
    </div>
  );
}

// ─── Step 1b: Co-Owner Invite ────────────────────────────────────────────────

function StepCoOwnerInvite({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: Pick<OnboardingData, "coOwnerName" | "coOwnerEmail" | "coOwnerBusinesses" | "businessName">;
  onChange: (u: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const canProceed = data.coOwnerName.trim().length > 0 && isValidEmail(data.coOwnerEmail.trim());
  const displayBizName = data.businessName.trim() || "your business";

  return (
    <div>
      <StepHeader
        title="Invite your co-owner"
        subtitle={`BusinessCadence is built for two. Who are you running ${displayBizName} with?`}
      />
      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
            style={{ color: "rgba(255,255,255,0.4)" }}>Their Name</label>
          <input
            style={inputStyle}
            value={data.coOwnerName}
            onChange={e => onChange({ coOwnerName: e.target.value })}
            placeholder="e.g. Lynn"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
            style={{ color: "rgba(255,255,255,0.4)" }}>Their Email</label>
          <input
            style={inputStyle}
            value={data.coOwnerEmail}
            onChange={e => onChange({ coOwnerEmail: e.target.value })}
            placeholder="e.g. lynn@yourbusiness.com"
            type="email"
          />
        </div>
        <div className="rounded-xl p-3 flex items-center gap-3"
          style={{ backgroundColor: "rgba(94,234,212,0.06)", border: "1px solid rgba(94,234,212,0.15)" }}>
          <span style={{ color: "#5EEAD4" }}>✓</span>
          <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
            They'll have full co-owner access to <strong style={{ color: "#5EEAD4" }}>{displayBizName}</strong>
          </span>
        </div>
        <TipBox>
          Your co-owner will receive an invite link to join BusinessCadence. They'll be able to post tasks, view the board, and manage meetings alongside you.
        </TipBox>
      </div>
      <NavButtons
        onBack={onBack}
        onNext={onNext}
        canProceed={canProceed}
        nextLabel="Continue →"
        onSkip={onNext}
        skipLabel="Skip — invite later"
      />
    </div>
  );
}

// ─── Step 2: Business Basics ──────────────────────────────────────────────────

function StepBusinessBasics({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: Pick<OnboardingData, "businessName" | "industry">;
  onChange: (u: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const canProceed = data.businessName.trim().length > 0 && !!data.industry;
  return (
    <div>
      <StepHeader
        title="Tell us about your business"
        subtitle="We'll use this to tailor your meeting agendas and suggest the right KPIs."
      />
      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
            style={{ color: "rgba(255,255,255,0.4)" }}>Business Name</label>
          <input
            style={inputStyle}
            value={data.businessName}
            onChange={e => onChange({ businessName: e.target.value })}
            placeholder="e.g. New Beginnings Chiropractic"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
            style={{ color: "rgba(255,255,255,0.4)" }}>Industry</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {INDUSTRY_TYPES.map(ind => (
              <button
                key={ind.value}
                onClick={() => onChange({ industry: ind.value, meetingDayPrefs: INDUSTRY_MEETING_DAY_DEFAULTS[ind.value] })}
                className="flex flex-col items-start p-3 rounded-xl text-left transition-all duration-150"
                style={{
                  border: `2px solid ${data.industry === ind.value ? "#5EEAD4" : "rgba(255,255,255,0.1)"}`,
                  backgroundColor: data.industry === ind.value ? "rgba(94,234,212,0.1)" : "rgba(255,255,255,0.04)",
                }}
              >
                <span className="font-semibold text-sm text-white">{ind.label}</span>
                <span className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{ind.description}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <NavButtons onBack={onBack} onNext={onNext} canProceed={canProceed} />
    </div>
  );
}

// ─── Step 3: Team Size ────────────────────────────────────────────────────────

function StepTeamSize({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: Pick<OnboardingData, "ownerCount" | "employeeCount">;
  onChange: (u: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <StepHeader
        title="Who's on your team?"
        subtitle="This helps us set up the right meeting structure and employee access."
      />
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-6">
          {[
            { label: "Owners / Partners", key: "ownerCount" as const, min: 1, max: 20, value: data.ownerCount },
            { label: "Employees", key: "employeeCount" as const, min: 0, max: 500, value: data.employeeCount },
          ].map(item => (
            <div key={item.key} className="flex flex-col gap-3">
              <label className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "rgba(255,255,255,0.4)" }}>{item.label}</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onChange({ [item.key]: Math.max(item.min, item.value - 1) })}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold transition-colors"
                  style={{ border: "2px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)" }}
                >−</button>
                <span className="text-3xl font-bold text-white w-8 text-center">{item.value}</span>
                <button
                  onClick={() => onChange({ [item.key]: Math.min(item.max, item.value + 1) })}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold transition-colors"
                  style={{ border: "2px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)" }}
                >+</button>
              </div>
            </div>
          ))}
        </div>
        <TipBox>
          If you have employees, you'll be able to invite them in a later step so they can submit their weekly numbers directly.
        </TipBox>
      </div>
      <NavButtons onBack={onBack} onNext={onNext} />
    </div>
  );
}

// ─── Step 4: Work Schedule ────────────────────────────────────────────────────

function StepWorkSchedule({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: Pick<OnboardingData, "workDays">;
  onChange: (u: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const toggle = (day: number) => {
    const next = data.workDays.includes(day)
      ? data.workDays.filter(d => d !== day)
      : [...data.workDays, day].sort();
    onChange({ workDays: next });
  };
  return (
    <div>
      <StepHeader
        title="What days do you operate?"
        subtitle="We'll only schedule meetings on your work days — no meetings on days you're closed."
      />
      <div className="flex flex-col gap-5">
        <div className="flex gap-2 flex-wrap">
          {DAY_NAMES.map((name, i) => (
            <button
              key={i}
              onClick={() => toggle(i)}
              style={{
                width: "56px", height: "56px", borderRadius: "12px",
                border: `2px solid ${data.workDays.includes(i) ? "#5EEAD4" : "rgba(255,255,255,0.12)"}`,
                backgroundColor: data.workDays.includes(i) ? "#5EEAD4" : "rgba(255,255,255,0.05)",
                color: data.workDays.includes(i) ? "#0F2440" : "rgba(255,255,255,0.6)",
                fontWeight: "600", fontSize: "14px", transition: "all 150ms",
              }}
            >{name}</button>
          ))}
        </div>
        {data.workDays.length === 0 && (
          <p className="text-sm" style={{ color: "#F87171" }}>Please select at least one work day.</p>
        )}
        <TipBox>
          You can add specific closed days (holidays, vacations) later in Manage Schedule — meetings will automatically shift to the next available day.
        </TipBox>
      </div>
      <NavButtons onBack={onBack} onNext={onNext} canProceed={data.workDays.length > 0} />
    </div>
  );
}

// ─── Step 5: Meeting Cadence ──────────────────────────────────────────────────

function MeetingCadenceStep({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: Pick<OnboardingData, "workDays" | "meetingDayPrefs" | "industry" | "meetingTimes">;
  onChange: (u: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const upd = (patch: Partial<OnboardingData["meetingDayPrefs"]>) =>
    onChange({ meetingDayPrefs: { ...data.meetingDayPrefs, ...patch } });

  const updTime = (key: keyof OnboardingData["meetingTimes"], value: string) =>
    onChange({ meetingTimes: { ...data.meetingTimes, [key]: value } });

  const useRecommended = () => {
    onChange({ meetingDayPrefs: INDUSTRY_MEETING_DAY_DEFAULTS[data.industry] });
    onNext();
  };

  const prefs = data.meetingDayPrefs;
  // Allow all 7 days for meetings — owners often meet on days the business isn't open
  const allowedDays = [0, 1, 2, 3, 4, 5, 6];

  // Calculate annual meeting count
  const countMeetings = () => {
    const weeksPerYear = 52;
    let count = 0;
    if (prefs.ownerDailyEnabled) count += prefs.ownerDaily.length * weeksPerYear;
    if (prefs.ownerWeeklyEnabled) count += weeksPerYear;
    if (prefs.ownerMonthlyEnabled) count += 12;
    if (prefs.quarterlyEnabled) count += 4;
    if (prefs.teamDailyEnabled) count += prefs.teamDaily.length * weeksPerYear;
    if (prefs.teamWeeklyEnabled) count += weeksPerYear;
    return count;
  };

  const meetingTypes = [
    { key: "ownerDaily" as const, enabledKey: "ownerDailyEnabled" as const, multi: true },
    { key: "ownerWeekly" as const, enabledKey: "ownerWeeklyEnabled" as const, multi: false },
    { key: "ownerMonthly" as const, enabledKey: "ownerMonthlyEnabled" as const, multi: false },
    { key: "quarterly" as const, enabledKey: "quarterlyEnabled" as const, multi: false },
    { key: "teamDaily" as const, enabledKey: "teamDailyEnabled" as const, multi: true },
    { key: "teamWeekly" as const, enabledKey: "teamWeeklyEnabled" as const, multi: false },
  ];

  const [expandedInfo, setExpandedInfo] = useState<string | null>(null);

  return (
    <div>
      <StepHeader
        title="Set your meeting rhythm"
        subtitle="Choose which meetings you want and when. You can change any of this later."
      />
      <div className="flex flex-col gap-4">
        {/* Use recommended shortcut */}
        <button
          onClick={useRecommended}
          className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-left transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, rgba(94,234,212,0.15), rgba(45,212,191,0.1))", border: "1px solid rgba(94,234,212,0.3)" }}
        >
          <div>
            <div className="text-sm font-bold text-white">⚡ Use our recommended schedule</div>
            <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
              Pre-filled defaults for {INDUSTRY_TYPES.find(i => i.value === data.industry)?.label ?? "your industry"} — you can customize later
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full ml-3 flex-shrink-0"
            style={{ backgroundColor: "#5EEAD4", color: "#0F2440" }}>Skip →</span>
        </button>

        {/* Meeting count summary */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
          style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <span className="text-lg">📅</span>
          <span className="text-sm text-white font-semibold">{countMeetings()} meetings/year</span>
          <span className="text-xs ml-auto" style={{ color: "rgba(255,255,255,0.35)" }}>based on current selections</span>
        </div>

        {/* Meeting type cards */}
        {meetingTypes.map(({ key, enabledKey, multi }) => {
          const info = MEETING_TYPE_INFO[key];
          const enabled = prefs[enabledKey];
          const isExpanded = expandedInfo === key;
          const currentDays = multi
            ? (prefs[key as "ownerDaily" | "teamDaily"] as number[])
            : [prefs[key as "ownerWeekly" | "ownerMonthly" | "quarterlyDay" | "teamWeekly"] as number];

          return (
            <div key={key} className="rounded-xl overflow-hidden transition-all"
              style={{
                border: `1px solid ${enabled ? "rgba(94,234,212,0.2)" : "rgba(255,255,255,0.08)"}`,
                backgroundColor: enabled ? "rgba(94,234,212,0.05)" : "rgba(255,255,255,0.03)",
                opacity: enabled ? 1 : 0.65,
              }}>
              {/* Header row */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-xl">{info.icon}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{info.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
                        {info.duration}
                      </span>
                    </div>
                    <button
                      onClick={() => setExpandedInfo(isExpanded ? null : key)}
                      className="text-xs mt-0.5 text-left transition-colors"
                      style={{ color: "#5EEAD4" }}
                    >
                      {isExpanded ? "Hide details ▲" : "What is this? ▼"}
                    </button>
                  </div>
                </div>
                {/* Toggle */}
                <button
                  onClick={() => upd({ [enabledKey]: !enabled })}
                  className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ml-3"
                  style={{ backgroundColor: enabled ? "#5EEAD4" : "rgba(255,255,255,0.15)" }}
                  role="switch"
                  aria-checked={enabled}
                >
                  <span
                    className={cn("pointer-events-none inline-block h-4 w-4 rounded-full shadow transform transition-transform duration-200", enabled ? "translate-x-4" : "translate-x-0")}
                    style={{ backgroundColor: enabled ? "#0F2440" : "rgba(255,255,255,0.7)" }}
                  />
                </button>
              </div>

              {/* Info panel */}
              {isExpanded && (
                <div className="px-4 pb-3 pt-0">
                  <div className="rounded-lg p-3 text-sm leading-relaxed"
                    style={{ backgroundColor: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)" }}>
                    <p className="mb-2">{info.purpose}</p>
                    <p className="text-xs italic" style={{ color: "rgba(94,234,212,0.7)" }}>💡 {info.tip}</p>
                  </div>
                </div>
              )}

              {/* Day picker + Time picker */}
              {enabled && (
                <div className="px-4 pb-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mt-2 mb-2"
                    style={{ color: "rgba(255,255,255,0.35)" }}>
                    {multi ? "Which days?" : "Which day?"}
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {DAY_NAMES.map((name, i) => {
                      const allowed = allowedDays.includes(i);
                      const selected = currentDays.includes(i);
                      return (
                        <button
                          key={i}
                          disabled={!allowed}
                          onClick={() => {
                            if (!allowed) return;
                            if (multi) {
                              const arr = prefs[key as "ownerDaily" | "teamDaily"] as number[];
                              const next = selected ? arr.filter(d => d !== i) : [...arr, i];
                              upd({ [key]: next });
                            } else {
                              upd({ [key]: i });
                            }
                          }}
                          style={{
                            width: "40px", height: "34px", borderRadius: "8px",
                            border: `1px solid ${!allowed ? "rgba(255,255,255,0.06)" : selected ? "#5EEAD4" : "rgba(255,255,255,0.12)"}`,
                            backgroundColor: !allowed ? "transparent" : selected ? "#5EEAD4" : "rgba(255,255,255,0.05)",
                            color: !allowed ? "rgba(255,255,255,0.15)" : selected ? "#0F2440" : "rgba(255,255,255,0.6)",
                            fontSize: "12px", fontWeight: "600", transition: "all 150ms",
                            cursor: !allowed ? "not-allowed" : "pointer",
                            opacity: !allowed ? 0.3 : 1,
                          }}
                        >{name}</button>
                      );
                    })}
                  </div>
                  {multi && (
                    <p className="text-[11px] mt-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Select all days you hold this meeting each week.
                    </p>
                  )}
                  {/* Time picker */}
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.35)" }}>Start time</span>
                    <select
                      value={data.meetingTimes[key as keyof typeof data.meetingTimes]}
                      onChange={e => updTime(key as keyof OnboardingData["meetingTimes"], e.target.value)}
                      style={{
                        backgroundColor: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(94,234,212,0.25)",
                        color: "#5EEAD4",
                        borderRadius: "8px",
                        padding: "5px 10px",
                        fontSize: "13px",
                        fontWeight: "600",
                        outline: "none",
                        fontFamily: "'Space Grotesk', sans-serif",
                        cursor: "pointer",
                      }}
                    >
                      {TIME_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value} style={{ backgroundColor: "#0F2440", color: "white" }}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>— owners can adjust this in Settings later</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <NavButtons onBack={onBack} onNext={onNext} />
    </div>
  );
}

// ─── Step 6: Goals Setup ──────────────────────────────────────────────────────

function StepGoals({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: Pick<OnboardingData, "goals" | "industry">;
  onChange: (u: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const suggestions = INDUSTRY_SUGGESTED_GOALS[data.industry] ?? [];

  const addSuggested = (s: SuggestedGoal) => {
    if (data.goals.some(g => g.label === s.label)) return;
    onChange({
      goals: [...data.goals, {
        label: s.label,
        metric: s.metric,
        unit: s.unit,
        targetValue: "",
        period: "quarterly",
      }],
    });
  };

  const updateGoal = (idx: number, patch: Partial<GoalDraft>) => {
    onChange({ goals: data.goals.map((g, i) => i === idx ? { ...g, ...patch } : g) });
  };

  const removeGoal = (idx: number) => {
    onChange({ goals: data.goals.filter((_, i) => i !== idx) });
  };

  const [pendingGoal, setPendingGoal] = useState<{ label: string; metric: string; unit: string; targetValue: string; period: "quarterly" | "annual" } | null>(null);

  const addBlank = () => {
    setPendingGoal({ label: "", metric: "", unit: "", targetValue: "", period: "quarterly" });
  };

  const confirmPendingGoal = () => {
    if (!pendingGoal || !pendingGoal.label.trim()) return;
    onChange({ goals: [...data.goals, pendingGoal] });
    setPendingGoal(null);
  };

  const cancelPendingGoal = () => setPendingGoal(null);

  return (
    <div>
      <StepHeader
        title="Set your business goals"
        subtitle="What does success look like for your business? Add 1–3 goals to track in your quarterly meetings."
      />
      <div className="flex flex-col gap-5">
        {/* Suggested goals */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
            Suggested goals for your industry
          </p>
          <div className="flex flex-col gap-2">
            {suggestions.map(s => {
              const added = data.goals.some(g => g.label === s.label);
              return (
                <button
                  key={s.label}
                  onClick={() => addSuggested(s)}
                  disabled={added}
                  className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-left transition-all"
                  style={{
                    border: `1px solid ${added ? "rgba(94,234,212,0.4)" : "rgba(255,255,255,0.1)"}`,
                    backgroundColor: added ? "rgba(94,234,212,0.08)" : "rgba(255,255,255,0.04)",
                    opacity: added ? 0.7 : 1,
                  }}
                >
                  <div>
                    <div className="text-sm font-semibold text-white">{s.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{s.example}</div>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full ml-3 flex-shrink-0 font-medium"
                    style={{
                      backgroundColor: added ? "rgba(94,234,212,0.15)" : "rgba(255,255,255,0.08)",
                      color: added ? "#5EEAD4" : "rgba(255,255,255,0.5)",
                    }}>
                    {added ? "✓ Added" : "+ Add"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Added goals */}
        {data.goals.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
              Your goals
            </p>
            <div className="flex flex-col gap-3">
              {data.goals.map((goal, idx) => (
                <div key={idx} className="rounded-xl p-3 flex flex-col gap-2"
                  style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="flex items-center gap-2">
                    <input
                      style={{ ...inputStyle, flex: 1 }}
                      value={goal.label}
                      onChange={e => updateGoal(idx, { label: e.target.value })}
                      placeholder="Goal name (e.g. Grow new patients)"
                    />
                    <button
                      onClick={() => removeGoal(idx)}
                      className="text-lg leading-none flex-shrink-0 transition-colors"
                      style={{ color: "rgba(255,255,255,0.25)" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#F87171")}
                      onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
                    >×</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      style={inputStyle}
                      value={goal.metric}
                      onChange={e => updateGoal(idx, { metric: e.target.value })}
                      placeholder="Metric (e.g. New patients/month)"
                    />
                    <input
                      style={inputStyle}
                      value={goal.targetValue}
                      onChange={e => updateGoal(idx, { targetValue: e.target.value })}
                      placeholder="Target (e.g. 30)"
                    />
                    <select
                      style={selectStyle}
                      value={goal.period}
                      onChange={e => updateGoal(idx, { period: e.target.value as "quarterly" | "annual" })}
                    >
                      <option value="quarterly" style={{ backgroundColor: "#0F2440" }}>Quarterly</option>
                      <option value="annual" style={{ backgroundColor: "#0F2440" }}>Annual</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending custom goal entry */}
        {pendingGoal && (
          <div className="rounded-xl p-3 flex flex-col gap-2"
            style={{ backgroundColor: "rgba(94,234,212,0.06)", border: "1px solid rgba(94,234,212,0.25)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#5EEAD4" }}>New custom goal</p>
            <div className="flex items-center gap-2">
              <input
                autoFocus
                style={{ ...inputStyle, flex: 1 }}
                value={pendingGoal.label}
                onChange={e => setPendingGoal(g => g ? { ...g, label: e.target.value } : g)}
                placeholder="Goal name (e.g. Grow new patients)"
                onKeyDown={e => { if (e.key === "Enter") confirmPendingGoal(); if (e.key === "Escape") cancelPendingGoal(); }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                style={inputStyle}
                value={pendingGoal.metric}
                onChange={e => setPendingGoal(g => g ? { ...g, metric: e.target.value } : g)}
                placeholder="Metric (e.g. New patients/month)"
              />
              <input
                style={inputStyle}
                value={pendingGoal.targetValue}
                onChange={e => setPendingGoal(g => g ? { ...g, targetValue: e.target.value } : g)}
                placeholder="Target (e.g. 30)"
              />
              <select
                style={selectStyle}
                value={pendingGoal.period}
                onChange={e => setPendingGoal(g => g ? { ...g, period: e.target.value as "quarterly" | "annual" } : g)}
              >
                <option value="quarterly" style={{ backgroundColor: "#0F2440" }}>Quarterly</option>
                <option value="annual" style={{ backgroundColor: "#0F2440" }}>Annual</option>
              </select>
            </div>
            <div className="flex gap-2 mt-1">
              <button
                onClick={confirmPendingGoal}
                disabled={!pendingGoal.label.trim()}
                className="text-sm font-semibold px-4 py-1.5 rounded-lg transition-all"
                style={{
                  backgroundColor: pendingGoal.label.trim() ? "#5EEAD4" : "rgba(94,234,212,0.2)",
                  color: pendingGoal.label.trim() ? "#0F2440" : "rgba(255,255,255,0.3)",
                  cursor: pendingGoal.label.trim() ? "pointer" : "not-allowed",
                }}
              >Save Goal</button>
              <button
                onClick={cancelPendingGoal}
                className="text-sm px-3 py-1.5 rounded-lg transition-colors"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >Cancel</button>
            </div>
          </div>
        )}

        {!pendingGoal && (
          <button
            onClick={addBlank}
            className="text-sm font-medium transition-colors text-left"
            style={{ color: "#5EEAD4" }}
          >
            + Add custom goal
          </button>
        )}

        <TipBox>
          Goals show up in your Quarterly Offsite agenda automatically. You can always add more goals from the Goals page.
        </TipBox>
      </div>
      <NavButtons
        onBack={onBack}
        onNext={onNext}
        nextLabel="Continue →"
        onSkip={onNext}
        skipLabel="Skip goals"
      />
    </div>
  );
}

// ─── Step 7: KPI Setup ────────────────────────────────────────────────────────

function StepKPIs({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: Pick<OnboardingData, "kpis" | "industry">;
  onChange: (u: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const updateKpi = (idx: number, patch: Partial<KpiDraft>) => {
    onChange({ kpis: data.kpis.map((k, i) => i === idx ? { ...k, ...patch } : k) });
  };

  const removeKpi = (idx: number) => {
    onChange({ kpis: data.kpis.filter((_, i) => i !== idx) });
  };

  const addBlank = () => {
    onChange({
      kpis: [...data.kpis, { name: "", unit: "#", frequency: "weekly", description: "" }],
    });
  };

  return (
    <div>
      <StepHeader
        title="Set up your KPIs"
        subtitle="Key Performance Indicators — the 3–5 numbers that tell you at a glance whether your business is healthy."
      />
      <div className="flex flex-col gap-5">
        {/* Plain-language explainer */}
        <div className="rounded-xl p-4"
          style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <p className="text-sm font-semibold text-white mb-2">What is a KPI (Key Performance Indicator)?</p>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
            A <strong style={{ color: "#5EEAD4" }}>Key Performance Indicator</strong> is a specific, measurable number you track regularly to know if your business is on track — without guessing. Think of KPIs as your business's vital signs.
          </p>
          <div className="mt-3 flex flex-col gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.35)" }}>Examples</p>
            {[
              { label: "New patients / clients this week", icon: "👥" },
              { label: "Monthly revenue ($)", icon: "💰" },
              { label: "Google reviews received this month", icon: "⭐" },
              { label: "Classes attended (fitness) or appointments booked", icon: "📅" },
              { label: "Employee hours logged", icon: "⏰" },
            ].map(ex => (
              <div key={ex.label} className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                <span>{ex.icon}</span><span>{ex.label}</span>
              </div>
            ))}
          </div>
          <p className="text-sm leading-relaxed mt-3" style={{ color: "rgba(255,255,255,0.55)" }}>
            Your employees submit their numbers each week or month. You'll review them together in your Weekly Review meeting.
          </p>
        </div>

        {/* Pre-filled industry KPIs */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
            Your KPIs — edit or remove any
          </p>
          <div className="flex flex-col gap-2">
            {data.kpis.map((kpi, idx) => (
              <div key={idx} className="rounded-xl p-3"
                style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                {/* Row 1: KPI name (full width) */}
                <div className="flex items-center gap-2 mb-2">
                  <input
                    style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                    value={kpi.name}
                    onChange={e => updateKpi(idx, { name: e.target.value })}
                    placeholder="KPI name (e.g. New Patients)"
                  />
                  <button
                    onClick={() => removeKpi(idx)}
                    className="text-lg leading-none flex-shrink-0 transition-colors"
                    style={{ color: "rgba(255,255,255,0.25)" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#F87171")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
                  >×</button>
                </div>
                {/* Row 2: Unit + Frequency */}
                <div className="flex items-center gap-2">
                  <input
                    style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                    value={kpi.unit}
                    onChange={e => updateKpi(idx, { unit: e.target.value })}
                    placeholder="Unit (e.g. patients, $, %)"
                  />
                  <select
                    style={{ ...selectStyle, flexShrink: 0 }}
                    value={kpi.frequency}
                    onChange={e => updateKpi(idx, { frequency: e.target.value as "weekly" | "monthly" })}
                  >
                    <option value="weekly" style={{ backgroundColor: "#0F2440" }}>Weekly</option>
                    <option value="monthly" style={{ backgroundColor: "#0F2440" }}>Monthly</option>
                  </select>
                </div>
                {kpi.description && (
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{kpi.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={addBlank}
          className="text-sm font-medium transition-colors text-left"
          style={{ color: "#5EEAD4" }}
        >
          + Add custom KPI
        </button>

        <TipBox>
          Start with 3–5 KPIs. You can always add more from Settings. Employees will submit these numbers each week or month.
        </TipBox>
      </div>
      <NavButtons
        onBack={onBack}
        onNext={onNext}
        nextLabel="Continue →"
        onSkip={onNext}
        skipLabel="Skip KPIs"
      />
    </div>
  );
}

// ─── Step 8: Employee Invites ─────────────────────────────────────────────────

function StepEmployeeInvites({
  data,
  onChange,
  onNext,
  onBack,
  businessName,
}: {
  data: Pick<OnboardingData, "employees" | "ownerCount">;
  onChange: (u: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  businessName: string;
}) {
  const addRow = (role: "employee" | "coowner" = "employee") => {
    onChange({ employees: [...data.employees, { name: "", email: "", role }] });
  };

  const updateRow = (idx: number, patch: Partial<EmployeeDraft>) => {
    onChange({ employees: data.employees.map((e, i) => i === idx ? { ...e, ...patch } : e) });
  };

  const removeRow = (idx: number) => {
    onChange({ employees: data.employees.filter((_, i) => i !== idx) });
  };

  const employees = data.employees.filter(e => e.role === "employee");
  const coowners = data.employees.filter(e => e.role === "coowner");

  return (
    <div>
      <StepHeader
        title="Invite your team"
        subtitle="Add employees and co-owners now so they can log in and submit their numbers right away. You can skip this and do it later in Settings."
      />
      <div className="flex flex-col gap-6">
        {/* Co-owner section (only if ownerCount > 1) */}
        {data.ownerCount > 1 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>
                Co-Owners / Partners
              </p>
              <button
                onClick={() => addRow("coowner")}
                className="text-xs font-medium transition-colors"
                style={{ color: "#5EEAD4" }}
              >+ Add co-owner</button>
            </div>
            {coowners.length === 0 ? (
              <div className="rounded-xl p-4 text-center text-sm"
                style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)" }}>
                No co-owners added yet
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {data.employees.map((emp, idx) => emp.role !== "coowner" ? null : (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      style={{ ...inputStyle, flex: 1 }}
                      value={emp.name}
                      onChange={e => updateRow(idx, { name: e.target.value })}
                      placeholder="Name"
                    />
                    <input
                      style={{ ...inputStyle, flex: 1 }}
                      value={emp.email}
                      onChange={e => updateRow(idx, { email: e.target.value })}
                      placeholder="Email address"
                      type="email"
                    />
                    <button
                      onClick={() => removeRow(idx)}
                      className="text-lg leading-none flex-shrink-0 transition-colors"
                      style={{ color: "rgba(255,255,255,0.25)" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#F87171")}
                      onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Employees section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>
              Employees
            </p>
            <button
              onClick={() => addRow("employee")}
              className="text-xs font-medium transition-colors"
              style={{ color: "#5EEAD4" }}
            >+ Add employee</button>
          </div>
          {employees.length === 0 ? (
            <div className="rounded-xl p-4 text-center text-sm"
              style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)" }}>
              No employees added yet — click "+ Add employee" above
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {data.employees.map((emp, idx) => emp.role !== "employee" ? null : (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    value={emp.name}
                    onChange={e => updateRow(idx, { name: e.target.value })}
                    placeholder="Name"
                  />
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    value={emp.email}
                    onChange={e => updateRow(idx, { email: e.target.value })}
                    placeholder="Email address"
                    type="email"
                  />
                  <button
                    onClick={() => removeRow(idx)}
                    className="text-lg leading-none flex-shrink-0 transition-colors"
                    style={{ color: "rgba(255,255,255,0.25)" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#F87171")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <TipBox>
          Each person will receive an invite link by email to set their own password. They'll have limited access — they can submit KPIs and view the Team Board, but not change settings.
        </TipBox>
      </div>
      <NavButtons
        onBack={onBack}
        onNext={onNext}
        nextLabel={data.employees.length > 0 ? "Send Invites & Continue →" : "Continue →"}
        onSkip={onNext}
        skipLabel="Skip — add later in Settings"
      />
    </div>
  );
}

// ─── Step 8b: Business Hours ────────────────────────────────────────────────

const COMMON_TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Phoenix", "America/Anchorage", "Pacific/Honolulu",
  "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Asia/Tokyo", "Asia/Shanghai", "Asia/Kolkata",
  "Australia/Sydney", "Australia/Melbourne",
];

const TZ_LABELS: Record<string, string> = {
  "America/New_York": "Eastern (ET)",
  "America/Chicago": "Central (CT)",
  "America/Denver": "Mountain (MT)",
  "America/Los_Angeles": "Pacific (PT)",
  "America/Phoenix": "Arizona (MST)",
  "America/Anchorage": "Alaska (AKT)",
  "Pacific/Honolulu": "Hawaii (HST)",
  "Europe/London": "London (GMT/BST)",
  "Europe/Paris": "Paris (CET)",
  "Europe/Berlin": "Berlin (CET)",
  "Asia/Tokyo": "Tokyo (JST)",
  "Asia/Shanghai": "Shanghai (CST)",
  "Asia/Kolkata": "India (IST)",
  "Australia/Sydney": "Sydney (AEDT)",
  "Australia/Melbourne": "Melbourne (AEDT)",
};

const TIME_OPTIONS_BH = Array.from({ length: 24 * 2 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  const hh = String(h).padStart(2, "0");
  const label = h === 0 ? `12:${m} AM` : h < 12 ? `${h}:${m} AM` : h === 12 ? `12:${m} PM` : `${h - 12}:${m} PM`;
  return { value: `${hh}:${m}`, label };
});

function StepBusinessHours({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: Pick<OnboardingData, "bhWorkDays" | "bhStartTime" | "bhEndTime" | "bhTimezone">;
  onChange: (u: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const toggleDay = (d: number) => {
    const days = data.bhWorkDays.includes(d)
      ? data.bhWorkDays.filter(x => x !== d)
      : [...data.bhWorkDays, d].sort((a, b) => a - b);
    onChange({ bhWorkDays: days });
  };

  // Ensure the timezone list includes the user's detected timezone
  const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzList = COMMON_TIMEZONES.includes(detectedTz)
    ? COMMON_TIMEZONES
    : [detectedTz, ...COMMON_TIMEZONES];

  return (
    <div>
      <StepHeader
        title="Set your business hours"
        subtitle="We'll use this to manage notifications and remind you when you're posting after hours."
      />
      <div className="flex flex-col gap-5">
        {/* Work days */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-2"
            style={{ color: "rgba(255,255,255,0.4)" }}>Work Days</label>
          <div className="flex gap-2 flex-wrap">
            {DAY_NAMES.map((name, idx) => (
              <button
                key={idx}
                onClick={() => toggleDay(idx)}
                className="w-10 h-10 rounded-lg text-xs font-bold transition-all active:scale-95"
                style={{
                  backgroundColor: data.bhWorkDays.includes(idx) ? "rgba(94,234,212,0.2)" : "rgba(255,255,255,0.05)",
                  border: data.bhWorkDays.includes(idx) ? "1.5px solid rgba(94,234,212,0.5)" : "1.5px solid rgba(255,255,255,0.1)",
                  color: data.bhWorkDays.includes(idx) ? "#5EEAD4" : "rgba(255,255,255,0.4)",
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Hours */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
              style={{ color: "rgba(255,255,255,0.4)" }}>Start Time</label>
            <select
              style={selectStyle}
              value={data.bhStartTime}
              onChange={e => onChange({ bhStartTime: e.target.value })}
            >
              {TIME_OPTIONS_BH.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
              style={{ color: "rgba(255,255,255,0.4)" }}>End Time</label>
            <select
              style={selectStyle}
              value={data.bhEndTime}
              onChange={e => onChange({ bhEndTime: e.target.value })}
            >
              {TIME_OPTIONS_BH.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Timezone */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
            style={{ color: "rgba(255,255,255,0.4)" }}>Timezone</label>
          <select
            style={selectStyle}
            value={data.bhTimezone}
            onChange={e => onChange({ bhTimezone: e.target.value })}
          >
            {tzList.map(tz => (
              <option key={tz} value={tz}>{TZ_LABELS[tz] ?? tz}</option>
            ))}
          </select>
        </div>

        <TipBox>
          You can always change these in Settings. When you post outside business hours, we'll remind you that your partner won't be notified until business hours resume.
        </TipBox>
      </div>
      <NavButtons
        onBack={onBack}
        onNext={onNext}
        canProceed={data.bhWorkDays.length > 0}
        nextLabel="Continue →"
      />
    </div>
  );
}

// ─── Step 9: Preview ──────────────────────────────────────────────────────────

const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MEETING_TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  daily:     { bg: "rgba(59,130,246,0.3)", text: "#93C5FD", label: "Daily" },
  weekly:    { bg: "rgba(94,234,212,0.3)", text: "#5EEAD4", label: "Weekly" },
  monthly:   { bg: "rgba(167,139,250,0.3)", text: "#C4B5FD", label: "Monthly" },
  quarterly: { bg: "rgba(251,146,60,0.3)", text: "#FED7AA", label: "Quarterly" },
};

function MiniCalendarPreview({ data }: { data: OnboardingData }) {
  const today = new Date();
  const year = today.getFullYear();
  const startMonth = today.getMonth();

  const meetings = generateMeetingSchedule({
    year,
    workDays: data.workDays,
    meetingDayPrefs: data.meetingDayPrefs,
    closedPeriods: [],
  });

  const meetingMap = new Map<string, Set<string>>();
  for (const m of meetings) {
    if (!meetingMap.has(m.date)) meetingMap.set(m.date, new Set());
    meetingMap.get(m.date)!.add(m.meetingType);
  }

  const months = [0, 1, 2].map(offset => {
    const m = (startMonth + offset) % 12;
    const y = year + Math.floor((startMonth + offset) / 12);
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
    return { year: y, month: m, days };
  });

  const windowStart = `${year}-${String(startMonth + 1).padStart(2, "0")}-01`;
  const endMonth = (startMonth + 2) % 12;
  const endYear = year + Math.floor((startMonth + 2) / 12);
  const windowEnd = `${endYear}-${String(endMonth + 1).padStart(2, "0")}-${new Date(endYear, endMonth + 1, 0).getDate()}`;
  const windowMeetings = meetings.filter(m => m.date >= windowStart && m.date <= windowEnd);
  const countByType: Record<string, number> = {};
  for (const m of windowMeetings) countByType[m.meetingType] = (countByType[m.meetingType] ?? 0) + 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
          Calendar Preview — Next 3 Months
        </p>
        <div className="flex gap-1.5 flex-wrap justify-end">
          {Object.entries(countByType).map(([type, count]) => {
            const c = MEETING_TYPE_COLORS[type];
            if (!c) return null;
            return (
              <span key={type} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: c.bg, color: c.text }}>
                {count} {c.label}
              </span>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {months.map(({ year: y, month: m, days }) => (
          <div key={`${y}-${m}`} className="flex flex-col gap-1">
            <p className="text-[10px] font-bold text-center uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
              {MONTH_NAMES_SHORT[m]} {y}
            </p>
            <div className="grid grid-cols-7 gap-px">
              {["S","M","T","W","T","F","S"].map((d, i) => (
                <div key={i} className="text-[8px] text-center font-medium" style={{ color: "rgba(255,255,255,0.25)" }}>{d}</div>
              ))}
              {days.map((day, i) => {
                if (!day) return <div key={i} />;
                const dateKey = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const types = meetingMap.get(dateKey);
                const isToday = dateKey === today.toISOString().slice(0, 10);
                const primaryType = types?.has("quarterly") ? "quarterly"
                  : types?.has("monthly") ? "monthly"
                  : types?.has("weekly") ? "weekly"
                  : types?.has("daily") ? "daily" : null;
                const c = primaryType ? MEETING_TYPE_COLORS[primaryType] : null;
                return (
                  <div key={i}
                    className="aspect-square flex items-center justify-center rounded-sm text-[8px] font-medium"
                    style={{
                      backgroundColor: c ? c.bg : isToday ? "rgba(94,234,212,0.15)" : "transparent",
                      color: c ? c.text : isToday ? "#5EEAD4" : "rgba(255,255,255,0.5)",
                      fontWeight: c ? 700 : 400,
                      outline: isToday ? "1px solid rgba(94,234,212,0.4)" : undefined,
                    }}
                  >{day}</div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepPreview({
  data,
  onConfirm,
  onBack,
  isLoading,
}: {
  data: OnboardingData;
  onConfirm: () => void;
  onBack: () => void;
  isLoading: boolean;
}) {
  const industry = INDUSTRY_TYPES.find(i => i.value === data.industry);
  const totalMeetings = (() => {
    const p = data.meetingDayPrefs;
    let c = 0;
    if (p.ownerDailyEnabled) c += p.ownerDaily.length * 52;
    if (p.ownerWeeklyEnabled) c += 52;
    if (p.ownerMonthlyEnabled) c += 12;
    if (p.quarterlyEnabled) c += 4;
    if (p.teamDailyEnabled) c += p.teamDaily.length * 52;
    if (p.teamWeeklyEnabled) c += 52;
    return c;
  })();

  return (
    <div>
      <StepHeader
        title="Review your setup"
        subtitle="Everything look right? You can change any of this later in Settings or Manage Schedule."
      />
      <div className="flex flex-col gap-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: "🏢", label: "Business", value: data.businessName },
            { icon: "🏷️", label: "Industry", value: industry?.label ?? data.industry },
            { icon: "👤", label: "Owners", value: `${data.ownerCount} owner${data.ownerCount !== 1 ? "s" : ""}` },
            { icon: "👥", label: "Employees", value: `${data.employeeCount} employee${data.employeeCount !== 1 ? "s" : ""}` },
            { icon: "📅", label: "Meetings/year", value: `${totalMeetings} meetings` },
            { icon: "🎯", label: "Goals set", value: `${data.goals.length} goal${data.goals.length !== 1 ? "s" : ""}` },
            { icon: "📊", label: "KPIs configured", value: `${data.kpis.length} KPI${data.kpis.length !== 1 ? "s" : ""}` },
            { icon: "✉️", label: "Invites queued", value: `${data.employees.length} person${data.employees.length !== 1 ? "s" : ""}` },
          ].map(item => (
            <div key={item.label} className="rounded-xl p-3 flex items-center gap-3"
              style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span className="text-xl">{item.icon}</span>
              <div>
                <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{item.label}</div>
                <div className="text-sm font-semibold text-white">{item.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Mini calendar */}
        <div className="rounded-xl p-4"
          style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <MiniCalendarPreview data={data} />
        </div>

        {/* Confirm button */}
        <div className="flex gap-3 mt-2">
          <button
            onClick={onBack}
            className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", backgroundColor: "rgba(255,255,255,0.04)" }}
          >
            ← Back
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #5EEAD4, #2DD4BF)", color: "#0F2440" }}
          >
            {isLoading ? "Building your calendar…" : "Build My Calendar →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 10: Done ────────────────────────────────────────────────────────────

function StepDone({ businessName, invitesSent, coOwnerName, onEnter }: { businessName: string; invitesSent: number; coOwnerName: string; onEnter: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
        style={{ backgroundColor: "rgba(94,234,212,0.1)", border: "1px solid rgba(94,234,212,0.2)" }}>
        🎉
      </div>
      <div>
        <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          You're all set!
        </h2>
        <p className="text-lg max-w-md" style={{ color: "rgba(255,255,255,0.5)" }}>
          <strong style={{ color: "#5EEAD4" }}>{businessName}</strong> is ready to run on BusinessCadence.
        </p>
      </div>
      <div className="flex flex-col gap-2 text-sm w-full max-w-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
        <div className="flex items-center gap-2"><span style={{ color: "#5EEAD4" }}>✓</span> Meeting cadence built</div>
        <div className="flex items-center gap-2"><span style={{ color: "#5EEAD4" }}>✓</span> Goals and KPIs configured</div>
        <div className="flex items-center gap-2"><span style={{ color: "#5EEAD4" }}>✓</span> Business hours set</div>
        {coOwnerName && (
          <div className="flex items-center gap-2">
            <span style={{ color: "#5EEAD4" }}>✓</span> Invite sent to {coOwnerName}
          </div>
        )}
        {invitesSent > 0 && (
          <div className="flex items-center gap-2">
            <span style={{ color: "#5EEAD4" }}>✓</span> {invitesSent} team invite{invitesSent !== 1 ? "s" : ""} sent
          </div>
        )}
        <div className="flex items-center gap-2"><span style={{ color: "#5EEAD4" }}>✓</span> Industry agendas applied</div>
      </div>
      <button
        onClick={onEnter}
        className="mt-2 px-10 py-3 rounded-xl font-bold text-base transition-all hover:opacity-90 active:scale-[0.98]"
        style={{ background: "linear-gradient(135deg, #5EEAD4, #2DD4BF)", color: "#0F2440" }}
      >
        Open My Calendar →
      </button>
    </div>
  );
}

// ─── Step 2b: Logo Upload ────────────────────────────────────────────────────

function StepLogoUpload({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: Pick<OnboardingData, "businessName" | "logoBase64" | "logoMimeType" | "logoPreviewUrl">;
  onChange: (u: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Logo must be under 5 MB");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const base64 = result.split(",")[1] ?? "";
      onChange({ logoBase64: base64, logoMimeType: file.type, logoPreviewUrl: previewUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleRemove = () => {
    if (data.logoPreviewUrl) URL.revokeObjectURL(data.logoPreviewUrl);
    onChange({ logoBase64: "", logoMimeType: "", logoPreviewUrl: "" });
  };

  return (
    <div>
      <StepHeader
        title="Add your business logo"
        subtitle="This will appear on your business card in the app. You can change it later in Settings."
      />
      <div className="flex flex-col items-center gap-5">
        {/* Drop zone / preview */}
        {data.logoPreviewUrl ? (
          <div className="relative">
            <div
              className="w-36 h-36 rounded-2xl overflow-hidden flex items-center justify-center"
              style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              <img src={data.logoPreviewUrl} alt="Logo preview" className="w-full h-full object-contain p-2" />
            </div>
            <button
              onClick={handleRemove}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: "#EF4444", color: "white" }}
            >
              ✕
            </button>
          </div>
        ) : (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className="w-full max-w-xs h-40 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all"
            style={{
              backgroundColor: isDragging ? "rgba(94,234,212,0.12)" : "rgba(255,255,255,0.04)",
              border: `2px dashed ${isDragging ? "#5EEAD4" : "rgba(255,255,255,0.15)"}`,
            }}
          >
            <span className="text-4xl">🖼️</span>
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: isDragging ? "#5EEAD4" : "rgba(255,255,255,0.6)" }}>
                Drop your logo here
              </p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>or click to browse · PNG, JPG, SVG · max 5 MB</p>
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />

        {data.logoPreviewUrl && (
          <button
            onClick={() => inputRef.current?.click()}
            className="text-sm transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#5EEAD4")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
          >
            Choose a different image
          </button>
        )}

        <TipBox>
          A square or circular logo works best. Your logo will be displayed on a dark background on the business selector card.
        </TipBox>
      </div>
      <NavButtons
        onBack={onBack}
        onNext={onNext}
        canProceed={true}
        nextLabel={data.logoBase64 ? "Continue →" : "Continue →"}
        onSkip={onNext}
        skipLabel="Skip — add later"
      />
    </div>
  );
}

// ─── Main Onboarding Component ────────────────────────────────────────────────

export default function Onboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [invitesSent, setInvitesSent] = useState(0);

  const accountId = Number(localStorage.getItem("bcc_account_id") ?? "0");
  const personId = localStorage.getItem("bcc_person_id") ?? "";

  const [data, setData] = useState<OnboardingData>({
    businessName: "",
    industry: "healthcare",
    logoBase64: "",
    logoMimeType: "",
    logoPreviewUrl: "",
    ownerCount: 2,
    employeeCount: 3,
    workDays: [1, 2, 3, 4, 5],
    // Co-owner invite
    coOwnerName: "",
    coOwnerEmail: "",
    coOwnerBusinesses: ["chiro", "crossfit"], // default to all available
    // Business hours
    bhWorkDays: [1, 2, 3, 4, 5],
    bhStartTime: "08:00",
    bhEndTime: "18:00",
    bhTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
    meetingDayPrefs: INDUSTRY_MEETING_DAY_DEFAULTS["healthcare"],
    meetingTimes: { ...DEFAULT_MEETING_TIMES },
    goals: [],
    kpis: INDUSTRY_KPI_DEFAULTS["healthcare"].map(k => ({ ...k })),
    employees: [],
  });

  const saveOnboarding = trpc.onboarding.save.useMutation();
  const createBusiness = trpc.business.create.useMutation();
  const uploadLogo = trpc.business.uploadLogo.useMutation();
  const createGoal = trpc.goals.create.useMutation();
  const seedKpis = trpc.kpi.seedDefaults.useMutation();
  const invitePerson = trpc.person.invite.useMutation();
  const saveBusinessHours = trpc.businessHours.updateSettings.useMutation();

  const update = useCallback((updates: Partial<OnboardingData>) => {
    setData(prev => {
      const next = { ...prev, ...updates };
      // When industry changes, reset KPIs to new industry defaults
      if (updates.industry && updates.industry !== prev.industry) {
        next.kpis = INDUSTRY_KPI_DEFAULTS[updates.industry].map(k => ({ ...k }));
        next.goals = [];
      }
      return next;
    });
  }, []);

  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => Math.max(0, s - 1));

  const handleConfirm = async () => {
    try {
      // 1. Save business profile
      await saveOnboarding.mutateAsync({
        accountId,
        businessName: data.businessName,
        industry: data.industry,
        ownerCount: data.ownerCount,
        employeeCount: data.employeeCount,
        workDays: data.workDays,
        meetingDayPrefs: data.meetingDayPrefs,
        meetingTimes: data.meetingTimes,
        onboardingComplete: true,
      });

      // 2. Create business record
      // goals.create requires business to be one of the legacy enum values — map industry to closest
      const businessSlugMap: Record<string, "chiropractic" | "crossfit" | "general"> = {
        healthcare: "chiropractic",
        fitness: "crossfit",
        realestate: "general",
        retail: "general",
        restaurant: "general",
        professional: "general",
        construction: "general",
        salon: "general",
        other: "general",
      };
      const slug = businessSlugMap[data.industry] ?? "general";
      const kpiSlug = data.businessName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60) || "business";
      const iconMap: Record<string, string> = { healthcare: "🏥", fitness: "💪", realestate: "🏠", restaurant: "🍕", retail: "🛍️", professional: "💼", construction: "🔨", salon: "✂️", other: "🏢" };
      const colorMap: Record<string, string> = { healthcare: "#10B981", fitness: "#F59E0B", realestate: "#2563EB", restaurant: "#E11D48", retail: "#7C3AED", professional: "#0D9488", construction: "#D97706", salon: "#EC4899", other: "#64748B" };
      let createdBusinessId: number | null = null;
      try {
        const biz = await createBusiness.mutateAsync({
          accountId,
          name: data.businessName.trim(),
          slug,
          icon: iconMap[data.industry] ?? "🏢",
          color: colorMap[data.industry] ?? "#64748B",
          sortOrder: 0,
        });
        createdBusinessId = biz?.id ?? null;
      } catch { /* non-fatal */ }

      // 2b. Upload logo if provided
      if (createdBusinessId && data.logoBase64 && data.logoMimeType) {
        try {
          await uploadLogo.mutateAsync({
            businessId: createdBusinessId,
            base64Data: data.logoBase64,
            mimeType: data.logoMimeType,
          });
        } catch { /* non-fatal */ }
      }

      // 3. Save goals
      for (const goal of data.goals) {
        if (!goal.label.trim()) continue;
        try {
          await createGoal.mutateAsync({
            accountId,
            business: slug,
            title: goal.label.trim(),
            description: [goal.metric, goal.targetValue ? `Target: ${goal.targetValue} ${goal.unit}`.trim() : ""].filter(Boolean).join(" — "),
            period: goal.period === "annual" ? "annual" : "quarterly",
            year: new Date().getFullYear(),
          });
        } catch { /* non-fatal */ }
      }

      // 4. Seed KPIs
        try {
          await seedKpis.mutateAsync({ accountId, businessSlug: kpiSlug });
        } catch { /* non-fatal */ }

      // 5. Send employee invites
      let sent = 0;
      const origin = window.location.origin;
      for (const emp of data.employees) {
        if (!emp.name.trim() || !emp.email.trim()) continue;
        try {
          await invitePerson.mutateAsync({
            accountId,
            name: emp.name.trim(),
            email: emp.email.trim(),
            role: emp.role,
            businessScope: kpiSlug,
            origin,
          });
          sent++;
        } catch { /* non-fatal */ }
      }

      // 6. Send co-owner invite (if provided)
      if (data.coOwnerName.trim() && data.coOwnerEmail.trim()) {
        try {
          await invitePerson.mutateAsync({
            accountId,
            name: data.coOwnerName.trim(),
            email: data.coOwnerEmail.trim(),
            role: "coowner",
            businessScope: data.coOwnerBusinesses.join(","),
            origin,
          });
          sent++;
        } catch { /* non-fatal */ }
      }
      setInvitesSent(sent);

      // 7. Save business hours
      try {
        await saveBusinessHours.mutateAsync({
          accountId,
          workDays: JSON.stringify(data.bhWorkDays),
          startTime: data.bhStartTime,
          endTime: data.bhEndTime,
          timezone: data.bhTimezone,
        });
      } catch { /* non-fatal */ }

      next(); // go to Done
    } catch (err) {
      console.error("Onboarding save failed:", err);
    }
  };

  const handleEnterApp = () => {
    if (accountId) {
      try { localStorage.setItem("bcc_onboarding_done_" + accountId, "1"); } catch { /* ignore */ }
    }
    navigate("/app");
  };

  const progressPercent = step === 0 ? 0 : Math.round((step / (TOTAL_STEPS - 1)) * 100);

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #0A1929 0%, #0F2440 100%)" }}>
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgba(94,234,212,0.15)", border: "1px solid rgba(94,234,212,0.3)" }}>
              <span className="text-xs font-bold" style={{ color: "#5EEAD4" }}>BC</span>
            </div>
            <span className="font-semibold text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>BusinessCadence</span>
          </div>
          {step > 0 && step < TOTAL_STEPS - 1 && (
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              Step {step} of {TOTAL_STEPS - 2}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {step > 0 && step < TOTAL_STEPS - 1 && (
          <div className="mb-6">
            <Progress value={progressPercent} className="h-1.5" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
          </div>
        )}

        {/* Card */}
        <div className="rounded-2xl p-8"
          style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}>
          {step === 0 && <StepWelcome onNext={next} />}
          {/* Step 1: Business basics (name + industry) — first real step */}
          {step === 1 && <StepBusinessBasics data={data} onChange={update} onNext={next} onBack={back} />}
          {/* Step 2: Logo upload — right after naming the business */}
          {step === 2 && <StepLogoUpload data={data} onChange={update} onNext={next} onBack={back} />}
          {/* Step 3: Co-owner invite — now they know the business name */}
          {step === 3 && <StepCoOwnerInvite data={data} onChange={update} onNext={next} onBack={back} />}
          {/* Step 4: Team size */}
          {step === 4 && <StepTeamSize data={data} onChange={update} onNext={next} onBack={back} />}
          {/* Step 5: Work schedule */}
          {step === 5 && <StepWorkSchedule data={data} onChange={update} onNext={next} onBack={back} />}
          {/* Step 6: Meeting cadence */}
          {step === 6 && <MeetingCadenceStep data={data} onChange={update} onNext={next} onBack={back} />}
          {/* Step 7: Goals */}
          {step === 7 && <StepGoals data={data} onChange={update} onNext={next} onBack={back} />}
          {/* Step 8: KPIs */}
          {step === 8 && <StepKPIs data={data} onChange={update} onNext={next} onBack={back} />}
          {/* Step 9: Employee invites */}
          {step === 9 && (
            <StepEmployeeInvites
              data={data}
              onChange={update}
              onNext={next}
              onBack={back}
              businessName={data.businessName}
            />
          )}
          {/* Step 10: Business hours */}
          {step === 10 && <StepBusinessHours data={data} onChange={update} onNext={next} onBack={back} />}
          {/* Step 11: Review / Preview */}
          {step === 11 && (
            <StepPreview
              data={data}
              onConfirm={handleConfirm}
              onBack={back}
              isLoading={saveOnboarding.isPending}
            />
          )}
          {/* Step 12: Done */}
          {step === 12 && (
            <StepDone
              businessName={data.businessName}
              invitesSent={invitesSent}
              coOwnerName={data.coOwnerName}
              onEnter={handleEnterApp}
            />
          )}
        </div>
      </div>
    </div>
  );
}
