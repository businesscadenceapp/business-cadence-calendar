/**
 * Board Archive — Searchable archive of all archived Owner Board cards
 * with topic tags, decision summaries, and full-text search.
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { usePerson } from "@/contexts/PersonContext";
import { toast } from "sonner";

type Attachment = { key: string; url: string; name: string; mimeType: string; sizeBytes: number };

function timeAgo(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const TYPE_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  update: { bg: "rgba(5,150,105,0.15)", text: "#6EE7B7", border: "rgba(5,150,105,0.35)", label: "Update" },
  issue:  { bg: "rgba(217,119,6,0.15)",  text: "#FCD34D", border: "rgba(217,119,6,0.35)",  label: "Issue" },
  task:   { bg: "rgba(124,58,237,0.15)", text: "#C4B5FD", border: "rgba(124,58,237,0.35)", label: "Task" },
};

// ─── Archive Card ─────────────────────────────────────────────────────────────

function ArchiveCard({
  card,
  onRestore,
}: {
  card: {
    id: number;
    author: string;
    type: string;
    content: string;
    archivedAt: Date | null;
    archiveTopicTag: string | null;
    archiveDecision: string | null;
    attachmentsJson: string | null;
    completedAt: Date | null;
    completedBy: string | null;
    confirmedAt: Date | null;
    confirmedBy: string | null;
    assignedTo: string | null;
  };
  onRestore: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const typeStyle = TYPE_STYLES[card.type] ?? TYPE_STYLES.update;

  const attachments: Attachment[] = useMemo(() => {
    if (!card.attachmentsJson) return [];
    try { return JSON.parse(card.attachmentsJson); } catch { return []; }
  }, [card.attachmentsJson]);

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3 transition-all"
      style={{
        backgroundColor: "rgba(255,255,255,0.03)",
        border: "1.5px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Author avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0 mt-0.5"
          style={{ backgroundColor: "rgba(51,162,219,0.15)", color: "#33A2DB" }}
        >
          {card.author?.[0] ?? "?"}
        </div>

        <div className="flex-1 min-w-0">
          {/* Author + type + date */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[13px] font-bold" style={{ color: "white", fontFamily: "'Space Grotesk', sans-serif" }}>
              {card.author}
            </span>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ backgroundColor: typeStyle.bg, color: typeStyle.text, border: `1px solid ${typeStyle.border}` }}
            >
              {typeStyle.label}
            </span>
            {card.archiveTopicTag && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: "rgba(51,162,219,0.1)", color: "#33A2DB", border: "1px solid rgba(51,162,219,0.25)" }}
              >
                #{card.archiveTopicTag}
              </span>
            )}
            <span className="text-[10px] ml-auto flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>
              {card.archivedAt ? formatDate(card.archivedAt) : ""}
            </span>
          </div>

          {/* Content */}
          <p
            className="text-[13px] leading-relaxed cursor-pointer"
            style={{ color: "rgba(255,255,255,0.85)" }}
            onClick={() => setExpanded(e => !e)}
          >
            {expanded ? card.content : (card.content.length > 180 ? card.content.slice(0, 180) + "…" : card.content)}
          </p>
          {card.content.length > 180 && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="text-[11px] mt-0.5 transition-opacity hover:opacity-80"
              style={{ color: "#33A2DB" }}
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {attachments.map(att => att.mimeType.startsWith("image/") ? (
                <a key={att.key} href={att.url} target="_blank" rel="noopener noreferrer"
                  className="block w-16 h-16 rounded-lg overflow-hidden flex-shrink-0"
                  style={{ border: "1.5px solid rgba(51,162,219,0.25)" }}
                >
                  <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                </a>
              ) : (
                <a key={att.key} href={att.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] transition-opacity hover:opacity-80"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", color: "#33A2DB" }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <span className="max-w-[100px] truncate">{att.name}</span>
                </a>
              ))}
            </div>
          )}

          {/* Decision marker */}
          {card.archiveDecision && (
            <div
              className="mt-2 rounded-lg px-3 py-2 flex items-start gap-2"
              style={{ backgroundColor: "rgba(51,162,219,0.08)", border: "1px solid rgba(51,162,219,0.2)" }}
            >
              <span className="text-[11px] font-bold flex-shrink-0 mt-0.5" style={{ color: "#33A2DB" }}>✓ Decision:</span>
              <p className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.8)" }}>{card.archiveDecision}</p>
            </div>
          )}

          {/* Task completion info */}
          {card.type === "task" && card.confirmedAt && (
            <p className="text-[11px] mt-1 italic" style={{ color: "rgba(255,255,255,0.4)" }}>
              Completed by {card.completedBy} · Confirmed by {card.confirmedBy} · {timeAgo(card.confirmedAt)}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pl-11">
        <button
          onClick={() => onRestore(card.id)}
          className="text-[11px] px-2.5 py-1 rounded-lg transition-all hover:opacity-80"
          style={{
            backgroundColor: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.4)",
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          ↩ Restore to Board
        </button>
      </div>
    </div>
  );
}

// ─── Archive Page ─────────────────────────────────────────────────────────────

export default function BoardArchive() {
  const { person } = usePerson();
  const accountId = person?.accountId ?? (() => {
    const stored = localStorage.getItem("bcc_account_id");
    return stored ? parseInt(stored, 10) : undefined;
  })();

  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"owner" | "team" | "">("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const { data: tagsData } = trpc.board.getArchiveTags.useQuery(
    { accountId: accountId ?? 0 },
    { enabled: accountId !== undefined, staleTime: 30_000 }
  );
  const tags = tagsData?.tags ?? [];

  const { data, isLoading, refetch } = trpc.board.getArchived.useQuery(
    {
      accountId: accountId ?? 0,
      search: search || undefined,
      topicTag: selectedTag ?? undefined,
      audience: selectedType || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
    { enabled: accountId !== undefined, staleTime: 10_000 }
  );

  const cards = data?.cards ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Restore card (un-archive)
  const restoreCard = trpc.board.archiveWithMeta.useMutation({
    onSuccess: () => { refetch(); toast.success("Restored to board"); },
    onError: () => toast.error("Failed to restore"),
  });

  const handleRestore = (id: number) => {
    // We can't truly un-archive with the current procedure, so we'll need a separate unarchive procedure
    // For now, show a toast directing user to use the board
    toast.info("To restore, use the board directly. Archive is read-only for now.");
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0F2440" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 py-4 flex flex-col gap-3"
        style={{ backgroundColor: "#0F2440", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Board Archive
            </h1>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              {total > 0 ? `${total} archived item${total !== 1 ? "s" : ""}` : "No archived items yet"}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search archived posts, decisions, topics…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[13px] placeholder-white/30 focus:outline-none transition-colors"
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              border: "1.5px solid rgba(255,255,255,0.12)",
              color: "white",
              fontFamily: "'Inter', sans-serif",
            }}
            onFocus={e => (e.target.style.borderColor = "#33A2DB")}
            onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Topic tag filter */}
          {tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Space Grotesk', sans-serif" }}>Topic:</span>
              <button
                onClick={() => { setSelectedTag(null); setPage(0); }}
                className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-all"
                style={{
                  backgroundColor: !selectedTag ? "rgba(51,162,219,0.15)" : "rgba(255,255,255,0.05)",
                  border: !selectedTag ? "1px solid rgba(51,162,219,0.35)" : "1px solid rgba(255,255,255,0.1)",
                  color: !selectedTag ? "#33A2DB" : "rgba(255,255,255,0.4)",
                }}
              >All</button>
              {tags.map(tag => (
                <button
                  key={tag}
                  onClick={() => { setSelectedTag(tag === selectedTag ? null : tag); setPage(0); }}
                  className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-all"
                  style={{
                    backgroundColor: selectedTag === tag ? "rgba(51,162,219,0.15)" : "rgba(255,255,255,0.05)",
                    border: selectedTag === tag ? "1px solid rgba(51,162,219,0.35)" : "1px solid rgba(255,255,255,0.1)",
                    color: selectedTag === tag ? "#33A2DB" : "rgba(255,255,255,0.4)",
                  }}
                >#{tag}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cards list */}
      <div className="px-4 py-4 flex flex-col gap-3">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#33A2DB", borderTopColor: "transparent" }} />
          </div>
        )}

        {!isLoading && cards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(51,162,219,0.08)", border: "1.5px solid rgba(51,162,219,0.15)" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#33A2DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 8h14M5 8a2 2 0 1 0 0-4h14a2 2 0 1 0 0 4M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8m-9 4h4"/>
              </svg>
            </div>
            <p className="text-[14px] font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {search || selectedTag ? "No results found" : "No archived items yet"}
            </p>
            <p className="text-[12px] text-center max-w-[240px]" style={{ color: "rgba(255,255,255,0.4)" }}>
              {search || selectedTag
                ? "Try a different search or clear the filters"
                : "Archive board cards to build your searchable record of decisions and discussions"}
            </p>
          </div>
        )}

        {cards.map(card => (
          <ArchiveCard
            key={card.id}
            card={card as any}
            onRestore={handleRestore}
          />
        ))}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="text-[12px] px-3 py-1.5 rounded-lg transition-all disabled:opacity-30"
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.6)",
              }}
            >← Prev</button>
            <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="text-[12px] px-3 py-1.5 rounded-lg transition-all disabled:opacity-30"
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.6)",
              }}
            >Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
