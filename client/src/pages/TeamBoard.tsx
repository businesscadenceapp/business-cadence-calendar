/**
 * Team Board — Employee Side of the Wall
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
import { useActiveBusiness } from "@/components/BusinessSwitcher";

// ─── Types ────────────────────────────────────────────────────────────────────

type CardType = "update" | "issue" | "task";
type Business = "chiropractic" | "crossfit" | "general";

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
  const [attachments, setAttachments] = useState<Array<{ key: string; url: string; name: string; mimeType: string; sizeBytes: number }>>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadAttachment = trpc.board.uploadAttachment.useMutation();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setAttachments(prev => [...prev, result]);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('Upload failed');
      setUploading(false);
    }
    e.target.value = '';
  };

  const createCard = trpc.board.create.useMutation({
    onSuccess: () => {
      setContent("");
      setAssignedTo(null);
      setAssignedToPersonId(null);
      setDueDate("");
      setAttachments([]);
      onAdded();
      toast.success(type === "task" ? "Task assigned to team" : "Announcement posted to team");
    },
    onError: () => toast.error("Failed to post"),
  });

  // After-hours status — used for the once-per-session posting reminder
  const { data: bhStatus } = trpc.businessHours.checkStatus.useQuery(
    { accountId: accountId! },
    { enabled: accountId !== undefined, staleTime: 60_000 }
  );

  const handleSubmit = () => {
    // After-hours reminder: show once per session if outside business hours or DND is on
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
    if (!currentUser) { toast.error("Not logged in"); return; }
    if (!content.trim()) { toast.error("Please write something"); return; }
    if (type === "task" && !assignedTo) { toast.error("Please select who this task is for"); return; }
    const dueAt = dueDate ? new Date(dueDate + "T23:59:59").getTime() : undefined;
    createCard.mutate({
      author: currentUser,
      type,
      business: (business as "chiropractic" | "crossfit" | "general"),
      content: content.trim(),
      audience: "team",
      ...(attachments.length > 0 ? { attachmentsJson: JSON.stringify(attachments) } : {}),
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

      {/* Attachment picker */}
      <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv" className="hidden" onChange={handleFileChange} />
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {attachments.map((a, i) => a.mimeType.startsWith('image/') ? (
            <div key={i} className="relative">
              <img src={a.url} alt={a.name} className="w-16 h-16 rounded-lg object-cover border" style={{ borderColor: 'rgba(94,234,212,0.3)' }} />
              <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px]" style={{ backgroundColor: '#F87171', color: 'white' }}>✕</button>
            </div>
          ) : (
            <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px]" style={{ backgroundColor: 'rgba(94,234,212,0.1)', border: '1px solid rgba(94,234,212,0.25)', color: '#5EEAD4' }}>
              📎 {a.name}
              <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="ml-1 text-[9px]" style={{ color: '#F87171' }}>✕</button>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] transition-all active:scale-[0.97] w-full"
        style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)', fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {uploading ? '⏳ Uploading…' : '📎 Attach photo or file'}
      </button>

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
  const [, navigate] = useLocation();
  const isOwner = person?.role === "owner" || person?.role === "coowner";
  const currentUser = person?.name ?? null;
  const accountId = person?.accountId;
  const { activeBusiness } = useActiveBusiness(person?.businessScope);
  const activeDbSlug = activeBusiness === "chiro" ? "chiropractic" : activeBusiness === "crossfit" ? "crossfit" : null;

  const [formOpen, setFormOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

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
    { audience: "team", personId: person?.id },
    { refetchInterval: 15_000 }
  );

  const allCards = useMemo(() => {
    let cards = ((data?.cards ?? []) as Card[]).filter(c => c.audience === "team");
    // Filter by active business from sidebar switcher
    if (activeDbSlug) {
      cards = cards.filter(c => c.business === activeDbSlug || c.business === "general");
    }
    // Employees only see their own tasks and all announcements
    if (!isOwner && currentUser) {
      return cards.filter(c =>
        c.type === "update" || // announcements
        (c.type === "task" && c.assignedTo === currentUser)
      );
    }
    return cards;
  }, [data, isOwner, currentUser, activeDbSlug]);

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

          {/* Stats row + Post button (owners only) */}
        </div>

        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ backgroundColor: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)" }}>
            <span className="text-[11px] font-bold" style={{ color: "#C4B5FD", fontFamily: "'Space Grotesk', sans-serif" }}>☑ {openTasks.length + donePendingTasks.length} Tasks</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ backgroundColor: "rgba(94,234,212,0.12)", border: "1px solid rgba(94,234,212,0.25)" }}>
            <span className="text-[11px] font-bold" style={{ color: "#5EEAD4", fontFamily: "'Space Grotesk', sans-serif" }}>📢 {announcements.length} Announcements</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => navigate("/app/team/archive")}
              className="px-3 py-2 rounded-xl text-[12px] font-medium transition-all active:scale-[0.97]"
              style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}
            >
              🗂 Archive
            </button>
            {isOwner && (
              <button
                onClick={() => setFormOpen(o => !o)}
                className="px-4 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-[0.97]"
                style={{
                  background: formOpen ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg, #A78BFA, #5EEAD4)",
                  color: formOpen ? "rgba(255,255,255,0.5)" : "#0F2440",
                  fontFamily: "'Space Grotesk', sans-serif",
                  boxShadow: formOpen ? "none" : "0 4px 16px rgba(167,139,250,0.3), 0 2px 6px rgba(0,0,0,0.3)",
                  border: formOpen ? "1px solid rgba(255,255,255,0.1)" : "none",
                }}
              >
                {formOpen ? "✕ Close" : "+ Post to Team"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Collapsible post form band (owners only) ── */}
      {isOwner && formOpen && (
        <div
          className="flex-shrink-0 px-4 py-4"
          style={{
            background: "linear-gradient(180deg, #0D2035 0%, #0A1929 100%)",
            borderBottom: "1px solid rgba(167,139,250,0.12)",
            boxShadow: "inset 0 -1px 0 rgba(167,139,250,0.08)",
          }}
        >
          <div className="max-w-xl">
            <TeamPostForm
              currentUser={currentUser}
              accountId={accountId}
              employees={employeePersons}
              onAdded={() => { refetch(); setFormOpen(false); }}
              allowedBusinesses={allowedBusinesses}
              defaultBusiness={defaultBusiness}
            />
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="flex-1 p-3 md:p-5 flex flex-col gap-5 md:gap-7">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(167,139,250,0.5)", borderTopColor: "transparent" }} />
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Loading board…</span>
            </div>
          </div>
        ) : (
          <>
            {/* Employee quick actions (employees only) */}
            {!isOwner && person && (
              <EmployeeQuickActions personName={person.name} accountId={accountId ?? 0} />
            )}

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
                  <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Assigned to-dos for your team</p>
                </div>
                {(openTasks.length + donePendingTasks.length) > 0 && (
                  <span className="ml-auto text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.4), rgba(124,58,237,0.25))", color: "#C4B5FD", border: "1px solid rgba(124,58,237,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>
                    {openTasks.length + donePendingTasks.length}
                  </span>
                )}
              </div>

              {openTasks.length === 0 && donePendingTasks.length === 0 ? (
                <div className="rounded-2xl p-8 text-center flex flex-col items-center gap-3" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1.5px dashed rgba(124,58,237,0.3)" }}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: "rgba(124,58,237,0.15)" }}>☑</div>
                  <div>
                    <p className="text-[13px] font-semibold text-white">All clear on tasks</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{isOwner ? 'Tap "+ Post to Team" above to assign a task.' : "No tasks assigned to you right now."}</p>
                  </div>
                </div>
              ) : (
                <>
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
                </>
              )}

              {/* Done — Awaiting Confirmation subsection */}
              {donePendingTasks.length > 0 && (
                <div className="mt-2 flex flex-col gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest px-1" style={{ color: "#FCD34D", fontFamily: "'Space Grotesk', sans-serif" }}>
                    ⏳ Done — Awaiting Confirmation ({donePendingTasks.length})
                  </p>
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
                        <TeamTaskCard
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

            {/* ── Announcements section ── */}
            <section
              className="flex flex-col gap-3 rounded-2xl p-4"
              style={{
                background: "linear-gradient(135deg, rgba(94,234,212,0.07) 0%, rgba(94,234,212,0.03) 100%)",
                border: "1.5px solid rgba(94,234,212,0.18)",
                boxShadow: "0 4px 24px rgba(94,234,212,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              <div className="flex items-center gap-3 pb-3 min-w-0" style={{ borderBottom: "1px solid rgba(94,234,212,0.2)" }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0" style={{ background: "linear-gradient(135deg, rgba(94,234,212,0.25), rgba(94,234,212,0.1))", border: "1px solid rgba(94,234,212,0.35)", boxShadow: "0 0 10px rgba(94,234,212,0.15)" }}>📢</div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold text-white leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Announcements</h2>
                  <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Broadcasts from ownership to the team</p>
                </div>
                {announcements.length > 0 && (
                  <span className="ml-auto text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: "linear-gradient(135deg, rgba(94,234,212,0.3), rgba(94,234,212,0.15))", color: "#5EEAD4", border: "1px solid rgba(94,234,212,0.35)", fontFamily: "'Space Grotesk', sans-serif" }}>
                    {announcements.length}
                  </span>
                )}
              </div>

              {announcements.length === 0 ? (
                <div className="rounded-xl p-6 text-center flex flex-col items-center gap-2" style={{ backgroundColor: "rgba(94,234,212,0.04)", border: "1px dashed rgba(94,234,212,0.2)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: "rgba(94,234,212,0.12)" }}>📢</div>
                  <div>
                    <p className="text-[12px] font-semibold text-white">No announcements yet</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{isOwner ? 'Post an announcement to broadcast to your team.' : 'Nothing from ownership yet.'}</p>
                  </div>
                </div>
              ) : (
                announcements.map(card => (
                  <AnnouncementCard
                    key={card.id}
                    card={card}
                    currentUser={currentUser}
                    accountId={accountId}
                    onSeen={id => markSeen.mutate({ id, seenBy: currentUser ?? "" })}
                    onArchive={id => archive.mutate({ id })}
                    onDelete={id => deleteCard.mutate({ id })}
                  />
                ))
              )}
            </section>
          </>
        )}
      </main>
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
