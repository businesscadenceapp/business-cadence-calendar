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
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getBusinessSelection, type BusinessSelection } from "./ClientLogin";
import { useIdentity } from "@/components/AppShell";
import { Link } from "wouter";

type Author = string;
type CardType = "update" | "issue" | "task";
type Business = "chiropractic" | "crossfit" | "realty" | "general";

// Identity is now managed by AppShell context (useIdentity hook)
// IDENTITY_KEY kept for backward compatibility with localStorage reads
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

// Light-theme author colors — dynamically generated from name to support any person
const PALETTE = [
  { bg: "#EFF6FF", border: "#BFDBFE", badgeBg: "#DBEAFE", badgeText: "#1D4ED8", btnBg: "#DBEAFE", btnBorder: "#93C5FD", btnText: "#1D4ED8", dot: "#2563EB" },
  { bg: "#FFF1F2", border: "#FECDD3", badgeBg: "#FFE4E6", badgeText: "#BE123C", btnBg: "#FFE4E6", btnBorder: "#FDA4AF", btnText: "#BE123C", dot: "#E11D48" },
  { bg: "#F0FDF4", border: "#86EFAC", badgeBg: "#D1FAE5", badgeText: "#065F46", btnBg: "#D1FAE5", btnBorder: "#6EE7B7", btnText: "#065F46", dot: "#059669" },
  { bg: "#FFFBEB", border: "#FCD34D", badgeBg: "#FEF3C7", badgeText: "#92400E", btnBg: "#FEF3C7", btnBorder: "#FCD34D", btnText: "#92400E", dot: "#D97706" },
  { bg: "#F5F3FF", border: "#C4B5FD", badgeBg: "#EDE9FE", badgeText: "#5B21B6", btnBg: "#EDE9FE", btnBorder: "#C4B5FD", btnText: "#5B21B6", dot: "#7C3AED" },
];

function getAuthorColors(name: string) {
  if (!name) return PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

// AUTHOR_COLORS kept for backward compat — delegates to getAuthorColors
const AUTHOR_COLORS: Record<string, typeof PALETTE[0]> = new Proxy({} as Record<string, typeof PALETTE[0]>, {
  get: (_t, prop: string) => getAuthorColors(prop),
});

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
  dueAt: number | null; // ms since epoch
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

  // Due date helpers
  const now = Date.now();
  const isOverdue = card.dueAt && !isDone && card.dueAt < now;
  const isDueSoon = card.dueAt && !isDone && !isOverdue && card.dueAt - now < 3 * 24 * 60 * 60 * 1000; // within 3 days
  const dueLabel = card.dueAt
    ? new Date(card.dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;

  // State-based card styling (light backgrounds with dark text)
  const stateStyles = {
    open:         { bg: "#EFF6FF", border: "#BFDBFE" },
    done_pending: { bg: "#FFFBEB", border: "#FCD34D" },
    confirmed:    { bg: "#F0FDF4", border: "#86EFAC" },
  };

  const style = stateStyles[taskState];

  return (
    <div
      className="rounded-2xl flex flex-col gap-0 transition-all duration-200 overflow-hidden"
      style={{
        backgroundColor: "#FFFFFF",
        border: `1.5px solid ${style.border}`,
        boxShadow: taskState === "open" ? "0 2px 12px rgba(30,58,95,0.06)" : "none",
        animation: "cardSlideIn 0.22s cubic-bezier(0.23,1,0.32,1) both",
      }}
    >
      {/* Top accent bar: purple for tasks */}
      <div className="w-full h-1 flex-shrink-0" style={{ backgroundColor: taskState === "confirmed" ? "#86EFAC" : taskState === "done_pending" ? "#FCD34D" : "#7C3AED" }} />

      <div className="p-4 flex flex-col gap-3">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Author avatar */}
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
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide" style={{ backgroundColor: "#EDE9FE", color: "#5B21B6", fontFamily: "'Space Grotesk', sans-serif" }}>
                Task
              </span>
              {card.assignedTo && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  → <span className="font-semibold" style={{ color: AUTHOR_COLORS[card.assignedTo].badgeText }}>{card.assignedTo}</span>
                </span>
              )}
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{ backgroundColor: biz.bg, color: biz.text, border: `1px solid ${biz.border}`, fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {biz.icon} {biz.label}
              </span>
              {/* Due date badge */}
              {dueLabel && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{
                    backgroundColor: isOverdue ? "#FEE2E2" : isDueSoon ? "#FEF3C7" : "#F1F5F9",
                    color: isOverdue ? "#B91C1C" : isDueSoon ? "#92400E" : "#475569",
                    border: `1px solid ${isOverdue ? "#FCA5A5" : isDueSoon ? "#FCD34D" : "#CBD5E1"}`,
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  {isOverdue ? "⚠️" : "📅"} {isOverdue ? "Overdue" : "Due"} {dueLabel}
                </span>
              )}
              <span className="text-[10px] text-slate-400 ml-auto" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {timeAgo(card.createdAt)}
              </span>
            </div>

            {/* Content */}
            <p className="text-[14px] text-[#1E3A5F] leading-relaxed font-medium">{card.content}</p>
          </div>
        </div>

        {/* State badge + completion trail */}
        {isDone && (
          <p className="text-[11px] text-slate-500 italic pl-12">
            Marked done by{" "}
            <span style={{ color: card.completedBy ? AUTHOR_COLORS[card.completedBy].badgeText : "#475569" }}>{card.completedBy}</span>
            {" "}· {timeAgo(card.completedAt!)}
          </p>
        )}

        {/* Action row */}
        <div className="flex items-center gap-2 flex-wrap pl-12">
          {/* State badges */}
          {taskState === "done_pending" && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ backgroundColor: "#FEF3C7", color: "#92400E", border: "1px solid #FCD34D", fontFamily: "'Space Grotesk', sans-serif" }}>
              ⏳ Awaiting Confirmation
            </span>
          )}
          {taskState === "confirmed" && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ backgroundColor: "#DCFCE7", color: "#166534", border: "1px solid #86EFAC", fontFamily: "'Space Grotesk', sans-serif" }}>
              ✓ Done
            </span>
          )}
          {taskState === "open" && !isDoer && currentUser && (
            <span className="text-[11px] text-slate-400 italic">Waiting for {card.assignedTo ?? "assignee"}</span>
          )}
          {taskState === "done_pending" && !isRequester && currentUser && (
            <span className="text-[11px] text-slate-400 italic">Waiting for {card.author} to confirm</span>
          )}

          <div className="ml-auto flex items-center gap-2">
            {taskState === "open" && isDoer && (
              <button
                onClick={() => onMarkDone(card.id)}
                className="text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-90 flex items-center gap-1.5 active:scale-[0.97]"
                style={{ backgroundColor: "#DCFCE7", border: "1.5px solid #86EFAC", color: "#166534", fontFamily: "'Space Grotesk', sans-serif" }}
              >
                ☑ Mark Done
              </button>
            )}
            {taskState === "done_pending" && isRequester && (
              <button
                onClick={() => onConfirmDone(card.id)}
                className="text-[11px] px-3 py-1.5 rounded-lg font-bold transition-all hover:opacity-90 flex items-center gap-1.5 active:scale-[0.97]"
                style={{ backgroundColor: "#DCFCE7", border: "1.5px solid #4ADE80", color: "#166534", fontFamily: "'Space Grotesk', sans-serif" }}
              >
                ✓ Confirm Done
              </button>
            )}
            {card.author === currentUser && (
              <button
                onClick={() => onDelete(card.id)}
                className="text-[11px] px-2 py-1.5 rounded-lg transition-all hover:text-red-400"
                style={{ color: "#CBD5E1", fontFamily: "'Space Grotesk', sans-serif" }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
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
  const colors = getAuthorColors(card.author);
  const biz = BUSINESS_LABELS[card.business];
  const isOwnCard = card.author === currentUser;
  const alreadySeen = !!card.seenAt;
  const isUpdate = card.type === "update";

  return (
    <div
      className="rounded-2xl flex flex-col gap-0 transition-all duration-200 overflow-hidden"
      style={{
        backgroundColor: "#FFFFFF",
        border: `1.5px solid ${alreadySeen ? "#E2E8F0" : colors.border}`,
        boxShadow: alreadySeen ? "none" : "0 2px 12px rgba(30,58,95,0.06)",
        opacity: alreadySeen ? 0.7 : 1,
        // Slide-in animation via CSS
        animation: "cardSlideIn 0.22s cubic-bezier(0.23,1,0.32,1) both",
      }}
    >
      {/* Colored left accent bar */}
      <div
        className="w-full h-1 flex-shrink-0"
        style={{ backgroundColor: alreadySeen ? "#E2E8F0" : colors.dot }}
      />

      <div className="p-4 flex flex-col gap-3">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Author avatar */}
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
              <span className="text-[10px] text-slate-400 ml-auto" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {timeAgo(card.createdAt)}
              </span>
            </div>

            {/* Content */}
            <p className="text-[14px] text-[#1E3A5F] leading-relaxed font-medium">{card.content}</p>
          </div>
        </div>

        {/* Status + action row */}
        <div className="flex items-center gap-2 flex-wrap pl-12">
          {alreadySeen && (
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <span style={{ color: "#16A34A" }}>✓</span> Seen by {card.seenBy}
            </span>
          )}
          {!alreadySeen && isOwnCard && (
            <span className="text-[10px] text-slate-400 italic">
              Awaiting {card.author === "Matt" ? "Lynn" : "Matt"}
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            {!isOwnCard && !alreadySeen && (
              <button
                onClick={() => onSeen(card.id)}
                className="text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-90 flex items-center gap-1.5 active:scale-[0.97]"
                style={{
                  backgroundColor: "#DCFCE7",
                  border: "1.5px solid #86EFAC",
                  color: "#166534",
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
                backgroundColor: "#F8FAFC",
                border: "1px solid #E2E8F0",
                color: "#94A3B8",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              Archive
            </button>
            {isOwnCard && (
              <button
                onClick={() => onDelete(card.id)}
                className="text-[11px] px-2 py-1.5 rounded-lg transition-all hover:text-red-400"
                style={{ color: "#CBD5E1", fontFamily: "'Space Grotesk', sans-serif" }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
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
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState(""); // YYYY-MM-DD string from date input

  const createCard = trpc.board.create.useMutation({
    onSuccess: () => {
      setContent("");
      setAssignedTo(null);
      setDueDate("");
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
    createCard.mutate({
      author: currentUser,
      type,
      business,
      content: content.trim(),
      ...(type === "task" && assignedTo ? { assignedTo } : {}),
      ...(dueAt ? { dueAt } : {}),
    });
  };

  // 'other' is used for the awaiting message
  const other = currentUser ?? "the other owner";

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
            {(["Matt", "Lynn"] as string[]).map(a => {
              const c = getAuthorColors(a);
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

      {/* Due date — only for tasks */}
      {type === "task" && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Due date <span className="normal-case text-slate-400">(optional)</span></p>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="w-full rounded-lg px-3 py-2 text-[12px] text-[#1E3A5F] focus:outline-none transition-colors"
            style={{
              backgroundColor: "#F8FAFC",
              border: "1.5px solid #CBD5E1",
              fontFamily: "'Inter', sans-serif",
            }}
            onFocus={e => (e.target.style.borderColor = "#7C3AED")}
            onBlur={e => (e.target.style.borderColor = "#CBD5E1")}
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
        className="w-full py-3 rounded-xl text-[13px] font-bold transition-all hover:opacity-90 disabled:opacity-40 active:scale-[0.97]"
        style={{
          background: currentUser
            ? `linear-gradient(135deg, ${getAuthorColors(currentUser).btnBg} 0%, ${getAuthorColors(currentUser).btnBorder} 100%)`
            : "#E2E8F0",
          border: `none`,
          color: currentUser ? getAuthorColors(currentUser).btnText : "#94A3B8",
          fontFamily: "'Space Grotesk', sans-serif",
          boxShadow: currentUser && !createCard.isPending ? "0 4px 14px rgba(30,58,95,0.18)" : "none",
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
  // Identity is managed by AppShell context — shared across all pages
  const { currentUser } = useIdentity();
  const [filterBusiness, setFilterBusiness] = useState<Business | "all">("all");
  const [showCompleted, setShowCompleted] = useState(false);

  // Read account scope from localStorage (set at login)
  const scope = useMemo<BusinessSelection>(() => getBusinessSelection(), []);
  const allowedBusinesses = useMemo<Business[]>(() => SCOPE_BUSINESSES[scope], [scope]);
  const defaultBusiness = useMemo<Business>(() => SCOPE_DEFAULT_BUSINESS[scope], [scope]);

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
      className="h-full flex"
      style={{ backgroundColor: "#F8F7F4", fontFamily: "'Inter', sans-serif" }}
    >
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
              <span>👈</span>
              <p className="text-[11px] text-amber-800">
                Select <strong>who you are</strong> in the sidebar — saved for next time.
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
                <div className="flex items-center gap-3 pb-2" style={{ borderBottom: "2px solid #7C3AED" }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{ backgroundColor: "#EDE9FE" }}>☑</div>
                  <div>
                    <h2 className="text-sm font-bold text-[#1E3A5F] leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Tasks</h2>
                    <p className="text-[10px] text-slate-400">Assigned to-dos between owners</p>
                  </div>
                  {openTasks.length > 0 && (
                    <span className="ml-auto text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#7C3AED", color: "#FFFFFF", fontFamily: "'Space Grotesk', sans-serif" }}>
                      {openTasks.length}
                    </span>
                  )}
                </div>

                {openTasks.length === 0 && donePendingTasks.length === 0 ? (
                  <div className="rounded-2xl p-8 text-center flex flex-col items-center gap-3" style={{ backgroundColor: "#FAFAF9", border: "1.5px dashed #C4B5FD" }}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: "#EDE9FE" }}>☑</div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#1E3A5F]">All clear on tasks</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Use the form on the left to assign a task to Matt or Lynn.</p>
                    </div>
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
                  <div className="flex items-center gap-3 pb-2" style={{ borderBottom: "2px solid #2563EB" }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{ backgroundColor: "#DBEAFE" }}>✅</div>
                    <div>
                      <h2 className="text-sm font-bold text-[#1E3A5F] leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Updates</h2>
                      <p className="text-[10px] text-slate-400">What I did since last meeting</p>
                    </div>
                    {updates.length > 0 && (
                      <span className="ml-auto text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#2563EB", color: "#FFFFFF", fontFamily: "'Space Grotesk', sans-serif" }}>
                        {updates.length}
                      </span>
                    )}
                  </div>
                  {updates.length === 0 ? (
                    <div className="rounded-2xl p-8 text-center flex flex-col items-center gap-3" style={{ backgroundColor: "#FAFAF9", border: "1.5px dashed #BFDBFE" }}>
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: "#DBEAFE" }}>✅</div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#1E3A5F]">No updates yet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Share what you've been working on.</p>
                      </div>
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
                  <div className="flex items-center gap-3 pb-2" style={{ borderBottom: "2px solid #E11D48" }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{ backgroundColor: "#FFE4E6" }}>💬</div>
                    <div>
                      <h2 className="text-sm font-bold text-[#1E3A5F] leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Issues</h2>
                      <p className="text-[10px] text-slate-400">What we need to discuss</p>
                    </div>
                    {issues.length > 0 && (
                      <span className="ml-auto text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#E11D48", color: "#FFFFFF", fontFamily: "'Space Grotesk', sans-serif" }}>
                        {issues.length}
                      </span>
                    )}
                  </div>
                  {issues.length === 0 ? (
                    <div className="rounded-2xl p-8 text-center flex flex-col items-center gap-3" style={{ backgroundColor: "#FAFAF9", border: "1.5px dashed #FECDD3" }}>
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: "#FFE4E6" }}>💬</div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#1E3A5F]">No issues queued</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Queue something to discuss at the next meeting.</p>
                      </div>
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
