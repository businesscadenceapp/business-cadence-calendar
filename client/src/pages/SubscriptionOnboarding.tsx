/**
 * SubscriptionOnboarding — A lightweight 4-step intro flow shown before the
 * paywall. It builds emotional buy-in and explains the value proposition
 * before asking for payment.
 *
 * Flow:
 *   Step 0: Emotional hook — "Running a business with someone you love…"
 *   Step 1: The problem — "Business talk bleeds into everything"
 *   Step 2: The solution — "Four meetings. One rhythm."
 *   Step 3: The promise — "Your relationship stays protected"
 *   → Paywall
 *
 * This component is intentionally lightweight — no API calls, no form inputs.
 * It's a pure marketing/emotional onboarding experience.
 */

import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { BrandIcon } from "@/components/BrandLogo";
import { ONBOARDING_STEP_BADGES } from "@shared/subscriptionPlans";

// ─── Step data ────────────────────────────────────────────────────────────────

interface OnboardingStep {
  badge: string;
  headline: React.ReactNode;
  body: string;
  icon: React.ReactNode;
  accentColor: string;
}

const STEPS: OnboardingStep[] = [
  {
    badge: ONBOARDING_STEP_BADGES[0],
    headline: (
      <>
        Running a business with someone you love is{" "}
        <span className="text-[#5EEAD4]">one of the hardest things</span> you'll
        ever do.
      </>
    ),
    body: "The late-night strategy sessions. The disagreements that follow you to dinner. The feeling that you're always either business partners or life partners — never both at once.",
    icon: (
      <svg className="w-14 h-14 text-[#5EEAD4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.3}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    accentColor: "#5EEAD4",
  },
  {
    badge: ONBOARDING_STEP_BADGES[1],
    headline: (
      <>
        Business talk{" "}
        <span className="text-[#F43F5E]">bleeds into everything</span> when
        there's no structure.
      </>
    ),
    body: "Without a dedicated time and place for business conversations, they happen everywhere — at dinner, in bed, on vacation. The boardroom follows you home.",
    icon: (
      <svg className="w-14 h-14 text-[#F43F5E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.3}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    accentColor: "#F43F5E",
  },
  {
    badge: ONBOARDING_STEP_BADGES[2],
    headline: (
      <>
        Four meetings.{" "}
        <span className="text-[#5EEAD4]">One unbreakable rhythm.</span>
      </>
    ),
    body: "A daily huddle, a weekly review, a monthly finance check, and a quarterly offsite. BusinessCadence builds this calendar for you and keeps both of you on the same page — automatically.",
    icon: (
      <svg className="w-14 h-14 text-[#5EEAD4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth={1.3} strokeLinecap="round" />
        <line x1="3" y1="9" x2="21" y2="9" strokeWidth={1.3} />
        <line x1="8" y1="2" x2="8" y2="6" strokeWidth={1.3} strokeLinecap="round" />
        <line x1="16" y1="2" x2="16" y2="6" strokeWidth={1.3} strokeLinecap="round" />
        <circle cx="8" cy="14" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="12" cy="14" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="16" cy="14" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="8" cy="18" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="12" cy="18" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    ),
    accentColor: "#5EEAD4",
  },
  {
    badge: ONBOARDING_STEP_BADGES[3],
    headline: (
      <>
        Your business has a place to live.{" "}
        <span className="text-[#5EEAD4]">Your relationship has room to breathe.</span>
      </>
    ),
    body: "Drop ideas into the shared hub the moment they hit you — no interrupting your partner. Set your business hours so notifications only arrive when you're in work mode. Turn on Sleep Mode and the business goes quiet for both of you.",
    icon: (
      <svg className="w-14 h-14 text-[#5EEAD4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {/* Crescent moon */}
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.3} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        {/* Stars */}
        <line x1="19" y1="3" x2="19" y2="3.01" strokeLinecap="round" strokeWidth={2.5} />
        <line x1="22" y1="6" x2="22" y2="6.01" strokeLinecap="round" strokeWidth={2.5} />
        <line x1="20" y1="7" x2="20" y2="7.01" strokeLinecap="round" strokeWidth={2.5} />
      </svg>
    ),
    accentColor: "#5EEAD4",
  },
  {
    badge: ONBOARDING_STEP_BADGES[4],
    headline: (
      <>
        Your business stays in the boardroom.{" "}
        <span className="text-[#5EEAD4]">Your relationship stays protected.</span>
      </>
    ),
    body: "BusinessCadence gives your work a structured time and place — so it stops spilling into everything else. Run the business together. Live your life together.",
    icon: (
      <svg className="w-14 h-14 text-[#5EEAD4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.3}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    accentColor: "#5EEAD4",
  },
];

// ─── Progress dots ─────────────────────────────────────────────────────────────

function ProgressDots({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === current ? 24 : 8,
            height: 8,
            backgroundColor:
              i === current ? "#5EEAD4" : "rgba(255,255,255,0.18)",
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

  const totalSteps = STEPS.length;

  const goNext = useCallback(() => {
    if (isAnimating) return;
    if (step >= totalSteps - 1) {
      // Last step → go to paywall
      navigate("/paywall");
      return;
    }
    setDirection("forward");
    setIsAnimating(true);
    setTimeout(() => {
      setStep((s) => s + 1);
      setIsAnimating(false);
    }, 220);
  }, [step, totalSteps, isAnimating, navigate]);

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
    navigate("/paywall");
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
            "linear-gradient(rgba(94,234,212,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(94,234,212,0.02) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Top bar: logo + skip */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-4">
        <div className="flex items-center gap-2">
          <BrandIcon size={32} variant="teal" />
          <span className="text-white/60 text-sm font-medium">
            Business<span className="text-[#5EEAD4]">Cadence</span>
          </span>
        </div>
        <button
          onClick={handleSkip}
          className="text-sm text-white/35 hover:text-white/60 transition-colors py-2 px-3"
        >
          Skip
        </button>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 w-full max-w-md mx-auto">
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
            className="mb-8 p-6 rounded-full border"
            style={{
              backgroundColor: `${current.accentColor}08`,
              borderColor: `${current.accentColor}20`,
            }}
          >
            {current.icon}
          </div>

          {/* Headline */}
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-snug tracking-tight mb-5">
            {current.headline}
          </h1>

          {/* Body */}
          <p className="text-white/50 text-base leading-relaxed max-w-sm">
            {current.body}
          </p>
        </div>
      </div>

      {/* Bottom bar: dots + CTA */}
      <div className="relative z-10 w-full px-8 pb-8 max-w-md mx-auto">
        {/* Progress dots */}
        <div className="flex justify-center mb-6">
          <ProgressDots total={totalSteps} current={step} />
        </div>

        {/* Primary CTA */}
        <button
          onClick={goNext}
          className="w-full bg-gradient-to-r from-[#5EEAD4] to-[#0D9488] text-[#0A1628] font-bold text-lg py-4 px-8 rounded-2xl transition-all duration-200 active:scale-[0.97] shadow-lg shadow-[#5EEAD4]/20"
        >
          {isLastStep ? "See Plans →" : "Next →"}
        </button>

        {/* Back link */}
        {step > 0 && (
          <button
            onClick={goPrev}
            className="w-full mt-3 text-white/30 text-sm hover:text-white/50 transition-colors py-2"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
