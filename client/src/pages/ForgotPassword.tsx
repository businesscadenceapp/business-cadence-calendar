/**
 * ForgotPassword — Self-service password reset request page.
 * User enters their email, receives a reset link if the account exists.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { BrandIcon } from "@/components/BrandLogo";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const forgotMutation = trpc.person.forgotPassword.useMutation({
    onSuccess: () => {
      setIsLoading(false);
      setSubmitted(true);
    },
    onError: () => {
      setIsLoading(false);
      // Still show success to prevent email enumeration
      setSubmitted(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    forgotMutation.mutate({
      email: email.trim().toLowerCase(),
      origin: window.location.origin,
    });
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "linear-gradient(160deg, #0F2440 0%, #1E3A5F 60%, #0D2D4A 100%)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Nav */}
      <nav className="w-full" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(15,36,64,0.95)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <a href="/">
              <img
                src="/manus-storage/wordmark-dark-v2_e9c10769.png"
                alt="BusinessCadence"
                height={80}
                style={{ height: 80, width: "auto", filter: "drop-shadow(0 2px 0px rgba(255,255,255,0.15)) drop-shadow(0 5px 10px rgba(0,0,0,0.40)) saturate(1.2) brightness(1.05)" }}
              />
            </a>
            <a href="/login" className="text-sm transition-colors" style={{ color: "rgba(255,255,255,0.5)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "white")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
            >
              ← Back to sign in
            </a>
          </div>
        </div>
      </nav>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div
            className="rounded-2xl p-8"
            style={{
              backgroundColor: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(94,234,212,0.2)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2), 0 0 0 1px rgba(94,234,212,0.08) inset",
              backdropFilter: "blur(16px)",
            }}
          >
            {!submitted ? (
              <>
                {/* Header */}
                <div className="flex items-center gap-4 mb-7">
                  <BrandIcon size={64} variant="teal" />
                  <div>
                    <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      Forgot password?
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                      We'll send you a reset link
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-white/70" htmlFor="email">Email address</label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      autoComplete="email"
                      autoFocus
                      className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none transition-all"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.08)",
                        border: "1.5px solid rgba(255,255,255,0.15)",
                      }}
                      onFocus={e => (e.target.style.borderColor = "#5EEAD4")}
                      onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.15)")}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !email.trim()}
                    className="w-full py-3.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 mt-1"
                    style={{
                      backgroundColor: "#5EEAD4",
                      color: "#0F2440",
                      boxShadow: "0 4px 16px rgba(94,234,212,0.25)",
                    }}
                  >
                    {isLoading ? "Sending…" : "Send reset link →"}
                  </button>
                </form>
              </>
            ) : (
              /* Success state */
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ backgroundColor: "rgba(94,234,212,0.15)", border: "1.5px solid rgba(94,234,212,0.3)" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5EEAD4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.1a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Check your email
                </h2>
                <p className="text-sm mb-2" style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
                  If an account exists for <strong className="text-white">{email}</strong>, we've sent a password reset link. It expires in 1 hour.
                </p>
                <p className="text-xs mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Didn't get it? Check your spam folder.
                </p>
                <a
                  href="/login"
                  className="inline-block text-sm font-semibold transition-colors"
                  style={{ color: "#5EEAD4" }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                >
                  ← Back to sign in
                </a>
              </div>
            )}
          </div>

          <p className="text-center text-xs mt-6" style={{ color: "rgba(255,255,255,0.3)" }}>
            Private access — BusinessCadence clients only
          </p>
        </div>
      </div>
    </div>
  );
}
