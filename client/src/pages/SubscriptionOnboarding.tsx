/**
 * SubscriptionOnboarding — 3 emotional intro cards shown before the paywall.
 *
 * Card 1: FOR CO-PRENEURS — Large crystal heart, "Running a business with your partner is hard."
 * Card 2: THE PROBLEM     — Glass card with chaos illustration, "Business talk bleeds into everything"
 * Card 3: THE SOLUTION    — Glass card with Work Mode + Quiet Hours rows, "Your business has a place to live."
 * → Paywall
 */

import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { BrandIcon } from "@/components/BrandLogo";
import { trpc } from "@/lib/trpc";

// ─── Progress dots ─────────────────────────────────────────────────────────────

function ProgressDots({ total, current, accentColor }: { total: number; current: number; accentColor: string }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === current ? 24 : 8,
            height: 8,
            backgroundColor: i === current ? accentColor : "rgba(255,255,255,0.18)",
          }}
        />
      ))}
    </div>
  );
}

// ─── Card 1: FOR CO-PRENEURS ──────────────────────────────────────────────────

function Card1() {
  return (
    <div className="flex flex-col items-center text-center w-full flex-1 justify-between">
      {/* Badge */}
      <div
        className="inline-flex items-center gap-2 px-5 py-2 rounded-full border text-xs font-bold uppercase tracking-widest"
        style={{
          borderColor: "rgba(51,162,219,0.5)",
          color: "#33A2DB",
          backgroundColor: "transparent",
        }}
      >
        FOR CO-PRENEURS
      </div>

      {/* Large crystal heart logo — centered, takes up most of the screen */}
      <div className="flex items-center justify-center" style={{ flex: 1, paddingTop: 24, paddingBottom: 24 }}>
        <BrandIcon size={220} />
      </div>

      {/* Text block at bottom */}
      <div className="text-center">
        <h1
          className="text-[28px] font-bold text-white leading-tight mb-4"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Running a business with<br />your partner is hard.
        </h1>
        <p className="text-white/55 text-[15px] leading-relaxed max-w-xs mx-auto">
          The late-night strategy sessions. The disagreements that follow you to dinner. The feeling that you're always either business partners or life partners — never both at once.
        </p>
      </div>
    </div>
  );
}

// ─── Card 2: THE PROBLEM ──────────────────────────────────────────────────────

function Card2() {
  return (
    <div className="flex flex-col items-center text-center w-full flex-1 justify-between">
      {/* Badge — red accent */}
      <div
        className="inline-flex items-center gap-2 px-5 py-2 rounded-full border text-xs font-bold uppercase tracking-widest"
        style={{
          borderColor: "rgba(220,38,38,0.5)",
          color: "#DC2626",
          backgroundColor: "rgba(220,38,38,0.08)",
        }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
        THE PROBLEM
      </div>

      {/* Glass card with chaos illustration */}
      <div
        className="flex items-center justify-center"
        style={{ flex: 1, paddingTop: 24, paddingBottom: 24 }}
      >
        <div
          className="relative rounded-3xl overflow-hidden flex items-center justify-center"
          style={{
            width: 260,
            height: 220,
            background: "linear-gradient(135deg, rgba(30,10,10,0.8) 0%, rgba(60,10,10,0.6) 100%)",
            border: "1px solid rgba(220,38,38,0.25)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 0 60px rgba(220,38,38,0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          {/* Glass highlight */}
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "rgba(255,255,255,0.12)" }} />

          {/* Center: house icon */}
          <div className="relative flex items-center justify-center">
            <svg
              width="80" height="80"
              viewBox="0 0 24 24" fill="none" stroke="rgba(220,38,38,0.6)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>

            {/* Floating red notification bubbles */}
            <div className="absolute -top-8 -right-12 flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: "#DC2626", color: "white", boxShadow: "0 0 12px rgba(220,38,38,0.6)" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              !
            </div>
            <div className="absolute -top-4 -left-14 flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: "#DC2626", color: "white", boxShadow: "0 0 12px rgba(220,38,38,0.6)" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              !
            </div>
            <div className="absolute top-6 -right-14 flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: "#DC2626", color: "white", boxShadow: "0 0 12px rgba(220,38,38,0.6)" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              !
            </div>
            <div className="absolute top-8 -left-12 flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: "#991B1B", color: "white", boxShadow: "0 0 12px rgba(153,27,27,0.6)" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
              !
            </div>

            {/* Red glow lines emanating from house */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 80 80" fill="none" style={{ opacity: 0.3 }}>
              <line x1="40" y1="20" x2="65" y2="5" stroke="#DC2626" strokeWidth="1" strokeDasharray="2 3"/>
              <line x1="40" y1="20" x2="15" y2="5" stroke="#DC2626" strokeWidth="1" strokeDasharray="2 3"/>
              <line x1="55" y1="40" x2="75" y2="35" stroke="#DC2626" strokeWidth="1" strokeDasharray="2 3"/>
              <line x1="25" y1="40" x2="5" y2="35" stroke="#DC2626" strokeWidth="1" strokeDasharray="2 3"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Text block */}
      <div className="text-center">
        <h1
          className="text-[26px] font-bold text-white leading-tight mb-4"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Business talk{" "}
          <span style={{ color: "#DC2626" }}>bleeds into<br />everything</span>{" "}
          when there's no structure.
        </h1>
        <p className="text-white/50 text-[15px] leading-relaxed max-w-xs mx-auto">
          Without a dedicated time and place for business conversations, they happen everywhere — at dinner, in bed, on vacation. The work follows you home.
        </p>
      </div>
    </div>
  );
}

// ─── Card 3: THE SOLUTION ─────────────────────────────────────────────────────

function Card3() {
  return (
    <div className="flex flex-col items-center text-center w-full flex-1 justify-between">
      {/* Badge — teal accent, matches mockup exactly */}
      <div
        className="inline-flex items-center gap-2 px-5 py-2 rounded-full border text-xs font-bold uppercase tracking-widest"
        style={{
          borderColor: "rgba(51,162,219,0.5)",
          color: "#33A2DB",
          backgroundColor: "rgba(51,162,219,0.1)",
        }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-[#33A2DB]" />
        THE SOLUTION
      </div>

      {/* Glass card with Work Mode + Quiet Hours */}
      <div
        className="flex items-center justify-center"
        style={{ flex: 1, paddingTop: 24, paddingBottom: 24 }}
      >
        <div
          className="rounded-3xl overflow-hidden w-64"
          style={{
            background: "linear-gradient(135deg, rgba(10,25,50,0.9) 0%, rgba(15,36,64,0.8) 100%)",
            border: "1px solid rgba(51,162,219,0.25)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 0 60px rgba(51,162,219,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          {/* Glass highlight */}
          <div className="h-px w-full" style={{ background: "rgba(255,255,255,0.1)" }} />

          {/* Work Mode row */}
          <div className="px-5 pt-5 pb-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-3">WORK MODE</div>
            <div className="flex items-center justify-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(51,162,219,0.3), rgba(37,220,249,0.2))",
                  border: "1px solid rgba(51,162,219,0.4)",
                  boxShadow: "0 0 20px rgba(51,162,219,0.2)",
                }}
              >
                {/* Sun icon */}
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#33A2DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              </div>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/50 mt-3">WORK MODE</div>
          </div>

          {/* Divider */}
          <div className="h-px mx-4" style={{ background: "rgba(51,162,219,0.15)" }} />

          {/* Quiet Hours row */}
          <div className="px-5 pt-4 pb-5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-3">QUIET HOURS</div>
            <div className="flex items-center justify-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(15,36,100,0.9), rgba(10,20,60,0.9))",
                  border: "2px solid rgba(51,162,219,0.5)",
                  boxShadow: "0 0 24px rgba(51,162,219,0.3)",
                }}
              >
                {/* Moon icon */}
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="rgba(51,162,219,0.3)" stroke="#33A2DB" strokeWidth="1.5"/>
                </svg>
              </div>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/50 mt-3">QUIET HOURS</div>
          </div>
        </div>
      </div>

      {/* Text block */}
      <div className="text-center">
        <h1
          className="text-[26px] font-bold text-white leading-tight mb-4"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Your business has a place to live.{" "}
          <span style={{ color: "#33A2DB" }}>Your relationship has room to breathe.</span>
        </h1>
        <p className="text-white/50 text-[15px] leading-relaxed max-w-xs mx-auto">
          Drop ideas into the shared hub the moment they hit you — no interrupting your partner. Set your business hours so notifications only arrive when you're in work mode. You choose when business mode goes quiet and you can focus the two of you.
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TOTAL_CARDS = 3;
const ACCENT_COLORS = ["#33A2DB", "#DC2626", "#33A2DB"];

export default function SubscriptionOnboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // ─── Partner invite detection ────────────────────────────────────────────────
  const params = new URLSearchParams(window.location.search);
  const partnerToken = params.get("token") ?? "";
  const isPartnerInvite = params.get("partner") === "1" && !!partnerToken;

  const { data: partnerInviteData } = trpc.subscription.lookupPartnerInvite.useQuery(
    { token: partnerToken },
    { enabled: isPartnerInvite, retry: false, staleTime: 60_000 }
  );

  const businessName: string | null = partnerInviteData?.valid
    ? (partnerInviteData.businessName ?? partnerInviteData.ownerName ?? null)
    : null;

  const goNext = useCallback(() => {
    if (isAnimating) return;
    if (step >= TOTAL_CARDS - 1) {
      if (isPartnerInvite) {
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
  }, [step, isAnimating, navigate, isPartnerInvite, partnerToken]);

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

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { if (diff > 0) goNext(); else goPrev(); }
    setTouchStart(null);
  };

  const isLastStep = step === TOTAL_CARDS - 1;
  const accentColor = ACCENT_COLORS[step];

  const animClass = isAnimating
    ? direction === "forward" ? "-translate-x-5 opacity-0" : "translate-x-5 opacity-0"
    : "translate-x-0 opacity-100";

  const finalCtaLabel = isPartnerInvite
    ? `Join ${businessName ?? "Your Business"} →`
    : "See Plans →";

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{
        background: "#0A1628",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Subtle background grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(51,162,219,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(51,162,219,0.015) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Skip button — top right */}
      <div className="relative z-10 flex items-center justify-end px-6 pt-4 flex-none">
        <button
          onClick={handleSkip}
          className="text-sm py-2 px-3 transition-colors"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          Skip
        </button>
      </div>

      {/* Partner invite banner */}
      {isPartnerInvite && partnerInviteData?.valid && (
        <div className="relative z-10 flex justify-center px-6 pt-1 flex-none">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: "rgba(51,162,219,0.10)",
              border: "1px solid rgba(51,162,219,0.22)",
              color: "#33A2DB",
            }}
          >
            {partnerInviteData.ownerName
              ? `${partnerInviteData.ownerName} invited you to join`
              : "You've been invited to join"}
          </div>
        </div>
      )}

      {/* Main card area */}
      <div
        className={`relative z-10 flex-1 flex flex-col items-center px-8 pt-4 w-full max-w-md mx-auto transition-all duration-220 ease-out ${animClass}`}
      >
        {step === 0 && <Card1 />}
        {step === 1 && <Card2 />}
        {step === 2 && <Card3 />}
      </div>

      {/* Bottom: dots + swipe hint or CTA */}
      <div className="relative z-10 w-full px-8 pb-8 max-w-md mx-auto flex-none">
        <div className="flex justify-center mb-5">
          <ProgressDots total={TOTAL_CARDS} current={step} accentColor={accentColor} />
        </div>
        {isLastStep ? (
          <button
            onClick={goNext}
            className="w-full font-bold text-lg py-4 px-8 rounded-2xl transition-all duration-200 active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #33A2DB 0%, #25DCF9 100%)",
              color: "#0A1628",
              boxShadow: "0 4px 24px rgba(51,162,219,0.3)",
            }}
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
  );
}
