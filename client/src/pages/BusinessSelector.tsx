/**
 * BusinessSelector — post-login screen showing swipeable business cards.
 *
 * Shown after login for owners and co-owners who have access to multiple
 * businesses. Each card is built dynamically from the account's businesses
 * table — no hardcoded business data. Each card shows a live notification
 * badge (open tasks + unseen board messages) in the top-right corner so
 * you can triage before entering a workspace.
 *
 * If the account has no businesses yet, the user is redirected to /onboarding.
 */

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { usePerson } from "@/contexts/PersonContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { clearAuth } from "@/components/PasswordGate";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";

const HEART_SRC = "/manus-storage/heart-transparent-clean_14235c91.png";

async function fireHeartbeatHaptic() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
    await new Promise(r => setTimeout(r, 160));
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch { /* ignore */ }
}

// ─── Dynamic business card shape ─────────────────────────────────────────────

interface DynamicCard {
  id: number;
  slug: string;
  name: string;
  icon: string;
  color: string;
  logoUrl: string | null;
}

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
  const { person, setPerson } = usePerson();

  // Active card index for swipe/scroll
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  // Haptic heartbeat on mount
  useEffect(() => {
    const t = setTimeout(() => fireHeartbeatHaptic(), 400);
    return () => clearTimeout(t);
  }, []);

  // Prevent iOS rubber-band / overscroll on this screen
  useEffect(() => {
    const prevent = (e: TouchEvent) => e.preventDefault();
    document.body.style.overflow = "hidden";
    document.addEventListener("touchmove", prevent, { passive: false });
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("touchmove", prevent);
    };
  }, []);

  const accountId = Number(
    typeof window !== "undefined" ? localStorage.getItem("bcc_account_id") ?? "0" : "0"
  );

  // Load businesses from DB for this account
  const { data: dbBusinesses, isLoading: bizLoading } = trpc.business.list.useQuery(
    { accountId },
    { enabled: accountId > 0 }
  );

  // Fetch per-business notification counts (polls every 30s)
  const { data: countsData } = trpc.board.getBusinessCounts.useQuery(undefined, {
    refetchInterval: 30_000,
    enabled: !!person,
  });
  const counts = countsData?.counts ?? {};

  // Build dynamic cards from DB businesses
  const cards: DynamicCard[] = (dbBusinesses ?? []).map(biz => ({
    id: biz.id,
    slug: biz.slug,
    name: biz.name,
    icon: biz.icon ?? "🏢",
    color: biz.color ?? "#64748B",
    logoUrl: biz.logoUrl ?? null,
  }));

  // Redirect logic
  useEffect(() => {
    if (!person) {
      navigate("/login");
      return;
    }
    if (bizLoading) return;

    // No businesses → go to onboarding
    if (cards.length === 0) {
      navigate("/onboarding");
      return;
    }
    // Always show the selector — even with one business — so the user learns
    // to tap their card and sees the "Add a Business" option.
  }, [person, bizLoading, cards.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (card: DynamicCard) => {
    localStorage.setItem("bcc_active_business_slug", card.slug);
    localStorage.setItem("bcc_active_business_id", String(card.id));
    // Keep legacy key in sync for pages that still use it
    localStorage.setItem("bcc_active_business", card.slug === "chiropractic" ? "chiro" : card.slug);
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
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setDragOffset(e.clientX - dragStartX);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const threshold = 80;
    const totalCards = cards.length + 1; // +1 for Add Business
    if (dragOffset < -threshold && activeIndex < totalCards - 1) {
      setActiveIndex(i => i + 1);
    } else if (dragOffset > threshold && activeIndex > 0) {
      setActiveIndex(i => i - 1);
    }
    setDragOffset(0);
  };

  if (!person || bizLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(160deg, #0A1929 0%, #0F2440 50%, #0A1929 100%)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "rgba(51,162,219,0.4)", borderTopColor: "transparent" }}
          />
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (cards.length === 0) return null; // redirect handled in useEffect

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #0A1929 0%, #0F2440 50%, #0A1929 100%)",
        fontFamily: "'Inter', sans-serif",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Header — large beating heart + name + greeting */}
      <div className="flex flex-col items-center mb-4 px-4">
        <img
          src={HEART_SRC}
          alt="Business Cadence"
          style={{
            width: 120,
            height: 120,
            objectFit: "contain",
            animation: "bc-heartbeat 2.4s ease-in-out infinite",
            marginBottom: 6,
          }}
        />
        <style>{`
          @keyframes bc-heartbeat {
            0%   { transform: scale(1); }
            14%  { transform: scale(1.13); }
            28%  { transform: scale(1); }
            42%  { transform: scale(1.08); }
            56%  { transform: scale(1); }
            100% { transform: scale(1); }
          }
          @media (prefers-reduced-motion: reduce) {
            @keyframes bc-heartbeat { 0%, 100% { transform: scale(1); } }
          }
        `}</style>
        <h1
          className="text-base font-semibold text-white mt-3 mb-0"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Welcome back, {person.name.split(" ")[0]}
        </h1>
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
        {/* Business cards */}
        {cards.map((card, i) => {
          const offset = i - activeIndex;
          const isDragActive = isDragging && Math.abs(dragOffset) > 5;

          const baseX = offset * 320;
          const x = baseX + (isDragActive ? dragOffset : 0);
          const scale = offset === 0 ? 1 : 0.85;
          const opacity = Math.abs(offset) > 1 ? 0 : offset === 0 ? 1 : 0.55;
          const zIndex = offset === 0 ? 10 : 5;

          const cardCounts = counts[card.slug] ?? { tasks: 0, unseen: 0, total: 0 };

          // Generate a gradient from the card's accent color
          const hex = card.color;
          const bgGradient = `linear-gradient(135deg, #0A1929 0%, ${hex}22 40%, #0A1929 100%)`;

          return (
            <div
              key={card.id}
              onClick={() => {
                if (Math.abs(dragOffset) > 10) return;
                if (offset === 0) {
                  handleSelect(card);
                } else if (offset < 0) {
                  setActiveIndex(i => Math.max(0, i - 1));
                } else {
                  setActiveIndex(i => Math.min(cards.length, i + 1));
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
                  ? `0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px ${card.color}30, 0 0 60px ${card.color}15`
                  : "0 16px 40px rgba(0,0,0,0.4)",
              }}
            >
              {/* Card background */}
              <div className="absolute inset-0" style={{ background: bgGradient }} />

              {/* Accent glow top */}
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ backgroundColor: card.color, opacity: 0.9 }}
              />

              {/* Notification badge — top right */}
              <NotificationBadge
                tasks={cardCounts.tasks}
                unseen={cardCounts.unseen}
                accentColor={card.color}
              />

              {/* Logo or icon area */}
              <div
                className="absolute inset-x-0 flex items-center justify-center"
                style={{ top: "40px", height: "200px" }}
              >
                {card.logoUrl ? (
                  <img
                    src={card.logoUrl}
                    alt={card.name}
                    draggable={false}
                    style={{
                      maxWidth: "220px",
                      maxHeight: "180px",
                      objectFit: "contain",
                      userSelect: "none",
                    }}
                  />
                ) : (
                  <div
                    className="flex items-center justify-center rounded-2xl"
                    style={{
                      width: "100px",
                      height: "100px",
                      backgroundColor: `${card.color}20`,
                      border: `2px solid ${card.color}40`,
                      fontSize: "48px",
                    }}
                  >
                    {card.icon}
                  </div>
                )}
              </div>

              {/* Card content */}
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center text-center px-6 pb-8">
                <div
                  className="w-full h-px mb-5"
                  style={{ backgroundColor: `${card.color}30` }}
                />
                <h2
                  className="text-base font-bold text-white mb-1 leading-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {card.name}
                </h2>
                <p
                  className="text-[11px] mb-5"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  {card.icon} {card.slug}
                </p>

                {/* Enter button — only on active card */}
                {offset === 0 && (
                  <button
                    className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.97]"
                    style={{
                      backgroundColor: card.color,
                      color: "#0A1929",
                      boxShadow: `0 4px 20px ${card.color}40`,
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

        {/* + Add Business card */}
        {(() => {
          const addOffset = cards.length - activeIndex;
          const isDragActive = isDragging && Math.abs(dragOffset) > 5;
          const baseX = addOffset * 320;
          const x = baseX + (isDragActive ? dragOffset : 0);
          const scale = addOffset === 0 ? 1 : 0.85;
          const opacity = Math.abs(addOffset) > 1 ? 0 : addOffset === 0 ? 1 : 0.55;
          const zIndex = addOffset === 0 ? 10 : 5;
          return (
            <div
              key="add-business"
              onClick={() => {
                if (Math.abs(dragOffset) > 10) return;
                if (addOffset === 0) {
                  toast.info("Add Business coming soon! You'll be able to onboard a second business from here.");
                } else if (addOffset < 0) {
                  setActiveIndex(i => Math.max(0, i - 1));
                } else {
                  setActiveIndex(cards.length);
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
                boxShadow: addOffset === 0
                  ? "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)"
                  : "0 16px 40px rgba(0,0,0,0.4)",
                background: "rgba(255,255,255,0.03)",
                border: "2px dashed rgba(255,255,255,0.15)",
              }}
            >
              {/* Inner content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-8">
                {/* Plus icon circle */}
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: "72px",
                    height: "72px",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    border: "2px dashed rgba(255,255,255,0.2)",
                  }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
                <div className="text-center">
                  <h2
                    className="text-base font-bold mb-1"
                    style={{ color: "rgba(255,255,255,0.7)", fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Add a Business
                  </h2>
                  <p
                    className="text-[11px] leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  >
                    Run multiple businesses from one command center
                  </p>
                </div>
                {addOffset === 0 && (
                  <button
                    className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.97]"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "rgba(255,255,255,0.8)",
                    }}
                    onClick={e => {
                      e.stopPropagation();
                      toast.info("Add Business coming soon! You'll be able to onboard a second business from here.");
                    }}
                  >
                    + Add Business
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Dot indicators — includes the Add Business dot */}
      <div className="flex items-center gap-2 mt-6">
        {cards.map((card, i) => {
          const cardCounts = counts[card.slug] ?? { total: 0 };
          return (
            <button
              key={card.id}
              onClick={() => setActiveIndex(i)}
              className="relative transition-all duration-300"
              style={{
                width: i === activeIndex ? "24px" : "8px",
                height: "8px",
                borderRadius: "4px",
                backgroundColor: i === activeIndex
                  ? cards[activeIndex]?.color ?? "#33A2DB"
                  : "rgba(255,255,255,0.2)",
              }}
            >
              {/* Small dot indicator on inactive dots if they have notifications */}
              {i !== activeIndex && (cardCounts as any).total > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                  style={{ backgroundColor: "#EF4444" }}
                />
              )}
            </button>
          );
        })}
        {/* Add Business dot */}
        <button
          onClick={() => setActiveIndex(cards.length)}
          className="relative transition-all duration-300"
          style={{
            width: activeIndex === cards.length ? "24px" : "8px",
            height: "8px",
            borderRadius: "4px",
            backgroundColor: activeIndex === cards.length
              ? "rgba(255,255,255,0.5)"
              : "rgba(255,255,255,0.15)",
          }}
        />
      </div>

      {/* Swipe hint */}
      {cards.length > 0 && (
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
          try {
            clearAuth();
            localStorage.removeItem("bcc_person_v1");
            localStorage.removeItem("bcc_active_business_slug");
            localStorage.removeItem("bcc_active_business_id");
            localStorage.removeItem("bcc_active_business");
            localStorage.removeItem("bcc_account_id");
          } catch { /* ignore */ }
          setPerson(null);
          navigate("/login");
        }}
      >
        Sign out
      </button>
    </div>
  );
}
