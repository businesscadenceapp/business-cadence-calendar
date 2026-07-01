/**
 * Command Board — Shared Updates, Issues & Tasks for Matt and Lynn
 * Matt = Blue (#3B82F6), Lynn = Pink (#EC4899)
 *
 * Identity is persisted in localStorage so you only pick once per device.
 * Tasks use a two-step completion flow:
 *   1. Doer marks done → moves to "Done — Awaiting Confirmation"
 *   2. Requester confirms → archived (collapsed "Completed" section)
 */
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Author = "Matt" | "Lynn";
type CardType = "update" | "issue" | "task";
type Business = "chiropractic" | "crossfit" | "realty" | "general";

const IDENTITY_KEY = "bcc_identity";

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
  assignedTo: Author | null;
  completedAt: Date | null;
  completedBy: Author | null;
  confirmedAt: Date | null;
  confirmedBy: Author | null;
  seenAt: Date | null;
  seenBy: Author | null;
  archivedAt: Date | null;
  createdAt: Date;
};

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ card, currentUser, onMarkDone, onConfirmDone, onDelete }: {
  card: Card;
  currentUser: Author | null;
  onMarkDone: (id: number) => void;
  onConfirmDone: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const authorColors = AUTHOR_COLORS[card.author];
  const biz = BUSINESS_LABELS[card.business];
  const isDoer = currentUser === card.assignedTo;
  const isRequester = currentUser === card.author;
  const isDone = !!card.completedAt;
  const isConfirmed = !!card.confirmedAt;

  // Task state
  const taskState: "open" | "done_pending" | "confirmed" = isConfirmed
    ? "confirmed"
    : isDone
    ? "done_pending"
    : "open";

  const stateStyles = {
    open: { bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.22)" },
    done_pending: { bg: "rgba(251,191,36,0.07)", border: "rgba(251,191,36,0.28)" },
    confirmed: { bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.22)" },
  };

  const style = stateStyles[taskState];

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3 transition-all duration-200"
      style={{ backgroundColor: style.bg, border: `1px solid ${style.border}` }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Task badge */}
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
          style={{ backgroundColor: "rgba(139,92,246,0.18)", color: "#C4B5FD", fontFamily: "'Space Grotesk', sans-serif" }}
        >
          ☑ Task
        </span>

        {/* Author badge */}
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: authorColors.badge, color: authorColors.badgeText, fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {card.author}
        </span>

        {/* Assigned to */}
        {card.assignedTo && (
          <span className="text-[10px] text-white/40 flex items-center gap-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            → <span style={{ color: AUTHOR_COLORS[card.assignedTo].text }}>{card.assignedTo}</span>
          </span>
        )}

        {/* Business tag */}
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
          style={{ backgroundColor: `${biz.color}18`, color: biz.color, fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {biz.icon} {biz.label}
        </span>

        {/* State badge */}
        {taskState === "done_pending" && (
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ backgroundColor: "rgba(251,191,36,0.15)", color: "#FDE68A", fontFamily: "'Space Grotesk', sans-serif" }}>
            ⏳ Done — Awaiting Confirmation
          </span>
        )}
        {taskState === "confirmed" && (
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "#86EFAC", fontFamily: "'Space Grotesk', sans-serif" }}>
            ✓ Confirmed Done
          </span>
        )}

        {/* Timestamp */}
        <span
          className={`text-[10px] text-white/25 ${taskState === "open" ? "ml-auto" : ""}`}
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {timeAgo(card.createdAt)}
        </span>
      </div>

      {/* Content */}
      <p className="text-[13px] text-white/80 leading-relaxed">{card.content}</p>

      {/* Completion trail */}
      {isDone && (
        <p className="text-[11px] text-white/35 italic">
          Marked done by <span style={{ color: card.completedBy ? AUTHOR_COLORS[card.completedBy].text : "white" }}>{card.completedBy}</span> · {timeAgo(card.completedAt!)}
        </p>
      )}

      {/* Action row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Doer: mark done (only if open and this is the assigned person) */}
        {taskState === "open" && isDoer && (
          <button
            onClick={() => onMarkDone(card.id)}
            className="text-[11px] px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-90 flex items-center gap-1.5"
            style={{
              backgroundColor: "rgba(34,197,94,0.15)",
              border: "1px solid rgba(34,197,94,0.30)",
              color: "#86EFAC",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            ☑ Mark as Done
          </button>
        )}

        {/* Requester: confirm done (only if done_pending and this is the requester) */}
        {taskState === "done_pending" && isRequester && (
          <button
            onClick={() => onConfirmDone(card.id)}
            className="text-[11px] px-3 py-1.5 rounded-lg font-bold transition-all hover:opacity-90 flex items-center gap-1.5"
            style={{
              backgroundColor: "rgba(34,197,94,0.20)",
              border: "1px solid rgba(34,197,94,0.40)",
              color: "#4ADE80",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            ✓ Confirm Done
          </button>
        )}

        {/* Waiting message */}
        {taskState === "open" && !isDoer && currentUser && (
          <span className="text-[11px] text-white/25 italic">
            Waiting for {card.assignedTo ?? "assignee"} to complete
          </span>
        )}
        {taskState === "done_pending" && !isRequester && currentUser && (
          <span className="text-[11px] text-white/25 italic">
            Waiting for {card.author} to confirm
          </span>
        )}

        {/* Delete — only own cards */}
        {card.author === currentUser && (
          <button
            onClick={() => onDelete(card.id)}
            className="text-[11px] px-2 py-1.5 rounded-lg transition-all hover:opacity-80 ml-auto"
            style={{ color: "rgba(255,255,255,0.20)", fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Update / Issue Card ──────────────────────────────────────────────────────

function BoardCard({ card, currentUser, onSeen, onArchive, onDelete }: {
  card: Card;
  currentUser: Author | null;
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
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: colors.badge, color: colors.badgeText, fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {card.author}
        </span>
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
          style={{ backgroundColor: `${biz.color}18`, color: biz.color, fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {biz.icon} {biz.label}
        </span>
        {alreadySeen && (
          <span className="text-[10px] text-white/30 ml-auto flex items-center gap-1">
            <span style={{ color: "#22c55e" }}>✓</span> Seen by {card.seenBy}
          </span>
        )}
        {!alreadySeen && isOwnCard && (
          <span className="text-[10px] text-white/25 ml-auto italic">Awaiting {card.author === "Matt" ? "Lynn" : "Matt"}</span>
        )}
        <span className="text-[10px] text-white/25 ml-auto" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {timeAgo(card.createdAt)}
        </span>
      </div>

      <p className="text-[13px] text-white/80 leading-relaxed">{card.content}</p>

      <div className="flex items-center gap-2 flex-wrap">
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
        {isOwnCard && (
          <button
            onClick={() => onDelete(card.id)}
            className="text-[11px] px-2 py-1.5 rounded-lg transition-all hover:opacity-80 ml-auto"
            style={{ color: "rgba(255,255,255,0.20)", fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Add Card Form ────────────────────────────────────────────────────────────

function AddCardForm({ currentUser, onAdded }: { currentUser: Author | null; onAdded: () => void }) {
  const [type, setType] = useState<CardType>("update");
  const [business, setBusiness] = useState<Business>("general");
  const [content, setContent] = useState("");
  const [assignedTo, setAssignedTo] = useState<Author | null>(null);

  const createCard = trpc.board.create.useMutation({
    onSuccess: () => {
      setContent("");
      setAssignedTo(null);
      onAdded();
      toast.success("Posted to the board");
    },
    onError: () => toast.error("Failed to post card"),
  });

  const handleSubmit = () => {
    if (!currentUser) { toast.error("Select who you are first (top right)"); return; }
    if (!content.trim()) { toast.error("Please write something"); return; }
    if (type === "task" && !assignedTo) { toast.error("Please select who this task is assigned to"); return; }
    createCard.mutate({
      author: currentUser,
      type,
      business,
      content: content.trim(),
      ...(type === "task" && assignedTo ? { assignedTo } : {}),
    });
  };

  const other = currentUser === "Matt" ? "Lynn" : "Matt";

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-4"
      style={{ backgroundColor: "oklch(0.17 0.022 240)", border: "1px solid oklch(1 0 0 / 10%)" }}
    >
      <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        + Post to Board
      </p>

      {/* Type selector */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] text-white/30 uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>What kind of post?</p>
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => setType("update")}
            className="w-full py-2 rounded-lg text-[11px] font-semibold transition-all text-left px-3"
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
            className="w-full py-2 rounded-lg text-[11px] font-semibold transition-all text-left px-3"
            style={{
              backgroundColor: type === "issue" ? "rgba(251,191,36,0.12)" : "oklch(1 0 0 / 5%)",
              border: `1px solid ${type === "issue" ? "rgba(251,191,36,0.30)" : "oklch(1 0 0 / 8%)"}`,
              color: type === "issue" ? "#FDE68A" : "rgba(255,255,255,0.35)",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            💬 Issue — Need to discuss
          </button>
          <button
            onClick={() => setType("task")}
            className="w-full py-2 rounded-lg text-[11px] font-semibold transition-all text-left px-3"
            style={{
              backgroundColor: type === "task" ? "rgba(139,92,246,0.15)" : "oklch(1 0 0 / 5%)",
              border: `1px solid ${type === "task" ? "rgba(139,92,246,0.35)" : "oklch(1 0 0 / 8%)"}`,
              color: type === "task" ? "#C4B5FD" : "rgba(255,255,255,0.35)",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            ☑ Task — Assign to someone
          </button>
        </div>
      </div>

      {/* Assign to (only for tasks) */}
      {type === "task" && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] text-white/30 uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Assign to:</p>
          <div className="flex gap-2">
            {(["Matt", "Lynn"] as Author[]).map(a => {
              const c = AUTHOR_COLORS[a];
              const isActive = assignedTo === a;
              const isSelf = a === currentUser;
              return (
                <button
                  key={a}
                  onClick={() => setAssignedTo(a)}
                  className="flex-1 py-2 rounded-lg text-[11px] font-bold transition-all"
                  style={{
                    backgroundColor: isActive ? c.badge : "oklch(1 0 0 / 5%)",
                    border: `2px solid ${isActive ? c.border : "oklch(1 0 0 / 8%)"}`,
                    color: isActive ? c.text : "rgba(255,255,255,0.35)",
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  {a}{isSelf ? " (me)" : ""}
                </button>
              );
            })}
          </div>
        </div>
      )}

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
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={
          type === "update"
            ? "What did you do since the last meeting?"
            : type === "issue"
            ? "What do we need to discuss at the next meeting?"
            : assignedTo
            ? `What needs to be done by ${assignedTo}?`
            : "Describe the task…"
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
        disabled={createCard.isPending || !currentUser || !content.trim() || (type === "task" && !assignedTo)}
        className="w-full py-2.5 rounded-lg text-[12px] font-bold transition-all hover:opacity-90 disabled:opacity-40"
        style={{
          background: currentUser
            ? `linear-gradient(135deg, ${AUTHOR_COLORS[currentUser].badge}, ${AUTHOR_COLORS[currentUser].bg})`
            : "oklch(1 0 0 / 8%)",
          border: `1px solid ${currentUser ? AUTHOR_COLORS[currentUser].border : "oklch(1 0 0 / 10%)"}`,
          color: currentUser ? AUTHOR_COLORS[currentUser].text : "rgba(255,255,255,0.30)",
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        {createCard.isPending ? "Posting…" : "Post to Board →"}
      </button>
    </div>
  );
}

// ─── Main Board Page ──────────────────────────────────────────────────────────

export default function Board() {
  // Persist identity in localStorage — set once per device
  const [currentUser, setCurrentUser] = useState<Author | null>(() => {
    const saved = localStorage.getItem(IDENTITY_KEY);
    return (saved === "Matt" || saved === "Lynn") ? saved : null;
  });
  const [filterBusiness, setFilterBusiness] = useState<Business | "all">("all");
  const [showCompleted, setShowCompleted] = useState(false);

  // Persist identity changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(IDENTITY_KEY, currentUser);
    }
  }, [currentUser]);

  const { data, refetch, isLoading } = trpc.board.list.useQuery(undefined, {
    refetchInterval: 15_000,
  });

  const markSeen = trpc.board.markSeen.useMutation({ onSuccess: () => refetch() });
  const archive = trpc.board.archive.useMutation({ onSuccess: () => refetch() });
  const deleteCard = trpc.board.delete.useMutation({ onSuccess: () => refetch() });
  const markDone = trpc.board.markDone.useMutation({
    onSuccess: () => { refetch(); toast.success("Task marked as done — waiting for confirmation"); },
    onError: () => toast.error("Failed to mark task done"),
  });
  const confirmDone = trpc.board.confirmDone.useMutation({
    onSuccess: () => { refetch(); toast.success("Task confirmed done — archived"); },
    onError: () => toast.error("Failed to confirm task"),
  });

  // Include archived cards for the completed section
  const allCards = (data?.cards ?? []) as Card[];

  const filtered = filterBusiness === "all"
    ? allCards
    : allCards.filter(c => c.business === filterBusiness);

  // Separate into sections
  const updates = filtered.filter(c => c.type === "update" && !c.archivedAt);
  const issues = filtered.filter(c => c.type === "issue" && !c.archivedAt);
  const openTasks = filtered.filter(c => c.type === "task" && !c.archivedAt && !c.completedAt);
  const donePendingTasks = filtered.filter(c => c.type === "task" && !c.archivedAt && c.completedAt && !c.confirmedAt);
  const completedTasks = filtered.filter(c => c.type === "task" && c.archivedAt && c.confirmedAt);

  const unseenCount = allCards.filter(c =>
    !c.seenAt && currentUser && c.author !== currentUser && c.type !== "task"
  ).length;

  const pendingTaskCount = donePendingTasks.filter(c =>
    currentUser && c.author === currentUser
  ).length;

  const totalBadge = unseenCount + pendingTaskCount;

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
            <p className="text-[11px] text-white/35 mt-0.5">Updates, issues & tasks between Matt and Lynn</p>
          </div>
        </div>

        {/* Identity selector (persistent) + back link */}
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
          <span className="text-[10px] text-white/30" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>I am:</span>
          {(["Matt", "Lynn"] as Author[]).map(a => {
            const c = AUTHOR_COLORS[a];
            const isActive = currentUser === a;
            return (
              <button
                key={a}
                onClick={() => setCurrentUser(a)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all relative"
                style={{
                  backgroundColor: isActive ? c.badge : "oklch(1 0 0 / 5%)",
                  border: `1px solid ${isActive ? c.border : "oklch(1 0 0 / 8%)"}`,
                  color: isActive ? c.text : "rgba(255,255,255,0.35)",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                {a}
                {isActive && totalBadge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#EF4444", color: "white" }}>
                    {totalBadge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: form + filters */}
        <aside
          className="w-80 flex-shrink-0 p-4 overflow-y-auto"
          style={{ borderRight: "1px solid oklch(1 0 0 / 8%)" }}
        >
          {/* Identity prompt if not set */}
          {!currentUser && (
            <div
              className="rounded-xl p-3 mb-4 flex items-center gap-2"
              style={{ backgroundColor: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)" }}
            >
              <span>👆</span>
              <p className="text-[11px] text-amber-200/70">Select <strong className="text-amber-200">who you are</strong> in the top-right — saved for next time.</p>
            </div>
          )}

          <AddCardForm currentUser={currentUser} onAdded={() => refetch()} />

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
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: "#8B5CF6" }} />
                <span className="text-[11px] text-white/55">Tasks (assigned)</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px]" style={{ color: "#22c55e" }}>✓</span>
                <span className="text-[11px] text-white/55">Seen / confirmed done</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main board */}
        <main className="flex-1 overflow-y-auto p-5 flex flex-col gap-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <span className="text-white/30 text-sm animate-pulse">Loading board…</span>
            </div>
          ) : (
            <>
              {/* ── Tasks section ── */}
              <section className="flex flex-col gap-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">☑</span>
                  <h2 className="text-sm font-bold text-white/80" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Tasks</h2>
                  <span className="text-[10px] text-white/25 ml-1">— Assigned to-dos between owners</span>
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "oklch(1 0 0 / 8%)", color: "rgba(255,255,255,0.40)", fontFamily: "'JetBrains Mono', monospace" }}>
                    {openTasks.length} open
                  </span>
                </div>

                {openTasks.length === 0 && donePendingTasks.length === 0 ? (
                  <div className="rounded-xl p-6 text-center" style={{ backgroundColor: "oklch(0.17 0.022 240)", border: "1px dashed oklch(1 0 0 / 10%)" }}>
                    <p className="text-[12px] text-white/25">No open tasks. Use "☑ Task" to assign something to Matt or Lynn.</p>
                  </div>
                ) : (
                  <>
                    {openTasks.map(card => (
                      <TaskCard
                        key={card.id}
                        card={card}
                        currentUser={currentUser}
                        onMarkDone={id => currentUser && markDone.mutate({ id, completedBy: currentUser })}
                        onConfirmDone={id => currentUser && confirmDone.mutate({ id, confirmedBy: currentUser })}
                        onDelete={id => deleteCard.mutate({ id })}
                      />
                    ))}
                  </>
                )}

                {/* Done — Awaiting Confirmation subsection */}
                {donePendingTasks.length > 0 && (
                  <div className="mt-2 flex flex-col gap-2">
                    <p className="text-[10px] font-bold text-amber-300/50 uppercase tracking-widest px-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      ⏳ Done — Awaiting Your Confirmation ({donePendingTasks.length})
                    </p>
                    {donePendingTasks.map(card => (
                      <TaskCard
                        key={card.id}
                        card={card}
                        currentUser={currentUser}
                        onMarkDone={id => currentUser && markDone.mutate({ id, completedBy: currentUser })}
                        onConfirmDone={id => currentUser && confirmDone.mutate({ id, confirmedBy: currentUser })}
                        onDelete={id => deleteCard.mutate({ id })}
                      />
                    ))}
                  </div>
                )}

                {/* Completed archive (collapsible) */}
                {completedTasks.length > 0 && (
                  <div className="mt-2">
                    <button
                      onClick={() => setShowCompleted(v => !v)}
                      className="text-[11px] text-white/30 hover:text-white/50 transition-colors flex items-center gap-1.5 px-1"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {showCompleted ? "▾" : "▸"} Completed this period ({completedTasks.length})
                    </button>
                    {showCompleted && (
                      <div className="mt-2 flex flex-col gap-2 opacity-60">
                        {completedTasks.map(card => (
                          <TaskCard
                            key={card.id}
                            card={card}
                            currentUser={currentUser}
                            onMarkDone={() => {}}
                            onConfirmDone={() => {}}
                            onDelete={id => deleteCard.mutate({ id })}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* ── Updates + Issues columns ── */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Updates */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">✅</span>
                    <h2 className="text-sm font-bold text-white/80" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Updates</h2>
                    <span className="text-[10px] text-white/25 ml-1">— What I did</span>
                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "oklch(1 0 0 / 8%)", color: "rgba(255,255,255,0.40)", fontFamily: "'JetBrains Mono', monospace" }}>
                      {updates.length}
                    </span>
                  </div>
                  {updates.length === 0 ? (
                    <div className="rounded-xl p-6 text-center" style={{ backgroundColor: "#F1F0ED", border: "1px dashed #E2E0DB" }}>
                      <p className="text-[12px] text-[#94A3B8]">No updates yet.</p>
                    </div>
                  ) : (
                    updates.map(card => (
                      <BoardCard
                        key={card.id}
                        card={card}
                        currentUser={currentUser}
                        onSeen={id => currentUser && markSeen.mutate({ id, seenBy: currentUser })}
                        onArchive={id => archive.mutate({ id })}
                        onDelete={id => deleteCard.mutate({ id })}
                      />
                    ))
                  )}
                </div>

                {/* Issues */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">💬</span>
                    <h2 className="text-sm font-bold text-white/80" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Issues</h2>
                    <span className="text-[10px] text-white/25 ml-1">— What we need to discuss</span>
                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "oklch(1 0 0 / 8%)", color: "rgba(255,255,255,0.40)", fontFamily: "'JetBrains Mono', monospace" }}>
                      {issues.length}
                    </span>
                  </div>
                  {issues.length === 0 ? (
                    <div className="rounded-xl p-6 text-center" style={{ backgroundColor: "#F1F0ED", border: "1px dashed #E2E0DB" }}>
                      <p className="text-[12px] text-[#94A3B8]">No issues queued.</p>
                    </div>
                  ) : (
                    issues.map(card => (
                      <BoardCard
                        key={card.id}
                        card={card}
                        currentUser={currentUser}
                        onSeen={id => currentUser && markSeen.mutate({ id, seenBy: currentUser })}
                        onArchive={id => archive.mutate({ id })}
                        onDelete={id => deleteCard.mutate({ id })}
                      />
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
