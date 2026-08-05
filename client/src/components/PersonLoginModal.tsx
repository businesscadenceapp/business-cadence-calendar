/**
 * PersonLoginModal — shown after the business account password gate passes,
 * when no person session exists. Lets the user identify themselves as an
 * individual (owner, co-owner, or employee) by logging in with their email + password.
 *
 * Also provides a "Register as owner" path for first-time setup.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePerson } from "@/contexts/PersonContext";
import { toast } from "sonner";

interface PersonLoginModalProps {
  accountId: number;
}

export default function PersonLoginModal({ accountId }: PersonLoginModalProps) {
  const { setPerson } = usePerson();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loginMutation = trpc.person.login.useMutation({
    onSuccess: (data) => {
      setIsLoading(false);
      if (data.success && data.person) {
        setPerson(data.person as any);
        toast.success(`Welcome back, ${data.person.name}!`);
      } else {
        toast.error("Incorrect email or password. Please try again.");
        setPassword("");
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
        toast.success(`Account created! Welcome, ${data.person.name}.`);
      } else {
        const reason = (data as any).reason;
        if (reason === "already_exists") {
          toast.error("An account with that email already exists. Please log in instead.");
          setMode("login");
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
    if (!name.trim() || !email.trim() || !password.trim()) return;
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords don't match.");
      return;
    }
    setIsLoading(true);
    registerMutation.mutate({
      accountId,
      name: name.trim(),
      email: email.trim(),
      password,
      role: "owner",
      businessScope: "all",
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #E2E0DB",
          boxShadow: "0 20px 60px rgba(30,58,95,0.18)",
        }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3"
            style={{ background: "linear-gradient(135deg, #2563EB 0%, #E11D48 100%)" }}
          >
            👤
          </div>
          <h2 className="text-xl font-bold text-[#1E3A5F]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
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
              <label className="text-xs font-semibold text-[#1E3A5F]" htmlFor="pl-email">Email</label>
              <input
                id="pl-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none transition-all"
                style={{ backgroundColor: "#F8F7F4", border: "1.5px solid #E2E0DB" }}
                onFocus={e => (e.target.style.borderColor = "#25DCF9")}
                onBlur={e => (e.target.style.borderColor = "#E2E0DB")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#1E3A5F]" htmlFor="pl-password">Password</label>
              <input
                id="pl-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none transition-all"
                style={{ backgroundColor: "#F8F7F4", border: "1.5px solid #E2E0DB" }}
                onFocus={e => (e.target.style.borderColor = "#25DCF9")}
                onBlur={e => (e.target.style.borderColor = "#E2E0DB")}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !email.trim() || !password.trim()}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 mt-1"
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
              <label className="text-xs font-semibold text-[#1E3A5F]" htmlFor="pr-name">Your Name</label>
              <input
                id="pr-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Matt"
                autoComplete="name"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none transition-all"
                style={{ backgroundColor: "#F8F7F4", border: "1.5px solid #E2E0DB" }}
                onFocus={e => (e.target.style.borderColor = "#25DCF9")}
                onBlur={e => (e.target.style.borderColor = "#E2E0DB")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#1E3A5F]" htmlFor="pr-email">Email</label>
              <input
                id="pr-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none transition-all"
                style={{ backgroundColor: "#F8F7F4", border: "1.5px solid #E2E0DB" }}
                onFocus={e => (e.target.style.borderColor = "#25DCF9")}
                onBlur={e => (e.target.style.borderColor = "#E2E0DB")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#1E3A5F]" htmlFor="pr-password">Password</label>
              <input
                id="pr-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none transition-all"
                style={{ backgroundColor: "#F8F7F4", border: "1.5px solid #E2E0DB" }}
                onFocus={e => (e.target.style.borderColor = "#25DCF9")}
                onBlur={e => (e.target.style.borderColor = "#E2E0DB")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#1E3A5F]" htmlFor="pr-confirm">Confirm Password</label>
              <input
                id="pr-confirm"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                autoComplete="new-password"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none transition-all"
                style={{ backgroundColor: "#F8F7F4", border: "1.5px solid #E2E0DB" }}
                onFocus={e => (e.target.style.borderColor = "#25DCF9")}
                onBlur={e => (e.target.style.borderColor = "#E2E0DB")}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 mt-1"
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
    </div>
  );
}
