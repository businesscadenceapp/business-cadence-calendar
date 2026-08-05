/**
 * ClientLogin — Unified personal sign-in for BusinessCadence.
 * Every user (owner, co-owner, or employee) signs in with their own
 * email + password. The server returns their role, accountId, and
 * businessScope, which are stored in PersonContext and localStorage.
 *
 * Self-registration is DISABLED — accounts are created via invite only.
 * New users should join the waitlist at the homepage.
 */

import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { usePerson } from "@/contexts/PersonContext";
import { toast } from "sonner";
import { BrandLogoStacked } from "@/components/BrandLogo";
import { TEAM_ENABLED } from "@/featureFlags";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";

async function triggerHaptic() {
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    }
  } catch {
    // silently ignore on web
  }
}

/** Fire a double-beat haptic pattern that mirrors the heartbeat animation */
async function fireHeartbeatHaptic() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
    await new Promise(r => setTimeout(r, 160));
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // silently ignore
  }
}

export default function ClientLogin() {
  const [, navigate] = useLocation();
  const { setPerson } = usePerson();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shake, setShake] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // Fire haptic heartbeat on mount — same experience as onboarding
  useEffect(() => {
    const timer = setTimeout(() => {
      fireHeartbeatHaptic();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const loginMutation = trpc.person.login.useMutation({
    onSuccess: async (data) => {
      setIsLoading(false);
      if (data.success && data.person) {
        // Store person session in context + localStorage
        setPerson(data.person as any);
        // Also set legacy accountId key so existing pages still work
        try {
          localStorage.setItem("bcc_account_id", String(data.person.accountId));
          localStorage.setItem("bcc_auth_v1", "granted");
        } catch { /* ignore */ }
        await triggerHaptic();
        toast.success(`Welcome back, ${data.person.name}!`);
        // Route based on role:
        // - Employees go straight to the team schedule (no business selector)
        // - Owners & co-owners: check onboarding first, then always land on
        //   the Business Selector — it's the app home screen where they see
        //   notification badges and choose which business to enter.
        const accountId = data.person.accountId;
        const role = data.person.role;
        if (role === "employee") {
          // When Team is disabled, employees land on the owner board instead
          navigate(TEAM_ENABLED ? "/app/team" : "/app/board");
          return;
        }
        // Owner or co-owner: check onboarding status
        try {
          const resp = await fetch(
            `/api/trpc/onboarding.getStatus?input=${encodeURIComponent(JSON.stringify({ json: { accountId } }))}`,
            { headers: { "Content-Type": "application/json" } }
          );
          const json = await resp.json();
          const complete = json?.result?.data?.json?.complete ?? false;
          if (!complete) {
            navigate("/onboarding");
          } else {
            // Business Selector is the default home screen for all owners/co-owners
            navigate("/select-business");
          }
        } catch {
          navigate("/select-business");
        }
      } else {
        setPassword("");
        setShake(true);
        setTimeout(() => setShake(false), 600);
        const reason = (data as any).reason;
        if (reason === "invite_pending") {
          toast.error("Your invite is pending. Check your email for the invite link.");
        } else {
          toast.error("Incorrect email or password. Please try again.");
        }
      }
    },
    onError: () => {
      setIsLoading(false);
      toast.error("Could not sign in. Please try again.");
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setIsLoading(true);
    loginMutation.mutate({ email: email.trim(), password });
  };

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        background: "linear-gradient(160deg, #0A1929 0%, #0F2440 60%, #0D2D4A 100%)",
        fontFamily: "'Inter', sans-serif",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Subtle ambient glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 70% 40% at 50% 20%, rgba(51,162,219,0.06) 0%, transparent 70%)",
      }} />

      {/* Scrollable content — prevents squish when keyboard appears */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="flex flex-col min-h-full justify-center px-8 py-10 w-full max-w-sm mx-auto">

          {/* Logo — stacked with tagline */}
          <div className="mb-8 flex justify-center">
            <BrandLogoStacked iconSize={110} showTagline={true} />
          </div>

          {/* Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Welcome back
            </h1>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              Sign in to your account
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            {/* Email */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }} htmlFor="email">
                Email
              </label>
              <input
                ref={emailRef}
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                className="w-full rounded-2xl px-5 text-base text-white placeholder-white/25 focus:outline-none transition-all"
                style={{
                  height: 56,
                  minHeight: 56,
                  backgroundColor: "rgba(255,255,255,0.07)",
                  border: "1.5px solid rgba(255,255,255,0.12)",
                  boxSizing: "border-box",
                }}
                onFocus={e => (e.target.style.borderColor = "#33A2DB")}
                onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }} htmlFor="password">
                  Password
                </label>
                <a href="/forgot-password" className="text-xs font-medium" style={{ color: "#33A2DB" }}>Forgot?</a>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className={`w-full rounded-2xl px-5 text-base text-white placeholder-white/25 focus:outline-none transition-all ${shake ? "animate-[shake_0.5s_ease-in-out]" : ""}`}
                style={{
                  height: 56,
                  minHeight: 56,
                  backgroundColor: "rgba(255,255,255,0.07)",
                  border: "1.5px solid rgba(255,255,255,0.12)",
                  boxSizing: "border-box",
                }}
                onFocus={e => (e.target.style.borderColor = "#33A2DB")}
                onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !email.trim() || !password.trim()}
              className="w-full rounded-2xl text-base font-bold transition-all active:scale-[0.97] disabled:opacity-40 mt-1"
              style={{
                height: 56,
                minHeight: 56,
                background: "linear-gradient(135deg, #33A2DB 0%, #25DCF9 100%)",
                color: "#0A1628",
                boxShadow: "0 4px 24px rgba(51,162,219,0.22)",
              }}
            >
              {isLoading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-6px); }
          30% { transform: translateX(6px); }
          45% { transform: translateX(-4px); }
          60% { transform: translateX(4px); }
          75% { transform: translateX(-2px); }
          90% { transform: translateX(2px); }
        }
      `}</style>
    </div>
  );
}
