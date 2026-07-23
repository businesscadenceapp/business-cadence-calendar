/**
 * BusinessSelector — post-login screen showing swipeable business cards.
 *
 * Shown after login for owners and co-owners who have access to multiple
 * businesses. Each card shows a live notification badge (open tasks +
 * unseen board messages) in the top-right corner so you can triage before
 * entering a workspace.
 *
 * Single-business users are redirected directly to /app/board and never
 * see this screen.
 */

import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { usePerson } from "@/contexts/PersonContext";
import { useActiveBusiness } from "@/components/BusinessSwitcher";
import { trpc } from "@/lib/trpc";
import type { BusinessKey } from "@/lib/calendarData";

// ─── Business card data ───────────────────────────────────────────────────────

interface BusinessCard {
  key: BusinessKey;
  /** DB slug used in board_cards.business column */
  dbSlug: string;
  name: string;
  shortName: string;
  tagline: string;
  logoSrc: string;
  logoAlt: string;
  accentColor: string;
  bgGradient: string;
  logoStyle?: React.CSSProperties;
}

const BUSINESS_CARDS: Record<BusinessKey, BusinessCard> = {
  crossfit: {
    key: "crossfit",
    dbSlug: "crossfit",
    name: "Evolved CrossFit",
    shortName: "Evolved CrossFit",
    tagline: "Fitness · Community · Performance",
    logoSrc: "/manus-storage/ecf-logo_e3510d26.png",
    logoAlt: "Evolved CrossFit",
    accentColor: "#F59E0B",
    bgGradient: "linear-gradient(135deg, #1a1200 0%, #2d1f00 40%, #1a1200 100%)",
    logoStyle: {
      filter: "invert(1) brightness(1.0)",
    },
  },
  chiro: {
    key: "chiro",
    dbSlug: "chiropractic",
    name: "New Beginnings Chiropractic",
    shortName: "New Beginnings Chiropractic",
    tagline: "Health · Healing · Wellness",
    logoSrc: "/manus-storage/nbc-rhino-logo_5f0c5664.png",
    logoAlt: "New Beginnings Chiropractic",
    accentColor: "#10B981",
    bgGradient: "linear-gradient(135deg, #001a0f 0%, #002d1a 40%, #001a0f 100%)",
    logoStyle: {
      filter: "invert(1) brightness(1.0)",
    },
  },
};

// ─── Notification badge ───────────────────────────────────────────────────────

interface BadgeProps {
  tasks: number;
  unseen: number;
  accentColor: string;
}

function NotificationBadge({ tasks, unseen, accentColor }: BadgeProps) {
  const total = tasks + unseen;
  if (total === 0) return null;

  const display = total > 99 ? "99+" : String(total);

  return (
    <div
      className="absolute top-3 right-3 flex flex-col items-end gap-1 z-20"
      style={{ pointerEvents: "none" }}
    >
      {/* Total badge */}
      <div
        className="flex items-center justify-center rounded-full text-[11px] font-bold text-white leading-none"
        style={{
          minWidth: display.length > 1 ? "24px" : "20px",
          height: "20px",
          padding: "0 5px",
          backgroundColor: "#EF4444",
          boxShadow: "0 2px 8px rgba(239,68,68,0.5)",
        }}
      >
        {display}
      </div>

      {/* Breakdown pill — tasks vs unseen */}
      {tasks > 0 && unseen > 0 && (
        <div
          className="flex items-center gap-1 rounded-full px-2 py-0.5"
          style={{
            backgroundColor: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(4px)",
          }}
        >
          {tasks > 0 && (
            <span className="text-[9px] font-semibold" style={{ color: "#FCD34D" }}>
              {tasks} task{tasks !== 1 ? "s" : ""}
            </span>
          )}
          {tasks > 0 && unseen > 0 && (
            <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
          )}
          {unseen > 0 && (
            <span className="text-[9px] font-semibold" style={{ color: "#93C5FD" }}>
              {unseen} new
            </span>
          )}
        </div>
      )}

      {/* Single-type label */}
      {(tasks > 0) !== (unseen > 0) && (
        <div
          className="flex items-center rounded-full px-2 py-0.5"
          style={{
            backgroundColor: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(4px)",
          }}
        >
          <span
            className="text-[9px] font-semibold"
            style={{ color: tasks > 0 ? "#FCD34D" : "#93C5FD" }}
          >
            {tasks > 0
              ? `${tasks} open task${tasks !== 1 ? "s" : ""}`
              : `${unseen} new message${unseen !== 1 ? "s" : ""}`}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── BusinessSelector ─────────────────────────────────────────────────────────

export default function BusinessSelector() {
  const [, navigate] = useLocation();
  const { person } = usePerson();
  const { setActiveBusiness, available } = useActiveBusiness(person?.businessScope);

  // Active card index for swipe/scroll
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  // Fetch per-business notification counts (polls every 30s)
  // Uses publicProcedure + accountId to avoid Manus OAuth requirement
  const { data: countsData } = trpc.board.getBusinessCounts.useQuery(
    { accountId: person?.accountId ?? 0 },
    {
      refetchInterval: 30_000,
      enabled: !!person?.accountId,
    }
  );
  const counts = countsData?.counts ?? {};

  // Filter to only the businesses this user can access
  const cards = available
    .map(key => BUSINESS_CARDS[key])
    .filter(Boolean) as BusinessCard[];

  // If only one business available, skip selector and go straight in
  useEffect(() => {
    if (!person) {
      navigate("/login");
      return;
    }
    if (cards.length === 1) {
      setActiveBusiness(cards[0].key);
      const role = person.role;
      if (role === "employee") {
        navigate("/app/team");
      } else {
        navigate("/app/board");
      }
    }
  }, [person, cards.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (card: BusinessCard) => {
    setActiveBusiness(card.key);
    const role = person?.role;
    if (role === "employee") {
      navigate("/app/team");
    } else {
      navigate("/app/board");
    }
  };

  // ── Touch / mouse drag for swipe ──────────────────────────────────────────

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragOffset(0);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setDragOffset(e.clientX - dragStartX);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const threshold = 80;
    if (dragOffset < -threshold && activeIndex < cards.length - 1) {
      setActiveIndex(i => i + 1);
    } else if (dragOffset > threshold && activeIndex > 0) {
      setActiveIndex(i => i - 1);
    }
    setDragOffset(0);
  };

  if (!person || cards.length === 0) return null;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #0A1929 0%, #0F2440 50%, #0A1929 100%)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Header */}
      <div className="text-center mb-8 px-4">
        <p
          className="text-[11px] font-bold uppercase tracking-[0.2em] mb-3"
          style={{ color: "rgba(94,234,212,0.7)" }}
        >
          BusinessCadence
        </p>
        <h1
          className="text-2xl sm:text-3xl font-bold text-white mb-2"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Welcome back, {person.name.split(" ")[0]}
        </h1>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
          {cards.length > 1 ? "Select a business to get started" : "Loading your dashboard…"}
        </p>
      </div>

      {/* Card carousel */}
      <div
        className="relative w-full flex items-center justify-center"
        style={{ height: "420px", touchAction: "pan-y" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {cards.map((card, i) => {
          const offset = i - activeIndex;
          const isDragActive = isDragging && Math.abs(dragOffset) > 5;

          const baseX = offset * 320;
          const x = baseX + (isDragActive ? dragOffset : 0);
          const scale = offset === 0 ? 1 : 0.85;
          const opacity = Math.abs(offset) > 1 ? 0 : offset === 0 ? 1 : 0.55;
          const zIndex = offset === 0 ? 10 : 5;

          const cardCounts = counts[card.dbSlug] ?? { tasks: 0, unseen: 0, total: 0 };

          return (
            <div
              key={card.key}
              onClick={() => {
                if (Math.abs(dragOffset) > 10) return;
                if (offset === 0) {
                  handleSelect(card);
                } else if (offset < 0) {
                  setActiveIndex(i => Math.max(0, i - 1));
                } else {
                  setActiveIndex(i => Math.min(cards.length - 1, i + 1));
                }
              }}
              style={{
                position: "absolute",
                width: "280px",
                height: "380px",
                transform: `translateX(${x}px) scale(${scale})`,
                opacity,
                zIndex,
                transition: isDragActive ? "none" : "transform 320ms cubic-bezier(0.23,1,0.32,1), opacity 280ms ease-out",
                cursor: "pointer",
                borderRadius: "24px",
                overflow: "hidden",
                boxShadow: offset === 0
                  ? `0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px ${card.accentColor}30, 0 0 60px ${card.accentColor}15`
                  : "0 16px 40px rgba(0,0,0,0.4)",
              }}
            >
              {/* Card background */}
              <div className="absolute inset-0" style={{ background: card.bgGradient }} />

              {/* Accent glow top */}
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ backgroundColor: card.accentColor, opacity: 0.9 }}
              />

              {/* Notification badge — top right */}
              <NotificationBadge
                tasks={cardCounts.tasks}
                unseen={cardCounts.unseen}
                accentColor={card.accentColor}
              />

              {/* Logo area */}
              <div
                className="absolute inset-x-0 flex items-center justify-center"
                style={{ top: "40px", height: "200px" }}
              >
                <img
                  src={card.logoSrc}
                  alt={card.logoAlt}
                  draggable={false}
                  style={{
                    maxWidth: "220px",
                    maxHeight: "180px",
                    objectFit: "contain",
                    userSelect: "none",
                    ...card.logoStyle,
                  }}
                />
              </div>

              {/* Card content */}
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center text-center px-6 pb-8">
                <div
                  className="w-full h-px mb-5"
                  style={{ backgroundColor: `${card.accentColor}30` }}
                />
                <h2
                  className="text-base font-bold text-white mb-1 leading-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {card.shortName}
                </h2>
                <p
                  className="text-[11px] mb-5"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  {card.tagline}
                </p>

                {/* Enter button — only on active card */}
                {offset === 0 && (
                  <button
                    className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.97]"
                    style={{
                      backgroundColor: card.accentColor,
                      color: "#0A1929",
                      boxShadow: `0 4px 20px ${card.accentColor}40`,
                    }}
                    onClick={e => {
                      e.stopPropagation();
                      handleSelect(card);
                    }}
                  >
                    Enter Dashboard →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dot indicators */}
      {cards.length > 1 && (
        <div className="flex items-center gap-2 mt-6">
          {cards.map((card, i) => {
            const cardCounts = counts[card.dbSlug] ?? { total: 0 };
            return (
              <button
                key={card.key}
                onClick={() => setActiveIndex(i)}
                className="relative transition-all duration-300"
                style={{
                  width: i === activeIndex ? "24px" : "8px",
                  height: "8px",
                  borderRadius: "4px",
                  backgroundColor: i === activeIndex
                    ? cards[activeIndex].accentColor
                    : "rgba(255,255,255,0.2)",
                }}
              >
                {/* Small dot indicator on inactive dots if they have notifications */}
                {i !== activeIndex && cardCounts.total > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                    style={{ backgroundColor: "#EF4444" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Swipe hint */}
      {cards.length > 1 && (
        <p
          className="mt-4 text-[11px]"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          Swipe or tap to switch
        </p>
      )}

      {/* Sign out link */}
      <button
        className="mt-10 text-xs transition-colors"
        style={{ color: "rgba(255,255,255,0.25)" }}
        onMouseEnter={e => (e.currentTarget.style.color = "#F87171")}
        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
        onClick={() => {
          try { localStorage.removeItem("bcc_person_v1"); } catch { /* ignore */ }
          navigate("/login");
        }}
      >
        Sign out
      </button>
    </div>
  );
}
