import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { usePerson } from "@/contexts/PersonContext";

const PAGE_SIZE = 20;

function timeAgo(ts: number | null | undefined): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function TeamBoardArchive() {
  const [, navigate] = useLocation();
  const { person } = usePerson();
  const accountId = person?.accountId;
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const { data, isLoading } = trpc.board.getArchived.useQuery(
    {
      accountId: accountId ?? 0,
      search: activeSearch || undefined,
      topicTag: topicFilter ?? undefined,
      audience: "team",
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
    { enabled: !!accountId }
  );

  const { data: tagsData } = trpc.board.getArchiveTags.useQuery(
    { accountId: accountId ?? 0 },
    { enabled: !!accountId }
  );

  const tags = tagsData?.tags ?? [];
  const cards = data?.cards ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSearch = () => {
    setActiveSearch(search);
    setPage(0);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A1929" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: "#0A1929", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <button
          onClick={() => navigate("/app/team")}
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-all active:scale-[0.95]"
          style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
        >
          ←
        </button>
        <div>
          <h1 className="text-[15px] font-bold" style={{ color: "white", fontFamily: "'Space Grotesk', sans-serif" }}>
            🗂 Team Archive
          </h1>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            {total} archived {total === 1 ? "discussion" : "discussions"}
          </p>
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4 max-w-2xl mx-auto">
        {/* Search bar */}
        <div className="flex gap-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Search archived discussions…"
            className="flex-1 rounded-xl px-4 py-2.5 text-[13px] placeholder-white/30 focus:outline-none transition-colors"
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              border: "1.5px solid rgba(255,255,255,0.12)",
              color: "white",
              fontFamily: "'Inter', sans-serif",
            }}
            onFocus={e => (e.target.style.borderColor = "#3B9EE8")}
            onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #3B9EE8 0%, #0EA5E9 100%)",
              color: "#0A1929",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            Search
          </button>
        </div>

        {/* Topic tag filters */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setTopicFilter(null); setPage(0); }}
              className="px-3 py-1 rounded-full text-[11px] font-medium transition-all"
              style={{
                backgroundColor: topicFilter === null ? "rgba(59,158,232,0.2)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${topicFilter === null ? "rgba(59,158,232,0.4)" : "rgba(255,255,255,0.12)"}`,
                color: topicFilter === null ? "#3B9EE8" : "rgba(255,255,255,0.5)",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              All topics
            </button>
            {tags.map(tag => (
              <button
                key={tag}
                onClick={() => { setTopicFilter(tag); setPage(0); }}
                className="px-3 py-1 rounded-full text-[11px] font-medium transition-all"
                style={{
                  backgroundColor: topicFilter === tag ? "rgba(59,158,232,0.2)" : "rgba(255,255,255,0.06)",
                  border: `1px solid ${topicFilter === tag ? "rgba(59,158,232,0.4)" : "rgba(255,255,255,0.12)"}`,
                  color: topicFilter === tag ? "#3B9EE8" : "rgba(255,255,255,0.5)",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl p-4 animate-pulse" style={{ backgroundColor: "rgba(255,255,255,0.04)", height: 100 }} />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🗂</p>
            <p className="text-[14px] font-semibold" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}>
              {activeSearch || topicFilter ? "No results found" : "No archived discussions yet"}
            </p>
            <p className="text-[12px] mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
              {activeSearch || topicFilter ? "Try a different search or topic" : "Archive team posts to build a searchable record"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {cards.map(card => {
              const attachments = card.attachmentsJson
                ? (JSON.parse(card.attachmentsJson) as Array<{ key: string; url: string; name: string; mimeType: string }>)
                : [];
              return (
                <div
                  key={card.id}
                  className="rounded-xl p-4 flex flex-col gap-2"
                  style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: card.type === "task" ? "rgba(124,58,237,0.15)" : card.type === "issue" ? "rgba(248,113,113,0.15)" : "rgba(59,158,232,0.12)",
                          color: card.type === "task" ? "#C4B5FD" : card.type === "issue" ? "#F87171" : "#3B9EE8",
                          fontFamily: "'Space Grotesk', sans-serif",
                        }}
                      >
                        {card.type === "task" ? "☑ TASK" : card.type === "issue" ? "⚠ ISSUE" : "📢 UPDATE"}
                      </span>
                      {card.archiveTopicTag && (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          #{card.archiveTopicTag}
                        </span>
                      )}
                      <span className="text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
                        {card.author}
                      </span>
                      {card.assignedTo && (
                        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                          → {card.assignedTo}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>
                      {timeAgo(card.archivedAt ? new Date(card.archivedAt).getTime() : undefined)}
                    </span>
                  </div>

                  {/* Content */}
                  <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.8)" }}>
                    {card.content}
                  </p>

                  {/* Attachments */}
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {attachments.map((a, i) => a.mimeType.startsWith("image/") ? (
                        <a key={i} href={a.url} target="_blank" rel="noopener noreferrer">
                          <img src={a.url} alt={a.name} className="w-16 h-16 rounded-lg object-cover border" style={{ borderColor: "rgba(59,158,232,0.2)" }} />
                        </a>
                      ) : (
                        <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium"
                          style={{ backgroundColor: "rgba(59,158,232,0.1)", border: "1px solid rgba(59,158,232,0.25)", color: "#3B9EE8" }}
                        >
                          📎 {a.name}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Decision marker */}
                  {card.archiveDecision && (
                    <div
                      className="rounded-lg px-3 py-2 mt-1"
                      style={{ backgroundColor: "rgba(59,158,232,0.08)", border: "1px solid rgba(59,158,232,0.2)" }}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#3B9EE8", fontFamily: "'Space Grotesk', sans-serif" }}>
                        ✓ Decision
                      </p>
                      <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.8)" }}>
                        {card.archiveDecision}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 rounded-lg text-[12px] font-medium transition-all"
              style={{
                backgroundColor: page === 0 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: page === 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)",
              }}
            >
              ← Previous
            </button>
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-4 py-2 rounded-lg text-[12px] font-medium transition-all"
              style={{
                backgroundColor: page >= totalPages - 1 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: page >= totalPages - 1 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)",
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
