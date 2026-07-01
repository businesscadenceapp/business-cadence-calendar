import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { INDUSTRY_TYPES, INDUSTRY_MEETING_DAY_DEFAULTS, type IndustryType } from "@shared/industryDefaults";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface OnboardingData {
  businessName: string;
  industry: IndustryType;
  ownerCount: number;
  employeeCount: number;
  workDays: number[]; // 0=Sun..6=Sat
  meetingDayPrefs: {
    ownerDaily: number;
    ownerWeekly: number;
    ownerMonthly: number;
    teamDaily: number;
    teamWeekly: number;
  };
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TOTAL_STEPS = 8;

// ─── Step components ─────────────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div className="w-20 h-20 rounded-2xl bg-teal-500/10 flex items-center justify-center">
        <span className="text-4xl">📅</span>
      </div>
      <div>
        <h1 className="text-3xl font-bold text-navy mb-3">Welcome to BusinessCadence</h1>
        <p className="text-slate-500 text-lg max-w-md">
          Let's set up your calendar in about 2 minutes. We'll ask a few questions about your business
          so we can build a meeting rhythm that actually fits how you work.
        </p>
      </div>
      <div className="flex flex-col gap-2 text-sm text-slate-400 mt-2">
        <div className="flex items-center gap-2">
          <span className="text-teal-500">✓</span> Industry-specific agenda templates
        </div>
        <div className="flex items-center gap-2">
          <span className="text-teal-500">✓</span> Meetings scheduled around your work days
        </div>
        <div className="flex items-center gap-2">
          <span className="text-teal-500">✓</span> Editable closed days that auto-shift meetings
        </div>
      </div>
      <Button onClick={onNext} size="lg" className="mt-4 bg-navy hover:bg-navy/90 text-white px-10">
        Let's Get Started →
      </Button>
    </div>
  );
}

function StepBusinessBasics({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: Pick<OnboardingData, "businessName" | "industry">;
  onChange: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const canProceed = data.businessName.trim().length > 0 && data.industry;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-navy mb-1">Tell us about your business</h2>
        <p className="text-slate-500">This helps us tailor your meeting agenda templates.</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="bizName" className="text-sm font-medium text-slate-700">Business Name</Label>
        <Input
          id="bizName"
          placeholder="e.g. New Beginnings Chiropractic"
          value={data.businessName}
          onChange={e => onChange({ businessName: e.target.value })}
          className="text-base"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium text-slate-700">Industry</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {INDUSTRY_TYPES.map(industry => (
            <button
              key={industry.value}
              onClick={() => {
                onChange({
                  industry: industry.value,
                  meetingDayPrefs: INDUSTRY_MEETING_DAY_DEFAULTS[industry.value],
                });
              }}
              className={cn(
                "flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all duration-150",
                data.industry === industry.value
                  ? "border-teal-500 bg-teal-50"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              )}
            >
              <span className="font-medium text-sm text-navy">{industry.label}</span>
              <span className="text-xs text-slate-400 mt-0.5">{industry.description}</span>
            </button>
          ))}
        </div>
      </div>

      <StepNav onBack={onBack} onNext={onNext} canProceed={!!canProceed} />
    </div>
  );
}

function StepTeamSize({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: Pick<OnboardingData, "ownerCount" | "employeeCount">;
  onChange: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-navy mb-1">Who's on your team?</h2>
        <p className="text-slate-500">Helps us understand your meeting structure.</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">Owners / Partners</Label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onChange({ ownerCount: Math.max(1, data.ownerCount - 1) })}
              className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center text-xl font-bold text-slate-600 hover:border-teal-500 transition-colors"
            >−</button>
            <span className="text-3xl font-bold text-navy w-8 text-center">{data.ownerCount}</span>
            <button
              onClick={() => onChange({ ownerCount: Math.min(20, data.ownerCount + 1) })}
              className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center text-xl font-bold text-slate-600 hover:border-teal-500 transition-colors"
            >+</button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">Employees</Label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onChange({ employeeCount: Math.max(0, data.employeeCount - 1) })}
              className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center text-xl font-bold text-slate-600 hover:border-teal-500 transition-colors"
            >−</button>
            <span className="text-3xl font-bold text-navy w-8 text-center">{data.employeeCount}</span>
            <button
              onClick={() => onChange({ employeeCount: Math.min(500, data.employeeCount + 1) })}
              className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center text-xl font-bold text-slate-600 hover:border-teal-500 transition-colors"
            >+</button>
          </div>
        </div>
      </div>

      <StepNav onBack={onBack} onNext={onNext} canProceed={true} />
    </div>
  );
}

function StepWorkSchedule({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: Pick<OnboardingData, "workDays">;
  onChange: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const toggleDay = (day: number) => {
    const current = data.workDays;
    if (current.includes(day)) {
      onChange({ workDays: current.filter(d => d !== day) });
    } else {
      onChange({ workDays: [...current, day].sort() });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-navy mb-1">What days do you operate?</h2>
        <p className="text-slate-500">We'll only schedule meetings on your work days.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {DAY_NAMES.map((name, i) => (
          <button
            key={i}
            onClick={() => toggleDay(i)}
            className={cn(
              "w-14 h-14 rounded-xl border-2 font-semibold text-sm transition-all duration-150",
              data.workDays.includes(i)
                ? "border-teal-500 bg-teal-500 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-teal-300"
            )}
          >
            {name}
          </button>
        ))}
      </div>

      {data.workDays.length === 0 && (
        <p className="text-sm text-red-500">Please select at least one work day.</p>
      )}

      <StepNav onBack={onBack} onNext={onNext} canProceed={data.workDays.length > 0} />
    </div>
  );
}

function DayPicker({
  label,
  value,
  onChange,
  allowedDays,
}: {
  label: string;
  value: number;
  onChange: (day: number) => void;
  allowedDays: number[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</Label>
      <div className="flex gap-1.5 flex-wrap">
        {DAY_NAMES.map((name, i) => {
          const allowed = allowedDays.includes(i);
          return (
            <button
              key={i}
              disabled={!allowed}
              onClick={() => allowed && onChange(i)}
              className={cn(
                "w-11 h-9 rounded-lg border text-xs font-semibold transition-all duration-150",
                !allowed && "opacity-30 cursor-not-allowed border-slate-100 text-slate-300",
                allowed && value === i && "border-teal-500 bg-teal-500 text-white",
                allowed && value !== i && "border-slate-200 bg-white text-slate-600 hover:border-teal-300"
              )}
            >
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepOwnerMeetings({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: Pick<OnboardingData, "workDays" | "meetingDayPrefs">;
  onChange: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const update = (key: keyof OnboardingData["meetingDayPrefs"], val: number) => {
    onChange({ meetingDayPrefs: { ...data.meetingDayPrefs, [key]: val } });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-navy mb-1">Owner meeting days</h2>
        <p className="text-slate-500">When do you and your co-owner(s) meet? Only your work days are selectable.</p>
      </div>

      <div className="flex flex-col gap-5 bg-slate-50 rounded-xl p-4">
        <DayPicker
          label="Daily Huddle (every week)"
          value={data.meetingDayPrefs.ownerDaily}
          onChange={v => update("ownerDaily", v)}
          allowedDays={data.workDays}
        />
        <DayPicker
          label="Weekly L10 / Review"
          value={data.meetingDayPrefs.ownerWeekly}
          onChange={v => update("ownerWeekly", v)}
          allowedDays={data.workDays}
        />
        <DayPicker
          label="Monthly Finance Review (1st occurrence each month)"
          value={data.meetingDayPrefs.ownerMonthly}
          onChange={v => update("ownerMonthly", v)}
          allowedDays={data.workDays}
        />
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Quarterly Offsite</Label>
          <p className="text-xs text-slate-400">Always scheduled on the first Friday of Jan, Apr, Jul, Oct — shifts to next Friday if that day is closed.</p>
        </div>
      </div>

      <StepNav onBack={onBack} onNext={onNext} canProceed={true} />
    </div>
  );
}

function StepTeamMeetings({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: Pick<OnboardingData, "workDays" | "meetingDayPrefs">;
  onChange: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const update = (key: keyof OnboardingData["meetingDayPrefs"], val: number) => {
    onChange({ meetingDayPrefs: { ...data.meetingDayPrefs, [key]: val } });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-navy mb-1">Team meeting days</h2>
        <p className="text-slate-500">When does your full team meet? These are separate from owner-only meetings.</p>
      </div>

      <div className="flex flex-col gap-5 bg-slate-50 rounded-xl p-4">
        <DayPicker
          label="Team Daily Standup (every week)"
          value={data.meetingDayPrefs.teamDaily}
          onChange={v => update("teamDaily", v)}
          allowedDays={data.workDays}
        />
        <DayPicker
          label="Team Weekly Meeting"
          value={data.meetingDayPrefs.teamWeekly}
          onChange={v => update("teamWeekly", v)}
          allowedDays={data.workDays}
        />
      </div>

      <StepNav onBack={onBack} onNext={onNext} canProceed={true} />
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-navy mb-1">Review your setup</h2>
        <p className="text-slate-500">Everything look right? You can always change this later in Settings.</p>
      </div>

      <div className="bg-slate-50 rounded-xl divide-y divide-slate-200">
        <PreviewRow label="Business" value={data.businessName} />
        <PreviewRow label="Industry" value={industry?.label ?? data.industry} />
        <PreviewRow label="Owners / Partners" value={String(data.ownerCount)} />
        <PreviewRow label="Employees" value={String(data.employeeCount)} />
        <PreviewRow
          label="Work Days"
          value={data.workDays.map(d => DAY_NAMES[d]).join(", ")}
        />
        <PreviewRow
          label="Owner Daily Huddle"
          value={`Every ${DAY_FULL[data.meetingDayPrefs.ownerDaily]}`}
        />
        <PreviewRow
          label="Owner Weekly Review"
          value={`Every ${DAY_FULL[data.meetingDayPrefs.ownerWeekly]}`}
        />
        <PreviewRow
          label="Owner Monthly Review"
          value={`First ${DAY_FULL[data.meetingDayPrefs.ownerMonthly]} of each month`}
        />
        <PreviewRow label="Quarterly Offsite" value="First Friday of Jan, Apr, Jul, Oct" />
        <PreviewRow
          label="Team Daily Standup"
          value={`Every ${DAY_FULL[data.meetingDayPrefs.teamDaily]}`}
        />
        <PreviewRow
          label="Team Weekly Meeting"
          value={`Every ${DAY_FULL[data.meetingDayPrefs.teamWeekly]}`}
        />
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          ← Back
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
        >
          {isLoading ? "Building your calendar…" : "Build My Calendar →"}
        </Button>
      </div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-navy">{value}</span>
    </div>
  );
}

function StepDone({ businessName, onEnter }: { businessName: string; onEnter: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div className="w-20 h-20 rounded-full bg-teal-500/10 flex items-center justify-center">
        <span className="text-4xl">🎉</span>
      </div>
      <div>
        <h2 className="text-3xl font-bold text-navy mb-2">You're all set!</h2>
        <p className="text-slate-500 text-lg max-w-md">
          Your BusinessCadence calendar for <strong>{businessName}</strong> is ready.
          Meetings are scheduled around your work days with industry-specific agendas.
        </p>
      </div>
      <div className="flex flex-col gap-2 text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <span className="text-teal-500">✓</span> Owner meeting cadence built
        </div>
        <div className="flex items-center gap-2">
          <span className="text-teal-500">✓</span> Team meeting cadence built
        </div>
        <div className="flex items-center gap-2">
          <span className="text-teal-500">✓</span> Industry agenda templates applied
        </div>
      </div>
      <Button onClick={onEnter} size="lg" className="mt-4 bg-navy hover:bg-navy/90 text-white px-10">
        Open My Calendar →
      </Button>
    </div>
  );
}

function StepNav({
  onBack,
  onNext,
  canProceed,
  nextLabel = "Continue →",
}: {
  onBack: () => void;
  onNext: () => void;
  canProceed: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="flex gap-3 mt-2">
      <Button variant="outline" onClick={onBack} className="flex-1">
        ← Back
      </Button>
      <Button
        onClick={onNext}
        disabled={!canProceed}
        className="flex-1 bg-navy hover:bg-navy/90 text-white disabled:opacity-40"
      >
        {nextLabel}
      </Button>
    </div>
  );
}

// ─── Main Onboarding Component ────────────────────────────────────────────────

export default function Onboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);

  // Get accountId from localStorage (set during login)
  const accountId = Number(localStorage.getItem("bcc_account_id") ?? "0");

  const [data, setData] = useState<OnboardingData>({
    businessName: "",
    industry: "healthcare",
    ownerCount: 2,
    employeeCount: 3,
    workDays: [1, 2, 3, 4, 5], // Mon–Fri default
    meetingDayPrefs: INDUSTRY_MEETING_DAY_DEFAULTS["healthcare"],
  });

  const saveOnboarding = trpc.onboarding.save.useMutation();

  const update = useCallback((updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => Math.max(0, s - 1));

  const handleConfirm = async () => {
    try {
      await saveOnboarding.mutateAsync({
        accountId,
        ...data,
        onboardingComplete: true,
      });
      next(); // go to Done step
    } catch (err) {
      console.error("Onboarding save failed:", err);
    }
  };

  const handleEnterApp = () => {
    // Mark onboarding as done so we don't redirect again on next login
    if (accountId) {
      try { localStorage.setItem("bcc_onboarding_done_" + accountId, "1"); } catch { /* ignore */ }
    }
    navigate("/app");
  };

  const progressPercent = step === 0 ? 0 : Math.round((step / (TOTAL_STEPS - 1)) * 100);

  return (
    <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center">
              <span className="text-white text-xs font-bold">BC</span>
            </div>
            <span className="font-semibold text-navy text-sm">BusinessCadence</span>
          </div>
          {step > 0 && step < TOTAL_STEPS - 1 && (
            <span className="text-xs text-slate-400">Step {step} of {TOTAL_STEPS - 2}</span>
          )}
        </div>

        {/* Progress bar */}
        {step > 0 && step < TOTAL_STEPS - 1 && (
          <div className="mb-6">
            <Progress value={progressPercent} className="h-1.5 bg-slate-200" />
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          {step === 0 && <StepWelcome onNext={next} />}
          {step === 1 && (
            <StepBusinessBasics data={data} onChange={update} onNext={next} onBack={back} />
          )}
          {step === 2 && (
            <StepTeamSize data={data} onChange={update} onNext={next} onBack={back} />
          )}
          {step === 3 && (
            <StepWorkSchedule data={data} onChange={update} onNext={next} onBack={back} />
          )}
          {step === 4 && (
            <StepOwnerMeetings data={data} onChange={update} onNext={next} onBack={back} />
          )}
          {step === 5 && (
            <StepTeamMeetings data={data} onChange={update} onNext={next} onBack={back} />
          )}
          {step === 6 && (
            <StepPreview
              data={data}
              onConfirm={handleConfirm}
              onBack={back}
              isLoading={saveOnboarding.isPending}
            />
          )}
          {step === 7 && (
            <StepDone businessName={data.businessName} onEnter={handleEnterApp} />
          )}
        </div>
      </div>
    </div>
  );
}
