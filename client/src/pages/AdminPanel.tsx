/**
 * Admin Panel — Owner-only management dashboard.
 * Accessible only to users with role="owner".
 * Features:
 *  - Waitlist viewer (all signups with timestamps)
 *  - Team member management (list, invite, remove)
 *  - Invite link generation
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePerson } from "@/contexts/PersonContext";
import { toast } from "sonner";
import { useLocation } from "wouter";

function timeAgo(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  coowner: "Co-Owner",
  employee: "Employee",
};

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  owner: { bg: "#DBEAFE", text: "#1D4ED8", border: "#93C5FD" },
  coowner: { bg: "#EDE9FE", text: "#5B21B6", border: "#C4B5FD" },
  employee: { bg: "#F0FDF4", text: "#166534", border: "#86EFAC" },
};

export default function AdminPanel() {
  const { person } = usePerson();
  const [, navigate] = useLocation();
  const accountId = person?.accountId ?? 0;
  const [activeTab, setActiveTab] = useState<"team" | "waitlist">("team");

  // Invite form state
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"coowner" | "employee">("coowner");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);

  // Guard: only owners can access
  if (person && person.role !== "owner") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-[#1E3A5F] mb-2">Access Restricted</h2>
          <p className="text-[#64748B] text-sm">This page is only accessible to account owners.</p>
          <button
            onClick={() => navigate("/app/board")}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: "#1E3A5F" }}
          >
            Go to Board
          </button>
        </div>
      </div>
    );
  }

  const { data: membersData, refetch: refetchMembers } = trpc.person.list.useQuery(
    { accountId },
    { enabled: accountId !== undefined }
  );

  const { data: waitlistData } = trpc.waitlist.list.useQuery(
    { accountId },
    { enabled: activeTab === "waitlist" && accountId !== undefined }
  );

  const { data: waitlistCountData } = trpc.waitlist.count.useQuery();

  const inviteMutation = trpc.person.invite.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setInviteLink(data.inviteUrl);
        refetchMembers();
        toast.success(`Invite created for ${inviteName}!`);
        setInviteName("");
        setInviteEmail("");
      } else {
        toast.error("Could not create invite — that email may already be registered.");
      }
    },
    onError: () => toast.error("Failed to create invite. Please try again."),
  });

  const removeMutation = trpc.person.remove.useMutation({
    onSuccess: () => {
      refetchMembers();
      toast.success("Team member removed.");
    },
    onError: () => toast.error("Could not remove team member."),
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    setInviteLink(null);
    inviteMutation.mutate({
      accountId,
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole,
      businessScope: "all",
      origin: window.location.origin,
    });
  };

  const members = membersData ?? [];
  const waitlistEmails = waitlistData?.emails ?? [];
  const waitlistCount = waitlistCountData?.count ?? 0;

  const inputClass = "w-full rounded-xl px-4 py-2.5 text-sm text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none transition-all";
  const inputStyle = { backgroundColor: "#F8F7F4", border: "1.5px solid #E2E0DB" };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-2xl font-bold text-[#1E3A5F] mb-1"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Admin Panel
        </h1>
        <p className="text-sm text-[#64748B]">Manage your team and waitlist signups.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["team", "waitlist"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={
              activeTab === tab
                ? { backgroundColor: "#1E3A5F", color: "#FFFFFF" }
                : { backgroundColor: "#FFFFFF", color: "#64748B", border: "1.5px solid #E2E0DB" }
            }
          >
            {tab === "team" ? `👥 Team (${members.length})` : `📋 Waitlist (${waitlistCount})`}
          </button>
        ))}
      </div>

      {/* ── Team Tab ── */}
      {activeTab === "team" && (
        <div className="flex flex-col gap-4">
          {/* Team member list */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E0DB", boxShadow: "0 2px 12px rgba(30,58,95,0.06)" }}
          >
            <div className="px-5 py-4 border-b border-[#F1F5F9]">
              <h2 className="text-sm font-bold text-[#1E3A5F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Team Members
              </h2>
            </div>
            {members.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[#94A3B8]">No team members yet.</div>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {members.map(m => {
                  const roleStyle = ROLE_COLORS[m.role] ?? ROLE_COLORS.employee;
                  const isCurrentUser = m.id === person?.id;
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-5 py-4">
                      {/* Avatar */}
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: roleStyle.bg, color: roleStyle.text }}
                      >
                        {m.name[0]?.toUpperCase()}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-[#1E3A5F]">{m.name}</span>
                          {isCurrentUser && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B] font-medium">you</span>
                          )}
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: roleStyle.bg, color: roleStyle.text, border: `1px solid ${roleStyle.border}` }}
                          >
                            {ROLE_LABELS[m.role] ?? m.role}
                          </span>
                          {!m.inviteAccepted && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#FEF3C7", color: "#92400E", border: "1px solid #FCD34D" }}>
                              ⏳ Invite pending
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#94A3B8] mt-0.5">{m.email}</p>
                      </div>
                      {/* Remove button (not for self) */}
                      {!isCurrentUser && (
                        <button
                          onClick={() => {
                            if (confirm(`Remove ${m.name} from the team?`)) {
                              removeMutation.mutate({ id: m.id });
                            }
                          }}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:bg-red-50 hover:text-red-600"
                          style={{ color: "#CBD5E1" }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Invite section */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E0DB", boxShadow: "0 2px 12px rgba(30,58,95,0.06)" }}
          >
            <button
              className="w-full flex items-center justify-between px-5 py-4"
              onClick={() => { setShowInviteForm(v => !v); setInviteLink(null); }}
            >
              <h2 className="text-sm font-bold text-[#1E3A5F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                ✉️ Invite New Team Member
              </h2>
              <span className="text-[#94A3B8] text-sm">{showInviteForm ? "▲" : "▼"}</span>
            </button>

            {showInviteForm && (
              <div className="px-5 pb-5 border-t border-[#F1F5F9]">
                <form onSubmit={handleInvite} className="flex flex-col gap-3 mt-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[#1E3A5F]">Name</label>
                    <input
                      type="text"
                      value={inviteName}
                      onChange={e => setInviteName(e.target.value)}
                      placeholder="e.g. Lynn"
                      className={inputClass}
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = "#0D9488")}
                      onBlur={e => (e.target.style.borderColor = "#E2E0DB")}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[#1E3A5F]">Email</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="their@email.com"
                      className={inputClass}
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = "#0D9488")}
                      onBlur={e => (e.target.style.borderColor = "#E2E0DB")}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[#1E3A5F]">Role</label>
                    <select
                      value={inviteRole}
                      onChange={e => setInviteRole(e.target.value as "coowner" | "employee")}
                      className={inputClass}
                      style={inputStyle}
                    >
                      <option value="coowner">Co-Owner (full access)</option>
                      <option value="employee">Employee (limited access)</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={inviteMutation.isPending || !inviteName.trim() || !inviteEmail.trim()}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
                    style={{ backgroundColor: "#1E3A5F", boxShadow: "0 4px 16px rgba(30,58,95,0.20)" }}
                  >
                    {inviteMutation.isPending ? "Creating invite…" : "Create Invite Link →"}
                  </button>
                </form>

                {/* Invite link display */}
                {inviteLink && (
                  <div
                    className="mt-4 rounded-xl p-4"
                    style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}
                  >
                    <p className="text-xs font-bold text-[#166534] mb-2">✓ Invite link created!</p>
                    <p className="text-[11px] text-[#64748B] mb-2">
                      Copy this link and send it to your team member. They'll set their own password.
                    </p>
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={inviteLink}
                        className="flex-1 text-xs rounded-lg px-3 py-2 bg-white border border-[#BBF7D0] text-[#1E3A5F] font-mono"
                        onClick={e => (e.target as HTMLInputElement).select()}
                      />
                      <button
                        onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success("Copied!"); }}
                        className="px-3 py-2 rounded-lg text-xs font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: "#0D9488" }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Waitlist Tab ── */}
      {activeTab === "waitlist" && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E0DB", boxShadow: "0 2px 12px rgba(30,58,95,0.06)" }}
        >
          <div className="px-5 py-4 border-b border-[#F1F5F9] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1E3A5F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Waitlist Signups
            </h2>
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: "#DBEAFE", color: "#1D4ED8" }}
            >
              {waitlistCount} total
            </span>
          </div>
          {waitlistEmails.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-[#94A3B8]">
              No waitlist signups yet. Share the landing page to start collecting emails!
            </div>
          ) : (
            <div className="divide-y divide-[#F1F5F9]">
              {waitlistEmails.map((entry, i) => (
                <div key={entry.id ?? i} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: "#EFF6FF", color: "#1D4ED8" }}
                    >
                      {entry.email[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm text-[#1E3A5F] font-medium">{entry.email}</span>
                  </div>
                  <span className="text-xs text-[#94A3B8]">{timeAgo(entry.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
