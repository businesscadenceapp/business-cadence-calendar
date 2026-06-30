/**
 * ClientLogin — Business selection portal.
 * Users choose which business context they want before entering the password-gated app.
 * The selection is stored in localStorage so the calendar app can default to it.
 */

import { useLocation } from "wouter";

const BUSINESS_STORAGE_KEY = "bcc_selected_business";

export type BusinessSelection = "chiro" | "crossfit" | "all";

const BUSINESSES = [
  {
    key: "chiro" as BusinessSelection,
    name: "New Beginnings Chiropractic",
    shortName: "Chiropractic",
    tagline: "Patient care · Scheduling · Team updates",
    icon: "🏥",
    color: "#10B981",
    bgColor: "rgba(16,185,129,0.08)",
    borderColor: "rgba(16,185,129,0.25)",
    hoverBorderColor: "rgba(16,185,129,0.6)",
    glowColor: "rgba(16,185,129,0.15)",
  },
  {
    key: "crossfit" as BusinessSelection,
    name: "Evolved CrossFit",
    shortName: "CrossFit",
    tagline: "Coaching · Programming · Member updates",
    icon: "💪",
    color: "#F59E0B",
    bgColor: "rgba(245,158,11,0.08)",
    borderColor: "rgba(245,158,11,0.25)",
    hoverBorderColor: "rgba(245,158,11,0.6)",
    glowColor: "rgba(245,158,11,0.15)",
  },
  {
    key: "all" as BusinessSelection,
    name: "All Three Businesses",
    shortName: "Full View",
    tagline: "Chiropractic · CrossFit · Realty",
    icon: "🗂️",
    color: "#6366F1",
    bgColor: "rgba(99,102,241,0.08)",
    borderColor: "rgba(99,102,241,0.25)",
    hoverBorderColor: "rgba(99,102,241,0.6)",
    glowColor: "rgba(99,102,241,0.15)",
  },
];

export function saveBusinessSelection(key: BusinessSelection) {
  try {
    localStorage.setItem(BUSINESS_STORAGE_KEY, key);
  } catch { /* ignore */ }
}

export function getBusinessSelection(): BusinessSelection {
  try {
    const stored = localStorage.getItem(BUSINESS_STORAGE_KEY);
    if (stored === "chiro" || stored === "crossfit" || stored === "all") return stored;
  } catch { /* ignore */ }
  return "all";
}

export default function ClientLogin() {
  const [, navigate] = useLocation();

  const handleSelect = (key: BusinessSelection) => {
    saveBusinessSelection(key);
    navigate("/app");
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: "oklch(0.13 0.025 240)", fontFamily: "'Inter', sans-serif" }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(oklch(1 0 0 / 2.5%) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 2.5%) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-10">
          <img
            src="/manus-storage/businesscadence-logo-navy-v2_7b54fc45.png"
            alt="BusinessCadence"
            className="h-10 w-auto mx-auto mb-6 opacity-90"
          />
          <h1
            className="text-2xl font-bold text-white mb-2"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Welcome Back
          </h1>
          <p className="text-[13px] text-white/40">
            Select which business you'd like to access
          </p>
        </div>

        {/* Business cards */}
        <div className="flex flex-col gap-4 mb-8">
          {BUSINESSES.map((biz) => (
            <button
              key={biz.key}
              onClick={() => handleSelect(biz.key)}
              className="w-full text-left rounded-2xl p-5 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] group"
              style={{
                backgroundColor: biz.bgColor,
                border: `1px solid ${biz.borderColor}`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = biz.hoverBorderColor;
                (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 32px ${biz.glowColor}`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = biz.borderColor;
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ backgroundColor: "oklch(1 0 0 / 6%)" }}
                >
                  {biz.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-semibold text-white text-[15px] mb-0.5"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {biz.name}
                  </p>
                  <p className="text-[12px] text-white/40">{biz.tagline}</p>
                </div>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: biz.color }}
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Back to homepage */}
        <div className="text-center">
          <a
            href="/"
            className="text-[12px] text-white/25 hover:text-white/50 transition-colors"
          >
            ← Back to BusinessCadence.com
          </a>
        </div>
      </div>
    </div>
  );
}
