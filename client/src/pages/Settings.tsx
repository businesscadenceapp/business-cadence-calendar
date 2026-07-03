/**
 * Settings page — Customize agenda items per business per meeting type.
 * Password re-entry is required before any changes are saved.
 */

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MEETING_TYPES, BUSINESSES } from "@/lib/calendarData";
import { getBusinessSelection } from "./ClientLogin";
import type { MeetingType, BusinessKey } from "@/lib/calendarData";

// Map calendarData BusinessKey to the DB business enum
const BIZ_MAP: Record<BusinessKey, "chiropractic" | "crossfit" | "realty"> = {
  chiro: "chiropractic",
  crossfit: "crossfit",
  realty: "realty",
};
const BIZ_MAP_REVERSE: Record<"chiropractic" | "crossfit" | "realty", BusinessKey> = {
  chiropractic: "chiro",
  crossfit: "crossfit",
  realty: "realty",
};

type DbBusiness = "chiropractic" | "crossfit" | "realty";
type DbMeetingType = "daily" | "weekly" | "monthly" | "quarterly";

interface AgendaItem {
  key: string;
  label: string;
  sortOrder: number;
}

// Build default items from calendarData for a given business + meeting type
function getDefaultItems(biz: BusinessKey, mt: MeetingType): AgendaItem[] {
  const meeting = MEETING_TYPES[mt];
  const block = meeting.timeBlocks.find((b) => b.business === biz);
  if (!block) return [];
  return block.items.map((label, i) => ({
    key: `${biz}-${mt}-default-${i}`,
    label,
    sortOrder: i,
  }));
}

const BUSINESSES_LIST: { key: DbBusiness; bizKey: BusinessKey; label: string; color: string; icon: string }[] = [
  { key: "chiropractic", bizKey: "chiro", label: "New Beginnings Chiropractic", color: "#10B981", icon: "🏥" },
  { key: "crossfit", bizKey: "crossfit", label: "Evolved CrossFit", color: "#F59E0B", icon: "💪" },
  { key: "realty", bizKey: "realty", label: "Bubbles Realty", color: "#64748B", icon: "🏠" },
];

const MEETING_LIST: { key: DbMeetingType; label: string; color: string }[] = [
  { key: "daily", label: "Daily Huddle", color: "#8B5CF6" },
  { key: "weekly", label: "Weekly Review", color: "#0EA5E9" },
  { key: "monthly", label: "Monthly Financial Review", color: "#14B8A6" },
  { key: "quarterly", label: "Quarterly Offsite", color: "#F43F5E" },
];

// ─── Password Confirm Modal ───────────────────────────────────────────────────
function PasswordModal({
  onConfirm,
  onCancel,
  isPending,
}: {
  onConfirm: (password: string, author: "Matt" | "Lynn") => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [pw, setPw] = useState("");
  const [author, setAuthor] = useState<"Matt" | "Lynn">("Matt");
  const [shake, setShake] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
      <div
        className="w-full max-w-sm mx-4 rounded-2xl p-6"
        style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E0DB" }}
      >
        <h3 className="text-[#1E3A5F] font-bold text-[15px] mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Confirm Changes
        </h3>
        <p className="text-[#64748B] text-[12px] mb-5" style={{ fontFamily: "'Inter', sans-serif" }}>
          Re-enter the site password to save agenda changes. This protects against accidental edits.
        </p>

        {/* Who is saving */}
        <p className="text-[#94A3B8] text-[11px] mb-2 uppercase tracking-wider" style={{ fontFamily: "'Inter', sans-serif" }}>
          Saved by
        </p>
        <div className="flex gap-2 mb-4">
          {(["Matt", "Lynn"] as const).map((name) => (
            <button
              key={name}
              onClick={() => setAuthor(name)}
              className="flex-1 py-2 rounded-xl text-[13px] font-bold transition-all"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                backgroundColor: author === name
                  ? name === "Matt" ? "#2563EB" : "#E11D48"
                  : "#F1F0ED",
                color: author === name ? "white" : "#64748B",
                border: "1px solid #E2E0DB",
              }}
            >
              {name}
            </button>
          ))}
        </div>

        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Site password"
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter" && pw.trim()) onConfirm(pw.trim(), author); }}
          className={`w-full rounded-xl px-4 py-3 text-[14px] text-[#1E3A5F] placeholder-[#94A3B8] focus:outline-none mb-3 ${shake ? "animate-[shake_0.5s_ease-in-out]" : ""}`}
          style={{
            backgroundColor: "#F8F7F4",
            border: "1px solid #E2E0DB",
            fontFamily: "'Inter', sans-serif",
          }}
        />

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-[13px] text-[#64748B] transition-all hover:text-[#374151]"
            style={{ backgroundColor: "#F1F0ED", fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Cancel
          </button>
          <button
            onClick={() => { if (pw.trim()) onConfirm(pw.trim(), author); }}
            disabled={isPending || !pw.trim()}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #1E3A5F 0%, #0D9488 100%)",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            {isPending ? "Saving…" : "Save Changes →"}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-6px); }
          30% { transform: translateX(6px); }
          45% { transform: translateX(-4px); }
          60% { transform: translateX(4px); }
          75% { transform: translateX(-2px); }
          90% { transform: translateX(2px); }
        }
      `}</style>
    </div>
  );
}

// ─── Agenda Editor for one business + meeting type ───────────────────────────
function AgendaEditor({
  biz,
  mt,
  savedItems,
  onSaveRequest,
}: {
  biz: DbBusiness;
  mt: DbMeetingType;
  savedItems: AgendaItem[] | null;
  onSaveRequest: (items: AgendaItem[]) => void;
}) {
  const bizKey = BIZ_MAP_REVERSE[biz];
  const defaultItems = getDefaultItems(bizKey, mt as MeetingType);
  const [items, setItems] = useState<AgendaItem[]>(savedItems ?? defaultItems);
  const [dirty, setDirty] = useState(false);

  // Reset when saved items change from outside
  useEffect(() => {
    setItems(savedItems ?? defaultItems);
    setDirty(false);
  }, [JSON.stringify(savedItems)]);

  const updateLabel = (idx: number, label: string) => {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, label } : it));
    setDirty(true);
  };

  const addItem = () => {
    const newKey = `custom-${biz}-${mt}-${Date.now()}`;
    setItems((prev) => [...prev, { key: newKey, label: "", sortOrder: prev.length }]);
    setDirty(true);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx).map((it, i) => ({ ...it, sortOrder: i })));
    setDirty(true);
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const next = [...items];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap]!, next[idx]!];
    setItems(next.map((it, i) => ({ ...it, sortOrder: i })));
    setDirty(true);
  };

  const resetToDefault = () => {
    setItems(defaultItems);
    setDirty(true);
  };

  return (
    <div>
      <div className="flex flex-col gap-1.5 mb-3">
        {items.map((item, idx) => (
          <div key={item.key} className="flex items-center gap-2">
            {/* Move up/down */}
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => moveItem(idx, -1)}
                disabled={idx === 0}
                className="w-5 h-4 rounded flex items-center justify-center text-[#94A3B8] hover:text-[#1E3A5F] disabled:opacity-20 transition-colors"
                style={{ backgroundColor: "#F1F0ED" }}
                title="Move up"
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M4 1L7 6H1L4 1Z" fill="currentColor"/></svg>
              </button>
              <button
                onClick={() => moveItem(idx, 1)}
                disabled={idx === items.length - 1}
                className="w-5 h-4 rounded flex items-center justify-center text-[#94A3B8] hover:text-[#1E3A5F] disabled:opacity-20 transition-colors"
                style={{ backgroundColor: "#F1F0ED" }}
                title="Move down"
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M4 7L7 2H1L4 7Z" fill="currentColor"/></svg>
              </button>
            </div>

            {/* Label input */}
            <input
              type="text"
              value={item.label}
              onChange={(e) => updateLabel(idx, e.target.value)}
              placeholder="Agenda item…"
              className="flex-1 rounded-lg px-3 py-2 text-[13px] text-[#1E3A5F] placeholder-[#94A3B8] focus:outline-none transition-all"
              style={{
                backgroundColor: "#F8F7F4",
                border: "1px solid #E2E0DB",
                fontFamily: "'Inter', sans-serif",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#0D9488")}
              onBlur={(e) => (e.target.style.borderColor = "#E2E0DB")}
            />

            {/* Remove */}
            <button
              onClick={() => removeItem(idx)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-red-500 transition-colors"
              style={{ backgroundColor: "#F1F0ED" }}
              title="Remove item"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Add item */}
      <button
        onClick={addItem}
        className="w-full py-2 rounded-lg text-[12px] text-[#64748B] hover:text-[#1E3A5F] transition-colors mb-3"
        style={{ backgroundColor: "#F8F7F4", border: "1px dashed #CBD5E1", fontFamily: "'Inter', sans-serif" }}
      >
        + Add agenda item
      </button>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={resetToDefault}
          className="px-3 py-1.5 rounded-lg text-[11px] text-[#64748B] hover:text-[#374151] transition-colors"
          style={{ backgroundColor: "#F1F0ED", fontFamily: "'Inter', sans-serif" }}
        >
          Reset to defaults
        </button>
        <div className="flex-1" />
        <button
          onClick={() => onSaveRequest(items.map((it, i) => ({ ...it, sortOrder: i })))}
          disabled={!dirty}
          className="px-4 py-1.5 rounded-lg text-[12px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-30"
          style={{
            background: dirty ? "linear-gradient(135deg, #1E3A5F 0%, #0D9488 100%)" : "#E2E0DB",
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          {dirty ? "Save Changes" : "No Changes"}
        </button>
      </div>
    </div>
  );
}

// Scope → which DB businesses are visible in Settings
const SCOPE_DB_BUSINESSES: Record<string, DbBusiness[]> = {
  chiro:    ["chiropractic"],
  crossfit: ["crossfit"],
  owner:    ["chiropractic", "crossfit", "realty"],
};


// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function Settings() {
  const scope = getBusinessSelection();
  const allowedDbBiz = SCOPE_DB_BUSINESSES[scope] ?? ["chiropractic", "crossfit", "realty"];
  const visibleBusinesses = BUSINESSES_LIST.filter(b => allowedDbBiz.includes(b.key));
  const accountId = Number(localStorage.getItem("bcc_account_id") ?? "0");

  const [selectedBiz, setSelectedBiz] = useState<DbBusiness>(
    allowedDbBiz[0] ?? "chiropractic"
  );
  const [selectedMt, setSelectedMt] = useState<DbMeetingType>("daily");
  const [pendingSave, setPendingSave] = useState<{ items: AgendaItem[] } | null>(null);

  const { data: allTemplates, refetch } = trpc.agendaTemplate.getAll.useQuery();

  const saveTemplate = trpc.agendaTemplate.save.useMutation({
    onSuccess: () => {
      toast.success("Agenda updated successfully.");
      setPendingSave(null);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message ?? "Incorrect password or save failed.");
    },
  });

  const getSavedItems = (biz: DbBusiness, mt: DbMeetingType): AgendaItem[] | null => {
    if (!allTemplates) return null;
    const found = allTemplates.templates.find((t) => t.business === biz && t.meetingType === mt);
    return found ? found.items : null;
  };

  const handleSaveRequest = (items: AgendaItem[]) => {
    setPendingSave({ items });
  };

  const handlePasswordConfirm = (password: string, updatedBy: "Matt" | "Lynn") => {
    if (!pendingSave) return;
    saveTemplate.mutate({
      business: selectedBiz,
      meetingType: selectedMt,
      items: pendingSave.items,
      updatedBy,
      password,
    });
  };

  const selectedBizInfo = BUSINESSES_LIST.find((b) => b.key === selectedBiz)!;
  const selectedMtInfo = MEETING_LIST.find((m) => m.key === selectedMt)!;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F8F7F4", fontFamily: "'Inter', sans-serif" }}>
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(30,58,95,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(30,58,95,0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/app"
            className="flex items-center gap-2 text-[12px] text-[#64748B] hover:text-[#1E3A5F] transition-colors"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Calendar
          </Link>
          <div className="flex-1" />
          <div>
            <h1 className="text-[#1E3A5F] font-bold text-[18px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Settings
            </h1>
            <p className="text-[#64748B] text-[11px]">Customize agenda items per meeting type</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
          {/* Left: Business selector */}
          <div className="flex flex-col gap-3">
            <p className="text-[#94A3B8] text-[10px] uppercase tracking-widest mb-1">Business</p>
            {visibleBusinesses.map((biz) => (
              <button
                key={biz.key}
                onClick={() => setSelectedBiz(biz.key)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                style={{
                  backgroundColor: selectedBiz === biz.key ? "#FFFFFF" : "#F8F7F4",
                  border: selectedBiz === biz.key ? `1px solid ${biz.color}` : "1px solid #E2E0DB",
                }}
              >
                <span className="text-lg">{biz.icon}</span>
                <span
                  className="text-[12px] font-semibold"
                  style={{                   color: selectedBiz === biz.key ? "#1E3A5F" : "#64748B", fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {biz.bizKey === "chiro" ? "Chiropractic" : biz.bizKey === "crossfit" ? "CrossFit" : "Realty"}
                </span>
              </button>
            ))}

            <p className="text-[#94A3B8] text-[10px] uppercase tracking-widest mt-4 mb-1">Meeting Type</p>
            {MEETING_LIST.map((mt) => (
              <button
                key={mt.key}
                onClick={() => setSelectedMt(mt.key)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                style={{
                  backgroundColor: selectedMt === mt.key ? "#FFFFFF" : "#F8F7F4",
                  border: selectedMt === mt.key ? `1px solid ${mt.color}` : "1px solid #E2E0DB",
                }}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: mt.color }} />
                <span
                  className="text-[12px] font-semibold"
                  style={{                   color: selectedMt === mt.key ? "#1E3A5F" : "#64748B", fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {mt.label}
                </span>
              </button>
            ))}
          </div>

          {/* Right: Editor */}
          <div
            className="rounded-2xl p-6"
            style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E0DB" }}
          >
            {/* Editor header */}
            <div className="flex items-center gap-3 mb-5">
              <span className="text-xl">{selectedBizInfo.icon}</span>
              <div>
                <h2 className="text-[#1E3A5F] font-bold text-[14px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {selectedBizInfo.label}
                </h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedMtInfo.color }} />
                  <span className="text-[#64748B] text-[11px]">{selectedMtInfo.label}</span>
                </div>
              </div>
              {getSavedItems(selectedBiz, selectedMt) && (
                <span
                  className="ml-auto text-[10px] px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "rgba(13,148,136,0.10)", color: "#0D9488" }}
                >
                  Custom
                </span>
              )}
            </div>

            <p className="text-[#64748B] text-[11px] mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
              Edit, reorder, add, or remove agenda items. Changes apply to all future meetings of this type.
              Past meeting logs are preserved with their original items.
            </p>

            <AgendaEditor
              key={`${selectedBiz}-${selectedMt}`}
              biz={selectedBiz}
              mt={selectedMt}
              savedItems={getSavedItems(selectedBiz, selectedMt)}
              onSaveRequest={handleSaveRequest}
            />
          </div>
        </div>
      </div>

      {/* Password confirmation modal */}
      {pendingSave && (
        <PasswordModal
          onConfirm={handlePasswordConfirm}
          onCancel={() => setPendingSave(null)}
          isPending={saveTemplate.isPending}
        />
      )}
    </div>
  );
}
