/**
 * PartnerRegister — Account creation / sign-in gate for the partner invite flow.
 *
 * Reached via /partner-register?token=<partnerInviteToken>
 *
 * Flow:
 *   1. Validate the token via lookupPartnerInvite
 *   2. If the partner already has an account → show sign-in form
 *   3. If no account → show registration form (name + email + password)
 *   4. On success → navigate to /onboarding?partnerToken=<token>
 *
 * The partner is registered as a co-owner on the same accountId as the owner.
 * After onboarding completes, the partner link is created and the owner is notified.
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { usePerson } from "@/contexts/PersonContext";
import { toast } from "sonner";
import { BrandIcon } from "@/components/BrandLogo";

type Mode = "register" | "login";

export default function PartnerRegister() {
  const [, navigate] = useLocation();
  const { setPerson } = usePerson();

  const params = new URLSearchParams(window.location.search);
  const partnerToken = params.get("token") ?? "";

  // ─── Token lookup ────────────────────────────────────────────────────────────
  const { data: inviteData, isLoading: tokenLoading } = trpc.subscription.lookupPartnerInvite.useQuery(
    { token: partnerToken },
    { enabled: !!partnerToken, retry: false, staleTime: 60_000 }
  );

  // ─── Form state ──────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Mutations ───────────────────────────────────────────────────────────────
  const registerMutation = trpc.person.register.useMutation({
    onSuccess: (data) => {
      setIsSubmitting(false);
      if (data.success && data.person) {
        const p = data.person as any;
        setPerson({
          id: p.id,
          name: p.name,
          email: p.email,
          role: p.role,
          businessScope: p.businessScope,
          accountId: p.accountId,
        });
        try {
          localStorage.setItem("bcc_account_id", String(p.accountId));
          localStorage.setItem("bcc_auth_v1", "granted");
        } catch { /* ignore */ }
        toast.success(`Welcome, ${p.name}! Let's finish setting up your workspace.`);
        navigate(`/onboarding?partnerToken=${encodeURIComponent(partnerToken)}`);
      } else {
        const reason = (data as any).reason;
        if (reason === "already_exists") {
          toast.error("An account with that email already exists. Please sign in instead.");
          setMode("login");
        } else {
          toast.error("Could not create your account. Please try again.");
        }
      }
    },
    onError: () => {
      setIsSubmitting(false);
      toast.error("Something went wrong. Please try again.");
    },
  });

  const loginMutation = trpc.person.login.useMutation({
    onSuccess: (data) => {
      setIsSubmitting(false);
      if (data.success && data.person) {
        const p = data.person as any;
        setPerson({
          id: p.id,
          name: p.name,
          email: p.email,
          role: p.role,
          businessScope: p.businessScope,
          accountId: p.accountId,
        });
        try {
          localStorage.setItem("bcc_account_id", String(p.accountId));
          localStorage.setItem("bcc_auth_v1", "granted");
        } catch { /* ignore */ }
        toast.success(`Welcome back, ${p.name}!`);
        navigate(`/onboarding?partnerToken=${encodeURIComponent(partnerToken)}`);
      } else {
        toast.error("Incorrect email or password. Please try again.");
      }
    },
    onError: () => {
      setIsSubmitting(false);
      toast.error("Something went wrong. Please try again.");
    },
  });

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Please enter your name."); return; }
    if (!email.trim() || !email.includes("@")) { toast.error("Please enter a valid email."); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    if (password !== confirm) { toast.error("Passwords don't match."); return; }
    if (!inviteData?.valid || !inviteData.accountId) {
      toast.error("Invalid invite link. Please ask your partner to re-send the invite.");
      return;
    }
    setIsSubmitting(true);
    registerMutation.mutate({
      accountId: inviteData.accountId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: "coowner",
      businessScope: "all",
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error("Please enter your email."); return; }
    if (!password) { toast.error("Please enter your password."); return; }
    setIsSubmitting(true);
    loginMutation.mutate({ email: email.trim().toLowerCase(), password });
  };

  // ─── Token error state ───────────────────────────────────────────────────────
  const tokenError = !partnerToken || (!tokenLoading && (!inviteData || !inviteData.valid));

  const businessName = inviteData?.valid
    ? (inviteData.businessName ?? inviteData.ownerName ?? null)
    : null;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{
        background: "linear-gradient(135deg, #0A1929 0%, #0F2440 50%, #0D2035 100%)",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(94,234,212,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2">
            <BrandIcon size={36} variant="teal" />
            <span className="text-white/70 text-base font-medium">
              Business<span className="text-[#5EEAD4]">Cadence</span>
            </span>
          </div>
        </div>

        {tokenLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-[#5EEAD4]/30 border-t-[#5EEAD4] animate-spin" />
          </div>
        ) : tokenError ? (
          /* ── Invalid token ── */
          <div
            className="rounded-2xl p-8 text-center"
            style={{
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div className="text-3xl mb-4">🔗</div>
            <h1 className="text-xl font-bold text-white mb-2">Invalid Invite Link</h1>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
              This partner invite link is invalid or has expired. Ask your partner to generate a new one from their app.
            </p>
            <a
              href="/login"
              className="inline-block py-2.5 px-6 rounded-xl text-sm font-bold"
              style={{ backgroundColor: "#5EEAD4", color: "#0F2440" }}
            >
              Go to Login
            </a>
          </div>
        ) : (
          <>
            {/* ── Header ── */}
            <div className="text-center mb-7">
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
                style={{ backgroundColor: "rgba(94,234,212,0.12)", border: "1px solid rgba(94,234,212,0.25)" }}
              >
                <svg className="w-3 h-3" style={{ color: "#5EEAD4" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-xs font-semibold" style={{ color: "#5EEAD4" }}>Partner Invite</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                {mode === "register"
                  ? businessName ? `Join ${businessName}` : "Create Your Account"
                  : "Welcome Back"}
              </h1>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                {mode === "register"
                  ? "Create your account to complete the business setup."
                  : "Sign in to continue setting up your workspace."}
              </p>
              {mode === "register" && (
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mt-3"
                  style={{ backgroundColor: "rgba(94,234,212,0.08)", border: "1px solid rgba(94,234,212,0.2)" }}
                >
                  <span className="text-xs" style={{ color: "rgba(94,234,212,0.9)" }}>
                    ✓ Full access included — no payment required
                  </span>
                </div>
              )}
            </div>

            {/* ── Form card ── */}
            <div
              className="rounded-2xl p-7"
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(94,234,212,0.2)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(94,234,212,0.05)",
              }}
            >
              {mode === "register" ? (
                <form onSubmit={handleRegister} className="flex flex-col gap-4">
                  <Field label="Your Name" id="name">
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Sarah"
                      autoComplete="name"
                      className={inputCls}
                      onFocus={focusBorder}
                      onBlur={blurBorder}
                    />
                  </Field>
                  <Field label="Email Address" id="email">
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      autoComplete="email"
                      className={inputCls}
                      onFocus={focusBorder}
                      onBlur={blurBorder}
                    />
                  </Field>
                  <Field label="Choose a Password" id="password">
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      className={inputCls}
                      onFocus={focusBorder}
                      onBlur={blurBorder}
                    />
                  </Field>
                  <Field label="Confirm Password" id="confirm">
                    <input
                      id="confirm"
                      type="password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                      className={inputCls}
                      onFocus={focusBorder}
                      onBlur={blurBorder}
                    />
                  </Field>
                  <SubmitButton loading={isSubmitting} disabled={!name || !email || !password || !confirm}>
                    Create Account & Continue →
                  </SubmitButton>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                  <Field label="Email Address" id="login-email">
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      autoComplete="email"
                      className={inputCls}
                      onFocus={focusBorder}
                      onBlur={blurBorder}
                    />
                  </Field>
                  <Field label="Password" id="login-password">
                    <input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Your password"
                      autoComplete="current-password"
                      className={inputCls}
                      onFocus={focusBorder}
                      onBlur={blurBorder}
                    />
                  </Field>
                  <SubmitButton loading={isSubmitting} disabled={!email || !password}>
                    Sign In & Continue →
                  </SubmitButton>
                </form>
              )}
            </div>

            {/* ── Mode toggle ── */}
            <p className="text-center text-xs mt-5" style={{ color: "rgba(255,255,255,0.3)" }}>
              {mode === "register" ? (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => setMode("login")}
                    className="underline"
                    style={{ color: "rgba(94,234,212,0.7)" }}
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  New to BusinessCadence?{" "}
                  <button
                    onClick={() => setMode("register")}
                    className="underline"
                    style={{ color: "rgba(94,234,212,0.7)" }}
                  >
                    Create an account
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none transition-all"
  + " bg-white/[0.06] border border-white/[0.12]";

const focusBorder = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = "#5EEAD4";
};
const blurBorder = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = "rgba(255,255,255,0.12)";
};

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function SubmitButton({ loading, disabled, children }: { loading: boolean; disabled: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="w-full py-3.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 mt-1"
      style={{
        background: "linear-gradient(135deg, #5EEAD4, #2DD4BF)",
        color: "#0F2440",
        boxShadow: "0 4px 16px rgba(94,234,212,0.25)",
      }}
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}
