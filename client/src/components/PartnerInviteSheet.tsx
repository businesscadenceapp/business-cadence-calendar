/**
 * PartnerInviteSheet — Bottom sheet for the paying owner to share their
 * unique partner invite link with their co-owner / business partner.
 *
 * The partner downloads the app free, taps the link, creates an account,
 * and gets full access without ever seeing a paywall.
 *
 * Design: dark navy theme (#0F2440 bg, #5EEAD4 teal accent)
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { usePerson } from "@/contexts/PersonContext";
import { Share2, Copy, Check, Users, Sparkles, X } from "lucide-react";
import { Capacitor } from "@capacitor/core";

interface PartnerInviteSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function PartnerInviteSheet({ open, onClose }: PartnerInviteSheetProps) {
  const { person } = usePerson();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateLink = trpc.subscription.generatePartnerInviteLink.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setInviteUrl(data.inviteUrl);
      }
    },
    onError: (err) => {
      toast.error(err.message || "Could not generate invite link.");
    },
  });

  const handleGenerate = () => {
    if (!person) return;
    const origin = window.location.origin;
    generateLink.mutate({
      accountId: person.accountId,
      ownerPersonId: person.id,
      origin,
    });
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Invite link copied!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy — please copy the link manually.");
    }
  };

  const handleShare = async () => {
    if (!inviteUrl) return;
    const shareData = {
      title: "Join me on BusinessCadence",
      text: "I've invited you to BusinessCadence — the app we'll use to run our business together. Tap the link to create your free account.",
      url: inviteUrl,
    };
    if (Capacitor.isNativePlatform() && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch { /* user cancelled */ }
    } else if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch { /* user cancelled */ }
    } else {
      handleCopy();
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl"
        style={{
          background: "linear-gradient(180deg, #0F2440 0%, #0A1929 100%)",
          border: "1px solid rgba(94,234,212,0.2)",
          borderBottom: "none",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
          paddingBottom: "env(safe-area-inset-bottom, 24px)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full transition-all"
          style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
        >
          <X size={16} style={{ color: "rgba(255,255,255,0.6)" }} />
        </button>

        <div className="px-6 pt-4 pb-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "rgba(94,234,212,0.12)", border: "1px solid rgba(94,234,212,0.25)" }}
            >
              <Users size={22} style={{ color: "#5EEAD4" }} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Invite Your Partner
              </h2>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                One subscription. Both of you. No double billing.
              </p>
            </div>
          </div>

          {/* How it works */}
          <div
            className="rounded-2xl p-4 mb-6"
            style={{ backgroundColor: "rgba(94,234,212,0.06)", border: "1px solid rgba(94,234,212,0.15)" }}
          >
            <p className="text-xs font-semibold mb-3" style={{ color: "#5EEAD4" }}>HOW IT WORKS</p>
            <div className="flex flex-col gap-2.5">
              {[
                { step: "1", text: "Generate your unique invite link below" },
                { step: "2", text: "Send it to your partner via text or email" },
                { step: "3", text: "They download the app free and tap the link" },
                { step: "4", text: "They create an account and get instant full access" },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: "rgba(94,234,212,0.2)", border: "1px solid rgba(94,234,212,0.4)" }}
                  >
                    <span className="text-xs font-bold" style={{ color: "#5EEAD4" }}>{step}</span>
                  </div>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>{text}</p>
                </div>
              ))}
            </div>
          </div>

          {!inviteUrl ? (
            /* Generate link button */
            <button
              onClick={handleGenerate}
              disabled={generateLink.isPending}
              className="w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, #5EEAD4, #2DD4BF)",
                color: "#0F2440",
                boxShadow: "0 4px 20px rgba(94,234,212,0.3)",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              <Sparkles size={18} />
              {generateLink.isPending ? "Generating…" : "Generate Invite Link"}
            </button>
          ) : (
            /* Invite link display */
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>YOUR PARTNER'S INVITE LINK</p>
              <div
                className="rounded-xl px-4 py-3 flex items-center gap-3"
                style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <p
                  className="text-sm flex-1 truncate"
                  style={{ color: "rgba(255,255,255,0.6)", fontFamily: "monospace" }}
                >
                  {inviteUrl}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCopy}
                  className="flex-1 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: copied ? "rgba(94,234,212,0.15)" : "rgba(255,255,255,0.08)",
                    border: `1px solid ${copied ? "rgba(94,234,212,0.4)" : "rgba(255,255,255,0.15)"}`,
                    color: copied ? "#5EEAD4" : "rgba(255,255,255,0.8)",
                  }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "Copied!" : "Copy Link"}
                </button>
                <button
                  onClick={handleShare}
                  className="flex-1 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, #5EEAD4, #2DD4BF)",
                    color: "#0F2440",
                    boxShadow: "0 4px 16px rgba(94,234,212,0.25)",
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  <Share2 size={16} />
                  Share
                </button>
              </div>

              {/* Regenerate option */}
              <button
                onClick={handleGenerate}
                className="text-xs text-center py-2 transition-all"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                Generate a new link (invalidates the old one)
              </button>
            </div>
          )}

          {/* Security note */}
          <p className="text-xs text-center mt-4" style={{ color: "rgba(255,255,255,0.25)" }}>
            This link is unique to your account. Only share it with your business partner.
          </p>
        </div>
      </div>
    </>
  );
}
