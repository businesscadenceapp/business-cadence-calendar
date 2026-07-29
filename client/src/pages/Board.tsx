/**
 * Owner Board — Card-Navigation Command Center
 * Premium card-based UX: Home card → slide-in sub-cards for Tasks, Updates, Issues, Archive
 * Dark navy theme: #0F2440 bg, #5EEAD4 teal accent, white text
 */
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { usePerson } from "@/contexts/PersonContext";
import { useIdentity } from "@/components/AppShell";
import { useActiveBusiness } from "@/components/BusinessSwitcher";
import { useTour, TOUR_STORAGE_KEY, TOUR_PENDING_KEY } from "@/contexts/TourContext";

type Author = string;
type CardType = "update" | "issue" | "task";
type Business = "chiropractic" | "crossfit" | "general";

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

type Priority = "high" | "medium" | "low";

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
  attachmentsJson: string | null;
  createdAt: Date;
  priority: Priority | null;
};

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

function sortByPriority(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority ?? "medium"];
    const pb = PRIORITY_ORDER[b.priority ?? "medium"];
    return pa - pb;
  });
}

const PRIORITY_BADGE: Record<Priority, { label: string; bg: string; text: string; border: string }> = {
  high:   { label: "High",   bg: "rgba(225,29,72,0.15)",   text: "#FDA4AF", border: "rgba(225,29,72,0.3)" },
  medium: { label: "Medium", bg: "rgba(217,119,6,0.15)",   text: "#FCD34D", border: "rgba(217,119,6,0.3)" },
  low:    { label: "Low",    bg: "rgba(94,234,212,0.1)",   text: "#5EEAD4", border: "rgba(94,234,212,0.2)" },
};

// ─── Card Comments ──────────────────────────────────────────────────────────────

type Comment = {
  id: number;
  cardId: number;
  authorName: string;
  authorPersonId: string | null;
  content: string;
  attachmentsJson: string | null;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [commentAttachments, setCommentAttachments] = useState<Array<{ key: string; url: string; name: string; mimeType: string; sizeBytes: number }>>([]);
  const [uploading, setUploading] = useState(false);

  const uploadAttachment = trpc.board.uploadAttachment.useMutation();

  const handleCommentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(',')[1];
        const result = await uploadAttachment.mutateAsync({
          fileName: file.name,
          mimeType: file.type,
          base64Data: base64,
          sizeBytes: file.size,
        });
        setCommentAttachments(prev => [...prev, result]);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('Upload failed');
      setUploading(false);
    }
    e.target.value = '';
  };

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
    if (!text.trim() && commentAttachments.length === 0) return;
    addComment.mutate({
      cardId,
      authorName: currentUser,
      content: text.trim() || '📎',
      ...(commentAttachments.length > 0 ? { attachmentsJson: JSON.stringify(commentAttachments) } : {}),
      ...(accountId ? { accountId } : {}),
    });
    setCommentAttachments([]);
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
                          className="text-[10px] ml-1 transition-colors"
                          style={{ color: "rgba(255,255,255,0.2)" }}
                          onMouseEnter={e => (e.currentTarget.style.color = "#F87171")}
                          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
                        >✕</button>
                      )}
                    </div>
                    <p className="text-[12px] text-white/80 mt-0.5 leading-relaxed">{c.content}</p>
                    {c.attachmentsJson && (() => {
                      try {
                        const atts: Array<{ key: string; url: string; name: string; mimeType: string }> = JSON.parse(c.attachmentsJson);
                        return atts.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {atts.map(att => att.mimeType.startsWith('image/') ? (
                              <a key={att.key} href={att.url} target="_blank" rel="noopener noreferrer" className="block w-16 h-16 rounded-lg overflow-hidden" style={{ border: '1px solid rgba(94,234,212,0.2)' }}>
                                <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                              </a>
                            ) : (
                              <a key={att.key} href={att.url} target="_blank" rel="noopener noreferrer" className="text-[10px] px-2 py-1 rounded-md" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#5EEAD4', border: '1px solid rgba(255,255,255,0.1)' }}>
                                📎 {att.name}
                              </a>
                            ))}
                          </div>
                        ) : null;
                      } catch { return null; }
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2 mt-1">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Add a comment…"
              rows={1}
              className="flex-1 rounded-lg px-2.5 py-1.5 text-[12px] resize-none focus:outline-none"
              style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "white" }}
              onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handleSubmit(); } }}
            />
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleCommentFileChange} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-[11px] px-2 py-1.5 rounded-lg transition-all"
              style={{ color: "#5EEAD4", backgroundColor: "rgba(94,234,212,0.08)" }}
            >📎</button>
            <button
              onClick={handleSubmit}
              disabled={!text.trim() && commentAttachments.length === 0}
              className="text-[11px] px-3 py-1.5 rounded-lg font-bold transition-all disabled:opacity-30"
              style={{ backgroundColor: "#5EEAD4", color: "#0F2440" }}
            >Send</button>
          </div>
          {commentAttachments.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {commentAttachments.map((att, i) => (
                <span key={att.key} className="text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1" style={{ backgroundColor: "rgba(94,234,212,0.1)", color: "#5EEAD4" }}>
                  📎 {att.name}
                  <button onClick={() => setCommentAttachments(prev => prev.filter((_, j) => j !== i))} className="ml-0.5" style={{ color: "#F87171" }}>✕</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Task Card ──────────────────────────────────────────────────────────────────

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
  const biz = BUSINESS_LABELS[card.business] ?? { label: card.business, icon: "📋", bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.6)", border: "rgba(255,255,255,0.15)" };
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
    open:         { bg: "rgba(255,255,255,0.04)", border: "rgba(124,58,237,0.25)" },
    done_pending: { bg: "rgba(217,119,6,0.06)", border: "rgba(217,119,6,0.25)" },
    confirmed:    { bg: "rgba(5,150,105,0.06)", border: "rgba(5,150,105,0.25)" },
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
      setTimeout(() => { onMarkDone(card.id); setSwipeDx(0); setSwipeTriggered(false); }, 200);
    } else if (swipeDx <= -SWIPE_THRESHOLD && canSwipeLeft) {
      setSwipeTriggered(true);
      setTimeout(() => { onConfirmDone(card.id); setSwipeDx(0); setSwipeTriggered(false); }, 200);
    } else {
      setSwipeDx(0);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }, [swipeDx, canSwipeRight, canSwipeLeft, card.id, onMarkDone, onConfirmDone]);

  const swipeProgress = Math.abs(swipeDx) / SWIPE_THRESHOLD;
  const swipeReady = Math.abs(swipeDx) >= SWIPE_THRESHOLD;

  return (
    <div className="relative rounded-2xl overflow-hidden">
      {canSwipeRight && (
        <div className="absolute inset-0 flex items-center px-5 rounded-2xl"
          style={{ backgroundColor: swipeReady ? "#059669" : "rgba(5,150,105,0.3)", opacity: Math.min(swipeProgress, 1), transition: swipeDx === 0 ? "opacity 0.2s, background-color 0.2s" : "none" }}>
          <span className="text-white text-lg font-bold" style={{ opacity: swipeProgress > 0.3 ? 1 : 0, transition: "opacity 0.15s" }}>☑ Done</span>
        </div>
      )}
      {canSwipeLeft && (
        <div className="absolute inset-0 flex items-center justify-end px-5 rounded-2xl"
          style={{ backgroundColor: swipeReady ? "#059669" : "rgba(5,150,105,0.3)", opacity: Math.min(swipeProgress, 1), transition: swipeDx === 0 ? "opacity 0.2s, background-color 0.2s" : "none" }}>
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
          border: `1px solid ${style.border}`,
          borderRadius: "1rem",
          transform: `translateX(${swipeTriggered ? (swipeDx > 0 ? 120 : -120) : swipeDx}px)`,
          transition: swipeDx === 0 || swipeTriggered ? "transform 0.25s cubic-bezier(0.23,1,0.32,1)" : "none",
          willChange: "transform",
          touchAction: hasSwipe ? "pan-y" : "auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div className="w-full h-0.5 flex-shrink-0" style={{ backgroundColor: taskState === "confirmed" ? "#059669" : taskState === "done_pending" ? "#D97706" : "#7C3AED" }} />

        <div className="p-3.5 flex flex-col gap-2.5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0 mt-0.5"
              style={{ backgroundColor: authorColors.badgeBg, color: authorColors.badgeText }}>
              {card.author[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[12px] font-bold" style={{ color: authorColors.badgeText, fontFamily: "'Space Grotesk', sans-serif" }}>{card.author}</span>
                {card.assignedTo && (
                  <span className="text-[10px] flex items-center gap-1" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}>
                    → <span className="font-semibold" style={{ color: AUTHOR_COLORS[card.assignedTo].badgeText }}>{card.assignedTo}</span>
                  </span>
                )}
                <span className="text-[10px] ml-auto flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>{timeAgo(card.createdAt)}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                {dueLabel && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                    style={{
                      backgroundColor: isOverdue ? "rgba(185,28,28,0.2)" : isDueSoon ? "rgba(217,119,6,0.2)" : "rgba(255,255,255,0.06)",
                      color: isOverdue ? "#FCA5A5" : isDueSoon ? "#FCD34D" : "rgba(255,255,255,0.5)",
                      border: `1px solid ${isOverdue ? "rgba(185,28,28,0.3)" : isDueSoon ? "rgba(217,119,6,0.3)" : "rgba(255,255,255,0.1)"}`,
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}>
                    {isOverdue ? "⚠️" : "📅"} {isOverdue ? "Overdue" : "Due"} {dueLabel}
                  </span>
                )}
                {(() => {
                  const p = (card.priority ?? "medium") as Priority;
                  const pb = PRIORITY_BADGE[p];
                  return (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: pb.bg, color: pb.text, border: `1px solid ${pb.border}`, fontFamily: "'Space Grotesk', sans-serif" }}>
                      {p === "high" ? "🔴" : p === "medium" ? "🟡" : "🟢"} {pb.label}
                    </span>
                  );
                })()}
              </div>
              <p className="text-[13px] text-white leading-relaxed">{card.content}</p>
            </div>
          </div>

          {isDone && (
            <p className="text-[10px] italic pl-11" style={{ color: "rgba(255,255,255,0.35)" }}>
              Marked done by <span style={{ color: card.completedBy ? AUTHOR_COLORS[card.completedBy].badgeText : "rgba(255,255,255,0.5)" }}>{card.completedBy}</span> · {timeAgo(card.completedAt!)}
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap pl-11">
            {taskState === "done_pending" && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: "rgba(217,119,6,0.15)", color: "#FCD34D", border: "1px solid rgba(217,119,6,0.25)", fontFamily: "'Space Grotesk', sans-serif" }}>⏳ Awaiting Confirmation</span>
            )}
            {taskState === "confirmed" && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: "rgba(5,150,105,0.15)", color: "#6EE7B7", border: "1px solid rgba(5,150,105,0.25)", fontFamily: "'Space Grotesk', sans-serif" }}>✓ Done</span>
            )}
            {taskState === "open" && !isDoer && currentUser && (
              <span className="text-[10px] italic" style={{ color: "rgba(255,255,255,0.3)" }}>Waiting for {card.assignedTo ?? "assignee"}</span>
            )}
            {taskState === "done_pending" && !isRequester && currentUser && (
              <span className="text-[10px] italic" style={{ color: "rgba(255,255,255,0.3)" }}>Waiting for {card.author} to confirm</span>
            )}

            <div className="ml-auto flex items-center gap-2">
              {taskState === "open" && isDoer && (
                <button onClick={() => onMarkDone(card.id)}
                  className="text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all active:scale-[0.97]"
                  style={{ backgroundColor: "rgba(5,150,105,0.15)", border: "1px solid rgba(5,150,105,0.3)", color: "#6EE7B7", fontFamily: "'Space Grotesk', sans-serif" }}>
                  ☑ Mark Done
                </button>
              )}
              {taskState === "done_pending" && isRequester && (
                <button onClick={() => onConfirmDone(card.id)}
                  className="text-[11px] px-3 py-1.5 rounded-lg font-bold transition-all active:scale-[0.97]"
                  style={{ backgroundColor: "rgba(5,150,105,0.2)", border: "1px solid rgba(5,150,105,0.4)", color: "#6EE7B7", fontFamily: "'Space Grotesk', sans-serif" }}>
                  ✓ Confirm Done
                </button>
              )}
              {card.author === currentUser && (
                <button onClick={() => onDelete(card.id)}
                  className="text-[11px] px-2 py-1.5 rounded-lg transition-all"
                  style={{ color: "rgba(255,255,255,0.2)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#F87171")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}>✕</button>
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
  const biz = BUSINESS_LABELS[card.business] ?? { label: card.business, icon: "📋", bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.6)", border: "rgba(255,255,255,0.15)" };
  const isOwnCard = card.author === currentUser;
  const alreadySeen = !!card.seenAt;

  return (
    <div
      className="rounded-2xl flex flex-col gap-0 transition-all duration-200 overflow-hidden"
      style={{
        backgroundColor: alreadySeen ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${alreadySeen ? "rgba(255,255,255,0.06)" : colors.border}`,
        opacity: alreadySeen ? 0.55 : 1,
      }}
    >
      <div className="w-full h-0.5 flex-shrink-0" style={{ backgroundColor: alreadySeen ? "rgba(255,255,255,0.08)" : colors.dot }} />

      <div className="p-3.5 flex flex-col gap-2.5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0 mt-0.5"
            style={{ backgroundColor: colors.badgeBg, color: colors.badgeText }}>
            {card.author[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[12px] font-bold" style={{ color: colors.badgeText, fontFamily: "'Space Grotesk', sans-serif" }}>{card.author}</span>
              <span className="text-[10px] ml-auto flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>{timeAgo(card.createdAt)}</span>
            </div>
            <p className="text-[13px] text-white leading-relaxed">{card.content}</p>
            {card.attachmentsJson && (() => {
              try {
                const atts: Array<{ key: string; url: string; name: string; mimeType: string; sizeBytes: number }> = JSON.parse(card.attachmentsJson);
                if (!atts.length) return null;
                return (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {atts.map(att => att.mimeType.startsWith('image/') ? (
                      <a key={att.key} href={att.url} target="_blank" rel="noopener noreferrer" className="block w-20 h-20 rounded-lg overflow-hidden" style={{ border: '1px solid rgba(94,234,212,0.2)' }}>
                        <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                      </a>
                    ) : (
                      <a key={att.key} href={att.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] transition-opacity hover:opacity-80"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#5EEAD4' }}>
                        📎 <span className="max-w-[100px] truncate">{att.name}</span>
                      </a>
                    ))}
                  </div>
                );
              } catch { return null; }
            })()}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap pl-11">
          {alreadySeen && (
            <span className="text-[10px] flex items-center gap-1" style={{ color: "rgba(255,255,255,0.3)" }}>
              <span style={{ color: "#6EE7B7" }}>✓</span> Seen by {card.seenBy}
            </span>
          )}
          {!alreadySeen && isOwnCard && (
            <span className="text-[10px] italic" style={{ color: "rgba(255,255,255,0.3)" }}>Awaiting acknowledgement</span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {!isOwnCard && !alreadySeen && (
              <button onClick={() => onSeen(card.id)}
                className="text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all active:scale-[0.97]"
                style={{ backgroundColor: "rgba(5,150,105,0.15)", border: "1px solid rgba(5,150,105,0.3)", color: "#6EE7B7", fontFamily: "'Space Grotesk', sans-serif" }}>
                ✓ Seen
              </button>
            )}
            <button onClick={() => onArchive(card.id)}
              className="text-[11px] px-2.5 py-1.5 rounded-lg transition-all hover:opacity-80"
              style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)", fontFamily: "'Space Grotesk', sans-serif" }}>
              Archive
            </button>
            {isOwnCard && (
              <button onClick={() => onDelete(card.id)}
                className="text-[11px] px-2 py-1.5 rounded-lg transition-all"
                style={{ color: "rgba(255,255,255,0.2)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#F87171")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}>✕</button>
            )}
          </div>
          <CardComments cardId={card.id} currentUser={currentUser} accountId={accountId} />
        </div>
      </div>
    </div>
  );
}

// ─── Add Card Form (Bottom Sheet) ────────────────────────────────────────────

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
  const [priority, setPriority] = useState<Priority>("medium");
  const [pendingAttachments, setPendingAttachments] = useState<Array<{ key: string; url: string; name: string; mimeType: string; sizeBytes: number }>>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadAttachment = trpc.board.uploadAttachment.useMutation();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) { toast.error("File too large (max 16 MB)"); return; }
    setUploadingFile(true);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => { resolve((reader.result as string).split(',')[1]); };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await uploadAttachment.mutateAsync({
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        base64Data,
        sizeBytes: file.size,
        accountId: accountId ?? 0,
      });
      setPendingAttachments(prev => [...prev, result]);
      toast.success('File attached');
    } catch {
      toast.error('Failed to upload file');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const createCard = trpc.board.create.useMutation({
    onSuccess: () => {
      setContent(""); setAssignedTo(null); setDueDate(""); setUpdateDate("");
      setMeetingType(null); setScheduledDate(""); setNotifyPersonIds([]); setPriority("medium"); setPendingAttachments([]);
      onAdded();
      toast.success("Posted to the board");
    },
    onError: () => toast.error("Failed to post card"),
  });

  const { data: bhStatus } = trpc.businessHours.checkStatus.useQuery(
    { accountId: accountId! },
    { enabled: accountId !== undefined, staleTime: 60_000 }
  );

  const handleSubmit = () => {
    const SESSION_KEY = "bh_after_hours_shown";
    if (bhStatus && (!bhStatus.withinHours || bhStatus.dndActive) && !sessionStorage.getItem(SESSION_KEY)) {
      sessionStorage.setItem(SESSION_KEY, "1");
      const msg = bhStatus.dndActive
        ? "You're Off the Clock. Your partner won't be notified until you go back online."
        : bhStatus.nextStartTime
          ? `You're posting after business hours. Your partner won't be notified until ${bhStatus.nextStartTime}.`
          : "You're posting after business hours. Your partner won't be notified until business hours resume.";
      toast(msg, { icon: "🌙", duration: 6000 });
    }
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
      ...(pendingAttachments.length > 0 ? { attachmentsJson: JSON.stringify(pendingAttachments) } : {}),
      priority,
    });
  };

  const inputStyle = { backgroundColor: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", color: "white", fontFamily: "'Inter', sans-serif" };
  const typeStyles: Record<CardType, { activeBg: string; activeBorder: string; activeText: string }> = {
    update: { activeBg: "rgba(5,150,105,0.15)", activeBorder: "rgba(5,150,105,0.4)", activeText: "#6EE7B7" },
    issue:  { activeBg: "rgba(217,119,6,0.15)", activeBorder: "rgba(217,119,6,0.4)", activeText: "#FCD34D" },
    task:   { activeBg: "rgba(124,58,237,0.15)", activeBorder: "rgba(124,58,237,0.4)", activeText: "#C4B5FD" },
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Type selector */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>What kind of post?</p>
        <div className="flex flex-col gap-1.5">
          {(["update", "issue", "task"] as CardType[]).map(t => {
            const s = typeStyles[t];
            const isActive = type === t;
            const labels: Record<CardType, string> = { update: "✅ Update — What I did", issue: "💬 Issue — Need to discuss", task: "☑ Task — Assign to someone" };
            return (
              <button key={t} onClick={() => setType(t)}
                className="w-full py-2 rounded-lg text-[11px] font-semibold transition-all text-left px-3 active:scale-[0.98]"
                style={{ backgroundColor: isActive ? s.activeBg : "rgba(255,255,255,0.03)", border: `1.5px solid ${isActive ? s.activeBorder : "rgba(255,255,255,0.08)"}`, color: isActive ? s.activeText : "rgba(255,255,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}>
                {labels[t]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Assign to (tasks) */}
      {type === "task" && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>Assign to:</p>
          <div className="flex gap-2">
            {(assignablePersons && assignablePersons.length > 0 ? assignablePersons.map(p => p.name) : [] as string[]).map(a => {
              const c = getAuthorColors(a);
              const isActive = assignedTo === a;
              const isSelf = a === currentUser;
              return (
                <button key={a} onClick={() => setAssignedTo(a)}
                  className="flex-1 py-2 rounded-lg text-[12px] font-bold transition-all active:scale-[0.97]"
                  style={{ backgroundColor: isActive ? c.btnBg : "rgba(255,255,255,0.03)", border: `1.5px solid ${isActive ? c.btnBorder : "rgba(255,255,255,0.08)"}`, color: isActive ? c.btnText : "rgba(255,255,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}>
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
                <button key={key} onClick={() => setBusiness(key)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 active:scale-[0.97]"
                  style={{ backgroundColor: business === key ? biz.bg : "rgba(255,255,255,0.03)", border: `1.5px solid ${business === key ? biz.border : "rgba(255,255,255,0.08)"}`, color: business === key ? biz.text : "rgba(255,255,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}>
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
          <input type="date" value={updateDate} onChange={e => setUpdateDate(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-[12px] focus:outline-none transition-colors" style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "#5EEAD4")} onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
        </div>
      )}

      {/* Issue — meeting picker + date */}
      {type === "issue" && (
        <>
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>Discuss in: <span className="normal-case text-red-400">*</span></p>
            <div className="flex flex-col gap-1.5">
              {([
                { key: "daily_huddle", label: "🌅 Daily Huddle", desc: "Needs to be handled today" },
                { key: "weekly_meeting", label: "📅 Weekly Meeting", desc: "Can wait for the weekly sit-down" },
                { key: "quarterly_review", label: "📊 Quarterly Review", desc: "Strategic — not urgent" },
              ] as const).map(m => (
                <button key={m.key} onClick={() => setMeetingType(m.key)}
                  className="w-full py-2 px-3 rounded-lg text-left transition-all active:scale-[0.98]"
                  style={{ backgroundColor: meetingType === m.key ? "rgba(217,119,6,0.15)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${meetingType === m.key ? "rgba(217,119,6,0.4)" : "rgba(255,255,255,0.08)"}`, fontFamily: "'Space Grotesk', sans-serif" }}>
                  <span className="text-[12px] font-semibold" style={{ color: meetingType === m.key ? "#FCD34D" : "rgba(255,255,255,0.6)" }}>{m.label}</span>
                  <span className="text-[10px] ml-2" style={{ color: "rgba(255,255,255,0.35)" }}>{m.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>Meeting date <span className="normal-case" style={{ color: "rgba(255,255,255,0.3)" }}>(optional)</span></p>
            <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-[12px] focus:outline-none transition-colors" style={inputStyle}
              onFocus={e => (e.target.style.borderColor = "#FCD34D")} onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
          </div>
        </>
      )}

      {/* Due date — tasks */}
      {type === "task" && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>Due date <span className="normal-case" style={{ color: "rgba(255,255,255,0.3)" }}>(optional)</span></p>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} min={new Date().toISOString().split("T")[0]}
            className="w-full rounded-lg px-3 py-2 text-[12px] focus:outline-none transition-colors" style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "#C4B5FD")} onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
        </div>
      )}

      {/* Content */}
      <textarea value={content} onChange={e => setContent(e.target.value)}
        placeholder={type === "update" ? "What did you do since the last meeting?" : type === "issue" ? "What do we need to discuss at the next meeting?" : assignedTo ? `What needs to be done by ${assignedTo}?` : "Describe the task…"}
        rows={3}
        className="w-full rounded-lg px-3 py-2.5 text-[13px] placeholder-white/30 resize-none focus:outline-none transition-colors"
        style={{ ...inputStyle, lineHeight: "1.6" }}
        onFocus={e => (e.target.style.borderColor = "rgba(255,255,255,0.25)")} onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
        onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handleSubmit(); } }} />

      {/* Priority selector — tasks and issues only */}
      {(type === "task" || type === "issue") && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>Priority</p>
          <div className="flex gap-2">
            {(["high", "medium", "low"] as Priority[]).map(p => {
              const pb = PRIORITY_BADGE[p];
              const isActive = priority === p;
              return (
                <button key={p} type="button" onClick={() => setPriority(p)}
                  className="flex-1 py-2 rounded-lg text-[11px] font-bold transition-all active:scale-[0.97]"
                  style={{ backgroundColor: isActive ? pb.bg : "rgba(255,255,255,0.03)", border: `1.5px solid ${isActive ? pb.border : "rgba(255,255,255,0.08)"}`, color: isActive ? pb.text : "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>
                  {p === "high" ? "🔴" : p === "medium" ? "🟡" : "🟢"} {pb.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Attachment picker */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv" className="hidden" onChange={handleFileSelect} />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all active:scale-[0.97] disabled:opacity-50"
            style={{ backgroundColor: "rgba(94,234,212,0.08)", border: "1.5px solid rgba(94,234,212,0.2)", color: "#5EEAD4", fontFamily: "'Space Grotesk', sans-serif" }}>
            📎 {uploadingFile ? "Uploading…" : "Attach photo or file"}
          </button>
          {pendingAttachments.length > 0 && (
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>{pendingAttachments.length} file{pendingAttachments.length !== 1 ? "s" : ""} attached</span>
          )}
        </div>
        {pendingAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pendingAttachments.map((att, i) => (
              <div key={att.key} className="relative group">
                {att.mimeType.startsWith('image/') ? (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden" style={{ border: "1px solid rgba(94,234,212,0.2)" }}>
                    <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setPendingAttachments(prev => prev.filter((_, j) => j !== i))}
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: "rgba(0,0,0,0.7)", color: "#F87171" }}>✕</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <span className="text-[10px] max-w-[80px] truncate" style={{ color: "rgba(255,255,255,0.6)" }}>📎 {att.name}</span>
                    <button type="button" onClick={() => setPendingAttachments(prev => prev.filter((_, j) => j !== i))}
                      className="text-[9px] ml-1" style={{ color: "#F87171" }}>✕</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notify */}
      {(type === "update" || type === "issue") && assignablePersons && assignablePersons.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>
            Notify <span className="normal-case" style={{ color: "rgba(255,255,255,0.3)" }}>(leave blank to notify owners only)</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {assignablePersons.filter(p => p.name !== currentUser).map(p => {
              const selected = notifyPersonIds.includes(p.id);
              return (
                <button key={p.id} type="button"
                  onClick={() => setNotifyPersonIds(prev => selected ? prev.filter(id => id !== p.id) : [...prev, p.id])}
                  className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all active:scale-[0.96]"
                  style={{ backgroundColor: selected ? "rgba(94,234,212,0.15)" : "rgba(255,255,255,0.04)", color: selected ? "#5EEAD4" : "rgba(255,255,255,0.5)", border: selected ? "1.5px solid rgba(94,234,212,0.3)" : "1.5px solid rgba(255,255,255,0.08)", fontFamily: "'Space Grotesk', sans-serif" }}>
                  {selected ? "✓ " : ""}{p.name}
                </button>
              );
            })}
          </div>
          {notifyPersonIds.length === 0 && (
            <p className="text-[10px] italic" style={{ color: "rgba(255,255,255,0.3)" }}>No one selected — owners will be notified by default</p>
          )}
        </div>
      )}

      <button onClick={handleSubmit}
        disabled={createCard.isPending || !currentUser || !content.trim() || (type === "task" && !assignedTo)}
        className="w-full py-3 rounded-xl text-[13px] font-bold transition-all hover:opacity-90 disabled:opacity-40 active:scale-[0.97]"
        style={{ backgroundColor: "#5EEAD4", color: "#0F2440", fontFamily: "'Space Grotesk', sans-serif", boxShadow: !createCard.isPending ? "0 4px 14px rgba(94,234,212,0.25)" : "none", letterSpacing: "0.02em" }}>
        {createCard.isPending ? "Posting…" : "📤 Post to Board"}
      </button>
    </div>
  );
}

// ─── Category Tile (Home Card) ───────────────────────────────────────────────

type CategoryKey = "tasks" | "updates" | "issues" | "archive";
type TileKey = CategoryKey | "needs_attention";

const CATEGORIES: { key: CategoryKey; label: string; icon: string; gradient: string; border: string; glow: string; textColor: string; countBg: string }[] = [
  { key: "tasks", label: "Tasks", icon: "☑", gradient: "linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(124,58,237,0.06) 100%)", border: "rgba(124,58,237,0.3)", glow: "rgba(124,58,237,0.12)", textColor: "#C4B5FD", countBg: "rgba(124,58,237,0.25)" },
  { key: "updates", label: "Updates", icon: "✅", gradient: "linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(37,99,235,0.06) 100%)", border: "rgba(37,99,235,0.3)", glow: "rgba(37,99,235,0.12)", textColor: "#93C5FD", countBg: "rgba(37,99,235,0.25)" },
  { key: "issues", label: "Issues", icon: "🔥", gradient: "linear-gradient(135deg, rgba(225,29,72,0.15) 0%, rgba(225,29,72,0.06) 100%)", border: "rgba(225,29,72,0.3)", glow: "rgba(225,29,72,0.12)", textColor: "#FDA4AF", countBg: "rgba(225,29,72,0.25)" },
  { key: "archive", label: "Archive", icon: "__folder__", gradient: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)", border: "rgba(255,255,255,0.12)", glow: "rgba(255,255,255,0.04)", textColor: "rgba(255,255,255,0.6)", countBg: "rgba(255,255,255,0.08)" },
];

// Needs Attention tile — shown as 4th tile replacing Archive in the 2×2 grid
const NEEDS_ATTENTION_META = {
  key: "needs_attention" as const,
  label: "Needs Attention",
  icon: "❗",
  gradient: "linear-gradient(135deg, rgba(251,191,36,0.18) 0%, rgba(251,191,36,0.07) 100%)",
  border: "rgba(251,191,36,0.38)",
  glow: "rgba(251,191,36,0.14)",
  textColor: "#FDE68A",
  countBg: "rgba(251,191,36,0.28)",
};

type TileMeta = { key: string; label: string; icon: string; gradient: string; border: string; glow: string; textColor: string; countBg: string };
function CategoryTile({ cat, count, onClick, delay }: { cat: TileMeta; count: number; onClick: () => void; delay: number }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.97]"
      style={{
        background: cat.gradient,
        border: `1px solid ${cat.border}`,
        boxShadow: `0 4px 20px ${cat.glow}`,
        animationDelay: `${delay}ms`,
        animation: "tileEnter 0.4s cubic-bezier(0.23,1,0.32,1) both",
      }}
    >
      <div className="text-2xl">{cat.icon}</div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: cat.textColor, fontFamily: "'Space Grotesk', sans-serif" }}>{cat.label}</span>
        {count > 0 && (
          <span className="text-[18px] font-black" style={{ color: "white", fontFamily: "'Space Grotesk', sans-serif" }}>{count}</span>
        )}
        {count === 0 && (
          <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.3)" }}>—</span>
        )}
      </div>
    </button>
  );
}

// ─── Bottom Sheet Overlay ────────────────────────────────────────────────────

function BottomSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", animation: "fadeIn 0.2s ease-out" }}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl p-5 pb-8"
        style={{
          backgroundColor: "#0D2035",
          border: "1px solid rgba(94,234,212,0.15)",
          borderBottom: "none",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.5), 0 -2px 20px rgba(94,234,212,0.08)",
          animation: "sheetSlideUp 0.35s cubic-bezier(0.23,1,0.32,1) both",
        }}
      >
        {/* Handle bar */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Sub-Card View (slide-in panel) ──────────────────────────────────────────

function SubCardView({ title, icon, accentColor, onBack, children }: {
  title: string;
  icon: string;
  accentColor: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col min-h-full"
      style={{ animation: "cardSlideInRight 0.3s cubic-bezier(0.23,1,0.32,1) both" }}
    >
      {/* Sub-card header */}
      <div
        className="flex-shrink-0 px-5 pt-5 pb-4 flex items-center gap-3"
        style={{ borderBottom: `1px solid ${accentColor}22` }}
      >
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-[0.9] hover:scale-[1.05]"
          style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div className="flex items-center gap-2">
          {icon === "__folder__" ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          ) : (
            <span className="text-lg">{icon}</span>
          )}
          <h2 className="text-[16px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h2>
        </div>
      </div>
      {/* Sub-card content */}
      <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

// ─── Main Board Page ──────────────────────────────────────────────────────────

function bizKeyToEnum(key: string): Business | "all" {
  if (key === "chiro") return "chiropractic";
  if (key === "crossfit") return "crossfit";
  return "all";
}

export default function Board() {
  const { currentUser } = useIdentity();
  const { person } = usePerson();
  const { activeBusiness } = useActiveBusiness(person?.businessScope);
  const filterBusiness: Business | "all" = bizKeyToEnum(activeBusiness);
  const [activeView, setActiveView] = useState<CategoryKey | "needs_attention" | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [needsAttnSection, setNeedsAttnSection] = useState<"tasks" | "issues">("tasks");
  const { replay, registerRef, active: tourActive } = useTour();
  const [profileDeferred, setProfileDeferred] = useState(false);

  // Start the tour on first Board visit after onboarding
  useEffect(() => {
    const pending = localStorage.getItem(TOUR_PENDING_KEY);
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    // Show tour if: explicit replay request from Settings, OR first-ever Board visit
    if (pending === "1" || !completed) {
      const t = setTimeout(() => {
        localStorage.removeItem(TOUR_PENDING_KEY);
        replay(); // replay() clears completion key and sets active=true
      }, 800);
      return () => clearTimeout(t);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const accountId = person?.accountId ?? (() => {
    const stored = localStorage.getItem("bcc_account_id");
    return stored ? parseInt(stored, 10) : undefined;
  })();

  // Quick onboarding defers goals/KPIs/meeting setup — surface a prompt to finish
  useEffect(() => {
    if (!accountId) return;
    try {
      setProfileDeferred(localStorage.getItem("bcc_profile_deferred_" + accountId) === "1");
    } catch { /* ignore */ }
  }, [accountId]);

  const dismissProfilePrompt = () => {
    if (accountId) {
      try { localStorage.removeItem("bcc_profile_deferred_" + accountId); } catch { /* ignore */ }
    }
    setProfileDeferred(false);
  };

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

  const { data, refetch, isLoading } = trpc.board.list.useQuery({ audience: "owner", personId: person?.id }, {
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
    : allCards.filter(c => c.business === filterBusiness || c.business === "general");

  const updates = filtered.filter(c => c.type === "update" && !c.archivedAt);
  const issues = sortByPriority(filtered.filter(c => c.type === "issue" && !c.archivedAt));
  const openTasks = filtered.filter(c => c.type === "task" && !c.archivedAt && !c.completedAt);
  const donePendingTasks = filtered.filter(c => c.type === "task" && !c.archivedAt && c.completedAt && !c.confirmedAt);
  const completedTasks = filtered.filter(c => c.type === "task" && c.archivedAt && c.confirmedAt);
  const archivedCards = filtered.filter(c => !!c.archivedAt);

  const counts: Record<CategoryKey, number> = {
    tasks: openTasks.length + donePendingTasks.length,
    updates: updates.length,
    issues: issues.length,
    archive: archivedCards.length,
  };

  // ── Render ──

  // If a sub-card is active, show it
  if (activeView) {
    const isNeedsAttn = activeView === "needs_attention";
    const catMeta = isNeedsAttn
      ? { label: "Needs Attention", icon: "❗", border: "rgba(245,158,11,0.5)" }
      : CATEGORIES.find(c => c.key === activeView)!;
    return (
      <div className="flex flex-col min-h-full" style={{ backgroundColor: "#0A1929", fontFamily: "'Inter', sans-serif" }}>
        <SubCardView title={catMeta.label} icon={catMeta.icon} accentColor={catMeta.border} onBack={() => setActiveView(null)}>
          {isNeedsAttn && (
            <>
              {/* Unified combined list */}
              {openTasks.length === 0 && donePendingTasks.length === 0 && issues.length === 0 ? (
                <EmptyState icon="✅" title="Nothing needs attention" subtitle="You're all caught up — no open tasks or unresolved issues." />
              ) : (
                <>
                  {/* Open tasks section */}
                  {(openTasks.length > 0 || donePendingTasks.length > 0) && (
                    <>
                      <p className="text-[10px] font-bold uppercase tracking-widest px-1 mb-2" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'Space Grotesk', sans-serif" }}>
                        ☑ Open Tasks ({openTasks.length + donePendingTasks.length})
                      </p>
                      {openTasks.map(card => (
                        <TaskCard key={card.id} card={card} currentUser={currentUser} accountId={accountId}
                          onMarkDone={id => currentUser && markDone.mutate({ id, completedBy: currentUser, ...(accountId ? { accountId } : {}) })}
                          onConfirmDone={id => currentUser && confirmDone.mutate({ id, confirmedBy: currentUser, ...(accountId ? { accountId } : {}) })}
                          onDelete={id => deleteCard.mutate({ id })} />
                      ))}
                      {donePendingTasks.map(card => (
                        <TaskCard key={card.id} card={card} currentUser={currentUser} accountId={accountId}
                          onMarkDone={id => currentUser && markDone.mutate({ id, completedBy: currentUser, ...(accountId ? { accountId } : {}) })}
                          onConfirmDone={id => currentUser && confirmDone.mutate({ id, confirmedBy: currentUser, ...(accountId ? { accountId } : {}) })}
                          onDelete={id => deleteCard.mutate({ id })} />
                      ))}
                    </>
                  )}
                  {/* Issues section */}
                  {issues.length > 0 && (
                    <>
                      <p className="text-[10px] font-bold uppercase tracking-widest px-1 mb-2 mt-4" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'Space Grotesk', sans-serif" }}>
                        🔥 Issues ({issues.length})
                      </p>
                      {issues.map(card => (
                        <BoardCard key={card.id} card={card} currentUser={currentUser} accountId={accountId}
                          onSeen={id => currentUser && markSeen.mutate({ id, seenBy: currentUser })}
                          onArchive={id => archive.mutate({ id })} onDelete={id => deleteCard.mutate({ id })} />
                      ))}
                    </>
                  )}
                </>
              )}
            </>
          )}
          {!isNeedsAttn && activeView === "tasks" && (
            <>
              {openTasks.length === 0 && donePendingTasks.length === 0 && completedTasks.length === 0 ? (
                <EmptyState icon="☑" title="All clear on tasks" subtitle="Post a task to assign something to your partner." />
              ) : (
                <>
                  {openTasks.map(card => (
                    <TaskCard key={card.id} card={card} currentUser={currentUser} accountId={accountId}
                      onMarkDone={id => currentUser && markDone.mutate({ id, completedBy: currentUser, ...(accountId ? { accountId } : {}) })}
                      onConfirmDone={id => currentUser && confirmDone.mutate({ id, confirmedBy: currentUser, ...(accountId ? { accountId } : {}) })}
                      onDelete={id => deleteCard.mutate({ id })} />
                  ))}
                  {donePendingTasks.length > 0 && (
                    <div className="flex flex-col gap-2 mt-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest px-1" style={{ color: "#FCD34D", fontFamily: "'Space Grotesk', sans-serif" }}>
                        ⏳ Done — Awaiting Confirmation ({donePendingTasks.length})
                      </p>
                      {donePendingTasks.map(card => (
                        <TaskCard key={card.id} card={card} currentUser={currentUser} accountId={accountId}
                          onMarkDone={id => currentUser && markDone.mutate({ id, completedBy: currentUser, ...(accountId ? { accountId } : {}) })}
                          onConfirmDone={id => currentUser && confirmDone.mutate({ id, confirmedBy: currentUser, ...(accountId ? { accountId } : {}) })}
                          onDelete={id => deleteCard.mutate({ id })} />
                      ))}
                    </div>
                  )}
                  {completedTasks.length > 0 && (
                    <div className="mt-2">
                      <button onClick={() => setShowCompleted(v => !v)}
                        className="text-[11px] transition-colors flex items-center gap-1.5 px-1"
                        style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'Space Grotesk', sans-serif" }}>
                        {showCompleted ? "▾" : "▸"} Completed ({completedTasks.length})
                      </button>
                      {showCompleted && (
                        <div className="mt-2 flex flex-col gap-2 opacity-60">
                          {completedTasks.map(card => (
                            <TaskCard key={card.id} card={card} currentUser={currentUser} accountId={accountId}
                              onMarkDone={() => {}} onConfirmDone={() => {}} onDelete={id => deleteCard.mutate({ id })} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {activeView === "updates" && (
            <>
              {updates.length === 0 ? (
                <EmptyState icon="✅" title="No updates yet" subtitle="Share what you've been working on." />
              ) : (
                updates.map(card => (
                  <BoardCard key={card.id} card={card} currentUser={currentUser} accountId={accountId}
                    onSeen={id => currentUser && markSeen.mutate({ id, seenBy: currentUser })}
                    onArchive={id => archive.mutate({ id })} onDelete={id => deleteCard.mutate({ id })} />
                ))
              )}
            </>
          )}

          {activeView === "issues" && (
            <>
              {issues.length === 0 ? (
                <EmptyState icon="🔥" title="No issues queued" subtitle="Queue something to discuss at the next meeting." />
              ) : (
                issues.map(card => (
                  <BoardCard key={card.id} card={card} currentUser={currentUser} accountId={accountId}
                    onSeen={id => currentUser && markSeen.mutate({ id, seenBy: currentUser })}
                    onArchive={id => archive.mutate({ id })} onDelete={id => deleteCard.mutate({ id })} />
                ))
              )}
            </>
          )}

          {activeView === "archive" && (
            <>
              {archivedCards.length === 0 ? (
                <EmptyState icon="🗂" title="Archive is empty" subtitle="Archived posts will appear here." />
              ) : (
                archivedCards.map(card => (
                  card.type === "task" ? (
                    <TaskCard key={card.id} card={card} currentUser={currentUser} accountId={accountId}
                      onMarkDone={() => {}} onConfirmDone={() => {}} onDelete={id => deleteCard.mutate({ id })} />
                  ) : (
                    <BoardCard key={card.id} card={card} currentUser={currentUser} accountId={accountId}
                      onSeen={() => {}} onArchive={() => {}} onDelete={id => deleteCard.mutate({ id })} />
                  )
                ))
              )}
            </>
          )}
        </SubCardView>

        {/* FAB for post */}
        <button
          onClick={() => setSheetOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all active:scale-[0.9] hover:scale-[1.05] z-40"
          style={{
            background: "linear-gradient(135deg, #5EEAD4, #38BDF8)",
            boxShadow: "0 6px 24px rgba(94,234,212,0.4), 0 2px 8px rgba(0,0,0,0.3)",
          }}
        >+</button>

        <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
          <AddCardForm currentUser={currentUser} onAdded={() => { refetch(); setSheetOpen(false); }}
            allowedBusinesses={allowedBusinesses} defaultBusiness={defaultBusiness}
            bizLabels={dynamicBizLabels} assignablePersons={allPersons} accountId={accountId} />
        </BottomSheet>
      </div>
    );
  }

  // ── Home Card View ──
  return (
    <div
      className="flex flex-col min-h-full"
      style={{ backgroundColor: "#0A1929", fontFamily: "'Inter', sans-serif" }}
    >
      {/* Hero */}
      <div
        className="flex-shrink-0 px-5 pt-4 pb-4"
        style={{
          background: "linear-gradient(160deg, #0D2035 0%, #0F2440 40%, #0D1F38 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient glow */}
        <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "240px", height: "240px", background: "radial-gradient(circle, rgba(94,234,212,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-40px", left: "-40px", width: "180px", height: "180px", background: "radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div className="flex items-center gap-2.5 mb-2">
          <div style={{
            width: 36, height: 36, borderRadius: "12px",
            background: "linear-gradient(135deg, rgba(94,234,212,0.2) 0%, rgba(94,234,212,0.08) 100%)",
            border: "1px solid rgba(94,234,212,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px",
            boxShadow: "0 0 16px rgba(94,234,212,0.15)",
          }}>⚡</div>
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

      {/* Category Tiles Grid */}
      <div className="flex-1 px-5 py-3">
        {/* Complete your profile prompt (quick onboarding deferred full setup) */}
        {profileDeferred && (
          <div
            className="mb-4 rounded-2xl p-4 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(94,234,212,0.12), rgba(56,189,248,0.08))",
              border: "1px solid rgba(94,234,212,0.3)",
            }}
          >
            <button
              onClick={dismissProfilePrompt}
              aria-label="Dismiss"
              className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all active:scale-95"
              style={{ color: "rgba(255,255,255,0.4)", backgroundColor: "rgba(255,255,255,0.06)" }}
            >✕</button>
            <div className="flex items-start gap-3 pr-8">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ backgroundColor: "rgba(94,234,212,0.15)", border: "1px solid rgba(94,234,212,0.3)" }}>
                🎯
              </div>
              <div>
                <p className="text-[14px] font-bold text-white mb-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Complete your business profile
                </p>
                <p className="text-[12px] mb-2.5" style={{ color: "rgba(255,255,255,0.55)", lineHeight: "1.5" }}>
                  Add your goals, KPIs, and meeting rhythm — about 3 more minutes.
                </p>
                <button
                  onClick={() => { window.location.href = "/onboarding?full=1"; }}
                  className="px-4 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-[0.97]"
                  style={{ background: "linear-gradient(135deg, #5EEAD4, #2DD4BF)", color: "#0F2440" }}
                >
                  Finish Setup →
                </button>
              </div>
            </div>
          </div>
        )}
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(94,234,212,0.5)", borderTopColor: "transparent" }} />
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Loading…</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.filter(c => c.key !== "archive").map((cat, i) => (
              <CategoryTile
                key={cat.key}
                cat={cat}
                count={counts[cat.key]}
                onClick={() => setActiveView(cat.key)}
                delay={i * 60}
              />
            ))}
            {/* 4th tile: Needs Attention */}
            <CategoryTile
              cat={NEEDS_ATTENTION_META as unknown as TileMeta}
              count={(counts.tasks ?? 0) + (counts.issues ?? 0)}
              onClick={() => {
                setNeedsAttnSection((counts.tasks ?? 0) > 0 ? "tasks" : "issues");
                setActiveView("needs_attention");
              }}
              delay={3 * 60}
            />
          </div>
        )}

        {/* Archive text link */}
        {!isLoading && (
          <div className="flex justify-center mt-3">
            <button
              onClick={() => setActiveView("archive")}
              className="text-[11px] transition-colors active:opacity-60"
              style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.03em" }}
            >
              <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                Archive{archivedCards.length > 0 ? ` (${archivedCards.length})` : ""}
              </span>
            </button>
          </div>
        )}

      </div>

      {/* Floating Action Button */}
      <button
        ref={(el) => registerRef("tour-hub", el)}
        data-tour="tour-hub"
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold transition-all active:scale-[0.9] hover:scale-[1.05] z-40"
        style={{
          background: "linear-gradient(135deg, #5EEAD4, #38BDF8)",
          color: "#0F2440",
          boxShadow: "0 6px 24px rgba(94,234,212,0.4), 0 2px 8px rgba(0,0,0,0.3)",
          animation: "fabPulse 3s ease-in-out infinite",
        }}
      >+</button>

      {/* Bottom Sheet for posting */}
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <AddCardForm currentUser={currentUser} onAdded={() => { refetch(); setSheetOpen(false); }}
          allowedBusinesses={allowedBusinesses} defaultBusiness={defaultBusiness}
          bizLabels={dynamicBizLabels} assignablePersons={allPersons} accountId={accountId} />
      </BottomSheet>

      {/* Animations */}
      <style>{`
        @keyframes tileEnter {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes cardSlideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes sheetSlideUp {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fabPulse {
          0%, 100% { box-shadow: 0 6px 24px rgba(94,234,212,0.4), 0 2px 8px rgba(0,0,0,0.3); }
          50% { box-shadow: 0 6px 32px rgba(94,234,212,0.55), 0 2px 12px rgba(0,0,0,0.3); }
        }
      `}</style>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl p-8 text-center flex flex-col items-center gap-3" style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)" }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>{icon}</div>
      <div>
        <p className="text-[13px] font-semibold text-white">{title}</p>
        <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{subtitle}</p>
      </div>
    </div>
  );
}
