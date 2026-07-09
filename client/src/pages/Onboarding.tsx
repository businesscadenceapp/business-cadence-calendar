import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { INDUSTRY_TYPES, INDUSTRY_MEETING_DAY_DEFAULTS, type IndustryType } from "@shared/industryDefaults";
import { generateMeetingSchedule } from "@shared/calendarEngine";
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
    ownerDaily: number[];  // multi-day selection
    ownerWeekly: number;
    ownerMonthly: number;
    quarterlyDay: number;  // day of week for quarterly offsite
    teamDaily: number[];  // multi-day selection
    teamWeekly: number;
    // enabled flags
    ownerDailyEnabled: boolean;
    ownerWeeklyEnabled: boolean;
    ownerMonthlyEnabled: boolean;
    quarterlyEnabled: boolean;
    teamDailyEnabled: boolean;
    teamWeeklyEnabled: boolean;
  };
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TOTAL_STEPS = 8;

// ─── Step components ─────────────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "rgba(94,234,212,0.1)", border: "1px solid rgba(94,234,212,0.2)" }}>
        <span className="text-4xl">📅</span>
      </div>
      <div>
        <h1 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Welcome to BusinessCadence</h1>
        <p className="text-lg max-w-md" style={{ color: "rgba(255,255,255,0.5)" }}>
          Let's set up your calendar in about 2 minutes. We'll ask a few questions about your business
          so we can build a meeting rhythm that actually fits how you work.
        </p>
      </div>
      <div className="flex flex-col gap-2 text-sm mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>
        <div className="flex items-center gap-2">
          <span style={{ color: "#5EEAD4" }}>✓</span> Industry-specific agenda templates
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: "#5EEAD4" }}>✓</span> Meetings scheduled around your work days
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: "#5EEAD4" }}>✓</span> Editable closed days that auto-shift meetings
        </div>
      </div>
      <Button onClick={onNext} size="lg" className="mt-4 px-10 font-bold" style={{ background: "linear-gradient(135deg, #5EEAD4, #2DD4BF)", color: "#0F2440" }}>
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
        <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Tell us about your business</h2>
        <p style={{ color: "rgba(255,255,255,0.5)" }}>This helps us tailor your meeting agenda templates.</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="bizName" className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>Business Name</Label>
        <Input
          id="bizName"
          placeholder="e.g. New Beginnings Chiropractic"
          value={data.businessName}
          onChange={e => onChange({ businessName: e.target.value })}
          className="text-base"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>Industry</Label>
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
              style={{
                border: `2px solid ${data.industry === industry.value ? "#5EEAD4" : "rgba(255,255,255,0.1)"}`,
                backgroundColor: data.industry === industry.value ? "rgba(94,234,212,0.1)" : "rgba(255,255,255,0.04)",
                borderRadius: "12px",
                padding: "12px",
                textAlign: "left",
                transition: "all 150ms",
              }}
            >
              <span className="font-medium text-sm text-white">{industry.label}</span>
              <span className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{industry.description}</span>
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
        <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Who's on your team?</h2>
        <p style={{ color: "rgba(255,255,255,0.5)" }}>Helps us understand your meeting structure.</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>Owners / Partners</Label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onChange({ ownerCount: Math.max(1, data.ownerCount - 1) })}
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold transition-colors"
              style={{ border: "2px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)" }}
            >−</button>
            <span className="text-3xl font-bold text-white w-8 text-center">{data.ownerCount}</span>
            <button
              onClick={() => onChange({ ownerCount: Math.min(20, data.ownerCount + 1) })}
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold transition-colors"
              style={{ border: "2px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)" }}
            >+</button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>Employees</Label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onChange({ employeeCount: Math.max(0, data.employeeCount - 1) })}
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold transition-colors"
              style={{ border: "2px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)" }}
            >−</button>
            <span className="text-3xl font-bold text-white w-8 text-center">{data.employeeCount}</span>
            <button
              onClick={() => onChange({ employeeCount: Math.min(500, data.employeeCount + 1) })}
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold transition-colors"
              style={{ border: "2px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)" }}
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
        <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>What days do you operate?</h2>
        <p style={{ color: "rgba(255,255,255,0.5)" }}>We'll only schedule meetings on your work days.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {DAY_NAMES.map((name, i) => (
          <button
            key={i}
            onClick={() => toggleDay(i)}
              style={{
                width: "56px", height: "56px", borderRadius: "12px",
                border: `2px solid ${data.workDays.includes(i) ? "#5EEAD4" : "rgba(255,255,255,0.12)"}`,
                backgroundColor: data.workDays.includes(i) ? "#5EEAD4" : "rgba(255,255,255,0.05)",
                color: data.workDays.includes(i) ? "#0F2440" : "rgba(255,255,255,0.6)",
                fontWeight: "600", fontSize: "14px", transition: "all 150ms",
              }}
          >
            {name}
          </button>
        ))}
      </div>

      {data.workDays.length === 0 && (
        <p className="text-sm" style={{ color: "#F87171" }}>Please select at least one work day.</p>
      )}

      <StepNav onBack={onBack} onNext={onNext} canProceed={data.workDays.length > 0} />
    </div>
  );
}

// Multi-select day picker (for Daily Huddle)
function DayPickerMulti({
  label,
  value,
  onChange,
  allowedDays,
}: {
  label: string;
  value: number[];
  onChange: (days: number[]) => void;
  allowedDays: number[];
}) {
  const toggle = (i: number) => {
    if (!allowedDays.includes(i)) return;
    const next = value.includes(i) ? value.filter(d => d !== i) : [...value, i];
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</Label>
      <p className="text-[11px] -mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>Select all days you hold this meeting each week.</p>
      <div className="flex gap-1.5 flex-wrap">
        {DAY_NAMES.map((name, i) => {
          const allowed = allowedDays.includes(i);
          const selected = value.includes(i);
          return (
            <button
              key={i}
              disabled={!allowed}
              onClick={() => toggle(i)}
              style={{
                width: "44px", height: "36px", borderRadius: "8px",
                border: `1px solid ${!allowed ? "rgba(255,255,255,0.06)" : selected ? "#5EEAD4" : "rgba(255,255,255,0.12)"}`,
                backgroundColor: !allowed ? "transparent" : selected ? "#5EEAD4" : "rgba(255,255,255,0.05)",
                color: !allowed ? "rgba(255,255,255,0.2)" : selected ? "#0F2440" : "rgba(255,255,255,0.6)",
                fontSize: "12px", fontWeight: "600", transition: "all 150ms",
                cursor: !allowed ? "not-allowed" : "pointer",
                opacity: !allowed ? 0.3 : 1,
              }}
            >
              {name}
            </button>
          );
        })}
      </div>
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
      <Label className="text-xs font-medium uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</Label>
      <div className="flex gap-1.5 flex-wrap">
        {DAY_NAMES.map((name, i) => {
          const allowed = allowedDays.includes(i);
          return (
            <button
              key={i}
              disabled={!allowed}
              onClick={() => allowed && onChange(i)}
              style={{
                width: "44px", height: "36px", borderRadius: "8px",
                border: `1px solid ${!allowed ? "rgba(255,255,255,0.06)" : value === i ? "#5EEAD4" : "rgba(255,255,255,0.12)"}`,
                backgroundColor: !allowed ? "transparent" : value === i ? "#5EEAD4" : "rgba(255,255,255,0.05)",
                color: !allowed ? "rgba(255,255,255,0.2)" : value === i ? "#0F2440" : "rgba(255,255,255,0.6)",
                fontSize: "12px", fontWeight: "600", transition: "all 150ms",
                cursor: !allowed ? "not-allowed" : "pointer",
                opacity: !allowed ? 0.3 : 1,
              }}
            >
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MeetingToggleRow({
  label,
  description,
  enabled,
  onToggle,
  children,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div style={{ borderRadius: "8px", border: `1px solid ${enabled ? "rgba(94,234,212,0.2)" : "rgba(255,255,255,0.08)"}`, backgroundColor: enabled ? "rgba(94,234,212,0.06)" : "rgba(255,255,255,0.03)", padding: "12px", transition: "all 200ms", opacity: enabled ? 1 : 0.7 }}>
      <div className="flex items-center justify-between mb-1">
        <div>
          <span className="text-sm font-semibold text-white">{label}</span>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{description}</p>
        </div>
        <button
          type="button"
          onClick={() => onToggle(!enabled)}
          className={cn("relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200")}
          style={{ backgroundColor: enabled ? "#5EEAD4" : "rgba(255,255,255,0.15)" }}
          aria-checked={enabled}
          role="switch"
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-4 w-4 rounded-full shadow transform transition-transform duration-200",
              enabled ? "translate-x-4" : "translate-x-0"
            )}
            style={{ backgroundColor: enabled ? "#0F2440" : "rgba(255,255,255,0.7)" }}
          />
        </button>
      </div>
      {enabled && children && <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>{children}</div>}
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
  const upd = (patch: Partial<OnboardingData["meetingDayPrefs"]>) =>
    onChange({ meetingDayPrefs: { ...data.meetingDayPrefs, ...patch } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Owner meeting days</h2>
        <p style={{ color: "rgba(255,255,255,0.5)" }}>Choose which meetings you want and when. Toggle off any you don't need — you can always change these later in Manage Schedule.</p>
      </div>

      <div className="flex flex-col gap-3">
        <MeetingToggleRow
          label="Daily Huddle"
          description="Quick daily sync between owners — 10–15 min"
          enabled={data.meetingDayPrefs.ownerDailyEnabled}
          onToggle={v => upd({ ownerDailyEnabled: v })}
        >
          <DayPickerMulti
            label="Which days?"
            value={data.meetingDayPrefs.ownerDaily}
            onChange={days => upd({ ownerDaily: days })}
            allowedDays={[1, 2, 3, 4, 5]}
          />
        </MeetingToggleRow>

        <MeetingToggleRow
          label="Weekly Review"
          description="Weekly business review — 60–90 min"
          enabled={data.meetingDayPrefs.ownerWeeklyEnabled}
          onToggle={v => upd({ ownerWeeklyEnabled: v })}
        >
          <DayPicker
            label="Which day?"
            value={data.meetingDayPrefs.ownerWeekly}
            onChange={v => upd({ ownerWeekly: v })}
            allowedDays={[1, 2, 3, 4, 5]}
          />
        </MeetingToggleRow>

        <MeetingToggleRow
          label="Monthly Finance Review"
          description="Monthly financial deep-dive — 60 min, 1st occurrence each month"
          enabled={data.meetingDayPrefs.ownerMonthlyEnabled}
          onToggle={v => upd({ ownerMonthlyEnabled: v })}
        >
          <DayPicker
            label="Which day?"
            value={data.meetingDayPrefs.ownerMonthly}
            onChange={v => upd({ ownerMonthly: v })}
            allowedDays={[1, 2, 3, 4, 5]}
          />
        </MeetingToggleRow>

        <MeetingToggleRow
          label="Quarterly Offsite"
          description="Quarterly strategic offsite — ~4 hrs, first occurrence in Jan, Apr, Jul, Oct"
          enabled={data.meetingDayPrefs.quarterlyEnabled}
          onToggle={v => upd({ quarterlyEnabled: v })}
        >
          <DayPicker
            label="Which day?"
            value={data.meetingDayPrefs.quarterlyDay}
            onChange={v => upd({ quarterlyDay: v })}
            allowedDays={[1, 2, 3, 4, 5]}
          />
        </MeetingToggleRow>
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
  const upd = (patch: Partial<OnboardingData["meetingDayPrefs"]>) =>
    onChange({ meetingDayPrefs: { ...data.meetingDayPrefs, ...patch } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Team meeting days</h2>
        <p style={{ color: "rgba(255,255,255,0.5)" }}>Choose which team meetings you want. Toggle off any you don't need — you can change these later in Manage Schedule.</p>
      </div>

      <div className="flex flex-col gap-3">
        <MeetingToggleRow
          label="Team Daily Huddle"
          description="Quick daily sync with your full team — 10–15 min"
          enabled={data.meetingDayPrefs.teamDailyEnabled}
          onToggle={v => upd({ teamDailyEnabled: v })}
        >
          <DayPickerMulti
            label="Which days?"
            value={data.meetingDayPrefs.teamDaily}
            onChange={days => upd({ teamDaily: days })}
            allowedDays={[1, 2, 3, 4, 5]}
          />
        </MeetingToggleRow>

        <MeetingToggleRow
          label="Team Weekly Meeting"
          description="Weekly all-hands or team review — 30–60 min"
          enabled={data.meetingDayPrefs.teamWeeklyEnabled}
          onToggle={v => upd({ teamWeeklyEnabled: v })}
        >
          <DayPicker
            label="Which day?"
            value={data.meetingDayPrefs.teamWeekly}
            onChange={v => upd({ teamWeekly: v })}
            allowedDays={[1, 2, 3, 4, 5]}
          />
        </MeetingToggleRow>
      </div>

      <StepNav onBack={onBack} onNext={onNext} canProceed={true} />
    </div>
  );
}

const MEETING_TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  daily:     { bg: "#DBEAFE", text: "#1D4ED8", label: "Daily" },
  weekly:    { bg: "#D1FAE5", text: "#065F46", label: "Weekly" },
  monthly:   { bg: "#CCFBF1", text: "#0F766E", label: "Monthly" },
  quarterly: { bg: "#FFE4E6", text: "#BE123C", label: "Quarterly" },
};

const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function MiniCalendarPreview({ data }: { data: OnboardingData }) {
  // Generate meetings for the next 3 months starting from today
  const today = new Date();
  const year = today.getFullYear();
  const startMonth = today.getMonth(); // 0-indexed
  
  const meetings = generateMeetingSchedule({
    year,
    workDays: data.workDays,
    meetingDayPrefs: data.meetingDayPrefs,
    closedPeriods: [],
  });
  
  // Build a set of meeting dates for quick lookup
  const meetingMap = new Map<string, Set<string>>();
  for (const m of meetings) {
    if (!meetingMap.has(m.date)) meetingMap.set(m.date, new Set());
    meetingMap.get(m.date)!.add(m.meetingType);
  }

  // Show 3 months
  const months = [0, 1, 2].map(offset => {
    const m = (startMonth + offset) % 12;
    const y = year + Math.floor((startMonth + offset) / 12);
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    const days: (number | null)[] = [];
    // Pad with nulls for first week
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
    return { year: y, month: m, days };
  });

  // Count meetings in the 3-month window
  const windowStart = `${year}-${String(startMonth + 1).padStart(2, "0")}-01`;
  const endMonth = (startMonth + 2) % 12;
  const endYear = year + Math.floor((startMonth + 2) / 12);
  const windowEnd = `${endYear}-${String(endMonth + 1).padStart(2, "0")}-${new Date(endYear, endMonth + 1, 0).getDate()}`;
  const windowMeetings = meetings.filter(m => m.date >= windowStart && m.date <= windowEnd);
  const countByType: Record<string, number> = {};
  for (const m of windowMeetings) {
    countByType[m.meetingType] = (countByType[m.meetingType] ?? 0) + 1;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>Calendar Preview — Next 3 Months</p>
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
                const hasMeeting = types && types.size > 0;
                // Pick the most prominent meeting type for color
                const primaryType = types?.has("quarterly") ? "quarterly"
                  : types?.has("monthly") ? "monthly"
                  : types?.has("weekly") ? "weekly"
                  : types?.has("daily") ? "daily" : null;
                const c = primaryType ? MEETING_TYPE_COLORS[primaryType] : null;
                return (
                  <div
                    key={i}
                    className="aspect-square flex items-center justify-center rounded-sm text-[8px] font-medium"
                    style={{
                      backgroundColor: c ? c.bg : isToday ? "rgba(94,234,212,0.15)" : "transparent",
                      color: c ? c.text : isToday ? "#5EEAD4" : "rgba(255,255,255,0.5)",
                      fontWeight: hasMeeting ? 700 : 400,
                      outline: isToday ? "1px solid rgba(94,234,212,0.4)" : undefined,
                    }}
                    title={primaryType ? `${MEETING_TYPE_COLORS[primaryType].label} meeting` : undefined}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap">
        {Object.entries(MEETING_TYPE_COLORS).map(([type, c]) => (
          <div key={type} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.bg, border: `1px solid ${c.text}40` }} />
            <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>{c.label}</span>
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Review your setup</h2>
        <p style={{ color: "rgba(255,255,255,0.5)" }}>Everything look right? You can always change this later in Manage Schedule.</p>
      </div>

      <div className="rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
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
          value={data.meetingDayPrefs.ownerDaily.map(d => DAY_NAMES[d]).join(", ") || "None selected"}
        />
        <PreviewRow
          label="Owner Weekly Review"
          value={`Every ${DAY_FULL[data.meetingDayPrefs.ownerWeekly]}`}
        />
        <PreviewRow
          label="Owner Monthly Review"
          value={`First ${DAY_FULL[data.meetingDayPrefs.ownerMonthly]} of each month`}
        />
        <PreviewRow
          label="Quarterly Offsite"
          value={`First ${DAY_FULL[data.meetingDayPrefs.quarterlyDay]} of Jan, Apr, Jul, Oct`}
        />
        <PreviewRow
          label="Team Daily Huddle"
          value={data.meetingDayPrefs.teamDaily.map(d => DAY_NAMES[d]).join(", ") || "None selected"}
        />
        <PreviewRow
          label="Team Weekly Meeting"
          value={`Every ${DAY_FULL[data.meetingDayPrefs.teamWeekly]}`}
        />
      </div>

      {/* Mini calendar preview */}
      <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <MiniCalendarPreview data={data} />
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1" style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)", backgroundColor: "rgba(255,255,255,0.05)" }}>
          ← Back
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 font-bold"
          style={{ background: "linear-gradient(135deg, #5EEAD4, #2DD4BF)", color: "#0F2440" }}
        >
          {isLoading ? "Building your calendar…" : "Build My Calendar →"}
        </Button>
      </div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <span className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}

function StepDone({ businessName, onEnter }: { businessName: string; onEnter: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(94,234,212,0.1)", border: "1px solid rgba(94,234,212,0.2)" }}>
        <span className="text-4xl">🎉</span>
      </div>
      <div>
        <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>You're all set!</h2>
        <p className="text-lg max-w-md" style={{ color: "rgba(255,255,255,0.5)" }}>
          Your BusinessCadence calendar for <strong style={{ color: "#5EEAD4" }}>{businessName}</strong> is ready.
          Meetings are scheduled around your work days with industry-specific agendas.
        </p>
      </div>
      <div className="flex flex-col gap-2 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
        <div className="flex items-center gap-2">
          <span style={{ color: "#5EEAD4" }}>✓</span> Owner meeting cadence built
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: "#5EEAD4" }}>✓</span> Team meeting cadence built
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: "#5EEAD4" }}>✓</span> Industry agenda templates applied
        </div>
      </div>
      <Button onClick={onEnter} size="lg" className="mt-4 px-10 font-bold" style={{ background: "linear-gradient(135deg, #5EEAD4, #2DD4BF)", color: "#0F2440" }}>
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
      <Button variant="outline" onClick={onBack} className="flex-1" style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)", backgroundColor: "rgba(255,255,255,0.05)" }}>
        ← Back
      </Button>
      <Button
        onClick={onNext}
        disabled={!canProceed}
        className="flex-1 font-bold disabled:opacity-40"
        style={{ background: "linear-gradient(135deg, #5EEAD4, #2DD4BF)", color: "#0F2440" }}
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
  const createBusiness = trpc.business.create.useMutation();

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
      // Also create the business record so the entire app is scoped to it
      if (accountId && data.businessName.trim()) {
        const slug = data.businessName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60) || "business";
        // Pick icon based on industry
        const iconMap: Record<string, string> = {
          healthcare: "🏥",
          fitness: "💪",
          realestate: "🏠",
          food: "🍕",
          retail: "🛍️",
          professional: "💼",
        };
        const colorMap: Record<string, string> = {
          healthcare: "#10B981",
          fitness: "#F59E0B",
          realestate: "#2563EB",
          food: "#E11D48",
          retail: "#7C3AED",
          professional: "#0D9488",
        };
        try {
          await createBusiness.mutateAsync({
            accountId,
            name: data.businessName.trim(),
            slug,
            icon: iconMap[data.industry] ?? "🏢",
            color: colorMap[data.industry] ?? "#64748B",
            sortOrder: 0,
          });
        } catch (bizErr) {
          console.warn("Business create failed (non-fatal):", bizErr);
        }
      }
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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #0A1929 0%, #0F2440 100%)" }}>
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(94,234,212,0.15)", border: "1px solid rgba(94,234,212,0.3)" }}>
            <span className="text-xs font-bold" style={{ color: "#5EEAD4" }}>BC</span>
          </div>
          <span className="font-semibold text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>BusinessCadence</span>
          </div>
          {step > 0 && step < TOTAL_STEPS - 1 && (
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Step {step} of {TOTAL_STEPS - 2}</span>
          )}
        </div>

        {/* Progress bar */}
        {step > 0 && step < TOTAL_STEPS - 1 && (
          <div className="mb-6">
            <Progress value={progressPercent} className="h-1.5" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
          </div>
        )}

        {/* Card */}
        <div className="rounded-2xl p-8" style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}>
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
