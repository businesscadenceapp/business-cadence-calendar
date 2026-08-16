import { useState } from "react";
import { BrandIcon } from "@/components/BrandLogo";

export const TARSA_OVERVIEW_STORAGE_KEY = "tarsa_benefits_overview_seen_v1";

const OVERVIEW_CARDS = [
  {
    eyebrow: "A boundary that works",
    title: "Work stays at work.",
    body: "TARSA automatically changes the center sun to a moon outside your personal business hours. Notifications wait, so home time stays yours. You can also tap the sun to switch Sleep Mode on whenever you need it.",
    visual: "☀️  →  🌙",
    accent: "#FCD34D",
  },
  {
    eyebrow: "A place for the thought",
    title: "Capture it—don’t interrupt.",
    body: "When a business thought flashes, put it in TARSA as a task, update, or issue. Your partner can see it in work time, without either of you losing the moment at home.",
    visual: "💭  →  ✦",
    accent: "#33A2DB",
  },
  {
    eyebrow: "Two hubs, one rhythm",
    title: "Run the business with rhythm.",
    body: "The Command Center keeps day-to-day work moving. Swipe to the Productivity Hub for Goals, KPIs, Reports, Settings, and referrals—so you stay aligned without turning every evening into a meeting.",
    visual: "⚡  ⇄  📈",
    accent: "#A78BFA",
  },
];

export function TarsaBenefitsOverview({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const current = OVERVIEW_CARDS[step];
  const isLast = step === OVERVIEW_CARDS.length - 1;

  const finish = () => {
    try { localStorage.setItem(TARSA_OVERVIEW_STORAGE_KEY, "seen"); } catch { /* ignore */ }
    onComplete();
  };

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ zIndex: 120, background: "radial-gradient(circle at 50% 12%, #18385e 0%, #0f2440 48%, #08182d 100%)", paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(51,162,219,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(51,162,219,0.025) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
      <div className="relative z-10 flex justify-between items-center px-6 pt-4">
        <div className="flex items-center gap-2 text-white/80 text-sm font-semibold"><BrandIcon size={28} /> TARSA</div>
        <button type="button" onClick={finish} className="px-2 py-2 text-xs font-semibold text-white/45">Skip for now</button>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center max-w-md mx-auto w-full">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-8 text-3xl" style={{ background: `${current.accent}12`, border: `1px solid ${current.accent}38`, boxShadow: `0 0 32px ${current.accent}18` }}>
          {current.visual}
        </div>
        <p className="text-[11px] uppercase font-bold tracking-[0.16em] mb-4" style={{ color: current.accent, fontFamily: "'Space Grotesk', sans-serif" }}>{current.eyebrow}</p>
        <h1 className="text-[30px] leading-tight font-black text-white tracking-tight mb-5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{current.title}</h1>
        <p className="text-[16px] leading-relaxed" style={{ color: "rgba(255,255,255,0.66)" }}>{current.body}</p>
      </div>

      <div className="relative z-10 px-8 pb-8 max-w-md mx-auto w-full">
        <div className="flex justify-center gap-2 mb-6">
          {OVERVIEW_CARDS.map((card, index) => <span key={card.title} className="rounded-full transition-all" style={{ width: index === step ? 24 : 8, height: 8, background: index === step ? current.accent : "rgba(255,255,255,0.18)" }} />)}
        </div>
        <button
          type="button"
          onClick={() => isLast ? finish() : setStep(value => value + 1)}
          className="w-full min-h-[54px] rounded-2xl text-[16px] font-black active:scale-[0.98]"
          style={{ background: `linear-gradient(135deg, ${current.accent}, #33A2DB)`, color: "#071727", boxShadow: `0 10px 26px ${current.accent}33` }}
        >
          {isLast ? "Open Command Center" : "Continue"}
        </button>
      </div>
    </div>
  );
}
