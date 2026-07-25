/**
 * AppWelcome — Full-screen animated intro shown on first native app open.
 *
 * Copreneur-focused messaging with swipeable/tappable cards.
 * Only shown once (persisted via localStorage). After completion,
 * routes to login or business selector depending on auth state.
 */

import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { markWelcomeSeen } from "@/lib/platform";
// Single outline music note icon matching the heart style on card 1
function MusicNoteIcon() {
  // Double eighth note with double beams (♬) — outline style
  // "Two notes becoming one" — distinct from Apple Music's filled/horizontal style
  return (
    <svg className="w-16 h-16 text-[#5EEAD4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {/* Left note head */}
      <ellipse
        cx="7" cy="18"
        rx="2.8" ry="2"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="rotate(-10, 7, 18)"
      />
      {/* Right note head */}
      <ellipse
        cx="17" cy="16.5"
        rx="2.8" ry="2"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="rotate(-10, 17, 16.5)"
      />
      {/* Left stem */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.2}
        d="M9.8 17V4.5"
      />
      {/* Right stem */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.2}
        d="M19.8 15.5V3"
      />
      {/* Top beam */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9.8 4.5L19.8 3"
      />
      {/* Second beam (below the first) */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9.8 7.5L19.8 6"
      />
    </svg>
  );
}

// ─── Card Data ────────────────────────────────────────────────────────────────

interface WelcomeCard {
  headline: string;
  subtext?: string;
  icon: React.ReactNode;
}

const CARDS: WelcomeCard[] = [
  {
    headline: "Running a business with someone you love is one of the hardest things you'll ever do.",
    subtext: "But it doesn't have to pull you apart.",
    icon: (
      <svg className="w-16 h-16 text-[#5EEAD4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  {
    headline: "Most tools help you manage tasks. This one helps you stay connected.",
    subtext: "Because the relationship matters more than the to-do list.",
    icon: (
      <svg className="w-16 h-16 text-[#5EEAD4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {/* Wrench — "most tools" */}
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    headline: "Business Cadence was built for the conversations that keep everything together.",
    subtext: "A shared rhythm. A shared board. A shared purpose.",
    icon: (
      <svg className="w-16 h-16 text-[#5EEAD4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
];

// ─── Dot Indicator ────────────────────────────────────────────────────────────

function DotIndicator({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === current ? 24 : 8,
            height: 8,
            backgroundColor: i === current ? "#5EEAD4" : "rgba(255,255,255,0.2)",
          }}
        />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AppWelcome() {
  const [, navigate] = useLocation();
  const [currentCard, setCurrentCard] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("left");
  const [isAnimating, setIsAnimating] = useState(false);

  const totalSteps = CARDS.length + 1; // cards + final CTA

  const goNext = useCallback(() => {
    if (isAnimating) return;
    if (currentCard >= totalSteps - 1) return;
    setDirection("left");
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentCard((c) => c + 1);
      setIsAnimating(false);
    }, 250);
  }, [currentCard, totalSteps, isAnimating]);

  const goPrev = useCallback(() => {
    if (isAnimating) return;
    if (currentCard <= 0) return;
    setDirection("right");
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentCard((c) => c - 1);
      setIsAnimating(false);
    }, 250);
  }, [currentCard, isAnimating]);

  const handleGetStarted = () => {
    markWelcomeSeen();
    navigate("/login");
  };

  const handleSkip = () => {
    markWelcomeSeen();
    navigate("/login");
  };

  // Touch handling for swipe
  const [touchStart, setTouchStart] = useState<number | null>(null);

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

  // Animation class
  const animClass = isAnimating
    ? direction === "left"
      ? "translate-x-[-20px] opacity-0"
      : "translate-x-[20px] opacity-0"
    : "translate-x-0 opacity-100";

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-between bg-[#0A1929] overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Skip button */}
      <div className="w-full flex justify-end px-6 pt-4">
        <button
          onClick={handleSkip}
          className="text-sm text-white/40 hover:text-white/70 transition-colors py-2 px-3"
        >
          Skip
        </button>
      </div>

      {/* Card content area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 w-full max-w-md">
        <div className={`transition-all duration-250 ease-out ${animClass} flex flex-col items-center text-center`}>
          {currentCard < CARDS.length ? (
            <>
              {/* Icon */}
              <div className="mb-8 p-6 rounded-full bg-white/5 border border-white/10">
                {CARDS[currentCard].icon}
              </div>

              {/* Headline */}
              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-snug mb-4">
                {CARDS[currentCard].headline}
              </h1>

              {/* Subtext */}
              {CARDS[currentCard].subtext && (
                <p className="text-base text-white/50 leading-relaxed">
                  {CARDS[currentCard].subtext}
                </p>
              )}
            </>
          ) : (
            /* Final CTA card */
            <>
              <div className="mb-8 p-6 rounded-full bg-white/5 border border-white/10">
                <MusicNoteIcon />
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-snug mb-4">
                Let's build a rhythm that works for both of you.
              </h1>

              <p className="text-base text-white/50 leading-relaxed mb-10">
                Your business deserves structure. Your relationship deserves protection. Business Cadence gives you both.
              </p>

              <button
                onClick={handleGetStarted}
                className="w-full max-w-xs bg-[#5EEAD4] text-[#0A1929] font-semibold text-lg py-4 px-8 rounded-2xl hover:bg-[#2dd4bf] transition-all duration-200 active:scale-[0.97] shadow-lg shadow-[#5EEAD4]/20"
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bottom area: dots + next button */}
      <div className="w-full px-8 pb-8 flex items-center justify-between max-w-md">
        <DotIndicator total={totalSteps} current={currentCard} />

        {currentCard < CARDS.length && (
          <button
            onClick={goNext}
            className="flex items-center gap-2 text-[#5EEAD4] font-medium text-sm py-2 px-4 rounded-lg hover:bg-white/5 transition-colors active:scale-[0.97]"
          >
            Next
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
