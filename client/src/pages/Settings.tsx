/**
 * Settings page — Customize agenda items per business per meeting type.
 * Dark navy theme: #0F2440 bg, #5EEAD4 teal accent, white text
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MEETING_TYPES, BUSINESSES } from "@/lib/calendarData";
import { usePerson } from "@/contexts/PersonContext";
import { personScopeToBusinessSelection } from "@/lib/businessScope";
import type { MeetingType, BusinessKey } from "@/lib/calendarData";
import PartnerInviteSheet from "@/components/PartnerInviteSheet";
import { useTour, TOUR_PENDING_KEY } from "@/contexts/TourContext";
import { useActiveBusiness } from "@/components/BusinessSwitcher";

const BIZ_MAP: Record<BusinessKey, "chiropractic" | "crossfit"> = {
  chiro: "chiropractic",
  crossfit: "crossfit",
};
const BIZ_MAP_REVERSE: Record<"chiropractic" | "crossfit", BusinessKey> = {
  chiropractic: "chiro",
  crossfit: "crossfit",
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

// ─── Business Logo Section ───────────────────────────────────────────────────

interface BizLogoItem {
  key: string;
  id: number;
  label: string;
  color: string;
  icon: string;
  logoUrl: string | null;
}

function BusinessLogoSection({
  businesses,
  accountId,
}: {
  businesses: BizLogoItem[];
  accountId: number;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedBizId, setSelectedBizId] = useState<number | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const utils = trpc.useUtils();

  const uploadLogo = trpc.business.uploadLogo.useMutation({
    onSuccess: () => {
      utils.business.list.invalidate();
      setPreview(null);
      setSelectedBizId(null);
    },
    onError: (err) => {
      toast.error("Failed to upload logo: " + err.message);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Logo must be under 4 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!preview || !selectedBizId) return;
    const [header, base64Data] = preview.split(",");
    const mimeType = header.match(/data:(.*);base64/)?.[1] ?? "image/png";
    setUploading(true);
    try {
      await uploadLogo.mutateAsync({ businessId: selectedBizId, base64Data, mimeType });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div
      className="mx-4 sm:mx-6 mb-8 rounded-2xl p-5"
      style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
          style={{ backgroundColor: "rgba(94,234,212,0.15)", border: "1px solid rgba(94,234,212,0.3)" }}
        >
          🖼️
        </div>
        <div>
          <h2 className="text-sm font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Business Logo
          </h2>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            Upload a logo for each business. It appears on your selector card when you log in.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {businesses.map((biz) => (
          <div
            key={biz.key}
            className="flex items-center gap-4 rounded-xl px-4 py-3"
            style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", border: `1px solid ${biz.color}40` }}
            >
              {biz.logoUrl ? (
                <img src={biz.logoUrl} alt={biz.label} className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-xl">{biz.icon}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {biz.label}
              </p>
              <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                {biz.logoUrl ? "Logo uploaded" : "No logo yet"}
              </p>
            </div>

            <button
              onClick={() => {
                setSelectedBizId(biz.id);
                setPreview(null);
                setTimeout(() => fileInputRef.current?.click(), 50);
              }}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-80 active:scale-[0.97]"
              style={{ backgroundColor: `${biz.color}25`, color: biz.color, border: `1px solid ${biz.color}40` }}
            >
              {biz.logoUrl ? "Change" : "Upload"}
            </button>
          </div>
        ))}
      </div>

      {preview && selectedBizId && (
        <div
          className="mt-4 rounded-xl p-4 flex items-center gap-4"
          style={{ backgroundColor: "rgba(94,234,212,0.06)", border: "1px solid rgba(94,234,212,0.2)" }}
        >
          <img
            src={preview}
            alt="Preview"
            className="w-16 h-16 rounded-xl object-contain"
            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
          />
          <div className="flex-1">
            <p className="text-[12px] font-semibold text-white mb-1">Logo preview</p>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
              {businesses.find(b => b.id === selectedBizId)?.label}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setPreview(null); setSelectedBizId(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-40"
              style={{ backgroundColor: "#5EEAD4", color: "#0A1929" }}
            >
              {uploading ? "Uploading…" : "Save Logo"}
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
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
  const { replay } = useTour();
  const [, navigate] = useLocation();

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

  // Only show the currently active business — to customize another, switch business first
  const { activeBusiness } = useActiveBusiness(person?.businessScope);
  const visibleBusinesses = dbBusinesses
    .filter(b => {
      // Map activeBusiness key ("chiro") to slug ("chiropractic") for comparison
      const activeSlug = activeBusiness === "chiro" ? "chiropractic" : activeBusiness;
      return b.slug === activeSlug;
    })
    .map(b => ({
      key: b.slug as DbBusiness,
      bizKey: b.slug as BusinessKey,
      label: b.name,
      color: b.color,
      icon: b.icon,
      logoUrl: b.logoUrl ?? null,
      id: b.id,
    }));

  const [selectedBiz, setSelectedBiz] = useState<DbBusiness>("");
  useEffect(() => {
    // Reset selection when active business changes
    if (visibleBusinesses.length > 0) {
      setSelectedBiz(visibleBusinesses[0].key);
    }
  }, [activeBusiness]);

  // Team Calendar visibility settings
  const { data: teamCalSettings, refetch: refetchTeamCal } = trpc.teamCalendar.getSettings.useQuery(
    { accountId: accountId ?? 0 },
    { enabled: accountId !== undefined }
  );
  const [teamCalToggles, setTeamCalToggles] = useState({ showDaily: true, showWeekly: true, showMonthly: true, showQuarterly: true });
  useEffect(() => {
    if (teamCalSettings) setTeamCalToggles(teamCalSettings);
  }, [teamCalSettings]);
  const updateTeamCal = trpc.teamCalendar.updateSettings.useMutation({
    onSuccess: () => { toast.success("Team calendar visibility saved."); refetchTeamCal(); },
    onError: () => toast.error("Failed to save team calendar settings."),
  });

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
      business: effectiveSelectedBiz as "chiropractic" | "crossfit",
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
    <div className="min-h-screen" style={{ backgroundColor: "#0A1929", fontFamily: "'Inter', sans-serif" }}>
      {/* Hero header */}
      <div style={{
        background: "linear-gradient(135deg, #0D2035 0%, #0F2440 50%, #0D1F38 100%)",
        borderBottom: "1px solid rgba(94,234,212,0.12)",
        padding: "20px 20px 16px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: "-30px", right: "-30px",
          width: "160px", height: "160px",
          background: "radial-gradient(circle, rgba(94,234,212,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-[11px] mb-3 transition-colors"
          style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'Space Grotesk', sans-serif" }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Command Center
        </Link>
        <div className="flex items-center gap-2.5">
          <div style={{
            width: 30, height: 30, borderRadius: "9px",
            background: "linear-gradient(135deg, rgba(94,234,212,0.25) 0%, rgba(94,234,212,0.1) 100%)",
            border: "1px solid rgba(94,234,212,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "15px", boxShadow: "0 0 10px rgba(94,234,212,0.12)",
          }}>⚙️</div>
          <div>
            <h1 className="font-black text-[20px] text-white leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>Settings</h1>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>Customize agenda items per meeting type</p>
          </div>
        </div>
      </div>

      {/* ── App Tour ─────────────────────────────────────────────────────────── */}
      <div
        className="mx-4 sm:mx-6 mt-6 mb-2 rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
        style={{ backgroundColor: "rgba(94,234,212,0.05)", border: "1px solid rgba(94,234,212,0.15)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div style={{
            width: 36, height: 36, borderRadius: "10px", flexShrink: 0,
            background: "linear-gradient(135deg, rgba(94,234,212,0.2) 0%, rgba(94,234,212,0.08) 100%)",
            border: "1px solid rgba(94,234,212,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px",
          }}>🗺️</div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>App Tour</p>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>Replay the feature walkthrough</p>
          </div>
        </div>
        <button
          onClick={() => {
            // Set a pending flag and navigate to Board — Board will auto-start the tour
            localStorage.setItem(TOUR_PENDING_KEY, "1");
            navigate("/app/board");
          }}
          className="flex-shrink-0 px-4 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-[0.97]"
          style={{
            background: "linear-gradient(135deg, rgba(94,234,212,0.2) 0%, rgba(94,234,212,0.1) 100%)",
            border: "1px solid rgba(94,234,212,0.35)",
            color: "#5EEAD4",
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          Replay tour →
        </button>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-6">

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
          <div className="rounded-2xl p-6" style={{ background: "linear-gradient(135deg, rgba(94,234,212,0.06) 0%, rgba(94,234,212,0.02) 100%)", border: "1.5px solid rgba(94,234,212,0.18)", boxShadow: "0 4px 20px rgba(94,234,212,0.05)" }}>
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

      {/* ── Partner Access ─────────────────────────────────────────────────── */}
      {person?.role === "owner" && (
        <PartnerAccessSection />
      )}

      {(person?.role === "owner" || person?.role === "coowner") && (
        <EmployeeInvitePanel accountId={accountId ?? 0} />
      )}

      {(person?.role === "owner" || person?.role === "coowner") && (
        <ReportQuestionsPanel accountId={accountId ?? 0} businesses={visibleBusinesses} />
      )}

      {/* ── Business Logo ──────────────────────────────────────────────────── */}
      {(person?.role === "owner" || person?.role === "coowner") && (
        <BusinessLogoSection
          businesses={visibleBusinesses}
          accountId={accountId ?? 0}
        />
      )}

      {/* ── Meeting Schedule ──────────────────────────────────────────────── */}
      {(person?.role === "owner" || person?.role === "coowner") && (
        <div
          className="mx-4 sm:mx-6 mb-4 rounded-2xl p-5"
          style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">🗓️</span>
              <div>
                <h2 className="text-sm font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Meeting Schedule
                </h2>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Edit meeting days, times, and which types are active.
                </p>
              </div>
            </div>
            <Link
              href="/app/schedule"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-[0.97]"
              style={{ backgroundColor: "rgba(94,234,212,0.12)", border: "1px solid rgba(94,234,212,0.25)", color: "#5EEAD4", fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Edit Schedule →
            </Link>
          </div>
        </div>
      )}

      {/* ── Team Calendar Visibility ──────────────────────────────────────── */}
      {(person?.role === "owner" || person?.role === "coowner") && (
        <div
          className="mx-4 sm:mx-6 mb-8 rounded-2xl p-5"
          style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xl">📅</span>
            <div>
              <h2 className="text-sm font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Team Schedule Visibility
              </h2>
              <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                Choose which meeting types appear on the Team Schedule. Employees only see the types you enable.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 mb-4">
            {([
              { key: "showDaily" as const, label: "Daily Huddle", color: "#8B5CF6", desc: "Every workday — quick team sync" },
              { key: "showWeekly" as const, label: "Weekly Review", color: "#0EA5E9", desc: "Weekly team performance review" },
              { key: "showMonthly" as const, label: "Monthly Meeting", color: "#14B8A6", desc: "Monthly financial & business review" },
              { key: "showQuarterly" as const, label: "Quarterly / Annual", color: "#F43F5E", desc: "Quarterly offsite or end-of-year" },
            ] as const).map(({ key, label, color, desc }) => (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <div>
                    <p className="text-xs font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{label}</p>
                    <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => setTeamCalToggles(prev => ({ ...prev, [key]: !prev[key] }))}
                  className="relative flex-shrink-0 w-10 h-5 rounded-full transition-colors duration-200"
                  style={{ backgroundColor: teamCalToggles[key] ? "#5EEAD4" : "rgba(255,255,255,0.12)" }}
                  aria-label={`Toggle ${label}`}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
                    style={{ transform: teamCalToggles[key] ? "translateX(1.25rem)" : "translateX(0.125rem)" }}
                  />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => updateTeamCal.mutate({ accountId: accountId ?? 0, ...teamCalToggles })}
            disabled={updateTeamCal.isPending || accountId === undefined}
            className="w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
            style={{ backgroundColor: "#5EEAD4", color: "#0A1929", fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {updateTeamCal.isPending ? "Saving…" : "Save Team Schedule Settings"}
          </button>
        </div>
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
      <div className="rounded-2xl p-6" style={{ background: "linear-gradient(135deg, rgba(56,189,248,0.07) 0%, rgba(56,189,248,0.03) 100%)", border: "1.5px solid rgba(56,189,248,0.2)", boxShadow: "0 4px 20px rgba(56,189,248,0.05)" }}>
        <div className="flex items-center gap-3 mb-1">
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(56,189,248,0.18)", border: "1px solid rgba(56,189,248,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>👥</div>
          <h2 className="font-bold text-[16px] text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Team Members</h2>
        </div>
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
      <div className="rounded-2xl p-6" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(124,58,237,0.04) 100%)", border: "1.5px solid rgba(124,58,237,0.22)", boxShadow: "0 4px 20px rgba(124,58,237,0.06)" }}>
        <div className="flex items-center gap-3 mb-5">
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📝</div>
          <div>
            <h2 className="font-bold text-[14px] text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Weekly Report Questions</h2>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>Configure the questions employees answer in their weekly check-in.</p>
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

// ─── Partner Access Section ───────────────────────────────────────────────────
/**
 * Shown only to owners. Lets them open the PartnerInviteSheet to generate
 * and share a partner invite link with their co-owner.
 */
function PartnerAccessSection() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { person } = usePerson();
  const accountId = person?.accountId ?? 0;
  const { data: bizList = [] } = trpc.business.list.useQuery(
    { accountId },
    { enabled: accountId > 0, staleTime: 60_000 }
  );
  // Use the first business name as the personalization hint for the invite CTA
  const firstBusinessName = bizList[0]?.name ?? undefined;

  return (
    <>
      <div
        className="mx-4 sm:mx-6 mb-8 rounded-2xl p-5"
        style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
            style={{ backgroundColor: "rgba(94,234,212,0.15)", border: "1px solid rgba(94,234,212,0.3)" }}
          >
            👥
          </div>
          <div>
            <h2 className="text-sm font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Partner Access
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              Invite your business partner to join with full access — no extra charge.
            </p>
          </div>
        </div>

        <div
          className="rounded-xl p-4 mb-4"
          style={{ backgroundColor: "rgba(94,234,212,0.06)", border: "1px solid rgba(94,234,212,0.15)" }}
        >
          <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.65)" }}>
            <span className="font-semibold text-white">One subscription covers both of you.</span>{" "}
            Your partner downloads the app free, taps your invite link, creates an account, and gets
            full access — they never see a paywall.
          </p>
        </div>

        <button
          onClick={() => setSheetOpen(true)}
          className="w-full py-3 rounded-xl text-[13px] font-bold transition-all active:scale-[0.98] hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, rgba(94,234,212,0.2), rgba(45,212,191,0.15))",
            border: "1px solid rgba(94,234,212,0.35)",
            color: "#5EEAD4",
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          Generate Partner Invite Link →
        </button>
      </div>

      <PartnerInviteSheet open={sheetOpen} onClose={() => setSheetOpen(false)} businessName={firstBusinessName} />
    </>
  );
}
