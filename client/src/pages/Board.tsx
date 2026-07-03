/**
 * Command Board — Shared Updates, Issues & Tasks for Matt and Lynn
 * Matt = Blue (#2563EB), Lynn = Rose (#E11D48)
 *
 * Identity is persisted in localStorage so you only pick once per device.
 * Tasks use a two-step completion flow:
 *   1. Doer marks done → moves to "Done — Awaiting Confirmation"
 *   2. Requester confirms → archived (collapsed "Completed" section)
 *
 * All colors are designed for the light theme (#F8F7F4 bg):
 *   - Text always dark (navy or slate-700) on light backgrounds
 *   - Colored accents use saturated foreground colors, not washed-out pastels
 */
import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getBusinessSelection, type BusinessSelection } from "./ClientLogin";

type Author = "Matt" | "Lynn";
type CardType = "update" | "issue" | "task";
type Business = "chiropractic" | "crossfit" | "realty" | "general";

const IDENTITY_KEY = "bcc_identity";

// Map account scope → which board businesses are visible
// Single-business accounts (chiro/crossfit) have no selector — posts auto-tag to their one business
const SCOPE_BUSINESSES: Record<BusinessSelection, Business[]> = {
  chiro:    ["chiropractic"],
  crossfit: ["crossfit"],
  owner:    ["chiropractic", "crossfit", "realty", "general"],
};

// For single-business accounts, the default (and only) business to post under
const SCOPE_DEFAULT_BUSINESS: Record<BusinessSelection, Business> = {
  chiro:    "chiropractic",
  crossfit: "crossfit",
  owner:    "general",
};

// Light-theme author colors — dark text on tinted backgrounds
const AUTHOR_COLORS: Record<Author, {
  bg: string;        // card background
  border: string;    // card border
  badgeBg: string;   // name badge background
  badgeText: string; // name badge text (dark, readable)
  btnBg: string;     // active button background
  btnBorder: string; // active button border
  btnText: string;   // active button text
  dot: string;       // solid dot color
}> = {
  Matt: {
    bg: "#EFF6FF",
    border: "#BFDBFE",
    badgeBg: "#DBEAFE",
    badgeText: "#1D4ED8",
    btnBg: "#DBEAFE",
    btnBorder: "#93C5FD",
    btnText: "#1D4ED8",
    dot: "#2563EB",
  },
  Lynn: {
    bg: "#FFF1F2",
    border: "#FECDD3",
    badgeBg: "#FFE4E6",
    badgeText: "#BE123C",
    btnBg: "#FFE4E6",
    btnBorder: "#FDA4AF",
    btnText: "#BE123C",
    dot: "#E11D48",
  },
};

const BUSINESS_LABELS: Record<Business, { label: string; icon: string; bg: string; text: string; border: string }> = {
  chiropractic: { label: "Chiropractic", icon: "🦴", bg: "#D1FAE5", text: "#065F46", border: "#6EE7B7" },
  crossfit:     { label: "CrossFit",     icon: "💪", bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" },
  realty:       { label: "Realty",       icon: "🏠", bg: "#EDE9FE", text: "#5B21B6", border: "#C4B5FD" },
  general:      { label: "General",      icon: "📋", bg: "#F1F5F9", text: "#475569", border: "#CBD5E1" },
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

  const taskState: "open" | "done_pending" | "confirmed" = isConfirmed
    ? "confirmed"
    : isDone
    ? "done_pending"
    : "open";

  // State-based card styling (light backgrounds with dark text)
  const stateStyles = {
    open:         { bg: "#EFF6FF", border: "#BFDBFE" },
    done_pending: { bg: "#FFFBEB", border: "#FCD34D" },
    confirmed:    { bg: "#F0FDF4", border: "#86EFAC" },
  };

  const style = stateStyles[taskState];

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3 transition-all duration-200"
      style={{ backgroundColor: style.bg, border: `1.5px solid ${style.border}` }}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Task type badge */}
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
          style={{ backgroundColor: "#EDE9FE", color: "#5B21B6", fontFamily: "'Space Grotesk', sans-serif" }}
        >
          ☑ Task
        </span>

        {/* Author badge */}
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: authorColors.badgeBg, color: authorColors.badgeText, fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {card.author}
        </span>

        {/* Assigned to */}
        {card.assignedTo && (
          <span className="text-[10px] text-slate-500 flex items-center gap-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            →{" "}
            <span
              className="font-semibold"
              style={{ color: AUTHOR_COLORS[card.assignedTo].badgeText }}
            >
              {card.assignedTo}
            </span>
          </span>
        )}

        {/* Business tag */}
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
          style={{ backgroundColor: biz.bg, color: biz.text, border: `1px solid ${biz.border}`, fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {biz.icon} {biz.label}
        </span>

        {/* State badge */}
        {taskState === "done_pending" && (
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ backgroundColor: "#FEF3C7", color: "#92400E", border: "1px solid #FCD34D", fontFamily: "'Space Grotesk', sans-serif" }}>
            ⏳ Awaiting Confirmation
          </span>
        )}
        {taskState === "confirmed" && (
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ backgroundColor: "#DCFCE7", color: "#166534", border: "1px solid #86EFAC", fontFamily: "'Space Grotesk', sans-serif" }}>
            ✓ Confirmed Done
          </span>
        )}

        {/* Timestamp */}
        <span
          className={`text-[10px] text-slate-400 ${taskState === "open" ? "ml-auto" : ""}`}
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {timeAgo(card.createdAt)}
        </span>
      </div>

      {/* Content */}
      <p className="text-[13px] text-[#1E3A5F] leading-relaxed">{card.content}</p>

      {/* Completion trail */}
      {isDone && (
        <p className="text-[11px] text-slate-500 italic">
          Marked done by{" "}
          <span style={{ color: card.completedBy ? AUTHOR_COLORS[card.completedBy].badgeText : "#475569" }}>
            {card.completedBy}
          </span>{" "}
          · {timeAgo(card.completedAt!)}
        </p>
      )}

      {/* Action row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Doer: mark done */}
        {taskState === "open" && isDoer && (
          <button
            onClick={() => onMarkDone(card.id)}
            className="text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-90 flex items-center gap-1.5"
            style={{
              backgroundColor: "#DCFCE7",
              border: "1.5px solid #86EFAC",
              color: "#166534",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            ☑ Mark as Done
          </button>
        )}

        {/* Requester: confirm done */}
        {taskState === "done_pending" && isRequester && (
          <button
            onClick={() => onConfirmDone(card.id)}
            className="text-[11px] px-3 py-1.5 rounded-lg font-bold transition-all hover:opacity-90 flex items-center gap-1.5"
            style={{
              backgroundColor: "#DCFCE7",
              border: "1.5px solid #4ADE80",
              color: "#166534",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            ✓ Confirm Done
          </button>
        )}

        {/* Waiting messages */}
        {taskState === "open" && !isDoer && currentUser && (
          <span className="text-[11px] text-slate-400 italic">
            Waiting for {card.assignedTo ?? "assignee"} to complete
          </span>
        )}
        {taskState === "done_pending" && !isRequester && currentUser && (
          <span className="text-[11px] text-slate-400 italic">
            Waiting for {card.author} to confirm
          </span>
        )}

        {/* Delete */}
        {card.author === currentUser && (
          <button
            onClick={() => onDelete(card.id)}
            className="text-[11px] px-2 py-1.5 rounded-lg transition-all hover:opacity-80 ml-auto"
            style={{ color: "#94A3B8", fontFamily: "'Space Grotesk', sans-serif" }}
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
        border: `1.5px solid ${colors.border}`,
        opacity: alreadySeen ? 0.75 : 1,
      }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        {/* Author badge */}
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: colors.badgeBg, color: colors.badgeText, fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {card.author}
        </span>

        {/* Business tag */}
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
          style={{ backgroundColor: biz.bg, color: biz.text, border: `1px solid ${biz.border}`, fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {biz.icon} {biz.label}
        </span>

        {/* Seen indicator */}
        {alreadySeen && (
          <span className="text-[10px] text-slate-400 ml-auto flex items-center gap-1">
            <span style={{ color: "#16A34A" }}>✓</span> Seen by {card.seenBy}
          </span>
        )}
        {!alreadySeen && isOwnCard && (
          <span className="text-[10px] text-slate-400 ml-auto italic">
            Awaiting {card.author === "Matt" ? "Lynn" : "Matt"}
          </span>
        )}

        <span className="text-[10px] text-slate-400 ml-auto" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {timeAgo(card.createdAt)}
        </span>
      </div>

      <p className="text-[13px] text-[#1E3A5F] leading-relaxed">{card.content}</p>

      <div className="flex items-center gap-2 flex-wrap">
        {!isOwnCard && !alreadySeen && (
          <button
            onClick={() => onSeen(card.id)}
            className="text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-90 flex items-center gap-1.5"
            style={{
              backgroundColor: "#DCFCE7",
              border: "1.5px solid #86EFAC",
              color: "#166534",
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
            backgroundColor: "#F8FAFC",
            border: "1px solid #CBD5E1",
            color: "#475569",
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          Archive
        </button>
        {isOwnCard && (
          <button
            onClick={() => onDelete(card.id)}
            className="text-[11px] px-2 py-1.5 rounded-lg transition-all hover:opacity-80 ml-auto"
            style={{ color: "#94A3B8", fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Add Card Form ────────────────────────────────────────────────────────────

function AddCardForm({ currentUser, onAdded, allowedBusinesses, defaultBusiness }: {
  currentUser: Author | null;
  onAdded: () => void;
  allowedBusinesses: Business[];
  defaultBusiness: Business;
}) {
  const [type, setType] = useState<CardType>("update");
  const [business, setBusiness] = useState<Business>(defaultBusiness);
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

  // Type button styles
  const typeStyles: Record<CardType, { activeBg: string; activeBorder: string; activeText: string }> = {
    update: { activeBg: "#D1FAE5", activeBorder: "#6EE7B7", activeText: "#065F46" },
    issue:  { activeBg: "#FEF3C7", activeBorder: "#FCD34D", activeText: "#92400E" },
    task:   { activeBg: "#EDE9FE", activeBorder: "#C4B5FD", activeText: "#5B21B6" },
  };

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-4"
      style={{ backgroundColor: "#FFFFFF", border: "1.5px solid #E2E8F0" }}
    >
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        + Post to Board
      </p>

      {/* Type selector */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>What kind of post?</p>
        <div className="flex flex-col gap-1.5">
          {(["update", "issue", "task"] as CardType[]).map(t => {
            const s = typeStyles[t];
            const isActive = type === t;
            const labels: Record<CardType, string> = {
              update: "✅ Update — What I did",
              issue:  "💬 Issue — Need to discuss",
              task:   "☑ Task — Assign to someone",
            };
            return (
              <button
                key={t}
                onClick={() => setType(t)}
                className="w-full py-2 rounded-lg text-[11px] font-semibold transition-all text-left px-3"
                style={{
                  backgroundColor: isActive ? s.activeBg : "#F8FAFC",
                  border: `1.5px solid ${isActive ? s.activeBorder : "#E2E8F0"}`,
                  color: isActive ? s.activeText : "#64748B",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                {labels[t]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Assign to (only for tasks) */}
      {type === "task" && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Assign to:</p>
          <div className="flex gap-2">
            {(["Matt", "Lynn"] as Author[]).map(a => {
              const c = AUTHOR_COLORS[a];
              const isActive = assignedTo === a;
              const isSelf = a === currentUser;
              return (
                <button
                  key={a}
                  onClick={() => setAssignedTo(a)}
                  className="flex-1 py-2 rounded-lg text-[12px] font-bold transition-all"
                  style={{
                    backgroundColor: isActive ? c.btnBg : "#F8FAFC",
                    border: `2px solid ${isActive ? c.btnBorder : "#E2E8F0"}`,
                    color: isActive ? c.btnText : "#475569",
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

      {/* Business — only show businesses this account can access */}
      {allowedBusinesses.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Which business?</p>
          <div className="flex gap-1.5 flex-wrap">
            {allowedBusinesses.map(key => {
              const biz = BUSINESS_LABELS[key];
              return (
                <button
                  key={key}
                  onClick={() => setBusiness(key)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1"
                  style={{
                    backgroundColor: business === key ? biz.bg : "#F8FAFC",
                    border: `1.5px solid ${business === key ? biz.border : "#E2E8F0"}`,
                    color: business === key ? biz.text : "#64748B",
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  {biz.icon} {biz.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Content textarea */}
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
        className="w-full rounded-lg px-3 py-2.5 text-[13px] text-[#1E3A5F] placeholder-slate-400 resize-none focus:outline-none transition-colors"
        style={{
          backgroundColor: "#F8FAFC",
          border: "1.5px solid #CBD5E1",
          fontFamily: "'Inter', sans-serif",
          lineHeight: "1.6",
        }}
        onFocus={e => (e.target.style.borderColor = "#94A3B8")}
        onBlur={e => (e.target.style.borderColor =
          "#CBD5E1")}
      />

      <button
        onClick={handleSubmit}
        disabled={createCard.isPending || !currentUser || !content.trim() || (type === "task" && !assignedTo)}
        className="w-full py-2.5 rounded-lg text-[12px] font-bold transition-all hover:opacity-90 disabled:opacity-40"
        style={{
          backgroundColor: currentUser ? AUTHOR_COLORS[currentUser].btnBg : "#E2E8F0",
          border: `1.5px solid ${currentUser ? AUTHOR_COLORS[currentUser].btnBorder : "#CBD5E1"}`,
          color: currentUser ? AUTHOR_COLORS[currentUser].btnText : "#94A3B8",
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
  const [currentUser, setCurrentUser] = useState<Author | null>(() => {
    const saved = localStorage.getItem(IDENTITY_KEY);
    return (saved === "Matt" || saved === "Lynn") ? saved : null;
  });
  const [filterBusiness, setFilterBusiness] = useState<Business | "all">("all");
  const [showCompleted, setShowCompleted] = useState(false);

  // Read account scope from localStorage (set at login)
  const scope = useMemo<BusinessSelection>(() => getBusinessSelection(), []);
  const allowedBusinesses = useMemo<Business[]>(() => SCOPE_BUSINESSES[scope], [scope]);
  const defaultBusiness = useMemo<Business>(() => SCOPE_DEFAULT_BUSINESS[scope], [scope]);

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

  // Only show cards for businesses this account is allowed to see
  const allCards = ((data?.cards ?? []) as Card[]).filter(c =>
    allowedBusinesses.includes(c.business)
  );

  const filtered = filterBusiness === "all"
    ? allCards
    : allCards.filter(c => c.business === filterBusiness);

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
      style={{ backgroundColor: "#F8F7F4", fontFamily: "'Inter', sans-serif" }}
    >
      {/* Header */}
      <header
        className="px-4 sm:px-5 py-3 flex items-center justify-between flex-shrink-0 gap-3"
        style={{ borderBottom: "1px solid #E2E8F0", backgroundColor: "#FFFFFF" }}
      >
        {/* Logo + title */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
            style={{ background: "linear-gradient(135deg, #2563EB 0%, #E11D48 100%)", boxShadow: "0 2px 8px rgba(37,99,235,0.25)" }}
          >
            📋
          </div>
          <div>
            <h1 className="text-base font-bold text-[#1E3A5F] leading-tight tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Command Board
            </h1>
            <p className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">Your co-owner operating system</p>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1.5">
          <Link href="/app/goals" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:bg-[#F1F5F9]" style={{ color: "#7C3AED", fontFamily: "'Space Grotesk', sans-serif" }}>
            <span>🎯</span> Goals
          </Link>
          <Link href="/app/reports" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:bg-[#F1F5F9]" style={{ color: "#0D9488", fontFamily: "'Space Grotesk', sans-serif" }}>
            <span>📊</span> Reports
          </Link>
          <Link href="/app/calendar" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:bg-[#F1F5F9]" style={{ color: "#64748B", fontFamily: "'Space Grotesk', sans-serif" }}>
            <span>📅</span> Calendar
          </Link>
          <Link href="/app/settings" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:bg-[#F1F5F9]" style={{ color: "#94A3B8", fontFamily: "'Space Grotesk', sans-serif" }}>
            <span>⚙️</span> Settings
          </Link>
          <div className="w-px h-5 bg-slate-200 mx-1" />
        </nav>

        {/* Identity selector + mobile menu */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-medium hidden sm:block" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>I am:</span>
          {(["Matt", "Lynn"] as Author[]).map(a => {
            const c = AUTHOR_COLORS[a];
            const isActive = currentUser === a;
            return (
              <button
                key={a}
                onClick={() => setCurrentUser(a)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all relative"
                style={{
                  backgroundColor: isActive ? c.btnBg : "#F8FAFC",
                  border: `2px solid ${isActive ? c.btnBorder : "#E2E8F0"}`,
                  color: isActive ? c.btnText : "#475569",
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
          {/* Mobile nav dropdown */}
          <div className="relative md:hidden">
            <button
              id="board-mobile-menu-btn"
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
              style={{ background: "rgba(30,58,95,0.06)", border: "1px solid rgba(30,58,95,0.15)" }}
              onClick={() => {
                const menu = document.getElementById("board-mobile-menu");
                if (menu) menu.style.display = menu.style.display === "none" ? "flex" : "none";
              }}
              aria-label="Navigation menu"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="3" r="1.3" fill="#1E3A5F" />
                <circle cx="7" cy="7" r="1.3" fill="#1E3A5F" />
                <circle cx="7" cy="11" r="1.3" fill="#1E3A5F" />
              </svg>
            </button>
            <div
              id="board-mobile-menu"
              className="absolute right-0 top-10 w-48 rounded-xl shadow-lg z-50 flex-col overflow-hidden"
              style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", display: "none" }}
            >
              <Link href="/app/goals" className="flex items-center gap-2.5 px-4 py-3 text-[12px] font-semibold hover:bg-[#F8F7F4] transition-colors" style={{ color: "#7C3AED" }}>🎯 Goals</Link>
              <Link href="/app/reports" className="flex items-center gap-2.5 px-4 py-3 text-[12px] font-semibold hover:bg-[#F8F7F4] transition-colors" style={{ color: "#0D9488" }}>📊 Reports</Link>
              <Link href="/app/calendar" className="flex items-center gap-2.5 px-4 py-3 text-[12px] font-semibold hover:bg-[#F8F7F4] transition-colors" style={{ color: "#64748B" }}>📅 Calendar</Link>
              <Link href="/app/settings" className="flex items-center gap-2.5 px-4 py-3 text-[12px] font-semibold hover:bg-[#F8F7F4] transition-colors" style={{ color: "#94A3B8" }}>⚙️ Settings</Link>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <aside
          className="w-80 flex-shrink-0 p-4 overflow-y-auto"
          style={{ borderRight: "1px solid #E2E8F0", backgroundColor: "#FAFAF9" }}
        >
          {/* Identity prompt if not set */}
          {!currentUser && (
            <div
              className="rounded-xl p-3 mb-4 flex items-center gap-2"
              style={{ backgroundColor: "#FFFBEB", border: "1.5px solid #FCD34D" }}
            >
              <span>👆</span>
              <p className="text-[11px] text-amber-800">
                Select <strong>who you are</strong> in the top-right — saved for next time.
              </p>
            </div>
          )}

          <AddCardForm currentUser={currentUser} onAdded={() => refetch()} allowedBusinesses={allowedBusinesses} defaultBusiness={defaultBusiness} />

          {/* Business filter — only show businesses this account can access */}
          {allowedBusinesses.length > 1 && (
            <div className="mt-5 flex flex-col gap-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Filter by Business
              </p>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => setFilterBusiness("all")}
                  className="text-left px-3 py-2 rounded-lg text-[11px] font-medium transition-all"
                  style={{
                    backgroundColor: filterBusiness === "all" ? "#E2E8F0" : "transparent",
                    color: filterBusiness === "all" ? "#1E3A5F" : "#64748B",
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  📋 All Businesses
                </button>
                {allowedBusinesses.map(key => {
                  const biz = BUSINESS_LABELS[key];
                  return (
                    <button
                      key={key}
                      onClick={() => setFilterBusiness(key)}
                      className="text-left px-3 py-2 rounded-lg text-[11px] font-medium transition-all"
                      style={{
                        backgroundColor: filterBusiness === key ? biz.bg : "transparent",
                        color: filterBusiness === key ? biz.text : "#64748B",
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      {biz.icon} {biz.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="mt-5 rounded-xl p-3.5" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Color Key</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: "#2563EB" }} />
                <span className="text-[11px] text-slate-600">Matt's posts</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: "#E11D48" }} />
                <span className="text-[11px] text-slate-600">Lynn's posts</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: "#7C3AED" }} />
                <span className="text-[11px] text-slate-600">Tasks (assigned)</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px]" style={{ color: "#16A34A" }}>✓</span>
                <span className="text-[11px] text-slate-600">Seen / confirmed done</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main board */}
        <main className="flex-1 overflow-y-auto p-5 flex flex-col gap-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <span className="text-slate-400 text-sm animate-pulse">Loading board…</span>
            </div>
          ) : (
            <>
              {/* ── Tasks section ── */}
              <section className="flex flex-col gap-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">☑</span>
                  <h2 className="text-sm font-bold text-[#1E3A5F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Tasks</h2>
                  <span className="text-[10px] text-slate-400 ml-1">— Assigned to-dos between owners</span>
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "#E2E8F0", color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>
                    {openTasks.length} open
                  </span>
                </div>

                {openTasks.length === 0 && donePendingTasks.length === 0 ? (
                  <div className="rounded-xl p-6 text-center" style={{ backgroundColor: "#F8FAFC", border: "1px dashed #CBD5E1" }}>
                    <p className="text-[12px] text-slate-400">No open tasks. Use "☑ Task" to assign something to Matt or Lynn.</p>
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
                    <p className="text-[10px] font-bold uppercase tracking-widest px-1"
                      style={{ color: "#92400E", fontFamily: "'Space Grotesk', sans-serif" }}>
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
                      className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1.5 px-1"
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
                    <h2 className="text-sm font-bold text-[#1E3A5F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Updates</h2>
                    <span className="text-[10px] text-slate-400 ml-1">— What I did</span>
                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "#E2E8F0", color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>
                      {updates.length}
                    </span>
                  </div>
                  {updates.length === 0 ? (
                    <div className="rounded-xl p-6 text-center" style={{ backgroundColor: "#F1F0ED", border: "1px dashed #E2E0DB" }}>
                      <p className="text-[12px] text-slate-400">No updates yet.</p>
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
                    <h2 className="text-sm font-bold text-[#1E3A5F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Issues</h2>
                    <span className="text-[10px] text-slate-400 ml-1">— What we need to discuss</span>
                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "#E2E8F0", color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>
                      {issues.length}
                    </span>
                  </div>
                  {issues.length === 0 ? (
                    <div className="rounded-xl p-6 text-center" style={{ backgroundColor: "#F1F0ED", border: "1px dashed #E2E0DB" }}>
                      <p className="text-[12px] text-slate-400">No issues queued.</p>
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
