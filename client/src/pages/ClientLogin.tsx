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
import { BrandIcon } from "@/components/BrandLogo";

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
        toast.success(`Welcome back, ${data.person.name}!`);
        // Check onboarding status — co-owners and employees skip onboarding
        const accountId = data.person.accountId;
        const role = data.person.role;
        if (role === "coowner" || role === "employee") {
          navigate("/app/board");
          return;
        }
        try {
          const resp = await fetch(
            `/api/trpc/onboarding.getStatus?input=${encodeURIComponent(JSON.stringify({ json: { accountId } }))}`,
            { headers: { "Content-Type": "application/json" } }
          );
          const json = await resp.json();
          const complete = json?.result?.data?.json?.complete ?? false;
          navigate(complete ? "/app/board" : "/onboarding");
        } catch {
          navigate("/app/board");
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
                src="/manus-storage/businesscadence-logo-final-clean_3f67cebb.webp"
                alt="BusinessCadence"
                height={80}
                style={{
                  height: 80,
                  width: "auto",
                  filter: "drop-shadow(0 2px 0px rgba(255,255,255,0.15)) drop-shadow(0 5px 10px rgba(0,0,0,0.40)) saturate(1.2) brightness(1.05)",
                }}
              />
            </a>
            <a href="/" className="text-sm transition-colors" style={{ color: "rgba(255,255,255,0.5)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "white")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
            >
              ← Back to homepage
            </a>
          </div>
        </div>
      </nav>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">

          {/* Card */}
          <div
            className="rounded-2xl p-8"
            style={{
              backgroundColor: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2)",
              backdropFilter: "blur(16px)",
            }}
          >
            {/* Header */}
            <div className="text-center mb-7">
              <div className="flex justify-center mb-4">
                <BrandIcon size={88} />
              </div>
              <h2
                className="text-xl font-bold text-white"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Sign In
              </h2>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                Sign in with your BusinessCadence account
              </p>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-white/70" htmlFor="email">Email</label>
                <input
                  ref={emailRef}
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoComplete="email"
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none transition-all"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.08)",
                    border: "1.5px solid rgba(255,255,255,0.15)",
                  }}
                  onFocus={e => (e.target.style.borderColor = "#5EEAD4")}
                  onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.15)")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-white/70" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Your password"
                  autoComplete="current-password"
                  className={`w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none transition-all ${shake ? "animate-[shake_0.5s_ease-in-out]" : ""}`}
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
                disabled={isLoading || !email.trim() || !password.trim()}
                className="w-full py-3.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 mt-1"
                style={{
                  backgroundColor: "#5EEAD4",
                  color: "#0F2440",
                  boxShadow: "0 4px 16px rgba(94,234,212,0.25)",
                }}
              >
                {isLoading ? "Signing in…" : "Sign In →"}
              </button>

              {/* Waitlist CTA for non-members */}
              <div
                className="mt-2 rounded-xl p-4 text-center"
                style={{
                  backgroundColor: "rgba(94,234,212,0.08)",
                  border: "1px solid rgba(94,234,212,0.2)",
                }}
              >
                <p className="text-xs font-medium mb-1" style={{ color: "#5EEAD4" }}>Not a member yet?</p>
                <a
                  href="/#waitlist"
                  className="text-xs font-bold hover:underline"
                  style={{ color: "#5EEAD4" }}
                >
                  Join the waitlist →
                </a>
                <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Access is by invitation only during our beta.
                </p>
              </div>
            </form>
          </div>

          <p className="text-center text-xs mt-6" style={{ color: "rgba(255,255,255,0.3)" }}>
            Private access — BusinessCadence clients only
          </p>
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
