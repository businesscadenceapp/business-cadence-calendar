/**
 * Admin Panel — Owner-only management dashboard.
 * Dark navy themed to match the rest of the app.
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
  owner: { bg: "rgba(37,99,235,0.2)", text: "#93C5FD", border: "rgba(37,99,235,0.4)" },
  coowner: { bg: "rgba(124,58,237,0.2)", text: "#C4B5FD", border: "rgba(124,58,237,0.4)" },
  employee: { bg: "rgba(5,150,105,0.2)", text: "#6EE7B7", border: "rgba(5,150,105,0.4)" },
};

export default function AdminPanel() {
  const { person } = usePerson();
  const [, navigate] = useLocation();
  const accountId = person?.accountId ?? 0;
  const [activeTab, setActiveTab] = useState<"team" | "waitlist" | "beta">("team");

  const [inviteName, setInviteName] = useState("");

  // Beta access state
  const [betaSearchEmail, setBetaSearchEmail] = useState("");
  const [betaNote, setBetaNote] = useState("");
  const [betaSearchResult, setBetaSearchResult] = useState<null | { found: boolean; accountId?: number; personId?: string; name?: string; email?: string; hasBeta?: boolean }>(null);

  const foundingSpots = trpc.subscription.getFoundingSpots.useQuery(undefined, { staleTime: 30_000 });

  const grantBeta = trpc.subscription.grantBeta.useMutation({
    onSuccess: () => {
      toast.success("Beta access granted!");
      setBetaSearchResult(null);
      setBetaSearchEmail("");
      setBetaNote("");
    },
    onError: (e) => toast.error(e.message || "Failed to grant beta access"),
  });

  const revokeBeta = trpc.subscription.revokeBeta.useMutation({
    onSuccess: () => {
      toast.success("Beta access revoked.");
      setBetaSearchResult(null);
      setBetaSearchEmail("");
    },
    onError: (e) => toast.error(e.message || "Failed to revoke beta access"),
  });

  const betaPersonSearch = trpc.person.findByEmail.useQuery(
    { email: betaSearchEmail.trim() || "placeholder@x.com" },
    { enabled: false }
  );

  const betaSubSearch = trpc.subscription.getSubscription.useQuery(
    { accountId: betaSearchResult?.accountId ?? 0 },
    { enabled: !!betaSearchResult?.accountId }
  );

  // Update hasBeta once betaSubSearch resolves
  const betaSubStatus = betaSubSearch.data?.subscription?.status;

  const handleBetaSearch = async () => {
    if (!betaSearchEmail.trim()) return;
    const result = await betaPersonSearch.refetch();
    if (result.data?.person) {
      const p = result.data.person;
      setBetaSearchResult({ found: true, accountId: p.accountId, personId: p.id, name: p.name, email: p.email, hasBeta: false });
    } else {
      setBetaSearchResult({ found: false });
    }
  };

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"coowner" | "employee">("coowner");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);

  if (person && person.role !== "owner") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Access Restricted</h2>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>This page is only accessible to account owners.</p>
          <button
            onClick={() => navigate("/app/board")}
            className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: "#5EEAD4", color: "#0F2440" }}
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

  const inputStyle: React.CSSProperties = {
    backgroundColor: "rgba(255,255,255,0.06)",
    border: "1.5px solid rgba(255,255,255,0.12)",
    borderRadius: "12px",
    padding: "10px 16px",
    fontSize: "13px",
    color: "white",
    width: "100%",
    outline: "none",
    fontFamily: "'Inter', sans-serif",
  };

  return (
    <div
      className="min-h-full"
      style={{ backgroundColor: "#0A1929", fontFamily: "'Inter', sans-serif" }}
    >
      {/* Hero header */}
      <div
        className="px-5 pt-6 pb-5"
        style={{
          background: "linear-gradient(135deg, #0D2035 0%, #0F2440 50%, #0D1F38 100%)",
          borderBottom: "1px solid rgba(255,215,0,0.12)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{
          position: "absolute", top: "-40px", right: "-40px",
          width: "200px", height: "200px",
          background: "radial-gradient(circle, rgba(255,215,0,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div className="flex items-center gap-2.5 mb-1.5">
          <div style={{
            width: 32, height: 32,
            borderRadius: "10px",
            background: "linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(255,215,0,0.08) 100%)",
            border: "1px solid rgba(255,215,0,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "16px",
            boxShadow: "0 0 12px rgba(255,215,0,0.15)",
          }}>🔑</div>
          <span className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: "#FCD34D", fontFamily: "'Space Grotesk', sans-serif" }}>Admin Panel</span>
        </div>
        <h1 className="text-[22px] font-black text-white leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
          Team &amp; Waitlist
        </h1>
        <p className="text-[12px] mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>Manage your team members and waitlist signups.</p>
      </div>

      <div className="p-4 pb-24 max-w-2xl">
        {/* Tabs */}
        <div className="flex gap-2 mb-5">
  {(["team", "waitlist"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded-xl text-[12px] font-bold transition-all"
              style={
                activeTab === tab
                  ? { background: "linear-gradient(135deg, #5EEAD4, #38BDF8)", color: "#0F2440", boxShadow: "0 4px 12px rgba(94,234,212,0.25)" }
                  : { backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }
              }
            >
              {tab === "team" ? `👥 Team (${members.length})` : tab === "waitlist" ? `📋 Waitlist (${waitlistCount})` : `🧪 Beta Access`}
            </button>
          ))}
        </div>

        {/* ── Team Tab ── */}
        {activeTab === "team" && (
          <div className="flex flex-col gap-4">
            {/* Team member list */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(37,99,235,0.04) 100%)",
                border: "1.5px solid rgba(37,99,235,0.2)",
                boxShadow: "0 4px 24px rgba(37,99,235,0.08)",
              }}
            >
              <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(37,99,235,0.2)" }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: "rgba(37,99,235,0.2)", border: "1px solid rgba(37,99,235,0.35)" }}>👥</div>
                <h2 className="text-sm font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Team Members</h2>
                <span className="ml-auto text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: "rgba(37,99,235,0.25)", color: "#93C5FD", border: "1px solid rgba(37,99,235,0.35)" }}>
                  {members.length}
                </span>
              </div>
              {members.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>No team members yet.</div>
              ) : (
                <div>
                  {members.map((m, idx) => {
                    const roleStyle = ROLE_COLORS[m.role] ?? ROLE_COLORS.employee;
                    const isCurrentUser = m.id === person?.id;
                    return (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 px-5 py-4"
                        style={{ borderBottom: idx < members.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                      >
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{ backgroundColor: roleStyle.bg, color: roleStyle.text, border: `1px solid ${roleStyle.border}` }}
                        >
                          {m.name[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-white">{m.name}</span>
                            {isCurrentUser && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>you</span>
                            )}
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: roleStyle.bg, color: roleStyle.text, border: `1px solid ${roleStyle.border}` }}
                            >
                              {ROLE_LABELS[m.role] ?? m.role}
                            </span>
                            {!m.inviteAccepted && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "rgba(217,119,6,0.2)", color: "#FCD34D", border: "1px solid rgba(217,119,6,0.35)" }}>
                                ⏳ Invite pending
                              </span>
                            )}
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{m.email}</p>
                        </div>
                        {!isCurrentUser && (
                          <button
                            onClick={() => {
                              if (confirm(`Remove ${m.name} from the team?`)) {
                                removeMutation.mutate({ id: m.id });
                              }
                            }}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                            style={{ color: "rgba(255,255,255,0.25)", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#F87171"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(248,113,113,0.3)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.25)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
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
              style={{
                background: "linear-gradient(135deg, rgba(94,234,212,0.06) 0%, rgba(94,234,212,0.03) 100%)",
                border: "1.5px solid rgba(94,234,212,0.18)",
                boxShadow: "0 4px 24px rgba(94,234,212,0.06)",
              }}
            >
              <button
                className="w-full flex items-center justify-between px-5 py-4"
                onClick={() => { setShowInviteForm(v => !v); setInviteLink(null); }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: "rgba(94,234,212,0.15)", border: "1px solid rgba(94,234,212,0.3)" }}>✉️</div>
                  <h2 className="text-sm font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Invite New Team Member</h2>
                </div>
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{showInviteForm ? "▲" : "▼"}</span>
              </button>

              {showInviteForm && (
                <div className="px-5 pb-5" style={{ borderTop: "1px solid rgba(94,234,212,0.12)" }}>
                  <form onSubmit={handleInvite} className="flex flex-col gap-3 mt-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>Name</label>
                      <input
                        type="text"
                        value={inviteName}
                        onChange={e => setInviteName(e.target.value)}
                        placeholder="e.g. Lynn"
                        style={inputStyle}
                        onFocus={e => ((e.target as HTMLInputElement).style.borderColor = "rgba(94,234,212,0.5)")}
                        onBlur={e => ((e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)")}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>Email</label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        placeholder="their@email.com"
                        style={inputStyle}
                        onFocus={e => ((e.target as HTMLInputElement).style.borderColor = "rgba(94,234,212,0.5)")}
                        onBlur={e => ((e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)")}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>Role</label>
                      <select
                        value={inviteRole}
                        onChange={e => setInviteRole(e.target.value as "coowner" | "employee")}
                        style={{ ...inputStyle, cursor: "pointer" }}
                      >
                        <option value="coowner" style={{ backgroundColor: "#0F2440" }}>Co-Owner (full access)</option>
                        <option value="employee" style={{ backgroundColor: "#0F2440" }}>Employee (limited access)</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={inviteMutation.isPending || !inviteName.trim() || !inviteEmail.trim()}
                      className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
                      style={{
                        background: "linear-gradient(135deg, #5EEAD4, #38BDF8)",
                        color: "#0F2440",
                        boxShadow: "0 4px 16px rgba(94,234,212,0.25)",
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      {inviteMutation.isPending ? "Creating invite…" : "Create Invite Link →"}
                    </button>
                  </form>

                  {inviteLink && (
                    <div
                      className="mt-4 rounded-xl p-4"
                      style={{ backgroundColor: "rgba(5,150,105,0.12)", border: "1px solid rgba(5,150,105,0.3)" }}
                    >
                      <p className="text-xs font-bold mb-2" style={{ color: "#6EE7B7" }}>✓ Invite link created!</p>
                      <p className="text-[11px] mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                        Copy this link and send it to your team member. They'll set their own password.
                      </p>
                      <div className="flex gap-2">
                        <input
                          readOnly
                          value={inviteLink}
                          className="flex-1 text-xs rounded-lg px-3 py-2 font-mono"
                          style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(5,150,105,0.3)", color: "rgba(255,255,255,0.8)" }}
                          onClick={e => (e.target as HTMLInputElement).select()}
                        />
                        <button
                          onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success("Copied!"); }}
                          className="px-3 py-2 rounded-lg text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: "#0D9488", color: "white" }}
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
            style={{
              background: "linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(124,58,237,0.04) 100%)",
              border: "1.5px solid rgba(124,58,237,0.2)",
              boxShadow: "0 4px 24px rgba(124,58,237,0.08)",
            }}
          >
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(124,58,237,0.2)" }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.35)" }}>📋</div>
              <h2 className="text-sm font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Waitlist Signups</h2>
              <span className="ml-auto text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: "rgba(124,58,237,0.25)", color: "#C4B5FD", border: "1px solid rgba(124,58,237,0.35)" }}>
                {waitlistCount} total
              </span>
            </div>
            {waitlistEmails.length === 0 ? (
              <div className="px-5 py-10 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: "rgba(124,58,237,0.15)" }}>📭</div>
                <div>
                  <p className="text-sm font-semibold text-white">No signups yet</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Waitlist signups will appear here.</p>
                </div>
              </div>
            ) : (
              <div>
                {waitlistEmails.map((entry: { email: string; createdAt: Date | string }, idx: number) => (
                  <div
                    key={entry.email}
                    className="flex items-center gap-3 px-5 py-3.5"
                    style={{ borderBottom: idx < waitlistEmails.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: "rgba(124,58,237,0.2)", color: "#C4B5FD", border: "1px solid rgba(124,58,237,0.3)" }}>
                      {entry.email[0]?.toUpperCase()}
                    </div>
                    <span className="flex-1 text-sm text-white truncate">{entry.email}</span>
                    <span className="text-[11px] flex-shrink-0" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'JetBrains Mono', monospace" }}>
                      {timeAgo(entry.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* ── Beta Access Tab ── */}
        {activeTab === "beta" && (
          <div className="flex flex-col gap-4">
            {/* Founding spots counter */}
            <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.10) 0%, rgba(245,158,11,0.05) 100%)", border: "1.5px solid rgba(245,158,11,0.25)" }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.35)" }}>🏅</div>
                <h2 className="text-sm font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Founding Member Spots</h2>
              </div>
              {foundingSpots.data ? (
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black" style={{ color: "#FCD34D", fontFamily: "'Space Grotesk', sans-serif" }}>{foundingSpots.data.remaining}</span>
                  <span className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>of {foundingSpots.data.total} spots remaining</span>
                  <span className="ml-auto text-xs px-2.5 py-1 rounded-full font-bold" style={{ backgroundColor: "rgba(245,158,11,0.2)", color: "#FCD34D", border: "1px solid rgba(245,158,11,0.35)" }}>
                    {foundingSpots.data.taken} taken
                  </span>
                </div>
              ) : (
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Loading…</p>
              )}
            </div>

            {/* Grant beta access */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.04) 100%)", border: "1.5px solid rgba(16,185,129,0.2)" }}>
              <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(16,185,129,0.2)" }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.35)" }}>🧪</div>
                <h2 className="text-sm font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Grant Beta Access</h2>
              </div>
              <div className="p-5 flex flex-col gap-3">
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Beta users get full Founding Member access at $0. Search by email to find a user, then grant or revoke their beta status.
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={betaSearchEmail}
                    onChange={e => { setBetaSearchEmail(e.target.value); setBetaSearchResult(null); }}
                    placeholder="user@example.com"
                    style={{ ...inputStyle, flex: 1 }}
                    onKeyDown={e => e.key === "Enter" && handleBetaSearch()}
                  />
                  <button
                    onClick={handleBetaSearch}
                    disabled={!betaSearchEmail.trim() || betaPersonSearch.isFetching}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.97] disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #5EEAD4, #38BDF8)", color: "#0F2440" }}
                  >
                    {betaPersonSearch.isFetching ? "…" : "Search"}
                  </button>
                </div>

                {betaSearchResult && !betaSearchResult.found && (
                  <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#FCA5A5" }}>
                    No user found with that email address.
                  </div>
                )}

                {betaSearchResult?.found && (
                  <div className="rounded-xl p-4 flex flex-col gap-3" style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ backgroundColor: "rgba(94,234,212,0.2)", color: "#5EEAD4", border: "1px solid rgba(94,234,212,0.3)" }}>
                        {betaSearchResult.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{betaSearchResult.name}</p>
                        <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{betaSearchResult.email}</p>
                      </div>
                      {betaSubStatus === "beta" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0" style={{ backgroundColor: "rgba(16,185,129,0.2)", color: "#6EE7B7", border: "1px solid rgba(16,185,129,0.35)" }}>
                          Beta Active
                        </span>
                      )}
                    </div>

                    {betaSubStatus !== "beta" && (
                      <input
                        type="text"
                        value={betaNote}
                        onChange={e => setBetaNote(e.target.value)}
                        placeholder="Note (optional): e.g. 'Beta tester — referred by Sarah'"
                        style={{ ...inputStyle }}
                      />
                    )}

                    <div className="flex gap-2">
                      {betaSubStatus !== "beta" ? (
                        <button
                          onClick={() => {
                            if (!betaSearchResult.accountId || !betaSearchResult.personId || !person?.id) return;
                            grantBeta.mutate({
                              accountId: betaSearchResult.accountId,
                              ownerPersonId: betaSearchResult.personId,
                              note: betaNote || undefined,
                            });
                          }}
                          disabled={grantBeta.isPending}
                          className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.97] disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg, #10B981, #059669)", color: "white" }}
                        >
                          {grantBeta.isPending ? "Granting…" : "✓ Grant Beta Access"}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (!betaSearchResult.accountId || !person?.id) return;
                            revokeBeta.mutate({ accountId: betaSearchResult.accountId! });
                          }}
                          disabled={revokeBeta.isPending}
                          className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.97] disabled:opacity-50"
                          style={{ backgroundColor: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#FCA5A5" }}
                        >
                          {revokeBeta.isPending ? "Revoking…" : "✕ Revoke Beta Access"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
