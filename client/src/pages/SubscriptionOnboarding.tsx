/**
 * SubscriptionOnboarding — A 5-step emotional intro flow shown before the
 * paywall. It builds emotional buy-in and explains the value proposition
 * before asking for payment.
 *
 * Flow (normal):
 *   Step 0: For Co-Preneurs — "Running a business with your partner is hard."
 *   Step 1: The Problem    — "Business talk bleeds into everything"
 *   Step 2: The Solution   — "Your business has a place to live…"
 *   Step 3: How It Works   — Feature highlights
 *   Step 4: The Promise    — "Keep the business at work. Keep the love at home."
 *   → Paywall
 *
 * Flow (partner invite — ?token=...&partner=1):
 *   Same 4 cards, but final CTA says "Join [Business Name] →"
 *   → /partner-register?token=... (account creation / sign-in)
 *   → /onboarding (business profile setup)
 */

import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { BrandIcon } from "@/components/BrandLogo";
import { trpc } from "@/lib/trpc";
// ─── Step data ────────────────────────────────────────────────────────────────
interface OnboardingStep {
  badge: string;
  headline: React.ReactNode;
  body: string;
  icon: React.ReactNode;
  accentColor: string;
  bgAccent?: string;
}
const STEPS: OnboardingStep[] = [
  // Step 0 — Hook
  {
    badge: "FOR CO-PRENEURS",
    headline: (
      <>
        Running a business with your partner{" "}
        <span className="text-[#33A2DB]">is hard.</span>
      </>
    ),
    body: "The late-night strategy sessions. The disagreements that follow you to dinner. The feeling that you're always either business partners or life partners — never both at once.",
    icon: (
      <BrandIcon size={120} />
    ),
    accentColor: "#33A2DB",
    bgAccent: "rgba(51,162,219,0.06)",
  },
  // Step 1 — The Problem
  {
    badge: "THE PROBLEM",
    headline: (
      <>
        Business talk{" "}
        <span className="text-[#F43F5E]">bleeds into everything</span> when
        there's no structure.
      </>
    ),
    body: "Without a dedicated time and place for business conversations, they happen everywhere — at dinner, in bed, on vacation. The boardroom follows you home.",
    icon: (
      <div className="relative w-40 h-40 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)" }}>
        {/* House with chaos icons */}
        <svg className="w-16 h-16 text-[#F43F5E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.3}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        {/* Floating notification badges */}
        <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: "#F43F5E", color: "white" }}>!</div>
        <div className="absolute top-2 -left-3 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: "#F43F5E", color: "white" }}>!</div>
        <div className="absolute -bottom-2 right-4 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: "#F43F5E", color: "white" }}>!</div>
      </div>
    ),
    accentColor: "#F43F5E",
    bgAccent: "rgba(244,63,94,0.04)",
  },
  // Step 2 — The Solution (moon card)
  {
    badge: "THE SOLUTION",
    headline: (
      <>
        Your business has a place to live.{" "}
        <span className="text-[#33A2DB]">Your relationship has room to breathe.</span>
      </>
    ),
    body: "Drop ideas into the shared hub the moment they hit you — no interrupting your partner. Set business hours so notifications only arrive when you're in work mode.",
    icon: (
      <div className="w-56 rounded-2xl overflow-hidden"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(51,162,219,0.2)" }}>
        {/* Boardroom Mode row */}
        <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: "rgba(51,162,219,0.15)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(51,162,219,0.15)" }}>
            <svg className="w-5 h-5 text-[#33A2DB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-bold text-white uppercase tracking-wider">Boardroom Mode</div>
            <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Business stays at work</div>
          </div>
        </div>
        {/* Quiet Hours row */}
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(51,162,219,0.15)" }}>
            <svg className="w-5 h-5 text-[#33A2DB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-bold text-white uppercase tracking-wider">Quiet Hours</div>
            <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Relationship gets to breathe</div>
          </div>
        </div>
      </div>
    ),
    accentColor: "#33A2DB",
    bgAccent: "rgba(51,162,219,0.04)",
  },
  // Step 3 — How It Works
  {
    badge: "HOW IT WORKS",
    headline: (
      <>
        One shared hub.{" "}
        <span className="text-[#33A2DB]">Two owners. Zero confusion.</span>
      </>
    ),
    body: "Tasks, updates, issues, goals, and KPIs — all in one place. The AI tone check helps you say it right, because how you say it matters as much as what you say.",
    icon: (
      <div className="flex flex-col gap-2 w-56">
        {[
          { icon: "✓", label: "Shared Command Center", color: "#33A2DB" },
          { icon: "✓", label: "Meeting Cadence Calendar", color: "#33A2DB" },
          { icon: "✓", label: "Goals & KPI Tracking", color: "#33A2DB" },
          { icon: "✓", label: "AI Tone Check", color: "#F16801" },
          { icon: "✓", label: "Quiet Hours / Off the Clock", color: "#33A2DB" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: item.color, color: "white" }}>{item.icon}</div>
            <span className="text-sm text-white font-medium">{item.label}</span>
          </div>
        ))}
      </div>
    ),
    accentColor: "#33A2DB",
    bgAccent: "rgba(51,162,219,0.04)",
  },
  // Step 4 — The Promise
  {
    badge: "THE PROMISE",
    headline: (
      <>
        Keep the business at work.{" "}
        <span className="text-[#33A2DB]">Keep the love at home.</span>
      </>
    ),
    body: "BusinessCadence gives your work a structured time and place — so it stops spilling into everything else. Run the business together. Live your life together.",
    icon: (
      <div className="flex flex-col items-center gap-3">
        <div className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, rgba(51,162,219,0.2), rgba(241,104,1,0.2))", border: "2px solid rgba(51,162,219,0.3)" }}>
          <svg className="w-10 h-10 text-[#33A2DB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
            Join couples building better businesses
          </div>
        </div>
      </div>
    ),
    accentColor: "#33A2DB",
    bgAccent: "rgba(51,162,219,0.04)",
  },
];

// ─── Progress dots ─────────────────────────────────────────────────────────────

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === current ? 24 : 8,
            height: 8,
            backgroundColor: i === current ? "#33A2DB" : "rgba(255,255,255,0.18)",
          }}
        />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SubscriptionOnboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // ─── Partner invite detection ────────────────────────────────────────────────
  // Read query params once (stable — no re-render side effects)
  const params = new URLSearchParams(window.location.search);
  const partnerToken = params.get("token") ?? "";
  const isPartnerInvite = params.get("partner") === "1" && !!partnerToken;

  const { data: partnerInviteData } = trpc.subscription.lookupPartnerInvite.useQuery(
    { token: partnerToken },
    { enabled: isPartnerInvite, retry: false, staleTime: 60_000 }
  );

  // Business name for the personalized CTA — prefer stored businessName, fall back to owner name
  const businessName: string | null = partnerInviteData?.valid
    ? (partnerInviteData.businessName ?? partnerInviteData.ownerName ?? null)
    : null;

  const totalSteps = STEPS.length;

  const goNext = useCallback(() => {
    if (isAnimating) return;
    if (step >= totalSteps - 1) {
      if (isPartnerInvite) {
        // Partner flow: route to account creation / sign-in before onboarding
        navigate(`/partner-register?token=${encodeURIComponent(partnerToken)}`);
      } else {
        navigate("/paywall");
      }
      return;
    }
    setDirection("forward");
    setIsAnimating(true);
    setTimeout(() => {
      setStep((s) => s + 1);
      setIsAnimating(false);
    }, 220);
  }, [step, totalSteps, isAnimating, navigate, isPartnerInvite, partnerToken]);

  const goPrev = useCallback(() => {
    if (isAnimating || step === 0) return;
    setDirection("back");
    setIsAnimating(true);
    setTimeout(() => {
      setStep((s) => s - 1);
      setIsAnimating(false);
    }, 220);
  }, [step, isAnimating]);

  const handleSkip = () => {
    if (isPartnerInvite) {
      navigate(`/partner-register?token=${encodeURIComponent(partnerToken)}`);
    } else {
      navigate("/paywall");
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
    setTouchStart(null);
  };

  const current = STEPS[step];
  const isLastStep = step === totalSteps - 1;

  const animClass = isAnimating
    ? direction === "forward"
      ? "-translate-x-5 opacity-0"
      : "translate-x-5 opacity-0"
    : "translate-x-0 opacity-100";

  // Derive the CTA label for the final card
  const finalCtaLabel = isPartnerInvite
    ? `Join ${businessName ?? "Your Business"} →`
    : "See Plans →";

  return (
    <div
      className="fixed inset-0 flex flex-col bg-[#0A1628] overflow-hidden"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(51,162,219,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(51,162,219,0.02) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Skip — top-right only, no logo */}
      <div className="relative z-10 flex items-center justify-end px-6 pt-4">
        <button
          onClick={handleSkip}
          className="text-sm text-white/35 hover:text-white/60 transition-colors py-2 px-3"
        >
          Skip
        </button>
      </div>

      {/* Partner invite context banner — shown only on partner invite flow */}
      {isPartnerInvite && partnerInviteData?.valid && (
        <div className="relative z-10 flex justify-center px-6 pt-2">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: "rgba(51,162,219,0.10)",
              border: "1px solid rgba(51,162,219,0.22)",
              color: "#33A2DB",
            }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {partnerInviteData.ownerName
              ? `${partnerInviteData.ownerName} invited you to join`
              : "You've been invited to join"}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-between px-8 pb-4 w-full max-w-md mx-auto">
        <div
          className={`transition-all duration-220 ease-out ${animClass} flex flex-col items-center text-center w-full`}
        >
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-wider mb-8"
            style={{
              borderColor: `${current.accentColor}40`,
              color: current.accentColor,
              backgroundColor: `${current.accentColor}10`,
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: current.accentColor }}
            />
            {current.badge}
          </div>

          {/* Icon */}
          <div
            className="mb-8 flex items-center justify-center"
            style={{
              minHeight: 160,
            }}
          >
            {current.icon}
          </div>

          {/* Headline */}
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-snug tracking-tight mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {current.headline}
          </h1>

          {/* Body */}
          <p className="text-white/50 text-[15px] leading-relaxed max-w-sm">
            {current.body}
          </p>
        </div>

      {/* Bottom bar: dots + CTA */}
      <div className="relative z-10 w-full pt-6">
        <div className="flex justify-center mb-6">
          <ProgressDots total={totalSteps} current={step} />
        </div>
        {/* On the last step show the CTA button; on earlier steps just show a swipe hint */}
        {isLastStep ? (
          <button
            onClick={goNext}
            className="w-full bg-gradient-to-r from-[#33A2DB] to-[#25DCF9] text-[#0A1628] font-bold text-lg py-4 px-8 rounded-2xl transition-all duration-200 active:scale-[0.97] shadow-lg shadow-[#33A2DB]/20"
          >
            {finalCtaLabel}
          </button>
        ) : (
          <p className="text-center text-xs" style={{ color: "rgba(255,255,255,0.22)" }}>
            Swipe to continue
          </p>
        )}
      </div>
      </div>
    </div>
  );
}
