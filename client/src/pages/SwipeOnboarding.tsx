/**
 * SwipeOnboarding — full-screen swipeable card stack.
 *
 * Each card fills the viewport. When the user completes a card it slides out
 * to the left while the next card slides in from the right — native-app feel.
 *
 * Cards (only shown if the data isn't already known):
 *   0. Industry picker          — always shown
 *   1. Business hours           — always shown
 *   2. Invite partner           — shown if no invite was already sent
 *   3. Done                     — auto-navigates after a short celebration
 *
 * Data already collected upstream (business name from InvitePartnerSetup,
 * partner invite from WaitingForPartner) is read from PersonContext /
 * URL params and pre-filled silently.
 */

import { useState, useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { usePerson } from "@/contexts/PersonContext";
import { toast } from "sonner";
import {
  INDUSTRY_TYPES,
  INDUSTRY_MEETING_DAY_DEFAULTS,
  INDUSTRY_KPI_DEFAULTS,
  DEFAULT_MEETING_TIMES,
  type IndustryType,
} from "@shared/industryDefaults";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const HOUR_OPTIONS: { value: string; label: string }[] = (() => {
  const opts: { value: string; label: string }[] = [];
  for (let h = 5; h <= 22; h++) {
    for (const m of [0, 30]) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      const val = `${hh}:${mm}`;
      const period = h < 12 ? "AM" : "PM";
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      opts.push({ value: val, label: `${h12}:${mm} ${period}` });
    }
  }
  return opts;
})();

const INDUSTRY_ICONS: Record<string, string> = {
  healthcare: "🏥", fitness: "💪", realestate: "🏠",
  retail: "🛍️", restaurant: "🍕", professional: "💼",
  construction: "🔨", salon: "✂️", other: "🏢",
};
const INDUSTRY_COLORS: Record<string, string> = {
  healthcare: "#10B981", fitness: "#F59E0B", realestate: "#2563EB",
  retail: "#7C3AED", restaurant: "#E11D48", professional: "#0D9488",
  construction: "#D97706", salon: "#EC4899", other: "#64748B",
};
const INDUSTRY_SLUG_MAP: Record<string, "chiropractic" | "crossfit" | "general"> = {
  healthcare: "chiropractic", fitness: "crossfit",
  realestate: "general", retail: "general", restaurant: "general",
  professional: "general", construction: "general", salon: "general", other: "general",
};

// ─── Slide animation wrapper ──────────────────────────────────────────────────

function SlideCard({
  children,
  direction,
  active,
}: {
  children: React.ReactNode;
  direction: "enter" | "exit-left" | "idle";
  active: boolean;
}) {
  const base =
    "absolute inset-0 flex flex-col transition-transform duration-350 ease-[cubic-bezier(0.23,1,0.32,1)] will-change-transform";
  const transform =
    direction === "enter"
      ? "translate-x-full"
      : direction === "exit-left"
      ? "-translate-x-full"
      : "translate-x-0";
  if (!active && direction === "idle") return null;
  return (
    <div className={`${base} ${transform}`} style={{ pointerEvents: active ? "auto" : "none" }}>
      {children}
    </div>
  );
}

// ─── Card shell ───────────────────────────────────────────────────────────────

function CardShell({
  step,
  total,
  children,
}: {
  step: number;
  total: number;
  children: React.ReactNode;
}) {
  const pct = Math.round(((step + 1) / total) * 100);
  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "linear-gradient(160deg, #0A1929 0%, #0F2440 60%, #0D2D4A 100%)" }}
    >
      {/* Progress bar */}
      <div className="flex-none px-6 pt-14 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: "linear-gradient(90deg, #5EEAD4, #2DD4BF)" }}
            />
          </div>
          <span className="text-xs font-medium tabular-nums" style={{ color: "rgba(255,255,255,0.35)" }}>
            {step + 1}/{total}
          </span>
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-8">
        {children}
      </div>
    </div>
  );
}

// ─── Card 0: Industry ─────────────────────────────────────────────────────────

function IndustryCard({
  value,
  onChange,
  onNext,
  step,
  total,
}: {
  value: IndustryType;
  onChange: (v: IndustryType) => void;
  onNext: () => void;
  step: number;
  total: number;
}) {
  return (
    <CardShell step={step} total={total}>
      <div className="mb-8 mt-2">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#5EEAD4" }}>
          Step {step + 1}
        </p>
        <h2 className="text-3xl font-bold text-white leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          What kind of business do you run?
        </h2>
        <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
          We'll pre-configure your meeting agendas and KPIs for your industry.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 mb-8">
        {INDUSTRY_TYPES.map((ind) => {
          const selected = value === ind.value;
          return (
            <button
              key={ind.value}
              onClick={() => {
                onChange(ind.value as IndustryType);
                // Auto-advance after a short delay so the selection is visible
                setTimeout(onNext, 220);
              }}
              className="flex items-center gap-4 w-full rounded-2xl p-4 text-left transition-all duration-150 active:scale-[0.97]"
              style={{
                border: `2px solid ${selected ? "#5EEAD4" : "rgba(255,255,255,0.1)"}`,
                backgroundColor: selected ? "rgba(94,234,212,0.1)" : "rgba(255,255,255,0.04)",
              }}
            >
              <span className="text-2xl">{INDUSTRY_ICONS[ind.value] ?? "🏢"}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white">{ind.label}</div>
                <div className="text-xs mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {ind.description}
                </div>
              </div>
              {selected && (
                <span className="text-base flex-none" style={{ color: "#5EEAD4" }}>✓</span>
              )}
            </button>
          );
        })}
      </div>
    </CardShell>
  );
}

// ─── Card 1: Business Hours ───────────────────────────────────────────────────

function HoursCard({
  workDays,
  startTime,
  endTime,
  onWorkDaysChange,
  onStartChange,
  onEndChange,
  onNext,
  step,
  total,
}: {
  workDays: number[];
  startTime: string;
  endTime: string;
  onWorkDaysChange: (d: number[]) => void;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onNext: () => void;
  step: number;
  total: number;
}) {
  const toggleDay = (d: number) => {
    onWorkDaysChange(
      workDays.includes(d) ? workDays.filter((x) => x !== d) : [...workDays, d].sort()
    );
  };

  const selectStyle: React.CSSProperties = {
    backgroundColor: "rgba(255,255,255,0.08)",
    border: "1.5px solid rgba(255,255,255,0.15)",
    color: "white",
    borderRadius: 12,
    padding: "12px 14px",
    fontSize: 15,
    width: "100%",
    appearance: "none" as const,
    WebkitAppearance: "none" as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='rgba(255,255,255,0.4)' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 14px center",
    paddingRight: 36,
  };

  return (
    <CardShell step={step} total={total}>
      <div className="mb-8 mt-2">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#5EEAD4" }}>
          Step {step + 1}
        </p>
        <h2 className="text-3xl font-bold text-white leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          When does your business run?
        </h2>
        <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
          We'll keep work conversations inside these hours.
        </p>
      </div>

      {/* Work days */}
      <div className="mb-6">
        <label className="block text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>
          Work Days
        </label>
        <div className="flex gap-2">
          {DAY_LABELS.map((label, i) => {
            const active = workDays.includes(i);
            return (
              <button
                key={i}
                onClick={() => toggleDay(i)}
                className="flex-1 py-3 rounded-xl text-xs font-bold transition-all duration-150 active:scale-[0.93]"
                style={{
                  backgroundColor: active ? "#5EEAD4" : "rgba(255,255,255,0.07)",
                  color: active ? "#0A1929" : "rgba(255,255,255,0.4)",
                  border: `1.5px solid ${active ? "#5EEAD4" : "rgba(255,255,255,0.1)"}`,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hours */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
            Opens
          </label>
          <select value={startTime} onChange={(e) => onStartChange(e.target.value)} style={selectStyle}>
            {HOUR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} style={{ backgroundColor: "#0F2440" }}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
            Closes
          </label>
          <select value={endTime} onChange={(e) => onEndChange(e.target.value)} style={selectStyle}>
            {HOUR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} style={{ backgroundColor: "#0F2440" }}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={workDays.length === 0}
        className="w-full py-4 rounded-2xl font-bold text-base transition-all duration-200 active:scale-[0.97] disabled:opacity-40"
        style={{
          background: "linear-gradient(135deg, #5EEAD4 0%, #0D9488 100%)",
          color: "#0A1628",
          boxShadow: "0 4px 24px rgba(94,234,212,0.22)",
        }}
      >
        Continue →
      </button>
    </CardShell>
  );
}

// ─── Card 2: Invite Partner ───────────────────────────────────────────────────

function InviteCard({
  partnerName,
  partnerEmail,
  onPartnerNameChange,
  onPartnerEmailChange,
  onNext,
  onSkip,
  isLoading,
  step,
  total,
}: {
  partnerName: string;
  partnerEmail: string;
  onPartnerNameChange: (v: string) => void;
  onPartnerEmailChange: (v: string) => void;
  onNext: () => void;
  onSkip: () => void;
  isLoading: boolean;
  step: number;
  total: number;
}) {
  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const canSend = partnerName.trim().length > 0 && isValidEmail(partnerEmail.trim());

  const inputStyle: React.CSSProperties = {
    backgroundColor: "rgba(255,255,255,0.08)",
    border: "1.5px solid rgba(255,255,255,0.15)",
    color: "white",
    borderRadius: 12,
    padding: "14px 16px",
    fontSize: 15,
    width: "100%",
    outline: "none",
  };

  return (
    <CardShell step={step} total={total}>
      <div className="mb-8 mt-2">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#5EEAD4" }}>
          Step {step + 1}
        </p>
        <h2 className="text-3xl font-bold text-white leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Who are you running this with?
        </h2>
        <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
          BusinessCadence is built for two. Invite your co-owner and you'll both have full access.
        </p>
      </div>

      <div className="flex flex-col gap-5 mb-8">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
            Their Name
          </label>
          <input
            style={inputStyle}
            value={partnerName}
            onChange={(e) => onPartnerNameChange(e.target.value)}
            placeholder="e.g. Lynn"
            autoFocus
            onFocus={(e) => (e.target.style.borderColor = "#5EEAD4")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.15)")}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
            Their Email
          </label>
          <input
            style={inputStyle}
            value={partnerEmail}
            onChange={(e) => onPartnerEmailChange(e.target.value)}
            placeholder="lynn@yourbusiness.com"
            type="email"
            onFocus={(e) => (e.target.style.borderColor = "#5EEAD4")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.15)")}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={onNext}
          disabled={!canSend || isLoading}
          className="w-full py-4 rounded-2xl font-bold text-base transition-all duration-200 active:scale-[0.97] disabled:opacity-40"
          style={{
            background: "linear-gradient(135deg, #5EEAD4 0%, #0D9488 100%)",
            color: "#0A1628",
            boxShadow: "0 4px 24px rgba(94,234,212,0.22)",
          }}
        >
          {isLoading ? "Sending invite…" : "Send Invite →"}
        </button>
        <button
          onClick={onSkip}
          className="w-full py-3 text-sm font-medium transition-colors"
          style={{ color: "rgba(255,255,255,0.35)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
        >
          Skip — invite later
        </button>
      </div>
    </CardShell>
  );
}

// ─── Card 3: Done ─────────────────────────────────────────────────────────────

function DoneCard({ businessName, partnerName }: { businessName: string; partnerName: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center h-full px-6 text-center"
      style={{ background: "linear-gradient(160deg, #0A1929 0%, #0F2440 60%, #0D2D4A 100%)" }}
    >
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center text-5xl mb-6"
        style={{ backgroundColor: "rgba(94,234,212,0.1)", border: "2px solid rgba(94,234,212,0.25)" }}
      >
        🎉
      </div>
      <h2 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        You're all set!
      </h2>
      <p className="text-base mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>
        {businessName ? (
          <>
            <strong style={{ color: "#5EEAD4" }}>{businessName}</strong> is ready to run on BusinessCadence.
          </>
        ) : (
          "Your business is ready to run on BusinessCadence."
        )}
        {partnerName && (
          <> Invite sent to <strong style={{ color: "#5EEAD4" }}>{partnerName}</strong>.</>
        )}
      </p>
      <div className="flex flex-col gap-2 text-sm w-full max-w-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
        <div className="flex items-center gap-2"><span style={{ color: "#5EEAD4" }}>✓</span> Industry agendas applied</div>
        <div className="flex items-center gap-2"><span style={{ color: "#5EEAD4" }}>✓</span> Meeting cadence built</div>
        <div className="flex items-center gap-2"><span style={{ color: "#5EEAD4" }}>✓</span> Business hours set</div>
        {partnerName && (
          <div className="flex items-center gap-2"><span style={{ color: "#5EEAD4" }}>✓</span> Partner invite sent</div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SwipeOnboarding() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);

  const { person } = usePerson();
  const accountId = person?.accountId ?? Number(localStorage.getItem("bcc_account_id") ?? "0");

  // Pre-fill business name from URL (passed by WaitingForPartner or InvitePartnerSetup)
  const prefillBizName = params.get("bizName") ? decodeURIComponent(params.get("bizName")!) : "";
  // If partner was already invited upstream, skip the invite card
  const partnerAlreadySent = params.get("partnerSent") === "1";

  // ── State ──────────────────────────────────────────────────────────────────
  const [industry, setIndustry] = useState<IndustryType>("healthcare");
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("18:00");
  const [partnerName, setPartnerName] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [invitedPartnerName, setInvitedPartnerName] = useState("");
  // Business name — use URL param if available, otherwise ask in-flow
  const [bizName, setBizName] = useState(prefillBizName);

  // ── Cards definition ───────────────────────────────────────────────────────
  // Build card list dynamically — skip invite card if already sent
  // If no business name was passed in, add a name card at the start
  const needsNameCard = !prefillBizName;
  const CARD_COUNT = (needsNameCard ? 1 : 0) + 2 + (partnerAlreadySent ? 0 : 1); // [name +] industry + hours [+ invite]

  // ── Animation state ────────────────────────────────────────────────────────
  const [currentCard, setCurrentCard] = useState(0);
  const [prevCard, setPrevCard] = useState<number | null>(null);
  const [enteringCard, setEnteringCard] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const animTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── tRPC mutations ─────────────────────────────────────────────────────────
  const saveOnboarding = trpc.onboarding.save.useMutation();
  const createBusiness = trpc.business.create.useMutation();
  const seedKpis = trpc.kpi.seedDefaults.useMutation();
  const saveBusinessHours = trpc.businessHours.updateSettings.useMutation();
  const invitePerson = trpc.person.invite.useMutation();
  const startTrialMutation = trpc.subscription.startTrial.useMutation();
  const [isSaving, setIsSaving] = useState(false);

  // ── Navigation helpers ─────────────────────────────────────────────────────
  const advanceCard = () => {
    if (enteringCard) return;
    setEnteringCard(true);
    setPrevCard(currentCard);
    setCurrentCard((c) => c + 1);
    if (animTimeout.current) clearTimeout(animTimeout.current);
    animTimeout.current = setTimeout(() => {
      setPrevCard(null);
      setEnteringCard(false);
    }, 380);
  };

  // ── Save everything and enter the app ─────────────────────────────────────
  const finishSetup = async (invitedName?: string) => {
    setIsSaving(true);
    const resolvedBizName = bizName.trim() || "My Business";
    const slug = INDUSTRY_SLUG_MAP[industry] ?? "general";
    const kpiSlug = resolvedBizName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60) || "business";
    const meetingDayPrefs = INDUSTRY_MEETING_DAY_DEFAULTS[industry];

    try {
      // 1. Save business profile (required — propagates error to user if it fails)
      await saveOnboarding.mutateAsync({
        accountId,
        businessName: resolvedBizName,
        industry,
        ownerCount: 2,
        employeeCount: 0,
        workDays,
        meetingDayPrefs,
        onboardingComplete: true,
      });

      // 2. Create business record
      try {
        await createBusiness.mutateAsync({
          accountId,
          name: resolvedBizName,
          slug,
          icon: INDUSTRY_ICONS[industry] ?? "🏢",
          color: INDUSTRY_COLORS[industry] ?? "#64748B",
          sortOrder: 0,
        });
      } catch (e) {
        // Non-fatal — business may already exist from a previous attempt
        console.warn("createBusiness skipped:", e);
      }

      // 3. Seed KPIs
      try { await seedKpis.mutateAsync({ accountId, businessSlug: kpiSlug }); } catch (e) {
        console.warn("seedKpis skipped:", e);
      }

      // 4. Business hours
      try {
        await saveBusinessHours.mutateAsync({
          accountId,
          workDays: JSON.stringify(workDays),
          startTime,
          endTime,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
        });
      } catch (e) { console.warn("saveBusinessHours skipped:", e); }

      // 5. Safety-net trial row (no-op if already exists)
      try {
        const personRaw = localStorage.getItem("bcc_person_v1");
        const personId = personRaw ? (JSON.parse(personRaw) as { id?: string }).id ?? "" : "";
        await startTrialMutation.mutateAsync({ accountId, personId });
      } catch (e) { console.warn("startTrial skipped:", e); }

      // 6. Mark deferred profile flag
      try { localStorage.setItem("bcc_profile_deferred_" + accountId, "1"); } catch { /* ignore */ }

      setIsSaving(false);
      setInvitedPartnerName(invitedName ?? "");
      setIsDone(true);

      // Auto-navigate after celebration
      setTimeout(() => {
        try { localStorage.setItem("bcc_onboarding_done_" + accountId, "1"); } catch { /* ignore */ }
        navigate("/select-business");
      }, 2200);
    } catch (err) {
      setIsSaving(false);
      console.error("SwipeOnboarding save failed:", err);
      toast.error("Something went wrong saving your business profile. Please try again.");
    }
  };

  // ── Card handlers ──────────────────────────────────────────────────────────
  // Card index helpers — account for optional name card at index 0
  const industryCardIdx = needsNameCard ? 1 : 0;
  const hoursCardIdx = industryCardIdx + 1;
  const inviteCardIdx = hoursCardIdx + 1;

  const handleIndustryNext = (v: IndustryType) => {
    setIndustry(v);
    advanceCard();
  };

  const handleHoursNext = () => {
    if (partnerAlreadySent) {
      // No invite card — go straight to save
      finishSetup();
    } else {
      advanceCard();
    }
  };

  const handleInviteNext = async () => {
    if (!partnerName.trim() || !partnerEmail.trim()) return;
    setIsSaving(true);
    try {
      await invitePerson.mutateAsync({
        accountId,
        name: partnerName.trim(),
        email: partnerEmail.trim(),
        role: "coowner",
        businessScope: "all",
        origin: window.location.origin,
      });
      toast.success(`Invite sent to ${partnerName}!`);
    } catch (e) {
      console.warn("invitePerson failed:", e);
      // Non-fatal — partner can be invited from Settings later
    }
    setIsSaving(false);
    finishSetup(partnerName.trim());
  };

  const handleInviteSkip = () => {
    finishSetup();
  };

  // ── Done screen ────────────────────────────────────────────────────────────
  if (isDone) {
    return (
      <div className="fixed inset-0">
        <DoneCard
          businessName={bizName.trim() || prefillBizName}
          partnerName={invitedPartnerName || (partnerAlreadySent ? params.get("partnerName") ?? "" : "")}
        />
      </div>
    );
  }

  // ── Render card stack ──────────────────────────────────────────────────────
  // Animation: outgoing card slides to -100%, incoming card starts at +100% then slides to 0.
  // We use a key-based approach: when enteringCard is true, the new currentCard starts at
  // translateX(100%) and transitions to translateX(0) after a microtask (requestAnimationFrame).
  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Previous card — slides out left */}
      {prevCard !== null && (
        <div
          className="absolute inset-0 transition-transform duration-[350ms] ease-[cubic-bezier(0.23,1,0.32,1)]"
          style={{ transform: "translateX(-100%)" }}
        >
          {renderCard(prevCard, { industry, setIndustry, workDays, setWorkDays, startTime, setStartTime, endTime, setEndTime, partnerName, setPartnerName, partnerEmail, setPartnerEmail, handleIndustryNext, handleHoursNext, handleInviteNext, handleInviteSkip, isSaving, CARD_COUNT, partnerAlreadySent, bizName, setBizName, industryCardIdx, hoursCardIdx, inviteCardIdx, needsNameCard })}
        </div>
      )}

      {/* Current card — starts at translateX(100%) when entering, animates to 0 */}
      <div
        className="absolute inset-0 transition-transform duration-[350ms] ease-[cubic-bezier(0.23,1,0.32,1)]"
        style={{ transform: enteringCard ? "translateX(100%)" : "translateX(0)" }}
      >
        {renderCard(currentCard, { industry, setIndustry, workDays, setWorkDays, startTime, setStartTime, endTime, setEndTime, partnerName, setPartnerName, partnerEmail, setPartnerEmail, handleIndustryNext, handleHoursNext, handleInviteNext, handleInviteSkip, isSaving, CARD_COUNT, partnerAlreadySent, bizName, setBizName, industryCardIdx, hoursCardIdx, inviteCardIdx, needsNameCard })}
      </div>
    </div>
  );
}

// ─── Card renderer ────────────────────────────────────────────────────────────

interface CardProps {
  industry: IndustryType;
  setIndustry: (v: IndustryType) => void;
  workDays: number[];
  setWorkDays: (d: number[]) => void;
  startTime: string;
  setStartTime: (v: string) => void;
  endTime: string;
  setEndTime: (v: string) => void;
  partnerName: string;
  setPartnerName: (v: string) => void;
  partnerEmail: string;
  setPartnerEmail: (v: string) => void;
  handleIndustryNext: (v: IndustryType) => void;
  handleHoursNext: () => void;
  handleInviteNext: () => void;
  handleInviteSkip: () => void;
  isSaving: boolean;
  CARD_COUNT: number;
  partnerAlreadySent: boolean;
  bizName: string;
  setBizName: (v: string) => void;
  industryCardIdx: number;
  hoursCardIdx: number;
  inviteCardIdx: number;
  needsNameCard: boolean;
}

function renderCard(index: number, p: CardProps) {
  switch (index) {
    case p.industryCardIdx:
      return (
        <IndustryCard
          value={p.industry}
          onChange={p.setIndustry}
          onNext={() => p.handleIndustryNext(p.industry)}
          step={index}
          total={p.CARD_COUNT}
        />
      );
    case p.hoursCardIdx:
      return (
        <HoursCard
          workDays={p.workDays}
          startTime={p.startTime}
          endTime={p.endTime}
          onWorkDaysChange={p.setWorkDays}
          onStartChange={p.setStartTime}
          onEndChange={p.setEndTime}
          onNext={p.handleHoursNext}
          step={index}
          total={p.CARD_COUNT}
        />
      );
    case p.inviteCardIdx:
      return !p.partnerAlreadySent ? (
        <InviteCard
          partnerName={p.partnerName}
          partnerEmail={p.partnerEmail}
          onPartnerNameChange={p.setPartnerName}
          onPartnerEmailChange={p.setPartnerEmail}
          onNext={p.handleInviteNext}
          onSkip={p.handleInviteSkip}
          isLoading={p.isSaving}
          step={index}
          total={p.CARD_COUNT}
        />
      ) : null;
    default:
      return null;
  }
}
