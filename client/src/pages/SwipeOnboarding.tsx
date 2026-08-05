/**
 * SwipeOnboarding — full-screen swipeable card stack.
 * Simple flat implementation: step state drives which card renders.
 * Each card fills the viewport and slides left/right on advance.
 */

import { useState, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { usePerson } from "@/contexts/PersonContext";
import { toast } from "sonner";
import {
  INDUSTRY_TYPES,
  INDUSTRY_MEETING_DAY_DEFAULTS,
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
  retail: "#7C3AED", restaurant: "#E11D48", professional: "#25DCF9",
  construction: "#D97706", salon: "#EC4899", other: "#64748B",
};
const INDUSTRY_SLUG_MAP: Record<string, "chiropractic" | "crossfit" | "general"> = {
  healthcare: "chiropractic", fitness: "crossfit",
  realestate: "general", retail: "general", restaurant: "general",
  professional: "general", construction: "general", salon: "general", other: "general",
};

// ─── Shared styles ────────────────────────────────────────────────────────────

const BG = "linear-gradient(160deg, #0A1929 0%, #0F2440 60%, #0D2D4A 100%)";
const TEAL = "#33A2DB";
const BTN_STYLE: React.CSSProperties = {
  background: "linear-gradient(135deg, #33A2DB 0%, #25DCF9 100%)",
  color: "#0A1628",
  boxShadow: "0 4px 24px rgba(51,162,219,0.22)",
};
const INPUT_STYLE: React.CSSProperties = {
  backgroundColor: "rgba(255,255,255,0.08)",
  border: "1.5px solid rgba(255,255,255,0.15)",
  color: "white",
  borderRadius: 12,
  padding: "14px 16px",
  fontSize: 15,
  width: "100%",
  outline: "none",
};

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round(((step + 1) / total) * 100);
  return (
    <div className="flex-none px-6 pt-14 pb-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: "linear-gradient(90deg, #33A2DB, #2485b8)" }}
          />
        </div>
        <span className="text-xs font-medium tabular-nums" style={{ color: "rgba(255,255,255,0.35)" }}>
          {step + 1}/{total}
        </span>
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

  const prefillBizName = params.get("bizName") ? decodeURIComponent(params.get("bizName")!) : "";
  const partnerAlreadySent = params.get("partnerSent") === "1";

  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [slideDir, setSlideDir] = useState<"left" | "right" | "none">("none");
  const [industry, setIndustry] = useState<IndustryType>("healthcare");
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("18:00");
  const [bizName, setBizName] = useState(prefillBizName);
  const [partnerName, setPartnerName] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [donePartnerName, setDonePartnerName] = useState("");
  const animRef = useRef(false);

  // Steps: 0=industry, 1=hours, 2=invite (if not already sent)
  const TOTAL = partnerAlreadySent ? 2 : 3;

  // ── tRPC mutations ─────────────────────────────────────────────────────────
  const saveOnboarding = trpc.onboarding.save.useMutation();
  const createBusiness = trpc.business.create.useMutation();
  const seedKpis = trpc.kpi.seedDefaults.useMutation();
  const saveBusinessHours = trpc.businessHours.updateSettings.useMutation();
  const invitePerson = trpc.person.invite.useMutation();
  const startTrialMutation = trpc.subscription.startTrial.useMutation();

  // ── Advance to next step with slide animation ──────────────────────────────
  const advance = () => {
    if (animRef.current) return;
    animRef.current = true;
    setSlideDir("left");
    setTimeout(() => {
      setStep((s) => s + 1);
      setSlideDir("right");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setSlideDir("none");
          animRef.current = false;
        });
      });
    }, 300);
  };

  // ── Save and enter app ─────────────────────────────────────────────────────
  const finishSetup = async (invitedName?: string) => {
    setIsSaving(true);
    const resolvedBizName = bizName.trim() || "My Business";
    const slug = INDUSTRY_SLUG_MAP[industry] ?? "general";
    const kpiSlug = resolvedBizName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60) || "business";
    const meetingDayPrefs = INDUSTRY_MEETING_DAY_DEFAULTS[industry];

    try {
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

      try {
        await createBusiness.mutateAsync({
          accountId, name: resolvedBizName, slug,
          icon: INDUSTRY_ICONS[industry] ?? "🏢",
          color: INDUSTRY_COLORS[industry] ?? "#64748B",
          sortOrder: 0,
        });
      } catch { /* may already exist */ }

      try {
        await seedKpis.mutateAsync({ accountId, businessSlug: kpiSlug });
      } catch { /* non-fatal */ }

      try {
        await saveBusinessHours.mutateAsync({
          accountId, workDays: JSON.stringify(workDays), startTime, endTime,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
        });
      } catch { /* non-fatal */ }

      try {
        const personRaw = localStorage.getItem("bcc_person_v1");
        const personId = personRaw ? (JSON.parse(personRaw) as { id?: string }).id ?? "" : "";
        await startTrialMutation.mutateAsync({ accountId, personId });
      } catch { /* non-fatal */ }

      localStorage.setItem("bcc_profile_deferred_" + accountId, "1");
      setIsSaving(false);
      setDonePartnerName(invitedName ?? "");
      setIsDone(true);

      setTimeout(() => {
        localStorage.setItem("bcc_onboarding_done_" + accountId, "1");
        navigate("/select-business");
      }, 2200);
    } catch (err) {
      setIsSaving(false);
      console.error("SwipeOnboarding save failed:", err);
      toast.error("Something went wrong saving your setup. Please try again.");
    }
  };

  // ── Done screen ────────────────────────────────────────────────────────────
  if (isDone) {
    const displayBiz = bizName.trim() || prefillBizName;
    const displayPartner = donePartnerName || (partnerAlreadySent ? params.get("partnerName") ?? "" : "");
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 px-8 text-center"
        style={{ background: BG }}>
        <div className="text-6xl mb-2">🎉</div>
        <h2 className="text-3xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          You're all set!
        </h2>
        <p className="text-base" style={{ color: "rgba(255,255,255,0.55)" }}>
          {displayBiz ? <><strong style={{ color: TEAL }}>{displayBiz}</strong> is ready to run on BusinessCadence.</> : "Your business is ready to run on BusinessCadence."}
          {displayPartner && <> Invite sent to <strong style={{ color: TEAL }}>{displayPartner}</strong>.</>}
        </p>
        <div className="flex flex-col gap-2 text-sm mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>
          <div className="flex items-center gap-2"><span style={{ color: TEAL }}>✓</span> Industry agendas applied</div>
          <div className="flex items-center gap-2"><span style={{ color: TEAL }}>✓</span> Meeting cadence built</div>
          <div className="flex items-center gap-2"><span style={{ color: TEAL }}>✓</span> Business hours set</div>
          {displayPartner && <div className="flex items-center gap-2"><span style={{ color: TEAL }}>✓</span> Partner invite sent</div>}
        </div>
        <p className="text-xs mt-4" style={{ color: "rgba(255,255,255,0.25)" }}>Taking you in…</p>
      </div>
    );
  }

  // ── Slide wrapper style ────────────────────────────────────────────────────
  const slideStyle: React.CSSProperties = {
    transform: slideDir === "left" ? "translateX(-100%)" : slideDir === "right" ? "translateX(100%)" : "translateX(0)",
    transition: slideDir === "none" ? "none" : "transform 300ms cubic-bezier(0.23,1,0.32,1)",
  };

  // ── Step 0: Industry ───────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="fixed inset-0 overflow-hidden flex flex-col" style={{ background: BG, ...slideStyle }}>
        <ProgressBar step={0} total={TOTAL} />
        <div className="flex-1 overflow-y-auto px-6 pb-8">
          <div className="mb-8 mt-2">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: TEAL }}>Step 1</p>
            <h2 className="text-3xl font-bold text-white leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              What kind of business do you run?
            </h2>
            <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              We'll pre-configure your meeting agendas and KPIs for your industry.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {INDUSTRY_TYPES.map((ind) => (
              <button
                key={ind.value}
                onClick={() => { setIndustry(ind.value as IndustryType); advance(); }}
                className="flex items-center gap-4 w-full text-left rounded-2xl px-4 py-4 transition-all duration-150 active:scale-[0.97]"
                style={{
                  backgroundColor: industry === ind.value ? "rgba(51,162,219,0.12)" : "rgba(255,255,255,0.05)",
                  border: `1.5px solid ${industry === ind.value ? TEAL : "rgba(255,255,255,0.1)"}`,
                }}
              >
                <span className="text-2xl">{INDUSTRY_ICONS[ind.value] ?? "🏢"}</span>
                <div>
                  <div className="font-semibold text-white text-sm">{ind.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{ind.description}</div>
                </div>
                {industry === ind.value && <span className="ml-auto text-sm" style={{ color: TEAL }}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Step 1: Business hours ─────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="fixed inset-0 overflow-hidden flex flex-col" style={{ background: BG, ...slideStyle }}>
        <ProgressBar step={1} total={TOTAL} />
        <div className="flex-1 overflow-y-auto px-6 pb-8">
          <div className="mb-8 mt-2">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: TEAL }}>Step 2</p>
            <h2 className="text-3xl font-bold text-white leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              When does your business run?
            </h2>
            <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              We'll keep work conversations inside these hours.
            </p>
          </div>
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>Work Days</label>
            <div className="flex gap-2 flex-wrap">
              {DAY_LABELS.map((d, i) => (
                <button
                  key={i}
                  onClick={() => setWorkDays(workDays.includes(i) ? workDays.filter((x) => x !== i) : [...workDays, i])}
                  className="w-10 h-10 rounded-full text-sm font-semibold transition-all duration-150 active:scale-[0.93]"
                  style={{
                    backgroundColor: workDays.includes(i) ? TEAL : "rgba(255,255,255,0.08)",
                    color: workDays.includes(i) ? "#0A1628" : "rgba(255,255,255,0.6)",
                    border: `1.5px solid ${workDays.includes(i) ? TEAL : "rgba(255,255,255,0.15)"}`,
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>Opens</label>
              <select value={startTime} onChange={(e) => setStartTime(e.target.value)}
                style={{ ...INPUT_STYLE, appearance: "none" as React.CSSProperties["appearance"] }}>
                {HOUR_OPTIONS.map((o) => <option key={o.value} value={o.value} style={{ backgroundColor: "#0F2440" }}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>Closes</label>
              <select value={endTime} onChange={(e) => setEndTime(e.target.value)}
                style={{ ...INPUT_STYLE, appearance: "none" as React.CSSProperties["appearance"] }}>
                {HOUR_OPTIONS.map((o) => <option key={o.value} value={o.value} style={{ backgroundColor: "#0F2440" }}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <button
            onClick={() => partnerAlreadySent ? finishSetup() : advance()}
            disabled={workDays.length === 0 || isSaving}
            className="w-full py-4 rounded-2xl font-bold text-base transition-all duration-200 active:scale-[0.97] disabled:opacity-40"
            style={BTN_STYLE}
          >
            {isSaving ? "Saving…" : "Continue →"}
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2: Invite partner (only if not already sent) ──────────────────────
  if (step === 2 && !partnerAlreadySent) {
    const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
    const canSend = partnerName.trim().length > 0 && isValidEmail(partnerEmail.trim());

    const handleSendInvite = async () => {
      if (!canSend) return;
      setIsSaving(true);
      try {
        await invitePerson.mutateAsync({
          accountId, name: partnerName.trim(), email: partnerEmail.trim(),
          role: "coowner", businessScope: "all", origin: window.location.origin,
        });
        toast.success(`Invite sent to ${partnerName}!`);
      } catch { /* non-fatal */ }
      setIsSaving(false);
      finishSetup(partnerName.trim());
    };

    return (
      <div className="fixed inset-0 overflow-hidden flex flex-col" style={{ background: BG, ...slideStyle }}>
        <ProgressBar step={2} total={TOTAL} />
        <div className="flex-1 overflow-y-auto px-6 pb-8">
          <div className="mb-8 mt-2">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: TEAL }}>Step 3</p>
            <h2 className="text-3xl font-bold text-white leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Who are you running this with?
            </h2>
            <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              BusinessCadence is built for two. Invite your co-owner and you'll both have full access.
            </p>
          </div>
          <div className="flex flex-col gap-5 mb-8">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>Their Name</label>
              <input style={INPUT_STYLE} value={partnerName} onChange={(e) => setPartnerName(e.target.value)}
                placeholder="e.g. Lynn" autoFocus
                onFocus={(e) => (e.target.style.borderColor = TEAL)}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.15)")} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>Their Email</label>
              <input style={INPUT_STYLE} value={partnerEmail} onChange={(e) => setPartnerEmail(e.target.value)}
                placeholder="lynn@yourbusiness.com" type="email"
                onFocus={(e) => (e.target.style.borderColor = TEAL)}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.15)")} />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={handleSendInvite} disabled={!canSend || isSaving}
              className="w-full py-4 rounded-2xl font-bold text-base transition-all duration-200 active:scale-[0.97] disabled:opacity-40"
              style={BTN_STYLE}>
              {isSaving ? "Sending invite…" : "Send Invite →"}
            </button>
            <button onClick={() => finishSetup()} disabled={isSaving}
              className="w-full py-3 rounded-2xl text-sm font-medium transition-all duration-150"
              style={{ color: "rgba(255,255,255,0.4)", background: "transparent" }}>
              Skip — invite later
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback (shouldn't reach here)
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: BG }}>
      <div className="text-white text-center">
        <div className="text-4xl mb-4">⏳</div>
        <p style={{ color: "rgba(255,255,255,0.5)" }}>Setting up your business…</p>
      </div>
    </div>
  );
}
