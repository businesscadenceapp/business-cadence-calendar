/**
 * Team Command Board — Employee Side of the Wall
 *
 * Owners see this when they click the "Team" pill toggle.
 * Employees always land here after login.
 *
 * Owner view: all tasks assigned to any employee, announcements sent to team,
 *             quick KPI submission summary, employee check-in status.
 * Employee view: only their own tasks, announcements addressed to them,
 *                quick KPI entry shortcut, check-in shortcut.
 *
 * Dark navy theme: #0F2440 bg, #5EEAD4 teal accent, white text.
 */
import { useState, useRef, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { usePerson } from "@/contexts/PersonContext";
import { useLocation } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────

type CardType = "update" | "issue" | "task";
type Business = "chiropractic" | "crossfit" | "realty" | "general";

type Card = {
  id: number;
  author: string;
  type: CardType;
  business: Business;
  content: string;
  assignedTo: string | null;
  assignedToPersonId: string | null;
  dueAt: number | null;
  completedAt: Date | null;
  completedBy: string | null;
  confirmedAt: Date | null;
  confirmedBy: string | null;
  seenAt: Date | null;
  seenBy: string | null;
  archivedAt: Date | null;
  audience: "owner" | "team";
  createdAt: Date;
};

type Comment = {
  id: number;
  cardId: number;
  authorName: string;
  authorPersonId: string | null;
  content: string;
  createdAt: Date;
};

// ─── Utilities ────────────────────────────────────────────────────────────────

const PALETTE = [
  { bg: "rgba(37,99,235,0.12)", border: "rgba(37,99,235,0.35)", badgeBg: "rgba(37,99,235,0.2)", badgeText: "#93C5FD", dot: "#3B82F6" },
  { bg: "rgba(225,29,72,0.12)", border: "rgba(225,29,72,0.35)", badgeBg: "rgba(225,29,72,0.2)", badgeText: "#FDA4AF", dot: "#E11D48" },
  { bg: "rgba(5,150,105,0.12)", border: "rgba(5,150,105,0.35)", badgeBg: "rgba(5,150,105,0.2)", badgeText: "#6EE7B7", dot: "#059669" },
  { bg: "rgba(217,119,6,0.12)", border: "rgba(217,119,6,0.35)", badgeBg: "rgba(217,119,6,0.2)", badgeText: "#FCD34D", dot: "#D97706" },
  { bg: "rgba(124,58,237,0.12)", border: "rgba(124,58,237,0.35)", badgeBg: "rgba(124,58,237,0.2)", badgeText: "#C4B5FD", dot: "#7C3AED" },
];

function getAuthorColors(name: string) {
  if (!name) return PALETTE[0];
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
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Card Comments ────────────────────────────────────────────────────────────

function CardComments({ cardId, currentUser, accountId }: {
  cardId: number;
  currentUser: string | null;
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
    onSuccess: () => { setText(""); refetch(); },
    onError: () => toast.error("Failed to add comment"),
  });

  const deleteComment = trpc.board.deleteComment.useMutation({
    onSuccess: () => refetch(),
  });

  const handleSubmit = useCallback(() => {
    if (!text.trim()) return;
    addComment.mutate({
      cardId,
      authorName: currentUser ?? "Unknown",
      content: text.trim(),
      accountId,
    });
  }, [text, cardId, currentUser, accountId, addComment]);

  return (
    <div className="w-full mt-1">
      <button
        onClick={() => { setOpen(o => !o); }}
        className="text-[11px] font-medium transition-colors flex items-center gap-1"
        style={{ color: open ? "#5EEAD4" : "rgba(255,255,255,0.35)", fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {open ? "▲" : "▼"} {open ? "Hide" : "Comments"}{comments.length > 0 && !open ? ` (${comments.length})` : ""}
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-2">
          {comments.length === 0 && (
            <p className="text-[11px] italic" style={{ color: "rgba(255,255,255,0.3)" }}>No comments yet.</p>
          )}
          {comments.map(c => {
            const colors = getAuthorColors(c.authorName);
            const isMine = c.authorName === currentUser;
            return (
              <div key={c.id} className="flex items-start gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: colors.badgeBg, color: colors.badgeText }}
                >
                  {c.authorName[0]}
                </div>
                <div className="flex-1 min-w-0 rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-bold" style={{ color: colors.badgeText, fontFamily: "'Space Grotesk', sans-serif" }}>{c.authorName}</span>
                    <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{timeAgo(c.createdAt)}</span>
                    {isMine && (
                      <button
                        onClick={() => deleteComment.mutate({ commentId: c.id })}
                        className="ml-auto text-[10px] transition-colors"
                        style={{ color: "rgba(255,255,255,0.2)" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#F87171")}
                        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
                      >✕</button>
                    )}
                  </div>
                  <p className="text-[12px] text-white leading-relaxed">{c.content}</p>
                </div>
              </div>
            );
          })}

          {/* Reply input */}
          <div className="flex gap-2 mt-1">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Write a reply…"
              rows={2}
              className="flex-1 rounded-lg px-3 py-2 text-[12px] placeholder-white/30 resize-none focus:outline-none transition-colors"
              style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", color: "white" }}
              onFocus={e => (e.target.style.borderColor = "#5EEAD4")}
              onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
              onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handleSubmit(); } }}
            />
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || addComment.isPending}
              className="px-3 py-2 rounded-lg text-[11px] font-bold transition-all active:scale-[0.97] self-end"
              style={{
                background: text.trim() ? "linear-gradient(135deg, #5EEAD4, #0EA5E9)" : "rgba(255,255,255,0.08)",
                color: text.trim() ? "#0A1929" : "rgba(255,255,255,0.3)",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TeamTaskCard({ card, currentUser, accountId, onMarkDone, onConfirmDone, onDelete }: {
  card: Card;
  currentUser: string | null;
  accountId?: number;
  onMarkDone: (id: number) => void;
  onConfirmDone: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const authorColors = getAuthorColors(card.author);
  const assigneeColors = getAuthorColors(card.assignedTo ?? "");

  const taskState = card.confirmedAt ? "confirmed"
    : card.completedAt ? "done_pending"
    : "open";

  const isDoer = currentUser === card.assignedTo;
  const isRequester = currentUser === card.author;
  const isOverdue = card.dueAt && !card.completedAt && Date.now() > card.dueAt;

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        backgroundColor: taskState === "confirmed" ? "rgba(5,150,105,0.06)" : "rgba(255,255,255,0.05)",
        border: `1.5px solid ${taskState === "confirmed" ? "rgba(5,150,105,0.3)" : taskState === "done_pending" ? "rgba(217,119,6,0.4)" : isOverdue ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.1)"}`,
        animation: "cardSlideIn 0.22s cubic-bezier(0.23,1,0.32,1) both",
      }}
    >
      {/* Top accent bar */}
      <div className="w-full h-1 flex-shrink-0" style={{
        backgroundColor: taskState === "confirmed" ? "#059669"
          : taskState === "done_pending" ? "#D97706"
          : isOverdue ? "#EF4444"
          : "#7C3AED",
      }} />

      <div className="p-4 flex flex-col gap-3">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0 mt-0.5"
            style={{ backgroundColor: authorColors.badgeBg, color: authorColors.badgeText }}
          >
            {card.author[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[12px] font-bold" style={{ color: authorColors.badgeText, fontFamily: "'Space Grotesk', sans-serif" }}>
                {card.author}
              </span>
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>→</span>
              <div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                style={{ backgroundColor: assigneeColors.badgeBg, border: `1px solid ${assigneeColors.border}` }}
              >
                <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ backgroundColor: assigneeColors.dot, color: "white" }}>
                  {(card.assignedTo ?? "?")[0]}
                </div>
                <span className="text-[11px] font-semibold" style={{ color: assigneeColors.badgeText, fontFamily: "'Space Grotesk', sans-serif" }}>
                  {card.assignedTo ?? "Unassigned"}
                </span>
              </div>
              <span className="text-[10px] ml-auto flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>
                {timeAgo(card.createdAt)}
              </span>
            </div>
            <p className="text-[14px] text-white leading-relaxed font-medium">{card.content}</p>
          </div>
        </div>

        {/* Due date */}
        {card.dueAt && (
          <p className="text-[11px] pl-12" style={{ color: isOverdue ? "#F87171" : "rgba(255,255,255,0.4)" }}>
            {isOverdue ? "⚠ Overdue · " : "📅 Due "}
            {formatDate(card.dueAt)}
          </p>
        )}

        {/* Completion info */}
        {taskState === "done_pending" && (
          <p className="text-[11px] italic pl-12" style={{ color: "rgba(255,255,255,0.4)" }}>
            Marked done by{" "}
            <span style={{ color: card.completedBy ? getAuthorColors(card.completedBy).badgeText : "rgba(255,255,255,0.5)" }}>
              {card.completedBy}
            </span>
            {" "}· {timeAgo(card.completedAt!)}
          </p>
        )}

        {/* Status badges + actions */}
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
            {isRequester && taskState !== "confirmed" && (
              <button
                onClick={() => onDelete(card.id)}
                className="text-[11px] px-2 py-1.5 rounded-lg transition-all"
                style={{ color: "rgba(255,255,255,0.2)", fontFamily: "'Space Grotesk', sans-serif" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#F87171")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
              >✕</button>
            )}
          </div>
        </div>

        <CardComments cardId={card.id} currentUser={currentUser} accountId={accountId} />
      </div>
    </div>
  );
}

// ─── Announcement Card ────────────────────────────────────────────────────────

function AnnouncementCard({ card, currentUser, accountId, onSeen, onArchive, onDelete }: {
  card: Card;
  currentUser: string | null;
  accountId?: number;
  onSeen: (id: number) => void;
  onArchive: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const colors = getAuthorColors(card.author);
  const isOwnCard = card.author === currentUser;
  const alreadySeen = !!card.seenAt;

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        backgroundColor: alreadySeen ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)",
        border: `1.5px solid ${alreadySeen ? "rgba(255,255,255,0.08)" : colors.border}`,
        opacity: alreadySeen ? 0.7 : 1,
        animation: "cardSlideIn 0.22s cubic-bezier(0.23,1,0.32,1) both",
      }}
    >
      <div className="w-full h-1" style={{ backgroundColor: alreadySeen ? "rgba(255,255,255,0.1)" : colors.dot }} />

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
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: "rgba(94,234,212,0.12)", color: "#5EEAD4", border: "1px solid rgba(94,234,212,0.25)", fontFamily: "'Space Grotesk', sans-serif" }}>
                📢 Announcement
              </span>
              <span className="text-[10px] ml-auto flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>
                {timeAgo(card.createdAt)}
              </span>
            </div>
            <p className="text-[14px] text-white leading-relaxed font-medium">{card.content}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap pl-12">
          {alreadySeen && (
            <span className="text-[10px] flex items-center gap-1" style={{ color: "rgba(255,255,255,0.35)" }}>
              <span style={{ color: "#6EE7B7" }}>✓</span> Seen
            </span>
          )}
          {!alreadySeen && isOwnCard && (
            <span className="text-[10px] italic" style={{ color: "rgba(255,255,255,0.35)" }}>Awaiting acknowledgement</span>
          )}

          <div className="ml-auto flex items-center gap-2">
            {!isOwnCard && !alreadySeen && (
              <button
                onClick={() => onSeen(card.id)}
                className="text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-90 flex items-center gap-1.5 active:scale-[0.97]"
                style={{ backgroundColor: "rgba(5,150,105,0.2)", border: "1.5px solid rgba(5,150,105,0.4)", color: "#6EE7B7", fontFamily: "'Space Grotesk', sans-serif" }}
              >
                ✓ Seen
              </button>
            )}
            {isOwnCard && (
              <button
                onClick={() => onArchive(card.id)}
                className="text-[11px] px-2.5 py-1.5 rounded-lg transition-all hover:opacity-80"
                style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Archive
              </button>
            )}
            {isOwnCard && (
              <button
                onClick={() => onDelete(card.id)}
                className="text-[11px] px-2 py-1.5 rounded-lg transition-all"
                style={{ color: "rgba(255,255,255,0.2)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#F87171")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
              >✕</button>
            )}
          </div>
          <CardComments cardId={card.id} currentUser={currentUser} accountId={accountId} />
        </div>
      </div>
    </div>
  );
}

// ─── Post Form (Owner only — for sending tasks/announcements to team) ─────────

function TeamPostForm({ currentUser, accountId, employees, onAdded, allowedBusinesses, defaultBusiness }: {
  currentUser: string | null;
  accountId?: number;
  employees: { id: string; name: string }[];
  onAdded: () => void;
  allowedBusinesses: string[];
  defaultBusiness: string;
}) {
  const [type, setType] = useState<"update" | "task">("update");
  const [content, setContent] = useState("");
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [assignedToPersonId, setAssignedToPersonId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [business, setBusiness] = useState(defaultBusiness);

  const createCard = trpc.board.create.useMutation({
    onSuccess: () => {
      setContent("");
      setAssignedTo(null);
      setAssignedToPersonId(null);
      setDueDate("");
      onAdded();
      toast.success(type === "task" ? "Task assigned to team" : "Announcement posted to team");
    },
    onError: () => toast.error("Failed to post"),
  });

  const handleSubmit = () => {
    if (!currentUser) { toast.error("Not logged in"); return; }
    if (!content.trim()) { toast.error("Please write something"); return; }
    if (type === "task" && !assignedTo) { toast.error("Please select who this task is for"); return; }
    const dueAt = dueDate ? new Date(dueDate + "T23:59:59").getTime() : undefined;
    createCard.mutate({
      author: currentUser,
      type,
      business: (business as "chiropractic" | "crossfit" | "realty" | "general"),
      content: content.trim(),
      audience: "team",
      ...(type === "task" && assignedTo ? { assignedTo, ...(assignedToPersonId ? { assignedToPersonId } : {}) } : {}),
      ...(dueAt ? { dueAt } : {}),
      ...(accountId ? { accountId } : {}),
      ...(type === "update" ? { notifyPersonIds: employees.map(e => e.id) } : {}),
    });
  };

  const inputStyle = {
    backgroundColor: "rgba(255,255,255,0.06)",
    border: "1.5px solid rgba(255,255,255,0.12)",
    color: "white",
    fontFamily: "'Inter', sans-serif",
  };

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-4"
      style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.1)" }}
    >
      {/* Type toggle */}
      <div className="flex gap-2">
        {([
          { key: "update", label: "📢 Announcement", desc: "Broadcast to all employees" },
          { key: "task",   label: "☑ Assign Task",   desc: "Assign to a specific person" },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setType(t.key)}
            className="flex-1 py-2 px-3 rounded-lg text-left transition-all"
            style={{
              backgroundColor: type === t.key ? (t.key === "task" ? "rgba(124,58,237,0.15)" : "rgba(94,234,212,0.12)") : "rgba(255,255,255,0.04)",
              border: `1.5px solid ${type === t.key ? (t.key === "task" ? "rgba(124,58,237,0.4)" : "rgba(94,234,212,0.3)") : "rgba(255,255,255,0.1)"}`,
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            <p className="text-[12px] font-semibold" style={{ color: type === t.key ? (t.key === "task" ? "#C4B5FD" : "#5EEAD4") : "rgba(255,255,255,0.5)" }}>{t.label}</p>
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{t.desc}</p>
          </button>
        ))}
      </div>

      {/* Assign to (tasks only) */}
      {type === "task" && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>Assign to:</p>
          <div className="flex flex-wrap gap-2">
            {employees.map(emp => {
              const c = getAuthorColors(emp.name);
              const isActive = assignedTo === emp.name;
              return (
                <button
                  key={emp.id}
                  onClick={() => { setAssignedTo(emp.name); setAssignedToPersonId(emp.id); }}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all"
                  style={{
                    backgroundColor: isActive ? c.badgeBg : "rgba(255,255,255,0.04)",
                    border: `2px solid ${isActive ? c.border : "rgba(255,255,255,0.1)"}`,
                    color: isActive ? c.badgeText : "rgba(255,255,255,0.5)",
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  {emp.name}
                </button>
              );
            })}
            {employees.length === 0 && (
              <p className="text-[11px] italic" style={{ color: "rgba(255,255,255,0.3)" }}>No employees invited yet</p>
            )}
          </div>
        </div>
      )}

      {/* Business selector */}
      {allowedBusinesses.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>Business:</p>
          <div className="flex gap-1.5 flex-wrap">
            {allowedBusinesses.map(biz => (
              <button
                key={biz}
                onClick={() => setBusiness(biz)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                style={{
                  backgroundColor: business === biz ? "rgba(94,234,212,0.12)" : "rgba(255,255,255,0.04)",
                  border: `1.5px solid ${business === biz ? "rgba(94,234,212,0.3)" : "rgba(255,255,255,0.1)"}`,
                  color: business === biz ? "#5EEAD4" : "rgba(255,255,255,0.5)",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                {biz}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Due date (tasks only) */}
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

      {/* Content */}
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={type === "task"
          ? assignedTo ? `What needs to be done by ${assignedTo}?` : "Describe the task…"
          : "What do you want to announce to the team?"}
        rows={3}
        className="w-full rounded-lg px-3 py-2.5 text-[13px] placeholder-white/30 resize-none focus:outline-none transition-colors"
        style={{ ...inputStyle, lineHeight: "1.6" }}
        onFocus={e => (e.target.style.borderColor = "rgba(255,255,255,0.25)")}
        onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
        onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handleSubmit(); } }}
      />

      <button
        onClick={handleSubmit}
        disabled={createCard.isPending}
        className="w-full py-2.5 rounded-xl text-[13px] font-bold transition-all active:scale-[0.98]"
        style={{
          background: "linear-gradient(135deg, #5EEAD4 0%, #0EA5E9 100%)",
          color: "#0A1929",
          fontFamily: "'Space Grotesk', sans-serif",
          opacity: createCard.isPending ? 0.6 : 1,
        }}
      >
        {createCard.isPending ? "Posting…" : type === "task" ? "☑ Assign Task" : "📢 Post Announcement"}
      </button>
    </div>
  );
}

// ─── Employee Quick Actions ───────────────────────────────────────────────────

function EmployeeQuickActions({ personName, accountId }: { personName: string; accountId: number }) {
  const [, navigate] = useLocation();

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] uppercase tracking-wider font-bold" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>
        Quick Actions
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => navigate("/app/kpi")}
          className="flex flex-col items-start gap-1.5 p-3 rounded-xl transition-all hover:opacity-90 active:scale-[0.97]"
          style={{ backgroundColor: "rgba(94,234,212,0.1)", border: "1.5px solid rgba(94,234,212,0.25)" }}
        >
          <span className="text-xl">📈</span>
          <p className="text-[12px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Submit Numbers</p>
          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Weekly KPI entry</p>
        </button>
        <button
          onClick={() => navigate("/app/checkin")}
          className="flex flex-col items-start gap-1.5 p-3 rounded-xl transition-all hover:opacity-90 active:scale-[0.97]"
          style={{ backgroundColor: "rgba(124,58,237,0.1)", border: "1.5px solid rgba(124,58,237,0.25)" }}
        >
          <span className="text-xl">✅</span>
          <p className="text-[12px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Weekly Check-in</p>
          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Answer this week's questions</p>
        </button>
      </div>
    </div>
  );
}

// ─── Main TeamBoard Page ──────────────────────────────────────────────────────

export default function TeamBoard() {
  const { person } = usePerson();
  const isOwner = person?.role === "owner" || person?.role === "coowner";
  const currentUser = person?.name ?? null;
  const accountId = person?.accountId;

  const [formOpen, setFormOpen] = useState(false);

  // Fetch all persons to separate owners from employees
  const { data: personsData } = trpc.person.list.useQuery(
    { accountId: accountId ?? 0 },
    { enabled: accountId !== undefined, staleTime: 60_000 }
  );

  const allPersons = useMemo(() => personsData ?? [], [personsData]);
  const employeePersons = useMemo(
    () => allPersons.filter(p => p.role === "employee"),
    [allPersons]
  );

  // Fetch businesses
  const { data: dbBusinesses = [] } = trpc.business.list.useQuery(
    { accountId: accountId ?? 0 },
    { enabled: accountId !== undefined }
  );
  const allowedBusinesses = useMemo(() => dbBusinesses.map(b => b.slug), [dbBusinesses]);
  const defaultBusiness = allowedBusinesses[0] ?? "general";

  // Fetch team-side board cards
  const { data, refetch, isLoading } = trpc.board.list.useQuery(
    { audience: "team" },
    { refetchInterval: 15_000 }
  );

  const allCards = useMemo(() => {
    const cards = ((data?.cards ?? []) as Card[]).filter(c => c.audience === "team");
    // Employees only see their own tasks and all announcements
    if (!isOwner && currentUser) {
      return cards.filter(c =>
        c.type === "update" || // announcements
        (c.type === "task" && c.assignedTo === currentUser)
      );
    }
    return cards;
  }, [data, isOwner, currentUser]);

  const openTasks = allCards.filter(c => c.type === "task" && !c.archivedAt && !c.completedAt);
  const donePendingTasks = allCards.filter(c => c.type === "task" && !c.archivedAt && c.completedAt && !c.confirmedAt);
  const completedTasks = allCards.filter(c => c.type === "task" && c.archivedAt && c.confirmedAt);
  const announcements = allCards.filter(c => c.type === "update" && !c.archivedAt);

  const markDone = trpc.board.markDone.useMutation({
    onSuccess: () => { refetch(); toast.success("Task marked as done — waiting for owner confirmation"); },
    onError: () => toast.error("Failed to mark task done"),
  });
  const confirmDone = trpc.board.confirmDone.useMutation({
    onSuccess: () => { refetch(); toast.success("Task confirmed done"); },
    onError: () => toast.error("Failed to confirm task"),
  });
  const markSeen = trpc.board.markSeen.useMutation({ onSuccess: () => refetch() });
  const archive = trpc.board.archive.useMutation({ onSuccess: () => refetch() });
  const deleteCard = trpc.board.delete.useMutation({ onSuccess: () => refetch() });

  const taskCount = openTasks.length + donePendingTasks.length;
  const unseenAnnouncements = announcements.filter(c => !c.seenAt && c.author !== currentUser).length;

  return (
    <div
      className="flex flex-col min-h-full"
      style={{ backgroundColor: "#0A1929", fontFamily: "'Inter', sans-serif" }}
    >
      <style>{`
        @keyframes cardSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

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
        <div style={{
          position: "absolute", top: "-40px", right: "-40px",
          width: "200px", height: "200px",
          background: "radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div style={{
                width: 32, height: 32,
                borderRadius: "10px",
                background: "linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(124,58,237,0.08) 100%)",
                border: "1px solid rgba(124,58,237,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "16px",
                boxShadow: "0 0 12px rgba(124,58,237,0.15)",
              }}>👥</div>
              <span className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: "#A78BFA", fontFamily: "'Space Grotesk', sans-serif" }}>Team Board</span>
            </div>
            <h1 className="text-[22px] font-black text-white leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
              {isOwner ? "Your Team," : "Your Board,"}
              <br />
              <span style={{ background: "linear-gradient(90deg, #A78BFA, #5EEAD4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {isOwner ? "In Action." : "In Focus."}
              </span>
            </h1>
            <p className="text-[13px] mt-1.5" style={{ color: "rgba(255,255,255,0.45)" }}>
              {isOwner
                ? "Assign tasks and send announcements to your team."
                : "Your tasks and updates from ownership."}
            </p>
          </div>

          {/* Stats */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            {taskCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                style={{ backgroundColor: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}>
                <span className="text-[18px] font-black" style={{ color: "#C4B5FD", fontFamily: "'Space Grotesk', sans-serif" }}>{taskCount}</span>
                <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>open tasks</span>
              </div>
            )}
            {unseenAnnouncements > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                style={{ backgroundColor: "rgba(94,234,212,0.12)", border: "1px solid rgba(94,234,212,0.25)" }}>
                <span className="text-[18px] font-black" style={{ color: "#5EEAD4", fontFamily: "'Space Grotesk', sans-serif" }}>{unseenAnnouncements}</span>
                <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>new</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0">

        {/* Left column — main feed */}
        <div className="flex-1 min-w-0 p-5 flex flex-col gap-6">

          {/* Employee quick actions (employees only) */}
          {!isOwner && person && (
            <EmployeeQuickActions personName={person.name} accountId={accountId ?? 0} />
          )}

          {/* Open Tasks */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}>
                ☑ Open Tasks {openTasks.length > 0 && <span style={{ color: "#C4B5FD" }}>({openTasks.length})</span>}
              </h2>
            </div>
            {isLoading && (
              <div className="flex flex-col gap-2">
                {[1, 2].map(i => (
                  <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ backgroundColor: "rgba(255,255,255,0.05)" }} />
                ))}
              </div>
            )}
            {!isLoading && openTasks.length === 0 && (
              <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)" }}>
                <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.3)" }}>No open tasks</p>
              </div>
            )}
            {openTasks.map(card => (
              <TeamTaskCard
                key={card.id}
                card={card}
                currentUser={currentUser}
                accountId={accountId}
                onMarkDone={id => markDone.mutate({ id, completedBy: currentUser ?? "", accountId })}
                onConfirmDone={id => confirmDone.mutate({ id, confirmedBy: currentUser ?? "", accountId })}
                onDelete={id => deleteCard.mutate({ id })}
              />
            ))}
          </div>

          {/* Awaiting Confirmation */}
          {donePendingTasks.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-[13px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}>
                ⏳ Awaiting Confirmation <span style={{ color: "#FCD34D" }}>({donePendingTasks.length})</span>
              </h2>
              {donePendingTasks.map(card => (
                <TeamTaskCard
                  key={card.id}
                  card={card}
                  currentUser={currentUser}
                  accountId={accountId}
                  onMarkDone={id => markDone.mutate({ id, completedBy: currentUser ?? "", accountId })}
                  onConfirmDone={id => confirmDone.mutate({ id, confirmedBy: currentUser ?? "", accountId })}
                  onDelete={id => deleteCard.mutate({ id })}
                />
              ))}
            </div>
          )}

          {/* Announcements */}
          <div className="flex flex-col gap-3">
            <h2 className="text-[13px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}>
              📢 Announcements {announcements.length > 0 && <span style={{ color: "#5EEAD4" }}>({announcements.length})</span>}
            </h2>
            {announcements.length === 0 && (
              <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)" }}>
                <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.3)" }}>No announcements</p>
              </div>
            )}
            {announcements.map(card => (
              <AnnouncementCard
                key={card.id}
                card={card}
                currentUser={currentUser}
                accountId={accountId}
                onSeen={id => markSeen.mutate({ id, seenBy: currentUser ?? "" })}
                onArchive={id => archive.mutate({ id })}
                onDelete={id => deleteCard.mutate({ id })}
              />
            ))}
          </div>

          {/* Completed Tasks (collapsed) */}
          {completedTasks.length > 0 && (
            <CompletedTasksSection tasks={completedTasks} currentUser={currentUser} accountId={accountId} />
          )}
        </div>

        {/* Right sidebar — owner post form */}
        {isOwner && (
          <div
            className="lg:w-80 flex-shrink-0 p-5 flex flex-col gap-4"
            style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}>
                Post to Team
              </h2>
              <button
                onClick={() => setFormOpen(o => !o)}
                className="text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all"
                style={{
                  backgroundColor: formOpen ? "rgba(94,234,212,0.15)" : "rgba(255,255,255,0.06)",
                  border: `1px solid ${formOpen ? "rgba(94,234,212,0.3)" : "rgba(255,255,255,0.12)"}`,
                  color: formOpen ? "#5EEAD4" : "rgba(255,255,255,0.5)",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                {formOpen ? "▲ Close" : "▼ Open"}
              </button>
            </div>

            {formOpen && (
              <TeamPostForm
                currentUser={currentUser}
                accountId={accountId}
                employees={employeePersons}
                onAdded={() => { refetch(); setFormOpen(false); }}
                allowedBusinesses={allowedBusinesses}
                defaultBusiness={defaultBusiness}
              />
            )}

            {/* Employee summary */}
            <div className="flex flex-col gap-2 mt-2">
              <p className="text-[11px] uppercase tracking-wider font-bold" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>Team Members</p>
              {employeePersons.length === 0 && (
                <p className="text-[12px] italic" style={{ color: "rgba(255,255,255,0.3)" }}>No employees invited yet</p>
              )}
              {employeePersons.map(emp => {
                const colors = getAuthorColors(emp.name);
                const empTasks = openTasks.filter(c => c.assignedTo === emp.name);
                return (
                  <div
                    key={emp.id}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                    style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                      style={{ backgroundColor: colors.badgeBg, color: colors.badgeText }}
                    >
                      {emp.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-white truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{emp.name}</p>
                      <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {empTasks.length > 0 ? `${empTasks.length} open task${empTasks.length > 1 ? "s" : ""}` : "No open tasks"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Completed Tasks Section ──────────────────────────────────────────────────

function CompletedTasksSection({ tasks, currentUser, accountId }: {
  tasks: Card[];
  currentUser: string | null;
  accountId?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider transition-colors"
        style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {open ? "▲" : "▼"} Completed ({tasks.length})
      </button>
      {open && tasks.map(card => {
        const colors = getAuthorColors(card.author);
        return (
          <div
            key={card.id}
            className="rounded-xl p-3 flex items-start gap-3 opacity-50"
            style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
              style={{ backgroundColor: colors.badgeBg, color: colors.badgeText }}>
              {card.author[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-white line-through">{card.content}</p>
              <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                → {card.assignedTo} · confirmed by {card.confirmedBy} · {timeAgo(card.confirmedAt!)}
              </p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
              style={{ backgroundColor: "rgba(5,150,105,0.15)", color: "#6EE7B7", border: "1px solid rgba(5,150,105,0.3)" }}>
              ✓ Done
            </span>
          </div>
        );
      })}
    </div>
  );
}
