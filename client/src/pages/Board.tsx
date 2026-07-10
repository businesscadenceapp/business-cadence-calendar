/**
 * Owner Board — Shared Updates, Issues & Tasks between Owners
 * Dark navy theme: #0F2440 bg, #5EEAD4 teal accent, white text
 */
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { usePerson } from "@/contexts/PersonContext";
import { useIdentity } from "@/components/AppShell";

type Author = string;
type CardType = "update" | "issue" | "task";
type Business = "chiropractic" | "crossfit" | "realty" | "general";

const IDENTITY_KEY = "bcc_identity";

// Dark-theme author colors
const PALETTE = [
  { bg: "rgba(37,99,235,0.12)", border: "rgba(37,99,235,0.35)", badgeBg: "rgba(37,99,235,0.2)", badgeText: "#93C5FD", btnBg: "rgba(37,99,235,0.2)", btnBorder: "rgba(37,99,235,0.4)", btnText: "#93C5FD", dot: "#3B82F6" },
  { bg: "rgba(225,29,72,0.12)", border: "rgba(225,29,72,0.35)", badgeBg: "rgba(225,29,72,0.2)", badgeText: "#FDA4AF", btnBg: "rgba(225,29,72,0.2)", btnBorder: "rgba(225,29,72,0.4)", btnText: "#FDA4AF", dot: "#E11D48" },
  { bg: "rgba(5,150,105,0.12)", border: "rgba(5,150,105,0.35)", badgeBg: "rgba(5,150,105,0.2)", badgeText: "#6EE7B7", btnBg: "rgba(5,150,105,0.2)", btnBorder: "rgba(5,150,105,0.4)", btnText: "#6EE7B7", dot: "#059669" },
  { bg: "rgba(217,119,6,0.12)", border: "rgba(217,119,6,0.35)", badgeBg: "rgba(217,119,6,0.2)", badgeText: "#FCD34D", btnBg: "rgba(217,119,6,0.2)", btnBorder: "rgba(217,119,6,0.4)", btnText: "#FCD34D", dot: "#D97706" },
  { bg: "rgba(124,58,237,0.12)", border: "rgba(124,58,237,0.35)", badgeBg: "rgba(124,58,237,0.2)", badgeText: "#C4B5FD", btnBg: "rgba(124,58,237,0.2)", btnBorder: "rgba(124,58,237,0.4)", btnText: "#C4B5FD", dot: "#7C3AED" },
];

function getAuthorColors(name: string) {
  if (!name) return PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

const AUTHOR_COLORS: Record<string, typeof PALETTE[0]> = new Proxy({} as Record<string, typeof PALETTE[0]>, {
  get: (_t, prop: string) => getAuthorColors(prop),
});

const BUSINESS_LABELS: Record<Business, { label: string; icon: string; bg: string; text: string; border: string }> = {
  chiropractic: { label: "Chiropractic", icon: "🦴", bg: "rgba(16,185,129,0.15)", text: "#6EE7B7", border: "rgba(16,185,129,0.3)" },
  crossfit:     { label: "CrossFit",     icon: "💪", bg: "rgba(245,158,11,0.15)", text: "#FCD34D", border: "rgba(245,158,11,0.3)" },
  realty:       { label: "Realty",       icon: "🏠", bg: "rgba(124,58,237,0.15)", text: "#C4B5FD", border: "rgba(124,58,237,0.3)" },
  general:      { label: "General",      icon: "📋", bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.6)", border: "rgba(255,255,255,0.15)" },
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
  dueAt: number | null;
  completedAt: Date | null;
  completedBy: Author | null;
  confirmedAt: Date | null;
  confirmedBy: Author | null;
  seenAt: Date | null;
  seenBy: Author | null;
  archivedAt: Date | null;
  audience: "owner" | "team" | null;
  createdAt: Date;
};

// ─── Card Comments ──────────────────────────────────────────────────────────────

type Comment = {
  id: number;
  cardId: number;
  authorName: string;
  authorPersonId: string | null;
  content: string;
  createdAt: Date;
};

function CardComments({ cardId, currentUser, accountId }: {
  cardId: number;
  currentUser: Author | null;
  accountId?: number;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data, refetch } = trpc.board.listComments.useQuery(
    { cardId },
    { enabled: open, staleTime: 10_000 }
  );
  const comments: Comment[] = (data?.comments ?? []) as Comment[];

  const addComment = trpc.board.addComment.useMutation({
    onSuccess: () => {
      setText("");
      refetch();
    },
    onError: () => toast.error("Failed to post comment"),
  });

  const deleteComment = trpc.board.deleteComment.useMutation({
    onSuccess: () => refetch(),
  });

  const handleSubmit = () => {
    if (!currentUser) { toast.error("Select who you are first"); return; }
    if (!text.trim()) return;
    addComment.mutate({
      cardId,
      authorName: currentUser,
      content: text.trim(),
      ...(accountId ? { accountId } : {}),
    });
  };

  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg transition-all"
        style={{
          color: "#5EEAD4",
          backgroundColor: open ? "rgba(94,234,212,0.12)" : "rgba(94,234,212,0.06)",
          border: `1px solid ${open ? "rgba(94,234,212,0.3)" : "rgba(94,234,212,0.15)"}`,
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        {comments.length > 0 ? `${comments.length} comment${comments.length !== 1 ? "s" : ""}` : "Comment"}
      </button>

      {open && (
        <div
          className="mt-2 flex flex-col gap-2 rounded-xl p-3"
          style={{ backgroundColor: "rgba(0,0,0,0.2)", border: "1px solid rgba(94,234,212,0.12)" }}
        >
          {/* Existing comments */}
          {comments.length > 0 && (
            <div className="flex flex-col gap-2">
              {comments.map(c => (
                <div key={c.id} className="flex items-start gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: getAuthorColors(c.authorName).badgeBg, color: getAuthorColors(c.authorName).badgeText }}
                  >
                    {c.authorName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold" style={{ color: getAuthorColors(c.authorName).badgeText, fontFamily: "'Space Grotesk', sans-serif" }}>
                        {c.authorName}
                      </span>
                      <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>
                        {timeAgo(c.createdAt)}
                      </span>
                      {c.authorName === currentUser && (
                        <button
                          onClick={() => deleteComment.mutate({ commentId: c.id })}
                          className="ml-auto text-[10px] transition-colors"
                          style={{ color: "rgba(255,255,255,0.2)" }}
                          onMouseEnter={e => (e.currentTarget.style.color = "#F87171")}
                          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.8)" }}>{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* New comment input */}
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={currentUser ? `Add a comment as ${currentUser}…` : "Select who you are first"}
              rows={2}
              className="flex-1 rounded-lg px-3 py-2 text-[12px] placeholder-white/30 resize-none focus:outline-none transition-colors"
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                border: "1.5px solid rgba(255,255,255,0.12)",
                color: "white",
                fontFamily: "'Inter', sans-serif",
              }}
              onFocus={e => (e.target.style.borderColor = "#5EEAD4")}
              onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
            />
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || addComment.isPending}
              className="px-3 py-2 rounded-lg text-[11px] font-bold transition-all active:scale-[0.97] flex-shrink-0"
              style={{
                backgroundColor: text.trim() ? "rgba(94,234,212,0.2)" : "rgba(255,255,255,0.05)",
                border: `1.5px solid ${text.trim() ? "rgba(94,234,212,0.4)" : "rgba(255,255,255,0.1)"}`,
                color: text.trim() ? "#5EEAD4" : "rgba(255,255,255,0.3)",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              {addComment.isPending ? "…" : "Post"}
            </button>
          </div>
          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>Enter to post · Shift+Enter for new line</p>
        </div>
      )}
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

const SWIPE_THRESHOLD = 80;
const SWIPE_MAX = 120;

function TaskCard({ card, currentUser, accountId, onMarkDone, onConfirmDone, onDelete }: {
  card: Card;
  currentUser: Author | null;
  accountId?: number;
  onMarkDone: (id: number) => void;
  onConfirmDone: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const authorColors = getAuthorColors(card.author);
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

  const now = Date.now();
  const isOverdue = card.dueAt && !isDone && card.dueAt < now;
  const isDueSoon = card.dueAt && !isDone && !isOverdue && card.dueAt - now < 3 * 24 * 60 * 60 * 1000;
  const dueLabel = card.dueAt
    ? new Date(card.dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;

  const stateStyles = {
    open:         { bg: "rgba(255,255,255,0.05)", border: "rgba(124,58,237,0.3)" },
    done_pending: { bg: "rgba(217,119,6,0.08)", border: "rgba(217,119,6,0.3)" },
    confirmed:    { bg: "rgba(5,150,105,0.08)", border: "rgba(5,150,105,0.3)" },
  };
  const style = stateStyles[taskState];

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [swipeDx, setSwipeDx] = useState(0);
  const [swipeTriggered, setSwipeTriggered] = useState(false);

  const canSwipeRight = taskState === "open" && isDoer;
  const canSwipeLeft  = taskState === "done_pending" && isRequester;
  const hasSwipe = canSwipeRight || canSwipeLeft;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!hasSwipe) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setSwipeTriggered(false);
  }, [hasSwipe]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (Math.abs(dy) > Math.abs(dx) * 1.5) return;
    if (canSwipeRight && dx > 0) {
      e.preventDefault();
      setSwipeDx(Math.min(dx, SWIPE_MAX));
    } else if (canSwipeLeft && dx < 0) {
      e.preventDefault();
      setSwipeDx(Math.max(dx, -SWIPE_MAX));
    }
  }, [canSwipeRight, canSwipeLeft]);

  const handleTouchEnd = useCallback(() => {
    if (swipeDx >= SWIPE_THRESHOLD && canSwipeRight) {
      setSwipeTriggered(true);
      setTimeout(() => {
        onMarkDone(card.id);
        setSwipeDx(0);
        setSwipeTriggered(false);
      }, 200);
    } else if (swipeDx <= -SWIPE_THRESHOLD && canSwipeLeft) {
      setSwipeTriggered(true);
      setTimeout(() => {
        onConfirmDone(card.id);
        setSwipeDx(0);
        setSwipeTriggered(false);
      }, 200);
    } else {
      setSwipeDx(0);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }, [swipeDx, canSwipeRight, canSwipeLeft, card.id, onMarkDone, onConfirmDone]);

  const swipeProgress = Math.abs(swipeDx) / SWIPE_THRESHOLD;
  const swipeReady = Math.abs(swipeDx) >= SWIPE_THRESHOLD;

  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ animation: "cardSlideIn 0.22s cubic-bezier(0.23,1,0.32,1) both" }}>
      {canSwipeRight && (
        <div
          className="absolute inset-0 flex items-center px-5 rounded-2xl"
          style={{
            backgroundColor: swipeReady ? "#059669" : "rgba(5,150,105,0.3)",
            opacity: Math.min(swipeProgress, 1),
            transition: swipeDx === 0 ? "opacity 0.2s, background-color 0.2s" : "none",
          }}
        >
          <span className="text-white text-lg font-bold" style={{ opacity: swipeProgress > 0.3 ? 1 : 0, transition: "opacity 0.15s" }}>☑ Done</span>
        </div>
      )}
      {canSwipeLeft && (
        <div
          className="absolute inset-0 flex items-center justify-end px-5 rounded-2xl"
          style={{
            backgroundColor: swipeReady ? "#059669" : "rgba(5,150,105,0.3)",
            opacity: Math.min(swipeProgress, 1),
            transition: swipeDx === 0 ? "opacity 0.2s, background-color 0.2s" : "none",
          }}
        >
          <span className="text-white text-lg font-bold" style={{ opacity: swipeProgress > 0.3 ? 1 : 0, transition: "opacity 0.15s" }}>✓ Confirm</span>
        </div>
      )}

      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex flex-col gap-0"
        style={{
          backgroundColor: style.bg,
          border: `1.5px solid ${style.border}`,
          borderRadius: "1rem",
          transform: `translateX(${swipeTriggered ? (swipeDx > 0 ? 120 : -120) : swipeDx}px)`,
          transition: swipeDx === 0 || swipeTriggered ? "transform 0.25s cubic-bezier(0.23,1,0.32,1)" : "none",
          willChange: "transform",
          touchAction: hasSwipe ? "pan-y" : "auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Top accent bar */}
        <div className="w-full h-1 flex-shrink-0" style={{ backgroundColor: taskState === "confirmed" ? "#059669" : taskState === "done_pending" ? "#D97706" : "#7C3AED" }} />

        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0 mt-0.5"
              style={{ backgroundColor: authorColors.badgeBg, color: authorColors.badgeText }}
            >
              {card.author[0]}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[13px] font-bold" style={{ color: authorColors.badgeText, fontFamily: "'Space Grotesk', sans-serif" }}>
                  {card.author}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide" style={{ backgroundColor: "rgba(124,58,237,0.2)", color: "#C4B5FD", fontFamily: "'Space Grotesk', sans-serif" }}>
                  Task
                </span>
                {card.assignedTo && (
                  <span className="text-[11px] flex items-center gap-1" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}>
                    → <span className="font-semibold" style={{ color: AUTHOR_COLORS[card.assignedTo].badgeText }}>{card.assignedTo}</span>
                  </span>
                )}
                <span className="text-[10px] ml-auto flex-shrink-0" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'JetBrains Mono', monospace" }}>
                  {timeAgo(card.createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{ backgroundColor: biz.bg, color: biz.text, border: `1px solid ${biz.border}`, fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {biz.icon} {biz.label}
                </span>
                {dueLabel && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                    style={{
                      backgroundColor: isOverdue ? "rgba(185,28,28,0.2)" : isDueSoon ? "rgba(217,119,6,0.2)" : "rgba(255,255,255,0.08)",
                      color: isOverdue ? "#FCA5A5" : isDueSoon ? "#FCD34D" : "rgba(255,255,255,0.5)",
                      border: `1px solid ${isOverdue ? "rgba(185,28,28,0.4)" : isDueSoon ? "rgba(217,119,6,0.4)" : "rgba(255,255,255,0.15)"}`,
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    {isOverdue ? "⚠️" : "📅"} {isOverdue ? "Overdue" : "Due"} {dueLabel}
                  </span>
                )}
              </div>
              <p className="text-[14px] text-white leading-relaxed font-medium">{card.content}</p>
            </div>
          </div>

          {isDone && (
            <p className="text-[11px] italic pl-12" style={{ color: "rgba(255,255,255,0.4)" }}>
              Marked done by{" "}
              <span style={{ color: card.completedBy ? AUTHOR_COLORS[card.completedBy].badgeText : "rgba(255,255,255,0.5)" }}>{card.completedBy}</span>
              {" "}· {timeAgo(card.completedAt!)}
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap pl-12">
            {taskState === "done_pending" && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: "rgba(217,119,6,0.2)", color: "#FCD34D", border: "1px solid rgba(217,119,6,0.35)", fontFamily: "'Space Grotesk', sans-serif" }}>
                ⏳ Awaiting Confirmation
              </span>
            )}
            {taskState === "confirmed" && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: "rgba(5,150,105,0.2)", color: "#6EE7B7", border: "1px solid rgba(5,150,105,0.35)", fontFamily: "'Space Grotesk', sans-serif" }}>
                ✓ Done
              </span>
            )}
            {taskState === "open" && !isDoer && currentUser && (
              <span className="text-[11px] italic" style={{ color: "rgba(255,255,255,0.35)" }}>Waiting for {card.assignedTo ?? "assignee"}</span>
            )}
            {taskState === "done_pending" && !isRequester && currentUser && (
              <span className="text-[11px] italic" style={{ color: "rgba(255,255,255,0.35)" }}>Waiting for {card.author} to confirm</span>
            )}

            <div className="ml-auto flex items-center gap-2">
              {taskState === "open" && isDoer && (
                <button
                  onClick={() => onMarkDone(card.id)}
                  className="text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-90 flex items-center gap-1.5 active:scale-[0.97]"
                  style={{ backgroundColor: "rgba(5,150,105,0.2)", border: "1.5px solid rgba(5,150,105,0.4)", color: "#6EE7B7", fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  ☑ Mark Done
                </button>
              )}
              {taskState === "done_pending" && isRequester && (
                <button
                  onClick={() => onConfirmDone(card.id)}
                  className="text-[11px] px-3 py-1.5 rounded-lg font-bold transition-all hover:opacity-90 flex items-center gap-1.5 active:scale-[0.97]"
                  style={{ backgroundColor: "rgba(5,150,105,0.25)", border: "1.5px solid rgba(5,150,105,0.5)", color: "#6EE7B7", fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  ✓ Confirm Done
                </button>
              )}
              {card.author === currentUser && (
                <button
                  onClick={() => onDelete(card.id)}
                  className="text-[11px] px-2 py-1.5 rounded-lg transition-all"
                  style={{ color: "rgba(255,255,255,0.2)", fontFamily: "'Space Grotesk', sans-serif" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#F87171")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          <CardComments cardId={card.id} currentUser={currentUser} accountId={accountId} />
        </div>
      </div>
    </div>
  );
}

// ─── Update / Issue Card ──────────────────────────────────────────────────────

function BoardCard({ card, currentUser, accountId, onSeen, onArchive, onDelete }: {
  card: Card;
  currentUser: Author | null;
  accountId?: number;
  onSeen: (id: number) => void;
  onArchive: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const colors = getAuthorColors(card.author);
  const biz = BUSINESS_LABELS[card.business];
  const isOwnCard = card.author === currentUser;
  const alreadySeen = !!card.seenAt;

  return (
    <div
      className="rounded-2xl flex flex-col gap-0 transition-all duration-200 overflow-hidden"
      style={{
        backgroundColor: alreadySeen ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)",
        border: `1.5px solid ${alreadySeen ? "rgba(255,255,255,0.08)" : colors.border}`,
        opacity: alreadySeen ? 0.6 : 1,
        animation: "cardSlideIn 0.22s cubic-bezier(0.23,1,0.32,1) both",
      }}
    >
      {/* Colored left accent bar */}
      <div
        className="w-full h-1 flex-shrink-0"
        style={{ backgroundColor: alreadySeen ? "rgba(255,255,255,0.1)" : colors.dot }}
      />

      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0 mt-0.5"
            style={{ backgroundColor: colors.badgeBg, color: colors.badgeText }}
          >
            {card.author[0]}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[13px] font-bold" style={{ color: colors.badgeText, fontFamily: "'Space Grotesk', sans-serif" }}>
                {card.author}
              </span>
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{ backgroundColor: biz.bg, color: biz.text, border: `1px solid ${biz.border}`, fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {biz.icon} {biz.label}
              </span>
              <span className="text-[10px] ml-auto flex-shrink-0" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'JetBrains Mono', monospace" }}>
                {timeAgo(card.createdAt)}
              </span>
            </div>

            <p className="text-[14px] text-white leading-relaxed font-medium">{card.content}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap pl-12">
          {alreadySeen && (
            <span className="text-[10px] flex items-center gap-1" style={{ color: "rgba(255,255,255,0.35)" }}>
              <span style={{ color: "#6EE7B7" }}>✓</span> Seen by {card.seenBy}
            </span>
          )}
          {!alreadySeen && isOwnCard && (
            <span className="text-[10px] italic" style={{ color: "rgba(255,255,255,0.35)" }}>
              Awaiting acknowledgement
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            {!isOwnCard && !alreadySeen && (
              <button
                onClick={() => onSeen(card.id)}
                className="text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-90 flex items-center gap-1.5 active:scale-[0.97]"
                style={{
                  backgroundColor: "rgba(5,150,105,0.2)",
                  border: "1.5px solid rgba(5,150,105,0.4)",
                  color: "#6EE7B7",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                ✓ Seen
              </button>
            )}
            <button
              onClick={() => onArchive(card.id)}
              className="text-[11px] px-2.5 py-1.5 rounded-lg transition-all hover:opacity-80"
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.4)",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              Archive
            </button>
            {isOwnCard && (
              <button
                onClick={() => onDelete(card.id)}
                className="text-[11px] px-2 py-1.5 rounded-lg transition-all"
                style={{ color: "rgba(255,255,255,0.2)", fontFamily: "'Space Grotesk', sans-serif" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#F87171")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
              >
                ✕
              </button>
            )}
          </div>
          <CardComments cardId={card.id} currentUser={currentUser} accountId={accountId} />
        </div>
      </div>
    </div>
  );
}

// ─── Add Card Form ────────────────────────────────────────────────────────────

function AddCardForm({ currentUser, onAdded, allowedBusinesses, defaultBusiness, bizLabels, assignablePersons, accountId }: {
  currentUser: Author | null;
  onAdded: () => void;
  allowedBusinesses: Business[];
  defaultBusiness: Business;
  bizLabels?: Record<string, { label: string; icon: string; bg: string; text: string; border: string }>;
  assignablePersons?: { id: string; name: string }[];
  accountId?: number;
}) {
  const [type, setType] = useState<CardType>("update");
  const [business, setBusiness] = useState<Business>(defaultBusiness);
  const [content, setContent] = useState("");
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [updateDate, setUpdateDate] = useState("");
  const [meetingType, setMeetingType] = useState<"daily_huddle" | "weekly_meeting" | "quarterly_review" | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [notifyPersonIds, setNotifyPersonIds] = useState<string[]>([]);

  const createCard = trpc.board.create.useMutation({
    onSuccess: () => {
      setContent("");
      setAssignedTo(null);
      setDueDate("");
      setUpdateDate("");
      setMeetingType(null);
      setScheduledDate("");
      setNotifyPersonIds([]);
      onAdded();
      toast.success("Posted to the board");
    },
    onError: () => toast.error("Failed to post card"),
  });

  const handleSubmit = () => {
    if (!currentUser) { toast.error("Select who you are first (top right)"); return; }
    if (!content.trim()) { toast.error("Please write something"); return; }
    if (type === "task" && !assignedTo) { toast.error("Please select who this task is assigned to"); return; }
    const dueAt = dueDate ? new Date(dueDate + "T23:59:59").getTime() : undefined;
    const updateDateMs = updateDate ? new Date(updateDate + "T12:00:00").getTime() : undefined;
    const scheduledDateMs = scheduledDate ? new Date(scheduledDate + "T12:00:00").getTime() : undefined;
    if (type === "issue" && !meetingType) { toast.error("Please select which meeting to discuss this in"); return; }
    createCard.mutate({
      author: currentUser,
      type,
      business,
      content: content.trim(),
      ...(type === "task" && assignedTo ? { assignedTo } : {}),
      ...(dueAt ? { dueAt } : {}),
      ...(type === "update" && updateDateMs ? { updateDate: updateDateMs } : {}),
      ...(type === "issue" && meetingType ? { meetingType } : {}),
      ...(type === "issue" && scheduledDateMs ? { scheduledDate: scheduledDateMs } : {}),
      ...(accountId ? { accountId } : {}),
      ...((type === "update" || type === "issue") && notifyPersonIds.length > 0 ? { notifyPersonIds } : {}),
    });
  };

  const inputStyle = {
    backgroundColor: "rgba(255,255,255,0.06)",
    border: "1.5px solid rgba(255,255,255,0.12)",
    color: "white",
    fontFamily: "'Inter', sans-serif",
  };

  const typeStyles: Record<CardType, { activeBg: string; activeBorder: string; activeText: string }> = {
    update: { activeBg: "rgba(5,150,105,0.15)", activeBorder: "rgba(5,150,105,0.4)", activeText: "#6EE7B7" },
    issue:  { activeBg: "rgba(217,119,6,0.15)", activeBorder: "rgba(217,119,6,0.4)", activeText: "#FCD34D" },
    task:   { activeBg: "rgba(124,58,237,0.15)", activeBorder: "rgba(124,58,237,0.4)", activeText: "#C4B5FD" },
  };

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-4"
      style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.1)" }}
    >
      {/* Type selector */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>What kind of post?</p>
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
                  backgroundColor: isActive ? s.activeBg : "rgba(255,255,255,0.04)",
                  border: `1.5px solid ${isActive ? s.activeBorder : "rgba(255,255,255,0.1)"}`,
                  color: isActive ? s.activeText : "rgba(255,255,255,0.5)",
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
          <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>Assign to:</p>
          <div className="flex gap-2">
            {(assignablePersons && assignablePersons.length > 0 ? assignablePersons.map(p => p.name) : [] as string[]).map(a => {
              const c = getAuthorColors(a);
              const isActive = assignedTo === a;
              const isSelf = a === currentUser;
              return (
                <button
                  key={a}
                  onClick={() => setAssignedTo(a)}
                  className="flex-1 py-2 rounded-lg text-[12px] font-bold transition-all"
                  style={{
                    backgroundColor: isActive ? c.btnBg : "rgba(255,255,255,0.04)",
                    border: `2px solid ${isActive ? c.btnBorder : "rgba(255,255,255,0.1)"}`,
                    color: isActive ? c.btnText : "rgba(255,255,255,0.5)",
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

      {/* Business selector */}
      {allowedBusinesses.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>Which business?</p>
          <div className="flex gap-1.5 flex-wrap">
            {allowedBusinesses.map(key => {
              const biz = (bizLabels ?? BUSINESS_LABELS)[key] ?? { label: key, icon: "🏢", bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.6)", border: "rgba(255,255,255,0.15)" };
              return (
                <button
                  key={key}
                  onClick={() => setBusiness(key)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1"
                  style={{
                    backgroundColor: business === key ? biz.bg : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${business === key ? biz.border : "rgba(255,255,255,0.1)"}`,
                    color: business === key ? biz.text : "rgba(255,255,255,0.5)",
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

      {/* Update date */}
      {type === "update" && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>Date <span className="normal-case" style={{ color: "rgba(255,255,255,0.3)" }}>(optional)</span></p>
          <input
            type="date"
            value={updateDate}
            onChange={e => setUpdateDate(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-[12px] focus:outline-none transition-colors"
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "#5EEAD4")}
            onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
          />
        </div>
      )}

      {/* Issue — meeting picker + date */}
      {type === "issue" && (
        <>
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>Discuss in: <span className="normal-case text-red-400">*</span></p>
            <div className="flex flex-col gap-1.5">
              {([
                { key: "daily_huddle",     label: "🌅 Daily Huddle",      desc: "Needs to be handled today" },
                { key: "weekly_meeting",   label: "📅 Weekly Meeting",     desc: "Can wait for the weekly sit-down" },
                { key: "quarterly_review", label: "📊 Quarterly Review",   desc: "Strategic — not urgent" },
              ] as const).map(m => (
                <button
                  key={m.key}
                  onClick={() => setMeetingType(m.key)}
                  className="w-full py-2 px-3 rounded-lg text-left transition-all"
                  style={{
                    backgroundColor: meetingType === m.key ? "rgba(217,119,6,0.15)" : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${meetingType === m.key ? "rgba(217,119,6,0.4)" : "rgba(255,255,255,0.1)"}`,
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  <span className="text-[12px] font-semibold" style={{ color: meetingType === m.key ? "#FCD34D" : "rgba(255,255,255,0.6)" }}>{m.label}</span>
                  <span className="text-[10px] ml-2" style={{ color: "rgba(255,255,255,0.35)" }}>{m.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>Meeting date <span className="normal-case" style={{ color: "rgba(255,255,255,0.3)" }}>(optional)</span></p>
            <input
              type="date"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-[12px] focus:outline-none transition-colors"
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = "#FCD34D")}
              onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
            />
          </div>
        </>
      )}

      {/* Due date — tasks only */}
      {type === "task" && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>Due date <span className="normal-case" style={{ color: "rgba(255,255,255,0.3)" }}>(optional)</span></p>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="w-full rounded-lg px-3 py-2 text-[12px] focus:outline-none transition-colors"
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "#C4B5FD")}
            onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
          />
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
        className="w-full rounded-lg px-3 py-2.5 text-[13px] placeholder-white/30 resize-none focus:outline-none transition-colors"
        style={{
          ...inputStyle,
          lineHeight: "1.6",
        }}
        onFocus={e => (e.target.style.borderColor = "rgba(255,255,255,0.25)")}
        onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
        onKeyDown={e => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
          }
        }}
      />

      {/* Notify — recipient picker */}
      {(type === "update" || type === "issue") && assignablePersons && assignablePersons.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>
            Notify <span className="normal-case" style={{ color: "rgba(255,255,255,0.3)" }}>(leave blank to notify owners only)</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {assignablePersons
              .filter(p => p.name !== currentUser)
              .map(p => {
                const selected = notifyPersonIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      setNotifyPersonIds(prev =>
                        selected ? prev.filter(id => id !== p.id) : [...prev, p.id]
                      )
                    }
                    className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all active:scale-[0.96]"
                    style={{
                      backgroundColor: selected ? "rgba(94,234,212,0.2)" : "rgba(255,255,255,0.06)",
                      color: selected ? "#5EEAD4" : "rgba(255,255,255,0.5)",
                      border: selected ? "1.5px solid rgba(94,234,212,0.4)" : "1.5px solid rgba(255,255,255,0.12)",
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    {selected ? "✓ " : ""}{p.name}
                  </button>
                );
              })
            }
          </div>
          {notifyPersonIds.length === 0 && (
            <p className="text-[10px] italic" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Inter', sans-serif" }}>
              No one selected — owners will be notified by default
            </p>
          )}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={createCard.isPending || !currentUser || !content.trim() || (type === "task" && !assignedTo)}
        className="w-full py-3 rounded-xl text-[13px] font-bold transition-all hover:opacity-90 disabled:opacity-40 active:scale-[0.97]"
        style={{
          backgroundColor: "#5EEAD4",
          color: "#0F2440",
          fontFamily: "'Space Grotesk', sans-serif",
          boxShadow: !createCard.isPending ? "0 4px 14px rgba(94,234,212,0.25)" : "none",
          letterSpacing: "0.02em",
        }}
      >
        {createCard.isPending ? "Posting…" : "📤 Post to Board"}
      </button>
    </div>
  );
}

// ─── Main Board Page ──────────────────────────────────────────────────────────

export default function Board() {
  const { currentUser } = useIdentity();
  const [filterBusiness, setFilterBusiness] = useState<Business | "all">("all");
  const [showCompleted, setShowCompleted] = useState(false);

  const { person } = usePerson();
  const accountId = person?.accountId ?? (() => {
    const stored = localStorage.getItem("bcc_account_id");
    return stored ? parseInt(stored, 10) : undefined;
  })();

  const { data: dbBusinesses = [] } = trpc.business.list.useQuery(
    { accountId: accountId ?? 0 },
    { enabled: accountId !== undefined }
  );

  const { data: personsData } = trpc.person.list.useQuery(
    { accountId: accountId ?? 0 },
    { enabled: accountId !== undefined, staleTime: 60_000 }
  );
  const allPersons = useMemo(() => (personsData ?? []).map(p => ({ id: p.id, name: p.name })), [personsData]);

  const personScope = person?.businessScope ?? "all";
  const allowedBusinesses = useMemo<Business[]>(() => {
    if (!dbBusinesses.length) return [];
    if (personScope === "all") return dbBusinesses.map(b => b.slug as Business);
    const scopes = personScope.split(",").map(s => s.trim());
    return dbBusinesses.filter(b => scopes.includes(b.slug)).map(b => b.slug as Business);
  }, [dbBusinesses, personScope]);

  const defaultBusiness = useMemo<Business>(() => allowedBusinesses[0] ?? "general" as Business, [allowedBusinesses]);

  const dynamicBizLabels = useMemo(() => {
    const labels: Record<string, { label: string; icon: string; bg: string; text: string; border: string }> = { ...BUSINESS_LABELS };
    for (const b of dbBusinesses) {
      if (!labels[b.slug]) {
        labels[b.slug] = { label: b.name, icon: b.icon, bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.6)", border: "rgba(255,255,255,0.15)" };
      } else {
        labels[b.slug] = { ...labels[b.slug], label: b.name, icon: b.icon };
      }
    }
    return labels;
  }, [dbBusinesses]);

  const { data, refetch, isLoading } = trpc.board.list.useQuery({ audience: "owner" }, {
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

  const allCards = ((data?.cards ?? []) as Card[]).filter(c =>
    (c.business === "general" || allowedBusinesses.includes(c.business)) &&
    (c.audience === "owner" || c.audience == null)
  );

  const filtered = filterBusiness === "all"
    ? allCards
    : allCards.filter(c => c.business === filterBusiness);

  const updates = filtered.filter(c => c.type === "update" && !c.archivedAt);
  const issues = filtered.filter(c => c.type === "issue" && !c.archivedAt);
  const openTasks = filtered.filter(c => c.type === "task" && !c.archivedAt && !c.completedAt);
  const donePendingTasks = filtered.filter(c => c.type === "task" && !c.archivedAt && c.completedAt && !c.confirmedAt);
  const completedTasks = filtered.filter(c => c.type === "task" && c.archivedAt && c.confirmedAt);

  const [formOpen, setFormOpen] = useState(false);

  return (
    <div
      className="flex flex-col min-h-full"
      style={{ backgroundColor: "#0A1929", fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Hero header ── */}
      <div
        className="flex-shrink-0 px-5 pt-6 pb-5"
        style={{
          background: "linear-gradient(135deg, #0D2035 0%, #0F2440 50%, #0D1F38 100%)",
          borderBottom: "1px solid rgba(94,234,212,0.12)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle glow orb */}
        <div style={{
          position: "absolute", top: "-40px", right: "-40px",
          width: "200px", height: "200px",
          background: "radial-gradient(circle, rgba(94,234,212,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div style={{
                width: 32, height: 32,
                borderRadius: "10px",
                background: "linear-gradient(135deg, rgba(94,234,212,0.2) 0%, rgba(94,234,212,0.08) 100%)",
                border: "1px solid rgba(94,234,212,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "16px",
                boxShadow: "0 0 12px rgba(94,234,212,0.15)",
              }}>⚡</div>
              <span className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: "#5EEAD4", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.15em" }}>Owner Board</span>
            </div>
            <h1 className="text-[22px] font-black text-white leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
              Your Business,<br />
              <span style={{ background: "linear-gradient(90deg, #5EEAD4, #A78BFA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>In Sync.</span>
            </h1>
            <p className="text-[12px] mt-1.5" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "'Inter', sans-serif" }}>Real-time updates between owners — no more missed conversations.</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ backgroundColor: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)" }}>
            <span className="text-[11px] font-bold" style={{ color: "#C4B5FD", fontFamily: "'Space Grotesk', sans-serif" }}>☑ {openTasks.length + donePendingTasks.length} Tasks</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ backgroundColor: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.25)" }}>
            <span className="text-[11px] font-bold" style={{ color: "#93C5FD", fontFamily: "'Space Grotesk', sans-serif" }}>📢 {updates.length} Updates</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ backgroundColor: "rgba(225,29,72,0.15)", border: "1px solid rgba(225,29,72,0.25)" }}>
            <span className="text-[11px] font-bold" style={{ color: "#FDA4AF", fontFamily: "'Space Grotesk', sans-serif" }}>🔥 {issues.length} Issues</span>
          </div>
          <div className="ml-auto">
            <button
              onClick={() => setFormOpen(o => !o)}
              className="px-4 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-[0.97]"
              style={{
                background: formOpen ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg, #5EEAD4, #38BDF8)",
                color: formOpen ? "rgba(255,255,255,0.5)" : "#0F2440",
                fontFamily: "'Space Grotesk', sans-serif",
                boxShadow: formOpen ? "none" : "0 4px 16px rgba(94,234,212,0.3), 0 2px 6px rgba(0,0,0,0.3)",
                border: formOpen ? "1px solid rgba(255,255,255,0.1)" : "none",
              }}
            >
              {formOpen ? "✕ Close" : "+ Post to Board"}
            </button>
          </div>
        </div>

        {/* Business filter pills */}
        {allowedBusinesses.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap mt-3">
            <button
              onClick={() => setFilterBusiness("all")}
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all"
              style={{
                backgroundColor: filterBusiness === "all" ? "#5EEAD4" : "rgba(255,255,255,0.06)",
                color: filterBusiness === "all" ? "#0F2440" : "rgba(255,255,255,0.5)",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              All
            </button>
            {allowedBusinesses.map(key => {
              const biz = dynamicBizLabels[key] ?? { label: key, icon: "🏢", bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.6)", border: "rgba(255,255,255,0.15)" };
              return (
                <button
                  key={key}
                  onClick={() => setFilterBusiness(key)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all"
                  style={{
                    backgroundColor: filterBusiness === key ? biz.bg : "rgba(255,255,255,0.06)",
                    color: filterBusiness === key ? biz.text : "rgba(255,255,255,0.5)",
                    border: filterBusiness === key ? `1.5px solid ${biz.border}` : "1.5px solid transparent",
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  {biz.icon} {biz.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Top bar: filter + post button ── */}
      <div
        className="flex-shrink-0 px-4 py-3 flex items-center gap-3 flex-wrap"
        style={{ backgroundColor: "#0A1929", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "none" }}
      >
        {/* Business filter pills */}
        {allowedBusinesses.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
            <button
              onClick={() => setFilterBusiness("all")}
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all"
              style={{
                backgroundColor: filterBusiness === "all" ? "#5EEAD4" : "rgba(255,255,255,0.06)",
                color: filterBusiness === "all" ? "#0F2440" : "rgba(255,255,255,0.5)",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              All
            </button>
            {allowedBusinesses.map(key => {
              const biz = dynamicBizLabels[key] ?? { label: key, icon: "🏢", bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.6)", border: "rgba(255,255,255,0.15)" };
              return (
                <button
                  key={key}
                  onClick={() => setFilterBusiness(key)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all"
                  style={{
                    backgroundColor: filterBusiness === key ? biz.bg : "rgba(255,255,255,0.06)",
                    color: filterBusiness === key ? biz.text : "rgba(255,255,255,0.5)",
                    border: filterBusiness === key ? `1.5px solid ${biz.border}` : "1.5px solid transparent",
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  {biz.icon} {biz.label}
                </button>
              );
            })}
          </div>
        )}
        <div className="ml-auto flex-shrink-0">
          <button
            onClick={() => setFormOpen(o => !o)}
            className="px-4 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-[0.97]"
            style={{
              backgroundColor: formOpen ? "rgba(255,255,255,0.08)" : "#5EEAD4",
              color: formOpen ? "rgba(255,255,255,0.5)" : "#0F2440",
              fontFamily: "'Space Grotesk', sans-serif",
              boxShadow: formOpen ? "none" : "0 2px 8px rgba(94,234,212,0.25)",
            }}
          >
            {formOpen ? "✕ Close" : "+ Post to Board"}
          </button>
        </div>
      </div>

      {/* ── Collapsible post form ── */}
      {formOpen && (
        <div
          className="flex-shrink-0 px-4 py-4"
          style={{
            background: "linear-gradient(180deg, #0D2035 0%, #0A1929 100%)",
            borderBottom: "1px solid rgba(94,234,212,0.1)",
            boxShadow: "inset 0 -1px 0 rgba(94,234,212,0.08)",
          }}
        >
          <div className="max-w-xl">
            <AddCardForm
              currentUser={currentUser}
              onAdded={() => { refetch(); setFormOpen(false); }}
              allowedBusinesses={allowedBusinesses}
              defaultBusiness={defaultBusiness}
              bizLabels={dynamicBizLabels}
              assignablePersons={allPersons}
              accountId={accountId}
            />
          </div>
        </div>
      )}

      {/* Main board */}
      <main className="flex-1 p-3 md:p-5 flex flex-col gap-5 md:gap-7">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(94,234,212,0.5)", borderTopColor: "transparent" }} />
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Loading board…</span>
            </div>
          </div>
        ) : (
          <>
            {/* ── Tasks section ── */}
            <section
              className="flex flex-col gap-3 rounded-2xl p-4"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(124,58,237,0.04) 100%)",
                border: "1.5px solid rgba(124,58,237,0.2)",
                boxShadow: "0 4px 24px rgba(124,58,237,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              <div className="flex items-center gap-3 pb-3 min-w-0" style={{ borderBottom: "1px solid rgba(124,58,237,0.25)" }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(124,58,237,0.15))", border: "1px solid rgba(124,58,237,0.4)", boxShadow: "0 0 10px rgba(124,58,237,0.2)" }}>☑</div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold text-white leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Tasks</h2>
                  <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Assigned to-dos between owners</p>
                </div>
                {openTasks.length > 0 && (
                  <span className="ml-auto text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.4), rgba(124,58,237,0.25))", color: "#C4B5FD", border: "1px solid rgba(124,58,237,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>
                    {openTasks.length}
                  </span>
                )}
              </div>

              {openTasks.length === 0 && donePendingTasks.length === 0 ? (
                <div className="rounded-2xl p-8 text-center flex flex-col items-center gap-3" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1.5px dashed rgba(124,58,237,0.3)" }}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: "rgba(124,58,237,0.15)" }}>☑</div>
                  <div>
                    <p className="text-[13px] font-semibold text-white">All clear on tasks</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Tap "+ Post to Board" above and choose Task to assign one.</p>
                  </div>
                </div>
              ) : (
                <>
                  {openTasks.map(card => (
                    <TaskCard
                      key={card.id}
                      card={card}
                      currentUser={currentUser}
                      accountId={accountId}
                      onMarkDone={id => currentUser && markDone.mutate({ id, completedBy: currentUser, ...(accountId ? { accountId } : {}) })}
                      onConfirmDone={id => currentUser && confirmDone.mutate({ id, confirmedBy: currentUser, ...(accountId ? { accountId } : {}) })}
                      onDelete={id => deleteCard.mutate({ id })}
                    />
                  ))}
                </>
              )}

              {/* Done — Awaiting Confirmation subsection */}
              {donePendingTasks.length > 0 && (
                <div className="mt-2 flex flex-col gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest px-1"
                    style={{ color: "#FCD34D", fontFamily: "'Space Grotesk', sans-serif" }}>
                    ⏳ Done — Awaiting Your Confirmation ({donePendingTasks.length})
                  </p>
                  {donePendingTasks.map(card => (
                    <TaskCard
                      key={card.id}
                      card={card}
                      currentUser={currentUser}
                      accountId={accountId}
                      onMarkDone={id => currentUser && markDone.mutate({ id, completedBy: currentUser, ...(accountId ? { accountId } : {}) })}
                      onConfirmDone={id => currentUser && confirmDone.mutate({ id, confirmedBy: currentUser, ...(accountId ? { accountId } : {}) })}
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
                    className="text-[11px] transition-colors flex items-center gap-1.5 px-1"
                    style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'Space Grotesk', sans-serif" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
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
                          accountId={accountId}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Updates */}
              <div
                className="flex flex-col gap-3 rounded-2xl p-4"
                style={{
                  background: "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(37,99,235,0.04) 100%)",
                  border: "1.5px solid rgba(37,99,235,0.2)",
                  boxShadow: "0 4px 24px rgba(37,99,235,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
                }}
              >
                <div className="flex items-center gap-3 pb-3 min-w-0" style={{ borderBottom: "1px solid rgba(37,99,235,0.25)" }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0" style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.3), rgba(37,99,235,0.15))", border: "1px solid rgba(37,99,235,0.4)", boxShadow: "0 0 10px rgba(37,99,235,0.2)" }}>✅</div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-bold text-white leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Updates</h2>
                    <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>What I did since last meeting</p>
                  </div>
                  {updates.length > 0 && (
                    <span className="ml-auto text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.4), rgba(37,99,235,0.25))", color: "#93C5FD", border: "1px solid rgba(37,99,235,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>
                      {updates.length}
                    </span>
                  )}
                </div>
                {updates.length === 0 ? (
                  <div className="rounded-xl p-6 text-center flex flex-col items-center gap-2" style={{ backgroundColor: "rgba(37,99,235,0.05)", border: "1px dashed rgba(37,99,235,0.2)" }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: "rgba(37,99,235,0.15)" }}>✅</div>
                    <div>
                      <p className="text-[12px] font-semibold text-white">No updates yet</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Share what you've been working on.</p>
                    </div>
                  </div>
                ) : (
                  updates.map(card => (
                    <BoardCard
                      key={card.id}
                      card={card}
                      currentUser={currentUser}
                      accountId={accountId}
                      onSeen={id => currentUser && markSeen.mutate({ id, seenBy: currentUser })}
                      onArchive={id => archive.mutate({ id })}
                      onDelete={id => deleteCard.mutate({ id })}
                    />
                  ))
                )}
              </div>

              {/* Issues */}
              <div
                className="flex flex-col gap-3 rounded-2xl p-4"
                style={{
                  background: "linear-gradient(135deg, rgba(225,29,72,0.08) 0%, rgba(225,29,72,0.04) 100%)",
                  border: "1.5px solid rgba(225,29,72,0.2)",
                  boxShadow: "0 4px 24px rgba(225,29,72,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
                }}
              >
                <div className="flex items-center gap-3 pb-3 min-w-0" style={{ borderBottom: "1px solid rgba(225,29,72,0.25)" }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0" style={{ background: "linear-gradient(135deg, rgba(225,29,72,0.3), rgba(225,29,72,0.15))", border: "1px solid rgba(225,29,72,0.4)", boxShadow: "0 0 10px rgba(225,29,72,0.2)" }}>💬</div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-bold text-white leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Issues</h2>
                    <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>What we need to discuss</p>
                  </div>
                  {issues.length > 0 && (
                    <span className="ml-auto text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: "linear-gradient(135deg, rgba(225,29,72,0.4), rgba(225,29,72,0.25))", color: "#FDA4AF", border: "1px solid rgba(225,29,72,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>
                      {issues.length}
                    </span>
                  )}
                </div>
                {issues.length === 0 ? (
                  <div className="rounded-xl p-6 text-center flex flex-col items-center gap-2" style={{ backgroundColor: "rgba(225,29,72,0.05)", border: "1px dashed rgba(225,29,72,0.2)" }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: "rgba(225,29,72,0.15)" }}>💬</div>
                    <div>
                      <p className="text-[12px] font-semibold text-white">No issues queued</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Queue something to discuss at the next meeting.</p>
                    </div>
                  </div>
                ) : (
                  issues.map(card => (
                    <BoardCard
                      key={card.id}
                      card={card}
                      currentUser={currentUser}
                      accountId={accountId}
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
  );
}
