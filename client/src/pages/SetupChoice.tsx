/**
 * SetupChoice — Shown immediately after subscribing.
 * "Set up now, or invite your partner to handle setup?"
 * Designed as a premium full-screen native moment.
 */

import { useLocation } from "wouter";
import { BrandIcon } from "@/components/BrandLogo";

export default function SetupChoice() {
  const [, navigate] = useLocation();

  return (
    <div
      className="fixed inset-0 flex flex-col bg-[#0A1628]"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Radial teal glow top-center */}
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(94,234,212,0.12) 0%, transparent 70%)" }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(94,234,212,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(94,234,212,0.025) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* Top brand mark */}
      <div className="relative z-10 flex justify-center pt-8 pb-2">
        <div className="flex items-center gap-2">
          <BrandIcon size={28} variant="teal" />
          <span className="text-white/50 text-sm font-medium tracking-wide">
            Business<span className="text-[#5EEAD4]">Cadence</span>
          </span>
        </div>
      </div>

      {/* Center content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center">
        {/* Large icon */}
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8"
          style={{
            background: "linear-gradient(135deg, rgba(94,234,212,0.15) 0%, rgba(13,148,136,0.08) 100%)",
            border: "1px solid rgba(94,234,212,0.25)",
            boxShadow: "0 0 48px rgba(94,234,212,0.12), inset 0 1px 0 rgba(94,234,212,0.2)",
          }}
        >
          {/* Two interlocking rings — partnership */}
          <svg className="w-12 h-12 text-[#5EEAD4]" fill="none" stroke="currentColor" viewBox="0 0 48 48">
            <circle cx="18" cy="24" r="10" strokeWidth="2" strokeOpacity="0.9" />
            <circle cx="30" cy="24" r="10" strokeWidth="2" strokeOpacity="0.9" />
          </svg>
        </div>

        {/* Headline */}
        <h1 className="text-[28px] font-bold text-white leading-tight tracking-tight mb-4">
          You're in.
        </h1>
        <p className="text-white/50 text-base leading-relaxed max-w-xs">
          Would you like to set up your business profile now, or invite your partner to handle setup?
        </p>
      </div>

      {/* Bottom action area */}
      <div className="relative z-10 px-6 pb-8 flex flex-col gap-3 max-w-md mx-auto w-full">
        {/* Primary — set up myself */}
        <button
          onClick={() => navigate("/onboarding")}
          className="w-full py-4 rounded-2xl font-bold text-[#0A1628] text-base transition-all duration-200 active:scale-[0.97]"
          style={{
            background: "linear-gradient(135deg, #5EEAD4 0%, #0D9488 100%)",
            boxShadow: "0 4px 24px rgba(94,234,212,0.25), 0 1px 0 rgba(255,255,255,0.15) inset",
          }}
        >
          Set up now →
        </button>

        {/* Secondary — invite partner */}
        <button
          onClick={() => navigate("/invite-partner-setup")}
          className="w-full py-4 rounded-2xl font-semibold text-white/80 text-base transition-all duration-200 active:scale-[0.97]"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1.5px solid rgba(255,255,255,0.12)",
          }}
        >
          Invite my partner to handle setup
        </button>

        {/* Fine print */}
        <p className="text-white/25 text-xs text-center mt-1">
          You can always complete setup yourself later
        </p>
      </div>
    </div>
  );
}
