/**
 * DemoBoard — read-only demo tour of the BusinessCadence Board.
 * Uses hardcoded sample data so no auth or server calls are needed.
 * Accessible at /demo from WaitingForPartner "Take a tour" button.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

// ─── Types (mirrors Board.tsx Card type) ─────────────────────────────────────
type CardType = "update" | "issue" | "task";
type CategoryKey = "tasks" | "updates" | "issues";

interface DemoCard {
  id: number;
  author: string;
  type: CardType;
  content: string;
  assignedTo: string | null;
  completedAt: Date | null;
  confirmedAt: Date | null;
  createdAt: Date;
}

// ─── Sample Data ──────────────────────────────────────────────────────────────
const SAMPLE_CARDS: DemoCard[] = [
  { id: 1, author: "Alex", type: "task", content: "Order new signage for the front window — need it before the weekend rush", assignedTo: "Jordan", completedAt: null, confirmedAt: null, createdAt: new Date(Date.now() - 2 * 3600000) },
  { id: 2, author: "Jordan", type: "task", content: "Follow up with the accountant about Q3 taxes", assignedTo: "Alex", completedAt: new Date(Date.now() - 3600000), confirmedAt: null, createdAt: new Date(Date.now() - 5 * 3600000) },
  { id: 3, author: "Alex", type: "update", content: "We hit 42 new clients this month! Best month since we opened 🎉", assignedTo: null, completedAt: null, confirmedAt: null, createdAt: new Date(Date.now() - 1 * 3600000) },
  { id: 4, author: "Jordan", type: "update", content: "Renegotiated the lease — saving $400/month starting January", assignedTo: null, completedAt: null, confirmedAt: null, createdAt: new Date(Date.now() - 4 * 3600000) },
  { id: 5, author: "Jordan", type: "issue", content: "Supplier raised prices 12% — need to decide: absorb it or adjust our pricing", assignedTo: null, completedAt: null, confirmedAt: null, createdAt: new Date(Date.now() - 6 * 3600000) },
  { id: 6, author: "Alex", type: "issue", content: "Two staff members keep calling in sick on Fridays — need to address this at the weekly", assignedTo: null, completedAt: null, confirmedAt: null, createdAt: new Date(Date.now() - 8 * 3600000) },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const PALETTE = [
  { bg: "rgba(37,99,235,0.12)", border: "rgba(37,99,235,0.35)", badgeBg: "rgba(37,99,235,0.2)", badgeText: "#93C5FD", dot: "#3B82F6" },
  { bg: "rgba(225,29,72,0.12)", border: "rgba(225,29,72,0.35)", badgeBg: "rgba(225,29,72,0.2)", badgeText: "#FDA4AF", dot: "#E11D48" },
  { bg: "rgba(5,150,105,0.12)", border: "rgba(5,150,105,0.35)", badgeBg: "rgba(5,150,105,0.2)", badgeText: "#6EE7B7", dot: "#059669" },
];

function authorColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

const CATEGORIES: { key: CategoryKey; label: string; icon: string; gradient: string; border: string; glow: string; textColor: string }[] = [
  { key: "tasks", label: "Tasks", icon: "☑", gradient: "linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(124,58,237,0.06) 100%)", border: "rgba(124,58,237,0.3)", glow: "rgba(124,58,237,0.12)", textColor: "#C4B5FD" },
  { key: "updates", label: "Updates", icon: "✅", gradient: "linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(37,99,235,0.06) 100%)", border: "rgba(37,99,235,0.3)", glow: "rgba(37,99,235,0.12)", textColor: "#93C5FD" },
  { key: "issues", label: "Issues", icon: "🔥", gradient: "linear-gradient(135deg, rgba(225,29,72,0.15) 0%, rgba(225,29,72,0.06) 100%)", border: "rgba(225,29,72,0.3)", glow: "rgba(225,29,72,0.12)", textColor: "#FDA4AF" },
];

// ─── Demo Banner ─────────────────────────────────────────────────────────────
function DemoBanner({ onExit }: { onExit: () => void }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
      style={{
        background: "linear-gradient(90deg, rgba(245,158,11,0.18) 0%, rgba(217,119,6,0.12) 100%)",
        borderBottom: "1px solid rgba(245,158,11,0.3)",
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm">🔍</span>
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#FCD34D", fontFamily: "'Space Grotesk', sans-serif" }}>
          Demo Mode — Sample Data
        </span>
      </div>
      <button
        onClick={onExit}
        className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95"
        style={{
          backgroundColor: "rgba(245,158,11,0.2)",
          border: "1px solid rgba(245,158,11,0.4)",
          color: "#FCD34D",
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        Exit Tour →
      </button>
    </div>
  );
}

// ─── Card Components ──────────────────────────────────────────────────────────
function DemoCardItem({ card }: { card: DemoCard }) {
  const colors = authorColor(card.author);
  const demoToast = () => toast("This is a demo — set up your business to save real data", { icon: "🔍", duration: 2500 });

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-2.5"
      style={{
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
      }}
    >
      {/* Author + time */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: colors.badgeBg, color: colors.badgeText }}>
            {card.author[0]}
          </div>
          <span className="text-[12px] font-semibold" style={{ color: colors.badgeText, fontFamily: "'Space Grotesk', sans-serif" }}>
            {card.author}
          </span>
        </div>
        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{timeAgo(card.createdAt)}</span>
      </div>

      {/* Content */}
      <p className="text-[13px] text-white/85 leading-relaxed">{card.content}</p>

      {/* Task-specific: assigned to + status */}
      {card.type === "task" && card.assignedTo && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
            → {card.assignedTo}
          </span>
          {card.completedAt && !card.confirmedAt && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "rgba(252,211,77,0.15)", color: "#FCD34D" }}>
              ⏳ Done — awaiting confirmation
            </span>
          )}
        </div>
      )}

      {/* Action buttons (disabled in demo) */}
      <div className="flex gap-2 pt-0.5">
        {card.type === "task" && !card.completedAt && (
          <button onClick={demoToast} className="text-[11px] px-3 py-1.5 rounded-lg font-medium transition-all active:scale-95" style={{ backgroundColor: "rgba(94,234,212,0.1)", color: "#5EEAD4", border: "1px solid rgba(94,234,212,0.2)" }}>
            Mark Done
          </button>
        )}
        {card.type === "task" && card.completedAt && !card.confirmedAt && (
          <button onClick={demoToast} className="text-[11px] px-3 py-1.5 rounded-lg font-medium transition-all active:scale-95" style={{ backgroundColor: "rgba(252,211,77,0.1)", color: "#FCD34D", border: "1px solid rgba(252,211,77,0.2)" }}>
            Confirm Done
          </button>
        )}
        {(card.type === "update" || card.type === "issue") && (
          <button onClick={demoToast} className="text-[11px] px-3 py-1.5 rounded-lg font-medium transition-all active:scale-95" style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)" }}>
            Archive
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Category Tile (circular hub node) ───────────────────────────────────────
type DemoTileMeta = { key: string; label: string; icon: string; gradient: string; border: string; glow: string; textColor: string };
function DemoCategoryTile({ cat, count, onClick, delay, size = 76 }: { cat: DemoTileMeta; count: number; onClick: () => void; delay: number; size?: number }) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center gap-1.5 transition-all active:scale-[0.92] hover:scale-[1.06]"
      style={{
        animation: `hubNodeEnter 0.45s cubic-bezier(0.23,1,0.32,1) ${delay}ms both`,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div
        style={{
          width: size, height: size, borderRadius: "50%",
          background: cat.gradient,
          border: `2px solid ${cat.border}`,
          boxShadow: `0 0 18px ${cat.glow}, 0 4px 16px rgba(0,0,0,0.35)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative", flexShrink: 0,
        }}
      >
        <span style={{ fontSize: size * 0.36 }}>{cat.icon}</span>
        {count > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-black"
            style={{ backgroundColor: "rgba(255,255,255,0.12)", color: cat.textColor, border: `1.5px solid ${cat.border}`, fontFamily: "'Space Grotesk', sans-serif", padding: "0 5px" }}
          >{count}</span>
        )}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-center leading-tight" style={{ color: cat.textColor, fontFamily: "'Space Grotesk', sans-serif", maxWidth: size + 12 }}>{cat.label}</span>
    </button>
  );
}

// ─── Main Demo Page ───────────────────────────────────────────────────────────
export default function DemoBoard() {
  const [, navigate] = useLocation();
  const [activeView, setActiveView] = useState<CategoryKey | "needs_attention" | null>(null);
  const [needsAttnSection, setNeedsAttnSection] = useState<"tasks" | "issues">("tasks");

  const tasks = SAMPLE_CARDS.filter(c => c.type === "task");
  const updates = SAMPLE_CARDS.filter(c => c.type === "update");
  const issues = SAMPLE_CARDS.filter(c => c.type === "issue");

  const counts = { tasks: tasks.length, updates: updates.length, issues: issues.length };

  const demoToast = () => toast("This is a demo — set up your business to save real data", { icon: "🔍", duration: 2500 });

  const handleExit = () => {
    navigate("/waiting-for-partner");
  };

  const activeCards = activeView === "tasks" ? tasks : activeView === "updates" ? updates : issues;
  const isNeedsAttn = activeView === "needs_attention";

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ backgroundColor: "#0A1929", fontFamily: "'Inter', sans-serif" }}
    >
      {/* Demo Banner */}
      <DemoBanner onExit={handleExit} />

      {/* Sub-card view */}
      {activeView ? (
        <div className="flex flex-col flex-1">
          {/* Sub-header */}
          <div
            className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <button
              onClick={() => { setActiveView(null); setNeedsAttnSection("tasks"); }}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-95"
              style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}
            >←</button>
            <span className="text-[16px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {isNeedsAttn ? "❗ Needs Attention" : `${CATEGORIES.find(c => c.key === activeView)?.icon} ${CATEGORIES.find(c => c.key === activeView)?.label}`}
            </span>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#FCD34D", border: "1px solid rgba(245,158,11,0.25)" }}>SAMPLE</span>
          </div>

          {/* Cards */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
            {isNeedsAttn ? (
              <>
                {tasks.length === 0 && issues.length === 0 ? (
                  <div className="text-center py-10" style={{ color: "rgba(255,255,255,0.35)" }}>
                    <div className="text-3xl mb-2">✅</div>
                    <p className="text-sm">Nothing needs attention</p>
                  </div>
                ) : (
                  <>
                    {tasks.length > 0 && (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-widest px-1 mb-2" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'Space Grotesk', sans-serif" }}>☑ Open Tasks ({tasks.length})</p>
                        {tasks.map(card => <DemoCardItem key={card.id} card={card} />)}
                      </>
                    )}
                    {issues.length > 0 && (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-widest px-1 mb-2 mt-4" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'Space Grotesk', sans-serif" }}>🔥 Issues ({issues.length})</p>
                        {issues.map(card => <DemoCardItem key={card.id} card={card} />)}
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              activeCards.map(card => (
                <DemoCardItem key={card.id} card={card} />
              ))
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Hero */}
          <div
            className="flex-shrink-0 px-5 pt-4 pb-4"
            style={{
              background: "linear-gradient(160deg, #0D2035 0%, #0F2440 40%, #0D1F38 100%)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "240px", height: "240px", background: "radial-gradient(circle, rgba(94,234,212,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div className="flex items-center gap-2.5 mb-2">
              <div style={{ width: 36, height: 36, borderRadius: "12px", background: "linear-gradient(135deg, rgba(94,234,212,0.2) 0%, rgba(94,234,212,0.08) 100%)", border: "1px solid rgba(94,234,212,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>⚡</div>
              <span className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: "#5EEAD4", fontFamily: "'Space Grotesk', sans-serif" }}>Command Center</span>
            </div>
            <h1 className="text-[22px] font-black text-white leading-tight mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
              Your Business,<br />
              <span style={{ background: "linear-gradient(90deg, #5EEAD4, #A78BFA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>In Sync.</span>
            </h1>
            <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.45)", lineHeight: "1.4" }}>
              Real-time updates between owners — no more missed conversations.
            </p>
          </div>

          {/* Radial Hub Layout */}
          <div className="flex-1 px-5 py-3 flex items-center justify-center">
            <div
              className="relative flex items-center justify-center"
              style={{ width: "100%", aspectRatio: "1 / 1", maxWidth: 340, margin: "0 auto" }}
            >
              {/* Connector lines */}
              <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} viewBox="0 0 340 340">
                {[
                  { angle: -90 },
                  { angle: -30 },
                  { angle: 30 },
                  { angle: 90 },
                  { angle: 150 },
                  { angle: 210 },
                ].map(({ angle }, i) => {
                  const rad = (angle * Math.PI) / 180;
                  const r = 112;
                  const x = 170 + r * Math.cos(rad);
                  const y = 170 + r * Math.sin(rad);
                  return <line key={i} x1="170" y1="170" x2={x} y2={y} stroke="rgba(94,234,212,0.12)" strokeWidth="1.5" strokeDasharray="4 4" />;
                })}
              </svg>

              {/* Center hub */}
              <div
                style={{
                  position: "absolute", left: "50%", top: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 68, height: 68, borderRadius: "50%",
                  background: "linear-gradient(135deg, rgba(94,234,212,0.22) 0%, rgba(94,234,212,0.08) 100%)",
                  border: "2px solid rgba(94,234,212,0.45)",
                  boxShadow: "0 0 32px rgba(94,234,212,0.25), 0 0 8px rgba(94,234,212,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  zIndex: 2, animation: "hubCenterPulse 3s ease-in-out infinite",
                }}
              >
                <span style={{ fontSize: 26 }}>⚡</span>
              </div>

              {/* Orbit nodes */}
              {[
                { cat: CATEGORIES[0], count: counts.tasks, angle: -90, onClick: () => setActiveView("tasks") },
                { cat: CATEGORIES[1], count: counts.updates, angle: -30, onClick: () => setActiveView("updates") },
                { cat: CATEGORIES[2], count: counts.issues, angle: 30, onClick: () => setActiveView("issues") },
                { cat: { key: "needs_attention", label: "Needs Attention", icon: "❗", gradient: "linear-gradient(135deg, rgba(251,191,36,0.18) 0%, rgba(251,191,36,0.07) 100%)", border: "rgba(251,191,36,0.38)", glow: "rgba(251,191,36,0.14)", textColor: "#FDE68A" }, count: counts.tasks + counts.issues, angle: 90, onClick: () => { setNeedsAttnSection(counts.tasks > 0 ? "tasks" : "issues"); setActiveView("needs_attention"); } },
                { cat: { key: "calendar", label: "Calendar", icon: "📅", gradient: "linear-gradient(135deg, rgba(20,184,166,0.18) 0%, rgba(20,184,166,0.07) 100%)", border: "rgba(20,184,166,0.35)", glow: "rgba(20,184,166,0.14)", textColor: "#5EEAD4" }, count: -1, angle: 150, onClick: demoToast },
                { cat: { key: "archive", label: "Archive", icon: "📁", gradient: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)", border: "rgba(255,255,255,0.15)", glow: "rgba(255,255,255,0.05)", textColor: "rgba(255,255,255,0.7)" }, count: 0, angle: 210, onClick: demoToast },
              ].map(({ cat, count, angle, onClick }, i) => {
                const rad = (angle * Math.PI) / 180;
                const r = 112;
                const cx = 50 + (r / 340) * 100 * Math.cos(rad);
                const cy = 50 + (r / 340) * 100 * Math.sin(rad);
                return (
                  <div key={cat.key} style={{ position: "absolute", left: `${cx}%`, top: `${cy}%`, transform: "translate(-50%, -50%)", zIndex: 3 }}>
                    <DemoCategoryTile cat={cat} count={count} onClick={onClick} delay={i * 70} size={72} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* FAB (disabled in demo) */}
          <button
            onClick={demoToast}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold transition-all active:scale-[0.9] hover:scale-[1.05] z-40"
            style={{
              background: "linear-gradient(135deg, #5EEAD4, #38BDF8)",
              color: "#0F2440",
              boxShadow: "0 6px 24px rgba(94,234,212,0.4), 0 2px 8px rgba(0,0,0,0.3)",
            }}
          >+</button>
        </>
      )}

      {/* Bottom nav bar (demo — non-functional) */}
      <div
        className="fixed bottom-0 left-0 right-0 flex items-center justify-around px-2 z-30"
        style={{
          backgroundColor: "#0A1929",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          height: "64px",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {[
          { icon: "📋", label: "Board", active: true },
          { icon: "🎯", label: "Goals", active: false },
          { icon: "📈", label: "KPIs", active: false },
          { icon: "📅", label: "Calendar", active: false },
        ].map(item => (
          <button
            key={item.label}
            onClick={demoToast}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all active:scale-95"
            style={{ minWidth: "56px" }}
          >
            <span className="text-[18px]">{item.icon}</span>
            <span className="text-[10px] font-semibold" style={{ color: item.active ? "#5EEAD4" : "rgba(255,255,255,0.35)", fontFamily: "'Space Grotesk', sans-serif" }}>
              {item.label}
            </span>
          </button>
        ))}
      </div>

      <style>{`
        @keyframes hubNodeEnter {
          from { opacity: 0; transform: scale(0.6); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes hubCenterPulse {
          0%, 100% { box-shadow: 0 0 32px rgba(94,234,212,0.25), 0 0 8px rgba(94,234,212,0.15); }
          50% { box-shadow: 0 0 48px rgba(94,234,212,0.4), 0 0 16px rgba(94,234,212,0.25); }
        }
        @keyframes tileEnter {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
