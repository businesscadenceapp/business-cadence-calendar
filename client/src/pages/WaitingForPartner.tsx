/**
 * WaitingForPartner — Shown after subscriber invites their partner to handle setup.
 * Gives limited read access to the app while waiting.
 * Has an escape hatch: "Complete it myself →" to go to /onboarding.
 */

import { useLocation } from "wouter";
import { BrandIcon } from "@/components/BrandLogo";

export default function WaitingForPartner() {
  const [, navigate] = useLocation();

  // Read partner name/email from query params
  const params = new URLSearchParams(window.location.search);
  const partnerName = params.get("name") ?? "your partner";
  const partnerEmail = params.get("email") ?? "";

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
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(94,234,212,0.08) 0%, transparent 70%)" }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(94,234,212,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(94,234,212,0.02) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* Brand */}
      <div className="relative z-10 flex justify-center pt-8">
        <div className="flex items-center gap-2">
          <BrandIcon size={28} variant="teal" />
          <span className="text-white/40 text-sm font-medium tracking-wide">
            Business<span className="text-[#5EEAD4]">Cadence</span>
          </span>
        </div>
      </div>

      {/* Center content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center">
        {/* Animated pulse icon */}
        <div className="relative mb-8">
          {/* Outer pulse rings */}
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{
              background: "rgba(94,234,212,0.08)",
              animationDuration: "2.5s",
            }}
          />
          <div
            className="absolute inset-[-8px] rounded-full animate-ping"
            style={{
              background: "rgba(94,234,212,0.04)",
              animationDuration: "2.5s",
              animationDelay: "0.5s",
            }}
          />
          {/* Icon */}
          <div
            className="relative w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(94,234,212,0.12) 0%, rgba(13,148,136,0.06) 100%)",
              border: "1px solid rgba(94,234,212,0.25)",
            }}
          >
            <svg className="w-10 h-10 text-[#5EEAD4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <h1 className="text-[26px] font-bold text-white leading-tight tracking-tight mb-3">
          Invite sent to {partnerName}
        </h1>
        {partnerEmail && (
          <p className="text-[#5EEAD4]/70 text-sm mb-4 font-medium">{partnerEmail}</p>
        )}
        <p className="text-white/40 text-base leading-relaxed max-w-xs mb-8">
          Once they complete the business profile, you'll both have full access. We'll notify you when they're in.
        </p>

        {/* Status pill */}
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
          style={{
            background: "rgba(94,234,212,0.08)",
            border: "1px solid rgba(94,234,212,0.2)",
          }}
        >
          <div className="w-2 h-2 rounded-full bg-[#5EEAD4] animate-pulse" />
          <span className="text-[#5EEAD4] text-xs font-semibold">Waiting for setup</span>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="relative z-10 px-6 pb-8 flex flex-col gap-3 max-w-md mx-auto w-full">
        {/* Explore the app */}
        <button
          onClick={() => navigate("/app/board")}
          className="w-full py-4 rounded-2xl font-bold text-[#0A1628] text-base transition-all duration-200 active:scale-[0.97]"
          style={{
            background: "linear-gradient(135deg, #5EEAD4 0%, #0D9488 100%)",
            boxShadow: "0 4px 24px rgba(94,234,212,0.22)",
          }}
        >
          Explore the app →
        </button>

        {/* Escape hatch */}
        <button
          onClick={() => navigate("/onboarding")}
          className="w-full py-3.5 rounded-2xl font-semibold text-white/60 text-sm transition-all duration-200 active:scale-[0.97]"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1.5px solid rgba(255,255,255,0.10)",
          }}
        >
          Complete business profile myself
        </button>
      </div>
    </div>
  );
}
