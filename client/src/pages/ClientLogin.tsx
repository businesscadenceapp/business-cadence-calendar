/**
 * ClientLogin — Unified personal sign-in for BusinessCadence.
 * Every user (owner, co-owner, or employee) signs in with their own
 * email + password. The server returns their role, accountId, and
 * businessScope, which are stored in PersonContext and localStorage.
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
  const [mode, setMode] = useState<"login" | "register">("login");

  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shake, setShake] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Register state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, [mode]);

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
        // Check onboarding status
        const accountId = data.person.accountId;
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

  const registerMutation = trpc.person.register.useMutation({
    onSuccess: (data) => {
      setIsLoading(false);
      if (data.success && data.person) {
        setPerson(data.person as any);
        try {
          localStorage.setItem("bcc_account_id", String(data.person.accountId));
          localStorage.setItem("bcc_auth_v1", "granted");
        } catch { /* ignore */ }
        toast.success(`Account created! Welcome, ${data.person.name}.`);
        navigate("/onboarding");
      } else {
        const reason = (data as any).reason;
        if (reason === "already_exists") {
          toast.error("An account with that email already exists. Please sign in instead.");
          setMode("login");
          setEmail(regEmail);
        } else {
          toast.error("Could not create account. Please try again.");
        }
      }
    },
    onError: () => {
      setIsLoading(false);
      toast.error("Could not create account. Please try again.");
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setIsLoading(true);
    loginMutation.mutate({ email: email.trim(), password });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) return;
    if (regPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (regPassword !== regConfirm) {
      toast.error("Passwords don't match.");
      return;
    }
    setIsLoading(true);
    // Register as owner with accountId 0 — server will create a new account
    registerMutation.mutate({
      accountId: 0,
      name: regName.trim(),
      email: regEmail.trim(),
      password: regPassword,
      role: "owner",
      businessScope: "all",
    });
  };

  const inputClass = `w-full rounded-xl px-4 py-3 text-sm text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none transition-all`;
  const inputStyle = { backgroundColor: "#F8F7F4", border: "1.5px solid #E2E0DB" };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#F8F7F4", fontFamily: "'Inter', sans-serif" }}
    >
      {/* Nav */}
      <nav className="w-full border-b border-[#E2E0DB] bg-[#F8F7F4]/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <a href="/">
              <img
                src="/manus-storage/businesscadence-logo-final-clean_3f67cebb.webp"
                alt="BusinessCadence"
                height={80}
                style={{ height: 80, width: "auto", filter: "drop-shadow(0 2px 0px rgba(30,58,95,0.30)) drop-shadow(0 5px 10px rgba(30,58,95,0.18)) saturate(1.4) brightness(0.92)" }}
              />
            </a>
            <a href="/" className="text-sm text-[#64748B] hover:text-[#1E3A5F] transition-colors">
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
              backgroundColor: "#FFFFFF",
              border: "1px solid #E2E0DB",
              boxShadow: "0 20px 60px rgba(30,58,95,0.10), 0 4px 16px rgba(30,58,95,0.06)",
            }}
          >
            {/* Header */}
            <div className="text-center mb-7">
              {/* Brand icon — circular, same note + lavender/navy as the homepage logo */}
              <div className="flex justify-center mb-4">
                <BrandIcon size={88} />
              </div>
              <h2
                className="text-xl font-bold text-[#1E3A5F]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {mode === "login" ? "Who are you?" : "Create Your Account"}
              </h2>
              <p className="text-[#64748B] text-xs mt-1">
                {mode === "login"
                  ? "Sign in with your personal account"
                  : "Set up your owner profile"}
              </p>
            </div>

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#1E3A5F]" htmlFor="email">Email</label>
                  <input
                    ref={emailRef}
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoComplete="email"
                    className={inputClass}
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = "#0D9488")}
                    onBlur={e => (e.target.style.borderColor = "#E2E0DB")}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#1E3A5F]" htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Your password"
                    autoComplete="current-password"
                    className={`${inputClass} ${shake ? "animate-[shake_0.5s_ease-in-out]" : ""}`}
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = "#0D9488")}
                    onBlur={e => (e.target.style.borderColor = "#E2E0DB")}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !email.trim() || !password.trim()}
                  className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 mt-1"
                  style={{ backgroundColor: "#1E3A5F", boxShadow: "0 4px 16px rgba(30,58,95,0.25)" }}
                >
                  {isLoading ? "Signing in…" : "Sign In →"}
                </button>
                <p className="text-center text-xs text-[#94A3B8] mt-1">
                  First time here?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("register")}
                    className="text-[#2563EB] font-semibold hover:underline"
                  >
                    Create your account
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#1E3A5F]" htmlFor="reg-name">Your Name</label>
                  <input
                    ref={emailRef as any}
                    id="reg-name"
                    type="text"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    placeholder="e.g. Matt"
                    autoComplete="name"
                    className={inputClass}
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = "#0D9488")}
                    onBlur={e => (e.target.style.borderColor = "#E2E0DB")}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#1E3A5F]" htmlFor="reg-email">Email</label>
                  <input
                    id="reg-email"
                    type="email"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoComplete="email"
                    className={inputClass}
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = "#0D9488")}
                    onBlur={e => (e.target.style.borderColor = "#E2E0DB")}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#1E3A5F]" htmlFor="reg-password">Password</label>
                  <input
                    id="reg-password"
                    type="password"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    className={inputClass}
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = "#0D9488")}
                    onBlur={e => (e.target.style.borderColor = "#E2E0DB")}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#1E3A5F]" htmlFor="reg-confirm">Confirm Password</label>
                  <input
                    id="reg-confirm"
                    type="password"
                    value={regConfirm}
                    onChange={e => setRegConfirm(e.target.value)}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    className={inputClass}
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = "#0D9488")}
                    onBlur={e => (e.target.style.borderColor = "#E2E0DB")}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !regName.trim() || !regEmail.trim() || !regPassword.trim() || !regConfirm.trim()}
                  className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 mt-1"
                  style={{ backgroundColor: "#1E3A5F", boxShadow: "0 4px 16px rgba(30,58,95,0.25)" }}
                >
                  {isLoading ? "Creating…" : "Create Account →"}
                </button>
                <p className="text-center text-xs text-[#94A3B8] mt-1">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-[#2563EB] font-semibold hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </form>
            )}
          </div>

          <p className="text-center text-xs text-[#94A3B8] mt-6">
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
