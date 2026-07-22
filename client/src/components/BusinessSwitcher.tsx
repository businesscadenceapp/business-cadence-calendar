/**
 * BusinessSwitcher — active business badge + modal picker.
 *
 * For owners/co-owners with access to multiple businesses, this shows:
 *  - An always-visible badge with the current business name, icon, and color
 *  - A "Switch" button that opens a modal to pick a different business
 *
 * Single-business users (employees scoped to one business) see only the badge.
 *
 * Active business is persisted in localStorage under "bcc_active_business".
 */

import { useState, useEffect } from "react";
import { BUSINESSES } from "@/lib/calendarData";
import type { BusinessKey } from "@/lib/calendarData";

const STORAGE_KEY = "bcc_active_business";

// Businesses available to a given scope
function getAvailableBusinesses(businessScope: string | undefined): BusinessKey[] {
  if (!businessScope || businessScope === "all") {
    return ["chiro", "crossfit"] as BusinessKey[];
  }
  if (businessScope === "chiro") return ["chiro"];
  if (businessScope === "crossfit") return ["crossfit"];
  // Handle full business names
  if (businessScope === "chiropractic") return ["chiro"];
  // comma-separated — normalize names and filter
  const normalized = businessScope
    .split(",")
    .map(s => {
      const trimmed = s.trim();
      if (trimmed === "chiropractic") return "chiro";
      return trimmed;
    })
    .filter(s => s in BUSINESSES) as BusinessKey[];
  return normalized.length > 0 ? normalized : ["chiro"];
}

// Read active business from localStorage, validated against available businesses
function readActiveBusiness(available: BusinessKey[]): BusinessKey {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as BusinessKey | null;
    if (stored && available.includes(stored)) return stored;
  } catch { /* ignore */ }
  return available[0] ?? "chiro";
}

// Write active business to localStorage
function writeActiveBusiness(key: BusinessKey) {
  try { localStorage.setItem(STORAGE_KEY, key); } catch { /* ignore */ }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useActiveBusiness(businessScope: string | undefined) {
  const available = getAvailableBusinesses(businessScope);
  const [activeBusiness, setActiveBusinessState] = useState<BusinessKey>(() =>
    readActiveBusiness(available)
  );

  // If scope changes (e.g. after login), re-validate
  useEffect(() => {
    const valid = readActiveBusiness(available);
    setActiveBusinessState(valid);
  }, [businessScope]); // eslint-disable-line react-hooks/exhaustive-deps

  const setActiveBusiness = (key: BusinessKey) => {
    writeActiveBusiness(key);
    setActiveBusinessState(key);
  };

  return { activeBusiness, setActiveBusiness, available };
}

// ─── Badge ────────────────────────────────────────────────────────────────────

interface ActiveBusinessBadgeProps {
  businessKey: BusinessKey;
  compact?: boolean;
}

export function ActiveBusinessBadge({ businessKey, compact = false }: ActiveBusinessBadgeProps) {
  const biz = BUSINESSES[businessKey];
  if (!biz) return null;

  if (compact) {
    // Mobile: just icon + short name
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-sm leading-none">{biz.icon}</span>
        <span
          className="text-[11px] font-bold truncate max-w-[80px]"
          style={{ color: biz.color, fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {biz.shortName}
        </span>
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: biz.color }}
        />
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl"
      style={{
        backgroundColor: `${biz.color}15`,
        border: `1px solid ${biz.color}35`,
      }}
    >
      <span className="text-base leading-none flex-shrink-0">{biz.icon}</span>
      <div className="min-w-0 flex-1">
        <p
          className="text-[11px] font-bold truncate leading-tight"
          style={{ color: biz.color, fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {biz.shortName}
        </p>
        <p className="text-[9px] truncate" style={{ color: "rgba(255,255,255,0.3)" }}>
          Active business
        </p>
      </div>
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: biz.color, boxShadow: `0 0 4px ${biz.color}80` }}
      />
    </div>
  );
}

// ─── Switch Button ─────────────────────────────────────────────────────────────

interface SwitchBusinessButtonProps {
  onClick: () => void;
  compact?: boolean;
}

export function SwitchBusinessButton({ onClick, compact = false }: SwitchBusinessButtonProps) {
  if (compact) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
        style={{
          backgroundColor: "rgba(94,234,212,0.08)",
          border: "1px solid rgba(94,234,212,0.2)",
          color: "#5EEAD4",
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        <span className="text-xl w-7 text-center">🔀</span>
        Switch Business
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-[12px] font-semibold transition-all active:scale-[0.98]"
      style={{
        backgroundColor: "rgba(94,234,212,0.07)",
        border: "1px solid rgba(94,234,212,0.18)",
        color: "#5EEAD4",
        fontFamily: "'Space Grotesk', sans-serif",
      }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(94,234,212,0.13)")}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(94,234,212,0.07)")}
    >
      <span className="text-sm">🔀</span>
      Switch Business
    </button>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface BusinessSwitcherModalProps {
  available: BusinessKey[];
  current: BusinessKey;
  onSelect: (key: BusinessKey) => void;
  onClose: () => void;
}

export function BusinessSwitcherModal({
  available,
  current,
  onSelect,
  onClose,
}: BusinessSwitcherModalProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
        style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      />
      {/* Modal */}
      <div
        className="fixed z-50 left-1/2 top-1/2 w-full max-w-sm rounded-2xl p-6"
        style={{
          transform: "translate(-50%, -50%)",
          backgroundColor: "#162d4a",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-base font-bold text-white"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Switch Business
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: "rgba(255,255,255,0.4)", backgroundColor: "rgba(255,255,255,0.06)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "white")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {available.map(key => {
            const biz = BUSINESSES[key];
            const isActive = key === current;
            return (
              <button
                key={key}
                onClick={() => { onSelect(key); onClose(); }}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all active:scale-[0.98]"
                style={{
                  backgroundColor: isActive ? `${biz.color}18` : "rgba(255,255,255,0.04)",
                  border: isActive ? `1.5px solid ${biz.color}50` : "1px solid rgba(255,255,255,0.08)",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; }}
              >
                <span className="text-xl leading-none flex-shrink-0">{biz.icon}</span>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-bold truncate"
                    style={{ color: isActive ? biz.color : "white", fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {biz.shortName}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {biz.tagline}
                  </p>
                </div>
                {isActive && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: biz.color, boxShadow: `0 0 4px ${biz.color}` }}
                    />
                    <span
                      className="text-[9px] font-bold uppercase tracking-wide"
                      style={{ color: biz.color }}
                    >
                      Active
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
