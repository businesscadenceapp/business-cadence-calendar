/**
 * ResetPassword — Validates the reset token and lets the user set a new password.
 */

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { BrandIcon } from "@/components/BrandLogo";
import BrandLogo from "@/components/BrandLogo";

function getTokenFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("token") ?? "";
}

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const token = getTokenFromUrl();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Validate token on mount
  const { data: tokenData, isLoading: validating } = trpc.person.validateResetToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const resetMutation = trpc.person.resetPassword.useMutation({
    onSuccess: (data) => {
      setIsLoading(false);
      if (data.success) {
        setDone(true);
        toast.success("Password updated! Redirecting to sign in…");
        setTimeout(() => navigate("/login"), 2500);
      } else {
        const msg = data.reason === "expired"
          ? "This reset link has expired. Please request a new one."
          : "Invalid reset link. Please request a new one.";
        toast.error(msg);
        setTimeout(() => navigate("/forgot-password"), 2000);
      }
    },
    onError: () => {
      setIsLoading(false);
      toast.error("Something went wrong. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }
    setIsLoading(true);
    resetMutation.mutate({ token, password });
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(51,162,219,0.2)",
    boxShadow: "0 24px 64px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2), 0 0 0 1px rgba(51,162,219,0.08) inset",
    backdropFilter: "blur(16px)",
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: "rgba(255,255,255,0.08)",
    border: "1.5px solid rgba(255,255,255,0.15)",
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(160deg, #0F2440 0%, #1E3A5F 60%, #0D2D4A 100%)", fontFamily: "'Inter', sans-serif" }}
    >
      {/* Nav */}
      <nav className="w-full" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(15,36,64,0.95)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <a href="/">
              <BrandLogo size="md" theme="dark" showTagline={false} />
            </a>
          </div>
        </div>
      </nav>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl p-8" style={cardStyle}>

            {/* No token */}
            {!token && (
              <div className="text-center py-4">
                <p className="text-white/70 text-sm mb-4">Invalid reset link. Please request a new one.</p>
                <a href="/forgot-password" className="text-sm font-semibold" style={{ color: "#33A2DB" }}>
                  Request new link →
                </a>
              </div>
            )}

            {/* Validating */}
            {token && validating && (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-white/50 text-sm">Verifying link…</p>
              </div>
            )}

            {/* Invalid / expired token */}
            {token && !validating && tokenData && !tokenData.valid && (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: "rgba(239,68,68,0.15)", border: "1.5px solid rgba(239,68,68,0.3)" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-white mb-2">Link {tokenData.reason === "expired" ? "expired" : "invalid"}</h2>
                <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {tokenData.reason === "expired"
                    ? "This reset link has expired. Reset links are only valid for 1 hour."
                    : "This reset link is not valid. It may have already been used."}
                </p>
                <a href="/forgot-password" className="inline-block text-sm font-semibold" style={{ color: "#33A2DB" }}>
                  Request a new link →
                </a>
              </div>
            )}

            {/* Valid token — show form */}
            {token && !validating && tokenData?.valid && !done && (
              <>
                <div className="flex items-center gap-4 mb-7">
                  <BrandIcon size={64} variant="teal" />
                  <div>
                    <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      New password
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                      Hi {tokenData.name} — choose a new password
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-white/70" htmlFor="password">New password</label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        autoFocus
                        autoComplete="new-password"
                        className="w-full rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-white/30 focus:outline-none transition-all"
                        style={inputStyle}
                        onFocus={e => (e.target.style.borderColor = "#33A2DB")}
                        onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.15)")}
                      />
                      <button type="button" onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                        {showPassword
                          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        }
                      </button>
                    </div>
                    {password.length > 0 && password.length < 8 && (
                      <p className="text-xs" style={{ color: "#f87171" }}>Must be at least 8 characters</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-white/70" htmlFor="confirm">Confirm password</label>
                    <input
                      id="confirm"
                      type={showPassword ? "text" : "password"}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                      className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none transition-all"
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = "#33A2DB")}
                      onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.15)")}
                    />
                    {confirm.length > 0 && password !== confirm && (
                      <p className="text-xs" style={{ color: "#f87171" }}>Passwords don't match</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || password.length < 8 || password !== confirm}
                    className="w-full py-3.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 mt-1"
                    style={{ backgroundColor: "#33A2DB", color: "#0F2440", boxShadow: "0 4px 16px rgba(51,162,219,0.25)" }}
                  >
                    {isLoading ? "Updating…" : "Update password →"}
                  </button>
                </form>
              </>
            )}

            {/* Done */}
            {done && (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ backgroundColor: "rgba(51,162,219,0.15)", border: "1.5px solid rgba(51,162,219,0.3)" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#33A2DB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Password updated!
                </h2>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Redirecting you to sign in…
                </p>
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
