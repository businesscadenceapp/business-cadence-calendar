/**
 * InvitePartnerSetup — Subscriber names their business and optionally invites their partner.
 * Business name is saved even if the invite is skipped.
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { usePerson } from "@/contexts/PersonContext";
import { toast } from "sonner";
import { BrandIcon } from "@/components/BrandLogo";

export default function InvitePartnerSetup() {
  const [, navigate] = useLocation();
  const { person, setPerson } = usePerson();
  const [businessName, setBusinessName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [ownerPasswordConfirm, setOwnerPasswordConfirm] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const createBusiness = trpc.business.create.useMutation();
  const saveOnboarding = trpc.onboarding.save.useMutation();
  const registerOwner = trpc.person.register.useMutation({
    onSuccess: (data) => {
      setIsRegistering(false);
      if (data.success && data.person) {
        const registeredOwner = data.person;
        setPerson(registeredOwner);
        try {
          localStorage.setItem("bcc_account_id", String(registeredOwner.accountId));
          localStorage.setItem("bcc_auth_v1", "granted");
        } catch { /* local session persistence is best-effort */ }
        toast.success(`Welcome, ${registeredOwner.name}! Now name your business.`);
        return;
      }

      if ((data as { reason?: string }).reason === "already_exists") {
        toast.error("An account with that email already exists. Please sign in instead.");
        navigate("/login");
        return;
      }

      toast.error("Could not create your account. Please try again.");
    },
    onError: () => {
      setIsRegistering(false);
      toast.error("Could not create your account. Please try again.");
    },
  });

  const generateLink = trpc.subscription.generatePartnerInviteLink.useMutation({
    onSuccess: async (data) => {
      if (!data.inviteUrl) {
        toast.error("Could not generate invite link. Please try again.");
        setIsSending(false);
        return;
      }
      try {
        await sendInviteEmail.mutateAsync({
          toEmail: partnerEmail,
          toName: partnerName,
          inviteUrl: data.inviteUrl,
          fromName: person?.name ?? "Your partner",
        });
      } catch {
        // Email failed but link was generated — still proceed
      }
      setIsSending(false);
      navigate(`/waiting-for-partner?name=${encodeURIComponent(partnerName)}&email=${encodeURIComponent(partnerEmail)}&bizName=${encodeURIComponent(businessName.trim())}`);
    },
    onError: (err) => {
      setIsSending(false);
      toast.error(err.message || "Could not send invite. Please try again.");
    },
  });

  const sendInviteEmail = trpc.subscription.sendPartnerSetupInviteEmail.useMutation();

  const handleOwnerRegistration = (event: React.FormEvent) => {
    event.preventDefault();
    if (!ownerName.trim()) { toast.error("Please enter your name."); return; }
    if (!ownerEmail.trim() || !ownerEmail.includes("@")) { toast.error("Please enter a valid email address."); return; }
    if (ownerPassword.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    if (ownerPassword !== ownerPasswordConfirm) { toast.error("Passwords do not match."); return; }

    setIsRegistering(true);
    registerOwner.mutate({
      accountId: 0,
      name: ownerName.trim(),
      email: ownerEmail.trim().toLowerCase(),
      password: ownerPassword,
      role: "owner",
      businessScope: "all",
    });
  };

  const handleSend = () => {
    if (!businessName.trim()) { toast.error("Please enter your business name."); return; }
    if (!partnerName.trim()) { toast.error("Please enter your partner's name."); return; }
    if (!partnerEmail.trim() || !partnerEmail.includes("@")) { toast.error("Please enter a valid email address."); return; }
    if (!person?.id || !person?.accountId) { toast.error("Create your TARSA account to continue."); return; }
    setIsSending(true);
    generateLink.mutate({
      accountId: person.accountId,
      ownerPersonId: person.id,
      origin: "https://businesscadence.com",
      businessName: businessName.trim() || undefined,
    });
  };

  const handleSkip = async () => {
    if (!person?.accountId) {
      navigate("/select-business");
      return;
    }
    // Save business name if they typed one before skipping
    if (businessName.trim()) {
      setIsSkipping(true);
      try {
        const slug = businessName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60) || "business";
        await createBusiness.mutateAsync({
          accountId: person.accountId,
          name: businessName.trim(),
          slug,
          icon: "🏢",
          color: "#64748B",
          sortOrder: 0,
        });
      } catch {
        // May already exist — non-fatal
      }
      setIsSkipping(false);
    }
    navigate("/select-business");
  };

  if (!person) {
    return (
      <div
        className="fixed inset-0 flex flex-col bg-[#0A1628]"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="relative z-10 flex justify-center pt-6 pb-2">
          <div className="flex items-center gap-2">
            <BrandIcon size={28} variant="teal" />
            <span className="text-white/50 text-sm font-medium">TARSA</span>
          </div>
        </div>
        <main className="relative z-10 flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 py-8">
          <div className="w-full max-w-xs">
            <div className="text-center mb-7">
              <h1 className="text-2xl font-bold text-white leading-tight">Create your TARSA account</h1>
              <p className="text-white/45 text-sm leading-relaxed mt-2">
                Create your account first. Then you can name your business and invite your co-owner.
              </p>
            </div>
            <form onSubmit={handleOwnerRegistration} className="flex flex-col gap-4">
              <AccountField label="Your name" id="owner-name">
                <input id="owner-name" type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)} autoComplete="name" placeholder="e.g. Christian" className={accountInputClass} />
              </AccountField>
              <AccountField label="Email address" id="owner-email">
                <input id="owner-email" type="email" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} autoComplete="email" placeholder="you@email.com" className={accountInputClass} />
              </AccountField>
              <AccountField label="Choose a password" id="owner-password">
                <input id="owner-password" type="password" value={ownerPassword} onChange={e => setOwnerPassword(e.target.value)} autoComplete="new-password" placeholder="At least 8 characters" className={accountInputClass} />
              </AccountField>
              <AccountField label="Confirm password" id="owner-password-confirm">
                <input id="owner-password-confirm" type="password" value={ownerPasswordConfirm} onChange={e => setOwnerPasswordConfirm(e.target.value)} autoComplete="new-password" placeholder="Repeat your password" className={accountInputClass} />
              </AccountField>
              <button
                type="submit"
                disabled={isRegistering || !ownerName || !ownerEmail || !ownerPassword || !ownerPasswordConfirm}
                className="w-full py-3.5 rounded-xl font-bold text-[#0A1628] text-base transition-all active:scale-[0.97] disabled:opacity-50 mt-2"
                style={{ background: "linear-gradient(135deg, #33A2DB 0%, #25DCF9 100%)", boxShadow: "0 4px 24px rgba(51,162,219,0.22)" }}
              >
                {isRegistering ? "Creating account…" : "Create Account & Continue →"}
              </button>
            </form>
            <p className="text-center text-xs text-white/35 mt-5">
              Already have a TARSA account?{" "}
              <button type="button" onClick={() => navigate("/login")} className="underline text-[#33A2DB]">Sign in</button>
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 flex flex-col bg-[#0A1628]"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(51,162,219,0.10) 0%, transparent 70%)" }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(51,162,219,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(51,162,219,0.025) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* Brand header */}
      <div className="relative z-10 flex justify-center pt-6 pb-2">
        <div className="flex items-center gap-2">
          <BrandIcon size={28} variant="teal" />
          <span className="text-white/50 text-sm font-medium">
            Business<span className="text-[#33A2DB]">Cadence</span>
          </span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="relative z-10 flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 py-6">
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{
            background: "linear-gradient(135deg, rgba(51,162,219,0.12) 0%, rgba(37,220,249,0.06) 100%)",
            border: "1px solid rgba(51,162,219,0.22)",
            boxShadow: "0 0 40px rgba(51,162,219,0.10)",
          }}
        >
          <svg className="w-8 h-8 text-[#33A2DB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white leading-tight tracking-tight mb-2 text-center">
          Name your business
        </h1>
        <p className="text-white/45 text-sm leading-relaxed max-w-xs mb-6 text-center">
          Enter your business name, then optionally invite your partner to join.
        </p>

        {/* Form */}
        <div className="w-full max-w-xs flex flex-col gap-4">
          {/* Business Name */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">
              Business Name
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Maple Street Bakery"
              autoComplete="organization"
              className="w-full rounded-xl px-4 py-3.5 text-white text-base placeholder-white/20 focus:outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1.5px solid rgba(255,255,255,0.10)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(51,162,219,0.5)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.10)")}
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/25 text-xs uppercase tracking-wider">Invite partner (optional)</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Partner Name */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">
              Partner's Name
            </label>
            <input
              type="text"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder="e.g. Sarah"
              autoComplete="off"
              className="w-full rounded-xl px-4 py-3.5 text-white text-base placeholder-white/20 focus:outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1.5px solid rgba(255,255,255,0.10)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(51,162,219,0.5)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.10)")}
            />
          </div>

          {/* Partner Email */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">
              Partner's Email
            </label>
            <input
              type="email"
              value={partnerEmail}
              onChange={(e) => setPartnerEmail(e.target.value)}
              placeholder="partner@email.com"
              autoComplete="email"
              className="w-full rounded-xl px-4 py-3.5 text-white text-base placeholder-white/20 focus:outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1.5px solid rgba(255,255,255,0.10)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(51,162,219,0.5)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.10)")}
            />
          </div>

          {/* Buttons — same width as inputs */}
          <div className="flex flex-col gap-2 mt-2">
            <button
              onClick={handleSend}
              disabled={isSending || !businessName.trim() || !partnerName.trim() || !partnerEmail.trim()}
              className="w-full py-3.5 rounded-xl font-bold text-[#0A1628] text-base transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #33A2DB 0%, #25DCF9 100%)",
                boxShadow: "0 4px 24px rgba(51,162,219,0.22)",
              }}
            >
              {isSending ? "Sending…" : "Send Invite →"}
            </button>
            <button
              onClick={handleSkip}
              disabled={isSkipping}
              className="w-full py-3 text-white/40 text-sm text-center hover:text-white/60 transition-colors"
            >
              {isSkipping ? "Saving…" : "Skip — I'll invite my partner later"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const accountInputClass = "w-full rounded-xl px-4 py-3.5 text-white text-base placeholder-white/20 focus:outline-none bg-white/[0.06] border border-white/[0.12]";

function AccountField({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 text-left">
      <label htmlFor={id} className="text-xs font-semibold text-white/40 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}
