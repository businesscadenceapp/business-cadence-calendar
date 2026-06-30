/**
 * Command Board — Shared Updates & Issues for Matt and Lynn
 * Matt = Blue (#3B82F6), Lynn = Pink (#EC4899)
 */
import { useState, useRef } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Author = "Matt" | "Lynn";
type CardType = "update" | "issue";
type Business = "chiropractic" | "crossfit" | "realty" | "general";

const AUTHOR_COLORS: Record<Author, { bg: string; border: string; text: string; badge: string; badgeText: string }> = {
  Matt: {
    bg: "rgba(59,130,246,0.08)",
    border: "rgba(59,130,246,0.30)",
    text: "#93C5FD",
    badge: "rgba(59,130,246,0.20)",
    badgeText: "#BFDBFE",
  },
  Lynn: {
    bg: "rgba(236,72,153,0.08)",
    border: "rgba(236,72,153,0.30)",
    text: "#F9A8D4",
    badge: "rgba(236,72,153,0.20)",
    badgeText: "#FBCFE8",
  },
};

const BUSINESS_LABELS: Record<Business, { label: string; icon: string; color: string }> = {
  chiropractic: { label: "Chiropractic", icon: "🦴", color: "#10B981" },
  crossfit:     { label: "CrossFit",     icon: "💪", color: "#F59E0B" },
  realty:       { label: "Realty",       icon: "🏠", color: "#8B5CF6" },
  general:      { label: "General",      icon: "📋", color: "#6B7280" },
};

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

type Card = {
  id: number;
  author: Author;
  type: CardType;
  business: Business;
  content: string;
  seenAt: Date | null;
  seenBy: Author | null;
  archivedAt: Date | null;
  createdAt: Date;
};

function BoardCard({ card, currentUser, onSeen, onArchive, onDelete }: {
  card: Card;
  currentUser: Author;
  onSeen: (id: number) => void;
  onArchive: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const colors = AUTHOR_COLORS[card.author];
  const biz = BUSINESS_LABELS[card.business];
  const isOwnCard = card.author === currentUser;
  const alreadySeen = !!card.seenAt;

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3 transition-all duration-200"
      style={{
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        opacity: alreadySeen ? 0.7 : 1,
      }}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Author badge */}
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: colors.badge, color: colors.badgeText, fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {card.author}
        </span>

        {/* Business tag */}
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
          style={{ backgroundColor: `${biz.color}18`, color: biz.color, fontFamily: "'Space Grotesk', sans-serif" }}
        >
          <span>{biz.icon}</span>
          {biz.label}
        </span>

        {/* Seen indicator */}
        {alreadySeen && (
          <span className="text-[10px] text-white/30 ml-auto flex items-center gap-1">
            <span style={{ color: "#22c55e" }}>✓</span> Seen by {card.seenBy}
          </span>
        )}
        {!alreadySeen && isOwnCard && (
          <span className="text-[10px] text-white/25 ml-auto italic">Awaiting {card.author === "Matt" ? "Lynn" : "Matt"}</span>
        )}

        {/* Timestamp */}
        <span
          className="text-[10px] text-white/25 ml-auto"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {timeAgo(card.createdAt)}
        </span>
      </div>

      {/* Content */}
      <p className="text-[13px] text-white/80 leading-relaxed">{card.content}</p>

      {/* Action row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Seen button — only shown to the OTHER person and only if not yet seen */}
        {!isOwnCard && !alreadySeen && (
          <button
            onClick={() => onSeen(card.id)}
            className="text-[11px] px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-90 flex items-center gap-1.5"
            style={{
              backgroundColor: "rgba(34,197,94,0.15)",
              border: "1px solid rgba(34,197,94,0.30)",
              color: "#86EFAC",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            ✓ Mark as Seen
          </button>
        )}

        {/* Archive button — available to both */}
        <button
          onClick={() => onArchive(card.id)}
          className="text-[11px] px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
          style={{
            backgroundColor: "oklch(1 0 0 / 5%)",
            border: "1px solid oklch(1 0 0 / 10%)",
            color: "rgba(255,255,255,0.35)",
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          Archive
        </button>

        {/* Delete — only own cards */}
        {isOwnCard && (
          <button
            onClick={() => onDelete(card.id)}
            className="text-[11px] px-2 py-1.5 rounded-lg transition-all hover:opacity-80 ml-auto"
            style={{
              color: "rgba(255,255,255,0.20)",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function AddCardForm({ onAdded }: { onAdded: () => void }) {
  const [author, setAuthor] = useState<Author | null>(null);
  const [type, setType] = useState<CardType>("update");
  const [business, setBusiness] = useState<Business>("general");
  const [content, setContent] = useState("");
  const textRef = useRef<HTMLTextAreaElement>(null);

  const createCard = trpc.board.create.useMutation({
    onSuccess: () => {
      setContent("");
      setAuthor(null);
      onAdded();
      toast.success("Card posted to the board");
    },
    onError: () => toast.error("Failed to post card"),
  });

  const handleSubmit = () => {
    if (!author) { toast.error("Please select who is posting"); return; }
    if (!content.trim()) { toast.error("Please write something"); return; }
    createCard.mutate({ author, type, business, content: content.trim() });
  };

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-4"
      style={{ backgroundColor: "oklch(0.17 0.022 240)", border: "1px solid oklch(1 0 0 / 10%)" }}
    >
      <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        + Post to Board
      </p>

      {/* Who is posting */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] text-white/30 uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Who is posting?</p>
        <div className="flex gap-2">
          {(["Matt", "Lynn"] as Author[]).map(a => {
            const c = AUTHOR_COLORS[a];
            const isActive = author === a;
            return (
              <button
                key={a}
                onClick={() => setAuthor(a)}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all"
                style={{
                  backgroundColor: isActive ? c.badge : "oklch(1 0 0 / 5%)",
                  border: `2px solid ${isActive ? c.border : "oklch(1 0 0 / 8%)"}`,
                  color: isActive ? c.text : "rgba(255,255,255,0.35)",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                {a}
              </button>
            );
          })}
        </div>
      </div>

      {/* Type */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] text-white/30 uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>What kind of post?</p>
        <div className="flex gap-2">
          <button
            onClick={() => setType("update")}
            className="flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all"
            style={{
              backgroundColor: type === "update" ? "rgba(16,185,129,0.15)" : "oklch(1 0 0 / 5%)",
              border: `1px solid ${type === "update" ? "rgba(16,185,129,0.35)" : "oklch(1 0 0 / 8%)"}`,
              color: type === "update" ? "#6EE7B7" : "rgba(255,255,255,0.35)",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            ✅ Update — What I did
          </button>
          <button
            onClick={() => setType("issue")}
            className="flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all"
            style={{
              backgroundColor: type === "issue" ? "rgba(251,191,36,0.12)" : "oklch(1 0 0 / 5%)",
              border: `1px solid ${type === "issue" ? "rgba(251,191,36,0.30)" : "oklch(1 0 0 / 8%)"}`,
              color: type === "issue" ? "#FDE68A" : "rgba(255,255,255,0.35)",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            💬 Issue — Need to discuss
          </button>
        </div>
      </div>

      {/* Business */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] text-white/30 uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Which business?</p>
        <div className="flex gap-1.5 flex-wrap">
          {(Object.entries(BUSINESS_LABELS) as [Business, typeof BUSINESS_LABELS[Business]][]).map(([key, biz]) => (
            <button
              key={key}
              onClick={() => setBusiness(key)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1"
              style={{
                backgroundColor: business === key ? `${biz.color}18` : "oklch(1 0 0 / 5%)",
                border: `1px solid ${business === key ? `${biz.color}40` : "oklch(1 0 0 / 8%)"}`,
                color: business === key ? biz.color : "rgba(255,255,255,0.35)",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              {biz.icon} {biz.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <textarea
        ref={textRef}
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={
                    type === "update"
            ? "What did you do? e.g. Built the business calendar website at 1am - it tracks all our meeting cadences."
            : "What do we need to discuss? e.g. CrossFit pricing structure needs a decision before July."
        }
        rows={3}
        className="w-full rounded-lg px-3 py-2.5 text-[12px] text-white/75 placeholder-white/20 resize-none focus:outline-none transition-colors"
        style={{
          backgroundColor: "oklch(1 0 0 / 5%)",
          border: "1px solid oklch(1 0 0 / 12%)",
          fontFamily: "'Inter', sans-serif",
          lineHeight: "1.6",
        }}
        onFocus={e => (e.target.style.borderColor = "oklch(1 0 0 / 25%)")}
        onBlur={e => (e.target.style.borderColor = "oklch(1 0 0 / 12%)")}
      />

      <button
        onClick={handleSubmit}
        disabled={createCard.isPending || !author || !content.trim()}
        className="w-full py-2.5 rounded-lg text-[12px] font-bold transition-all hover:opacity-90 disabled:opacity-40"
        style={{
          background: author
            ? `linear-gradient(135deg, ${AUTHOR_COLORS[author].badge}, ${AUTHOR_COLORS[author].bg})`
            : "oklch(1 0 0 / 8%)",
          border: `1px solid ${author ? AUTHOR_COLORS[author].border : "oklch(1 0 0 / 10%)"}`,
          color: author ? AUTHOR_COLORS[author].text : "rgba(255,255,255,0.30)",
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        {createCard.isPending ? "Posting…" : "Post to Board →"}
      </button>
    </div>
  );
}

export default function Board() {
  const [currentUser, setCurrentUser] = useState<Author | null>(null);
  const [filterBusiness, setFilterBusiness] = useState<Business | "all">("all");

  const { data, refetch, isLoading } = trpc.board.list.useQuery(undefined, {
    refetchInterval: 15_000, // auto-refresh every 15s
  });

  const markSeen = trpc.board.markSeen.useMutation({ onSuccess: () => refetch() });
  const archive = trpc.board.archive.useMutation({ onSuccess: () => refetch() });
  const deleteCard = trpc.board.delete.useMutation({ onSuccess: () => refetch() });

  const cards = (data?.cards ?? []) as Card[];

  const filtered = filterBusiness === "all"
    ? cards
    : cards.filter(c => c.business === filterBusiness);

  const updates = filtered.filter(c => c.type === "update");
  const issues = filtered.filter(c => c.type === "issue");

  const unseenCount = cards.filter(c =>
    !c.seenAt && currentUser && c.author !== currentUser
  ).length;

  // Require explicit viewer selection before any actions
  const effectiveUser = currentUser;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "oklch(0.13 0.025 240)", fontFamily: "'Inter', sans-serif" }}
    >
      {/* Header */}
      <header
        className="px-5 py-3.5 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: "1px solid oklch(1 0 0 / 8%)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
            style={{ background: "linear-gradient(135deg, #3B82F6 0%, #EC4899 100%)", boxShadow: "0 0 16px rgba(59,130,246,0.25)" }}
          >
            📋
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Command Board
            </h1>
            <p className="text-[11px] text-white/35 mt-0.5">Shared updates & issues between Matt and Lynn</p>
          </div>
        </div>

        {/* Who am I selector + back link */}
        <div className="flex items-center gap-3">
          <Link
            href="/app"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:opacity-80"
            style={{
              backgroundColor: "oklch(1 0 0 / 6%)",
              border: "1px solid oklch(1 0 0 / 10%)",
              color: "rgba(255,255,255,0.40)",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            ← Calendar
          </Link>
          <span className="text-[10px] text-white/30 mr-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Viewing as:</span>
          {(["Matt", "Lynn"] as Author[]).map(a => {
            const c = AUTHOR_COLORS[a];
            const isActive = currentUser === a;
            return (
              <button
                key={a}
                onClick={() => setCurrentUser(a)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                style={{
                  backgroundColor: isActive ? c.badge : "oklch(1 0 0 / 5%)",
                  border: `1px solid ${isActive ? c.border : "oklch(1 0 0 / 8%)"}`,
                  color: isActive ? c.text : "rgba(255,255,255,0.35)",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                {a}
                {isActive && unseenCount > 0 && (
                  <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#EF4444", color: "white" }}>
                    {unseenCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Add card form */}
        <aside
          className="w-80 flex-shrink-0 p-4 overflow-y-auto"
          style={{ borderRight: "1px solid oklch(1 0 0 / 8%)" }}
        >
          <AddCardForm onAdded={() => refetch()} />

          {/* Business filter */}
          <div className="mt-5 flex flex-col gap-2">
            <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest px-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Filter by Business
            </p>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setFilterBusiness("all")}
                className="text-left px-3 py-2 rounded-lg text-[11px] transition-all"
                style={{
                  backgroundColor: filterBusiness === "all" ? "oklch(1 0 0 / 10%)" : "transparent",
                  color: filterBusiness === "all" ? "rgba(255,255,255,0.80)" : "rgba(255,255,255,0.35)",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                📋 All Businesses
              </button>
              {(Object.entries(BUSINESS_LABELS) as [Business, typeof BUSINESS_LABELS[Business]][]).map(([key, biz]) => (
                <button
                  key={key}
                  onClick={() => setFilterBusiness(key)}
                  className="text-left px-3 py-2 rounded-lg text-[11px] transition-all"
                  style={{
                    backgroundColor: filterBusiness === key ? `${biz.color}15` : "transparent",
                    color: filterBusiness === key ? biz.color : "rgba(255,255,255,0.35)",
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  {biz.icon} {biz.label}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-5 rounded-xl p-3.5" style={{ backgroundColor: "oklch(0.17 0.022 240)", border: "1px solid oklch(1 0 0 / 8%)" }}>
            <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Color Key</p>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: "#3B82F6" }} />
                <span className="text-[11px] text-white/55">Matt's posts</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: "#EC4899" }} />
                <span className="text-[11px] text-white/55">Lynn's posts</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px]" style={{ color: "#22c55e" }}>✓</span>
                <span className="text-[11px] text-white/55">Seen & acknowledged</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main board */}
        <main className="flex-1 overflow-y-auto p-5">
          {/* Viewer prompt banner */}
          {!currentUser && (
            <div
              className="rounded-xl p-4 mb-4 flex items-center gap-3"
              style={{ backgroundColor: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)" }}
            >
              <span className="text-lg">👆</span>
              <p className="text-[12px] text-amber-200/70">
                Select <strong className="text-amber-200">who you are</strong> in the top-right corner before marking cards as seen or taking any actions.
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <span className="text-white/30 text-sm animate-pulse">Loading board…</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Updates column */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">✅</span>
                  <h2 className="text-sm font-bold text-white/80" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Updates
                  </h2>
                  <span className="text-[10px] text-white/25 ml-1">— What I did since last meeting</span>
                  <span
                    className="ml-auto text-[10px] px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "oklch(1 0 0 / 8%)", color: "rgba(255,255,255,0.40)", fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {updates.length}
                  </span>
                </div>
                {updates.length === 0 ? (
                  <div
                    className="rounded-xl p-6 text-center"
                    style={{ backgroundColor: "oklch(0.17 0.022 240)", border: "1px dashed oklch(1 0 0 / 10%)" }}
                  >
                    <p className="text-[12px] text-white/25">No updates yet. Post something you have done since the last meeting.</p>
                  </div>
                ) : (
                  updates.map(card => (
                    <BoardCard
                      key={card.id}
                      card={card}
                      currentUser={currentUser ?? card.author}
                      onSeen={id => currentUser && markSeen.mutate({ id, seenBy: currentUser })}
                      onArchive={id => archive.mutate({ id })}
                      onDelete={id => deleteCard.mutate({ id })}
                    />
                  ))
                )}
              </div>

              {/* Issues column */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">💬</span>
                  <h2 className="text-sm font-bold text-white/80" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Issues
                  </h2>
                  <span className="text-[10px] text-white/25 ml-1">— What we need to discuss</span>
                  <span
                    className="ml-auto text-[10px] px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "oklch(1 0 0 / 8%)", color: "rgba(255,255,255,0.40)", fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {issues.length}
                  </span>
                </div>
                {issues.length === 0 ? (
                  <div
                    className="rounded-xl p-6 text-center"
                    style={{ backgroundColor: "oklch(0.17 0.022 240)", border: "1px dashed oklch(1 0 0 / 10%)" }}
                  >
                    <p className="text-[12px] text-white/25">No issues queued. Add topics you need to discuss at the next meeting.</p>
                  </div>
                ) : (
                  issues.map(card => (
                    <BoardCard
                      key={card.id}
                      card={card}
                      currentUser={currentUser ?? card.author}
                      onSeen={id => currentUser && markSeen.mutate({ id, seenBy: currentUser })}
                      onArchive={id => archive.mutate({ id })}
                      onDelete={id => deleteCard.mutate({ id })}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
