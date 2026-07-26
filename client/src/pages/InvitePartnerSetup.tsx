/**
 * InvitePartnerSetup — Subscriber sends their partner a setup link.
 * The partner will complete the business profile on behalf of both.
 * After sending, routes to /waiting-for-partner.
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { usePerson } from "@/contexts/PersonContext";
import { toast } from "sonner";
import { BrandIcon } from "@/components/BrandLogo";

export default function InvitePartnerSetup() {
  const [, navigate] = useLocation();
  const { person } = usePerson();
  const [businessName, setBusinessName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  const generateLink = trpc.subscription.generatePartnerInviteLink.useMutation({
    onSuccess: async (data) => {
      if (!data.inviteUrl) {
        toast.error("Could not generate invite link. Please try again.");
        setIsSending(false);
        return;
      }
      // Send email via server
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

  const handleSend = () => {
    if (!businessName.trim()) { toast.error("Please enter your business name."); return; }
    if (!partnerName.trim()) { toast.error("Please enter your partner's name."); return; }
    if (!partnerEmail.trim() || !partnerEmail.includes("@")) { toast.error("Please enter a valid email address."); return; }
    if (!person?.id || !person?.accountId) { toast.error("Please sign in first."); navigate("/login"); return; }
    setIsSending(true);
    generateLink.mutate({
      accountId: person.accountId,
      ownerPersonId: person.id,
      origin: window.location.origin,
      businessName: businessName.trim() || undefined,
    });
  };

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
          style={{ background: "radial-gradient(circle, rgba(94,234,212,0.10) 0%, transparent 70%)" }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(94,234,212,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(94,234,212,0.025) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* Brand header */}
      <div className="relative z-10 flex justify-center pt-6 pb-2">
        <div className="flex items-center gap-2">
          <BrandIcon size={28} variant="teal" />
          <span className="text-white/50 text-sm font-medium">
            Business<span className="text-[#5EEAD4]">Cadence</span>
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center">
        {/* Icon */}
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-7"
          style={{
            background: "linear-gradient(135deg, rgba(94,234,212,0.12) 0%, rgba(13,148,136,0.06) 100%)",
            border: "1px solid rgba(94,234,212,0.22)",
            boxShadow: "0 0 40px rgba(94,234,212,0.10)",
          }}
        >
          <svg className="w-10 h-10 text-[#5EEAD4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h1 className="text-[26px] font-bold text-white leading-tight tracking-tight mb-3">
          Let's set up your workspace
        </h1>
        <p className="text-white/45 text-sm leading-relaxed max-w-xs mb-8">
          Tell us your business name, then invite your partner to complete the setup together.
        </p>

        {/* Form */}
        <div className="w-full max-w-xs flex flex-col gap-4">
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
              onFocus={(e) => (e.target.style.borderColor = "rgba(94,234,212,0.5)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.10)")}
            />
          </div>

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
              onFocus={(e) => (e.target.style.borderColor = "rgba(94,234,212,0.5)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.10)")}
            />
          </div>

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
              onFocus={(e) => (e.target.style.borderColor = "rgba(94,234,212,0.5)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.10)")}
            />
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="relative z-10 px-6 pb-8 max-w-md mx-auto w-full">
        <button
          onClick={handleSend}
          disabled={isSending || !businessName.trim() || !partnerName.trim() || !partnerEmail.trim()}
          className="w-full py-4 rounded-2xl font-bold text-[#0A1628] text-base transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #5EEAD4 0%, #0D9488 100%)",
            boxShadow: "0 4px 24px rgba(94,234,212,0.22)",
          }}
        >
          {isSending ? "Sending…" : "Send Invite →"}
        </button>
        <button
          onClick={() => navigate(`/setup?bizName=${encodeURIComponent(businessName.trim())}`)}
          className="w-full py-3 text-white/30 text-sm text-center mt-2 hover:text-white/50 transition-colors"
        >
          I'll set it up myself instead
        </button>
      </div>
    </div>
  );
}
