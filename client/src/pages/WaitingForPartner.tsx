/**
 * WaitingForPartner — Shown after subscriber invites their partner to handle setup.
 * Gives limited read access to the app while waiting.
 * Has an escape hatch: "Complete it myself →" to go to /onboarding.
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { BrandIcon } from "@/components/BrandLogo";

// ─── Static sample-data mini previews (no DB writes) ────────────────────────

function PreviewFrame({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-4 flex-shrink-0 w-full snap-center"
      style={{
        background: "linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)",
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">{icon}</span>
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#5EEAD4]">{title}</span>
        <span className="ml-auto text-[9px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }}>
          SAMPLE
        </span>
      </div>
      {children}
    </div>
  );
}

function BoardPreview() {
  return (
    <PreviewFrame title="The Board" icon="⚡">
      <div className="flex flex-col gap-2 text-left">
        {[
          { icon: "☑", label: "Order new signage for front window", meta: "Task · assigned to Lynn" },
          { icon: "🔥", label: "Supplier raised prices — need to discuss", meta: "Issue · flagged by Mike" },
          { icon: "📣", label: "We hit 42 new clients this month!", meta: "Update · 2h ago" },
        ].map(item => (
          <div key={item.label} className="rounded-xl px-3 py-2.5 flex items-start gap-2.5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <span className="text-[13px] mt-0.5">{item.icon}</span>
            <div>
              <p className="text-[12px] text-white/85 font-medium leading-snug">{item.label}</p>
              <p className="text-[10px] text-white/35 mt-0.5">{item.meta}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-white/40 mt-3 leading-relaxed text-left">
        Post it on the Board instead of interrupting dinner. Your partner sees it during business hours.
      </p>
    </PreviewFrame>
  );
}

function HubPreview() {
  return (
    <PreviewFrame title="The Hub" icon="💬">
      <div className="flex flex-col gap-2 text-left">
        <div className="self-start max-w-[85%] rounded-2xl rounded-bl-md px-3 py-2"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-[12px] text-white/85 leading-snug">Idea: what if we ran a referral special next month?</p>
          <p className="text-[9px] text-white/30 mt-1">Mike · 9:14 AM</p>
        </div>
        <div className="self-end max-w-[85%] rounded-2xl rounded-br-md px-3 py-2"
          style={{ background: "rgba(94,234,212,0.12)", border: "1px solid rgba(94,234,212,0.25)" }}>
          <p className="text-[12px] text-white/90 leading-snug">Love it — adding it to Friday's owner meeting agenda.</p>
          <p className="text-[9px] text-white/35 mt-1">Lynn · 9:20 AM</p>
        </div>
        <div className="self-center flex items-center gap-1.5 px-3 py-1 rounded-full mt-1"
          style={{ background: "rgba(167,139,250,0.10)", border: "1px solid rgba(167,139,250,0.25)" }}>
          <span className="text-[10px]">🌙</span>
          <span className="text-[10px] font-semibold" style={{ color: "#A78BFA" }}>Sleep Mode until 8:00 AM</span>
        </div>
      </div>
      <p className="text-[11px] text-white/40 mt-3 leading-relaxed text-left">
        Every business idea gets captured — and Sleep Mode keeps evenings quiet.
      </p>
    </PreviewFrame>
  );
}

function CalendarPreview() {
  return (
    <PreviewFrame title="The Calendar" icon="📅">
      <div className="flex flex-col gap-2 text-left">
        {[
          { day: "MON", date: "9", label: "Daily Huddle", time: "8:30 AM", color: "#5EEAD4" },
          { day: "FRI", date: "13", label: "Weekly Owner Meeting", time: "2:00 PM", color: "#38BDF8" },
          { day: "FRI", date: "27", label: "Monthly Deep Dive", time: "1:00 PM", color: "#A78BFA" },
        ].map(m => (
          <div key={m.label} className="rounded-xl px-3 py-2.5 flex items-center gap-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex flex-col items-center w-9 flex-shrink-0 rounded-lg py-1"
              style={{ background: "rgba(255,255,255,0.05)" }}>
              <span className="text-[8px] font-bold tracking-wider" style={{ color: m.color }}>{m.day}</span>
              <span className="text-[14px] font-bold text-white leading-none">{m.date}</span>
            </div>
            <div>
              <p className="text-[12px] text-white/85 font-medium leading-snug">{m.label}</p>
              <p className="text-[10px] text-white/35 mt-0.5">{m.time} · agenda auto-built</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-white/40 mt-3 leading-relaxed text-left">
        A full year of owner meetings, scheduled and structured for your industry.
      </p>
    </PreviewFrame>
  );
}

export default function WaitingForPartner() {
  const [, navigate] = useLocation();
  const [previewIndex, setPreviewIndex] = useState(0);

  // Read partner name/email from query params
  const params = new URLSearchParams(window.location.search);
  const partnerName = params.get("name") ?? "your partner";
  const partnerEmail = params.get("email") ?? "";
  const bizName = params.get("bizName") ?? "";

  const previews = [
    { key: "board", node: <BoardPreview /> },
    { key: "hub", node: <HubPreview /> },
    { key: "calendar", node: <CalendarPreview /> },
  ];

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== previewIndex) setPreviewIndex(Math.max(0, Math.min(previews.length - 1, idx)));
  };

  return (
    <div
      className="fixed inset-0 flex flex-col bg-[#0A1628] overflow-y-auto"
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
      <div className="relative z-10 flex flex-col items-center justify-start px-8 pt-10 text-center">
        {/* Animated pulse icon */}
        <div className="relative mb-6">
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
        <p className="text-white/40 text-base leading-relaxed max-w-xs mb-6">
          Once they complete the business profile, you'll both have full access. We'll notify you when they're in.
        </p>

        {/* Status pill */}
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
          style={{
            background: "rgba(94,234,212,0.08)",
            border: "1px solid rgba(94,234,212,0.2)",
          }}
        >
          <div className="w-2 h-2 rounded-full bg-[#5EEAD4] animate-pulse" />
          <span className="text-[#5EEAD4] text-xs font-semibold">Waiting for setup</span>
        </div>

        {/* Sneak-peek carousel with sample data */}
        <div className="w-full max-w-md">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/30 mb-3">
            While you wait — here's what's coming
          </p>
          <div
            onScroll={handleScroll}
            className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 -mx-2 px-2"
            style={{ scrollbarWidth: "none" }}
          >
            {previews.map(p => (
              <div key={p.key} className="w-full flex-shrink-0 snap-center">
                {p.node}
              </div>
            ))}
          </div>
          {/* Dots */}
          <div className="flex justify-center gap-1.5 mt-3">
            {previews.map((p, i) => (
              <div
                key={p.key}
                className="rounded-full transition-all duration-200"
                style={{
                  width: i === previewIndex ? 16 : 6,
                  height: 6,
                  background: i === previewIndex ? "#5EEAD4" : "rgba(255,255,255,0.15)",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="relative z-10 px-6 pb-8 pt-6 flex flex-col gap-3 max-w-md mx-auto w-full flex-shrink-0">
        {/* Explore the app */}
      <button
        onClick={() => navigate(`/setup?bizName=${encodeURIComponent(bizName)}&partnerSent=1&partnerName=${encodeURIComponent(partnerName)}`)}
        className="w-full py-4 rounded-2xl font-bold text-[#0A1628] text-base transition-all duration-200 active:scale-[0.97]"
        style={{
          background: "linear-gradient(135deg, #5EEAD4 0%, #0D9488 100%)",
          boxShadow: "0 4px 24px rgba(94,234,212,0.22)",
        }}
      >
        Set up my business →
      </button>

        {/* Escape hatch */}
      <button
        onClick={() => navigate(`/setup?bizName=${encodeURIComponent(bizName)}&partnerSent=1&partnerName=${encodeURIComponent(partnerName)}`)}
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
