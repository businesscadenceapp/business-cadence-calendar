/**
 * Settings page — Customize agenda items per business per meeting type.
 * Dark navy theme: #0F2440 bg, #5EEAD4 teal accent, white text
 */

import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MEETING_TYPES, BUSINESSES } from "@/lib/calendarData";
import { usePerson } from "@/contexts/PersonContext";
import { personScopeToBusinessSelection } from "@/lib/businessScope";
import type { MeetingType, BusinessKey } from "@/lib/calendarData";

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

type DbBusiness = string;
type DbMeetingType = "daily" | "weekly" | "monthly" | "quarterly";

interface AgendaItem {
  key: string;
  label: string;
  sortOrder: number;
}

function getDefaultItems(biz: BusinessKey, mt: MeetingType): AgendaItem[] {
  const meeting = MEETING_TYPES[mt];
  const block = meeting.timeBlocks.find((b) => b.business === biz);
  if (!block) return [];
  return block.items.map((label, i) => ({ key: `${biz}-${mt}-default-${i}`, label, sortOrder: i }));
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

// Shared dark input styles
const darkInput = {
  backgroundColor: "rgba(255,255,255,0.06)",
  border: "1.5px solid rgba(255,255,255,0.12)",
  color: "white",
};

const AUTHOR_PALETTE = ["#2563EB", "#E11D48", "#059669", "#D97706", "#7C3AED"];

// ─── Password Confirm Modal ───────────────────────────────────────────────────
function PasswordModal({ onConfirm, onCancel, isPending, ownerNames }: {
  onConfirm: (password: string, author: string) => void;
  onCancel: () => void;
  isPending: boolean;
  ownerNames: string[];
}) {
  const [pw, setPw] = useState("");
  const [author, setAuthor] = useState<string>(ownerNames[0] ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
      <div
        className="w-full max-w-sm mx-4 rounded-2xl p-6"
        style={{ backgroundColor: "#0D2035", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}
      >
        <h3 className="font-bold text-[15px] mb-1 text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Confirm Changes
        </h3>
        <p className="text-[12px] mb-5" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}>
          Re-enter the site password to save agenda changes. This protects against accidental edits.
        </p>

        <p className="text-[11px] mb-2 uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Inter', sans-serif" }}>
          Saved by
        </p>
        <div className="flex gap-2 mb-4">
          {ownerNames.map((name, idx) => (
            <button
              key={name}
              onClick={() => setAuthor(name)}
              className="flex-1 py-2 rounded-xl text-[13px] font-bold transition-all"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                backgroundColor: author === name ? AUTHOR_PALETTE[idx % AUTHOR_PALETTE.length] : "rgba(255,255,255,0.06)",
                color: author === name ? "white" : "rgba(255,255,255,0.5)",
                border: "1px solid rgba(255,255,255,0.12)",
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
          className="w-full rounded-xl px-4 py-3 text-[14px] placeholder-white/30 focus:outline-none mb-3"
          style={darkInput}
        />

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-[13px] transition-all"
            style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Cancel
          </button>
          <button
            onClick={() => { if (pw.trim()) onConfirm(pw.trim(), author); }}
            disabled={isPending || !pw.trim()}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0D9488 100%)", fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {isPending ? "Saving…" : "Save Changes →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Agenda Editor ────────────────────────────────────────────────────────────
function AgendaEditor({ biz, mt, savedItems, onSaveRequest }: {
  biz: DbBusiness;
  mt: DbMeetingType;
  savedItems: AgendaItem[] | null;
  onSaveRequest: (items: AgendaItem[]) => void;
}) {
  const bizKey = (BIZ_MAP_REVERSE as Record<string, BusinessKey>)[biz] ?? (biz as BusinessKey);
  const defaultItems = getDefaultItems(bizKey, mt as MeetingType);
  const [items, setItems] = useState<AgendaItem[]>(savedItems ?? defaultItems);
  const [dirty, setDirty] = useState(false);

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
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => moveItem(idx, -1)}
                disabled={idx === 0}
                className="w-5 h-4 rounded flex items-center justify-center disabled:opacity-20 transition-colors"
                style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "white")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
                title="Move up"
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M4 1L7 6H1L4 1Z" fill="currentColor"/></svg>
              </button>
              <button
                onClick={() => moveItem(idx, 1)}
                disabled={idx === items.length - 1}
                className="w-5 h-4 rounded flex items-center justify-center disabled:opacity-20 transition-colors"
                style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "white")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
                title="Move down"
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M4 7L7 2H1L4 7Z" fill="currentColor"/></svg>
              </button>
            </div>

            <input
              type="text"
              value={item.label}
              onChange={(e) => updateLabel(idx, e.target.value)}
              placeholder="Agenda item…"
              className="flex-1 rounded-lg px-3 py-2 text-[13px] placeholder-white/30 focus:outline-none transition-all"
              style={darkInput}
              onFocus={(e) => (e.target.style.borderColor = "#5EEAD4")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
            />

            <button
              onClick={() => removeItem(idx)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#FDA4AF")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
              title="Remove item"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addItem}
        className="w-full py-2 rounded-lg text-[12px] transition-colors mb-3"
        style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif" }}
        onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
      >
        + Add agenda item
      </button>

      <div className="flex gap-2">
        <button
          onClick={resetToDefault}
          className="px-3 py-1.5 rounded-lg text-[11px] transition-colors"
          style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
        >
          Reset to defaults
        </button>
        <div className="flex-1" />
        <button
          onClick={() => onSaveRequest(items.map((it, i) => ({ ...it, sortOrder: i })))}
          disabled={!dirty}
          className="px-4 py-1.5 rounded-lg text-[12px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-30"
          style={{
            background: dirty ? "linear-gradient(135deg, #1E3A5F 0%, #0D9488 100%)" : "rgba(255,255,255,0.08)",
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          {dirty ? "Save Changes" : "No Changes"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function Settings() {
  const { person } = usePerson();
  const accountId = person?.accountId ?? (() => {
    const stored = localStorage.getItem("bcc_account_id");
    return stored ? parseInt(stored, 10) : undefined;
  })();

  const { data: dbBusinesses = [] } = trpc.business.list.useQuery(
    { accountId: accountId ?? 0 },
    { enabled: accountId !== undefined }
  );
  const { data: personsData = [] } = trpc.person.list.useQuery(
    { accountId: accountId ?? 0 },
    { enabled: accountId !== undefined }
  );
  const ownerNames = useMemo(
    () => personsData.filter(p => p.role === "owner" || p.role === "coowner").map(p => p.name),
    [personsData]
  );

  const visibleBusinesses = dbBusinesses.map(b => ({
    key: b.slug as DbBusiness,
    bizKey: b.slug as BusinessKey,
    label: b.name,
    color: b.color,
    icon: b.icon,
  }));

  const [selectedBiz, setSelectedBiz] = useState<DbBusiness>("");
  useEffect(() => {
    if (!selectedBiz && visibleBusinesses.length > 0) {
      setSelectedBiz(visibleBusinesses[0].key);
    }
  }, [visibleBusinesses, selectedBiz]);

  const effectiveSelectedBiz = (selectedBiz && visibleBusinesses.some(b => b.key === selectedBiz))
    ? selectedBiz
    : (visibleBusinesses[0]?.key ?? "chiropractic" as DbBusiness);
  const [selectedMt, setSelectedMt] = useState<DbMeetingType>("daily");
  const [pendingSave, setPendingSave] = useState<{ items: AgendaItem[] } | null>(null);

  const { data: allTemplates, refetch } = trpc.agendaTemplate.getAll.useQuery();

  const saveTemplate = trpc.agendaTemplate.save.useMutation({
    onSuccess: () => { toast.success("Agenda updated successfully."); setPendingSave(null); refetch(); },
    onError: (err) => { toast.error(err.message ?? "Incorrect password or save failed."); },
  });

  const getSavedItems = (biz: DbBusiness, mt: DbMeetingType): AgendaItem[] | null => {
    if (!allTemplates) return null;
    const found = allTemplates.templates.find((t) => t.business === biz && t.meetingType === mt);
    return found ? found.items : null;
  };

  const handleSaveRequest = (items: AgendaItem[]) => { setPendingSave({ items }); };

  const handlePasswordConfirm = (password: string, updatedBy: string) => {
    if (!pendingSave) return;
    saveTemplate.mutate({
      business: effectiveSelectedBiz as "chiropractic" | "crossfit" | "realty",
      meetingType: selectedMt,
      items: pendingSave.items,
      updatedBy,
      password,
    });
  };

  const selectedBizInfo = visibleBusinesses.find((b) => b.key === effectiveSelectedBiz)
    ?? visibleBusinesses[0]
    ?? { key: "", bizKey: "", label: "Business", color: "#E2E0DB", icon: "🏢" };
  const selectedMtInfo = MEETING_LIST.find((m) => m.key === selectedMt) ?? MEETING_LIST[0];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0F2440", fontFamily: "'Inter', sans-serif" }}>
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/app"
            className="flex items-center gap-2 text-[12px] transition-colors"
            style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Calendar
          </Link>
          <div className="flex-1" />
          <div>
            <h1 className="font-bold text-[18px] text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Settings
            </h1>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>Customize agenda items per meeting type</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
          {/* Left: Business + Meeting selector */}
          <div className="flex flex-col gap-3">
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Space Grotesk', sans-serif" }}>Business</p>
            {visibleBusinesses.map((biz) => (
              <button
                key={biz.key}
                onClick={() => setSelectedBiz(biz.key)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                style={{
                  backgroundColor: effectiveSelectedBiz === biz.key ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                  border: effectiveSelectedBiz === biz.key ? `1px solid ${biz.color}` : "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <span className="text-lg">{biz.icon}</span>
                <span className="text-[12px] font-semibold" style={{ color: effectiveSelectedBiz === biz.key ? "white" : "rgba(255,255,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}>
                  {biz.label}
                </span>
              </button>
            ))}

            <p className="text-[10px] uppercase tracking-widest mt-4 mb-1" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Space Grotesk', sans-serif" }}>Meeting Type</p>
            {MEETING_LIST.map((mt) => (
              <button
                key={mt.key}
                onClick={() => setSelectedMt(mt.key)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                style={{
                  backgroundColor: selectedMt === mt.key ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                  border: selectedMt === mt.key ? `1px solid ${mt.color}` : "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: mt.color }} />
                <span className="text-[12px] font-semibold" style={{ color: selectedMt === mt.key ? "white" : "rgba(255,255,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}>
                  {mt.label}
                </span>
              </button>
            ))}
          </div>

          {/* Right: Editor */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-xl">{selectedBizInfo.icon}</span>
              <div>
                <h2 className="font-bold text-[14px] text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {selectedBizInfo.label}
                </h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedMtInfo.color }} />
                  <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>{selectedMtInfo.label}</span>
                </div>
              </div>
              {getSavedItems(effectiveSelectedBiz, selectedMt) && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(13,148,136,0.2)", color: "#5EEAD4" }}>
                  Custom
                </span>
              )}
            </div>

            <p className="text-[11px] mb-4" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif" }}>
              Edit, reorder, add, or remove agenda items. Changes apply to all future meetings of this type.
              Past meeting logs are preserved with their original items.
            </p>

            <AgendaEditor
              key={`${effectiveSelectedBiz}-${selectedMt}`}
              biz={effectiveSelectedBiz}
              mt={selectedMt}
              savedItems={getSavedItems(effectiveSelectedBiz, selectedMt)}
              onSaveRequest={handleSaveRequest}
            />
          </div>
        </div>
      </div>

      {(person?.role === "owner" || person?.role === "coowner") && (
        <EmployeeInvitePanel accountId={accountId ?? 0} />
      )}

      {(person?.role === "owner" || person?.role === "coowner") && (
        <ReportQuestionsPanel accountId={accountId ?? 0} businesses={visibleBusinesses} />
      )}

      {pendingSave && (
        <PasswordModal
          onConfirm={handlePasswordConfirm}
          onCancel={() => setPendingSave(null)}
          isPending={saveTemplate.isPending}
          ownerNames={ownerNames}
        />
      )}
    </div>
  );
}

// ─── Employee Invite Panel ────────────────────────────────────────────────────
function EmployeeInvitePanel({ accountId }: { accountId: number }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"employee" | "coowner">("employee");
  const [scope, setScope] = useState("all");
  const [sending, setSending] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const { data: membersData, refetch: refetchMembers } = trpc.person.list.useQuery(
    { accountId },
    { enabled: accountId !== undefined }
  );
  const { data: bizList = [] } = trpc.business.list.useQuery(
    { accountId },
    { enabled: accountId !== undefined }
  );
  type PersonRow = { id: string; name: string; email: string; role: string; businessScope: string; inviteAccepted: boolean; createdAt: Date };

  const inviteMutation = trpc.person.invite.useMutation({
    onSuccess: (data) => {
      setSending(false);
      if (data.success) {
        setInviteLink(data.inviteUrl);
        setName("");
        setEmail("");
        toast.success(`Invite link created for ${email}`);
        refetchMembers();
      } else {
        toast.error("Could not create invite. Check that the email isn't already registered.");
      }
    },
    onError: () => { setSending(false); toast.error("Failed to send invite. Please try again."); },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSending(true);
    setInviteLink(null);
    inviteMutation.mutate({ accountId, name: name.trim(), email: email.trim(), role, businessScope: role === "coowner" ? "all" : scope, origin: window.location.origin });
  };

  const members: PersonRow[] = Array.isArray(membersData) ? membersData : [];
  const roleLabel = (r: string) => r === "owner" ? "Owner" : r === "coowner" ? "Co-owner" : "Employee";

  return (
    <div className="max-w-4xl mx-auto px-4 pb-8">
      <div className="rounded-2xl p-6" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <h2 className="font-bold text-[16px] mb-1 text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          👥 Team Members
        </h2>
        <p className="text-[12px] mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
          Add employees and send them an invite link to create their account.
        </p>

        {members.length > 0 && (
          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>Current Members</p>
            <div className="flex flex-col gap-2">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                  style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: m.role === "owner" ? "#2563EB" : m.role === "coowner" ? "#E11D48" : "#059669" }}
                  >
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-white truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{m.name}</p>
                    <p className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{m.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        backgroundColor: m.role === "owner" ? "rgba(37,99,235,0.2)" : m.role === "coowner" ? "rgba(225,29,72,0.2)" : "rgba(5,150,105,0.2)",
                        color: m.role === "owner" ? "#93C5FD" : m.role === "coowner" ? "#FDA4AF" : "#6EE7B7",
                      }}>
                      {roleLabel(m.role)}
                    </span>
                    {!m.inviteAccepted && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: "rgba(217,119,6,0.2)", color: "#FCD34D" }}>
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>Invite New Team Member</p>
        <form onSubmit={handleInvite} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-white/70">Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Colleen"
                className="w-full rounded-xl px-4 py-2.5 text-sm placeholder-white/30 focus:outline-none transition-all"
                style={darkInput}
                onFocus={e => (e.target.style.borderColor = "#5EEAD4")}
                onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-white/70">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="employee@email.com"
                className="w-full rounded-xl px-4 py-2.5 text-sm placeholder-white/30 focus:outline-none transition-all"
                style={darkInput}
                onFocus={e => (e.target.style.borderColor = "#5EEAD4")}
                onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-white/70">Role</label>
            <select value={role} onChange={e => setRole(e.target.value as "employee" | "coowner")}
              className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none cursor-pointer"
              style={darkInput}>
              <option value="employee">Employee (Board + KPIs only)</option>
              <option value="coowner">Co-owner (full access)</option>
            </select>
          </div>
          {role === "employee" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-white/70">Business Access</label>
              <select value={scope} onChange={e => setScope(e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none cursor-pointer"
                style={darkInput}>
                {bizList.map(b => <option key={b.slug} value={b.slug}>{b.name} only</option>)}
                {bizList.length > 1 && <option value="all">All businesses</option>}
              </select>
            </div>
          )}
          <button type="submit" disabled={sending || !name.trim() || !email.trim()}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
            style={{ backgroundColor: "#1E3A5F", boxShadow: "0 4px 16px rgba(30,58,95,0.3)" }}>
            {sending ? "Creating invite…" : "Send Invite Link →"}
          </button>
        </form>

        {inviteLink && (
          <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: "rgba(5,150,105,0.1)", border: "1px solid rgba(5,150,105,0.3)" }}>
            <p className="text-[12px] font-semibold mb-2" style={{ color: "#6EE7B7" }}>✓ Invite link created!</p>
            <p className="text-[11px] mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>Copy and send this link to your employee:</p>
            <div className="flex items-center gap-2">
              <input readOnly value={inviteLink}
                className="flex-1 text-[11px] px-3 py-2 rounded-lg font-mono focus:outline-none"
                style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(5,150,105,0.3)", color: "rgba(255,255,255,0.7)" }} />
              <button
                onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success("Copied!"); }}
                className="px-3 py-2 rounded-lg text-[11px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: "#059669" }}>
                Copy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Report Questions Panel ───────────────────────────────────────────────────
interface BizOption { key: string; label: string; icon: string; color: string; }

function ReportQuestionsPanel({ accountId, businesses }: { accountId: number; businesses: BizOption[] }) {
  const [selectedBizId, setSelectedBizId] = useState<number>(0);
  const [newQuestion, setNewQuestion] = useState("");

  const { data: dbBizList = [] } = trpc.business.list.useQuery({ accountId }, { enabled: accountId !== undefined });

  const bizOptions: { id: number; label: string; icon: string }[] = [
    { id: 0, label: "All Businesses", icon: "🌐" },
    ...dbBizList.map(b => ({ id: b.id, label: b.name, icon: b.icon || "🏢" })),
  ];

  const questionsQuery = trpc.report.listQuestions.useQuery(
    { accountId, businessId: selectedBizId === 0 ? undefined : selectedBizId },
    { enabled: accountId !== undefined }
  );

  const createQuestion = trpc.report.createQuestion.useMutation({
    onSuccess: () => { setNewQuestion(""); toast.success("Question added!"); questionsQuery.refetch(); },
    onError: () => toast.error("Failed to add question."),
  });

  const deleteQuestion = trpc.report.deleteQuestion.useMutation({
    onSuccess: () => { toast.success("Question removed."); questionsQuery.refetch(); },
    onError: () => toast.error("Failed to remove question."),
  });

  const questions = questionsQuery.data ?? [];

  function handleAddQuestion() {
    if (!newQuestion.trim()) return;
    createQuestion.mutate({ accountId, businessId: selectedBizId, question: newQuestion.trim(), sortOrder: questions.length });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pb-8">
      <div className="rounded-2xl p-6" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center gap-3 mb-5">
          <span className="text-xl">📝</span>
          <div>
            <h2 className="font-bold text-[14px] text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Weekly Report Questions
            </h2>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
              Configure the questions employees answer in their weekly check-in.
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap mb-5">
          {bizOptions.map(b => (
            <button key={b.id} onClick={() => setSelectedBizId(b.id)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5"
              style={{
                backgroundColor: selectedBizId === b.id ? "#1E3A5F" : "rgba(255,255,255,0.05)",
                color: selectedBizId === b.id ? "white" : "rgba(255,255,255,0.5)",
                border: `1.5px solid ${selectedBizId === b.id ? "#5EEAD4" : "rgba(255,255,255,0.1)"}`,
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
              {b.icon} {b.label}
            </button>
          ))}
        </div>

        {questionsQuery.isLoading ? (
          <p className="text-[12px] italic py-4" style={{ color: "rgba(255,255,255,0.3)" }}>Loading questions…</p>
        ) : questions.length === 0 ? (
          <div className="rounded-xl p-6 text-center mb-4" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1.5px dashed rgba(255,255,255,0.1)" }}>
            <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.3)" }}>
              No questions configured yet for {selectedBizId === 0 ? "all businesses" : bizOptions.find(b => b.id === selectedBizId)?.label ?? "this business"}.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mb-4">
            {questions.map((q, idx) => (
              <div key={q.id} className="flex items-center gap-3 px-4 py-3 rounded-xl group"
                style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="text-[12px] font-bold w-5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>{idx + 1}.</span>
                <p className="flex-1 text-[13px] text-white" style={{ fontFamily: "'Inter', sans-serif" }}>{q.question}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: q.businessId === 0 ? "rgba(124,58,237,0.2)" : "rgba(37,99,235,0.2)",
                    color: q.businessId === 0 ? "#C4B5FD" : "#93C5FD",
                  }}>
                  {q.businessId === 0 ? "All" : bizOptions.find(b => b.id === q.businessId)?.label ?? "Business"}
                </span>
                <button
                  onClick={() => deleteQuestion.mutate({ id: q.id })}
                  className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "#FDA4AF" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.1)")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                  title="Remove question"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={newQuestion}
            onChange={e => setNewQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && newQuestion.trim()) handleAddQuestion(); }}
            placeholder="e.g. What was your biggest win this week?"
            className="flex-1 rounded-xl px-4 py-2.5 text-[13px] placeholder-white/30 focus:outline-none transition-all"
            style={darkInput}
            onFocus={e => (e.target.style.borderColor = "#C4B5FD")}
            onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
          />
          <button
            onClick={handleAddQuestion}
            disabled={!newQuestion.trim() || createQuestion.isPending}
            className="px-4 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-40"
            style={{ backgroundColor: "#7C3AED", fontFamily: "'Space Grotesk', sans-serif" }}>
            {createQuestion.isPending ? "…" : "+ Add"}
          </button>
        </div>
        <p className="text-[10px] mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>
          Questions tagged "All" appear for every business. Select a specific business tab to add questions for that business only.
        </p>
      </div>
    </div>
  );
}
