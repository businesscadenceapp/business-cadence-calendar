/**
 * ClientLogin — Sign-in page for BusinessCadence.
 * Matches the homepage warm off-white palette and style.
 * Username selects the business context; password unlocks the app.
 */

import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const STORAGE_KEY = "bcc_auth_v1";
const BUSINESS_STORAGE_KEY = "bcc_selected_business";

export type BusinessSelection = "chiro" | "crossfit" | "all";

const USERNAMES: Record<string, BusinessSelection> = {
  "chiro": "chiro",
  "newbeginnings": "chiro",
  "crossfit": "crossfit",
  "evolvedcrossfit": "crossfit",
  "all": "all",
  "matt": "all",
  "lynn": "all",
};

export function saveBusinessSelection(key: BusinessSelection) {
  try {
    localStorage.setItem(BUSINESS_STORAGE_KEY, key);
  } catch { /* ignore */ }
}

export function getBusinessSelection(): BusinessSelection {
  try {
    const stored = localStorage.getItem(BUSINESS_STORAGE_KEY);
    if (stored === "chiro" || stored === "crossfit" || stored === "all") return stored;
  } catch { /* ignore */ }
  return "all";
}

export default function ClientLogin() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [shake, setShake] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);

  const verify = trpc.gate.verify.useMutation({
    onSuccess: (data) => {
      setIsLoading(false);
      if (data.success) {
        // Determine business context from username
        const normalized = username.trim().toLowerCase().replace(/\s/g, "");
        const bizKey = USERNAMES[normalized] ?? "all";
        saveBusinessSelection(bizKey);
        try { localStorage.setItem(STORAGE_KEY, "granted"); } catch { /* ignore */ }
        navigate("/app");
      } else {
        setPassword("");
        setShake(true);
        setTimeout(() => setShake(false), 600);
        toast.error("Incorrect username or password. Please try again.");
      }
    },
    onError: () => {
      setIsLoading(false);
      toast.error("Could not verify. Please try again.");
    },
  });

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setIsLoading(true);
    verify.mutate({ password: password.trim() });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8F7F4", fontFamily: "'Inter', sans-serif" }}>
      {/* Nav bar matching homepage */}
      <nav className="w-full border-b border-[#E2E0DB] bg-[#F8F7F4]/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <a href="/">
              <div style={{ filter: "drop-shadow(0 2px 0px rgba(30,58,95,0.30)) drop-shadow(0 5px 10px rgba(30,58,95,0.18)) saturate(1.4) brightness(0.92)" }}>
                <img
                  src="/manus-storage/businesscadence-logo-final-clean_3f67cebb.webp"
                  alt="BusinessCadence"
                  height={80}
                  style={{ height: 80, width: "auto" }}
                />
              </div>
            </a>
            <a
              href="/"
              className="text-sm text-[#64748B] hover:text-[#1E3A5F] transition-colors"
            >
              ← Back to homepage
            </a>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">

          {/* Logo above the card */}
          <div className="flex justify-center mb-8">
            <div style={{ filter: "drop-shadow(0 2px 0px rgba(30,58,95,0.35)) drop-shadow(0 4px 0px rgba(30,58,95,0.25)) drop-shadow(0 8px 0px rgba(30,58,95,0.15)) drop-shadow(0 14px 20px rgba(30,58,95,0.20)) saturate(1.5) brightness(0.90)" }}>
              <img
                src="/manus-storage/businesscadence-logo-final-clean_3f67cebb.webp"
                alt="BusinessCadence"
                height={180}
                style={{ height: 180, width: "auto" }}
              />
            </div>
          </div>

          {/* Welcome heading */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#1E3A5F] mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>
              Welcome Back
            </h1>
            <p className="text-[#64748B] text-sm">
              Sign in to access your BusinessCadence calendar
            </p>
          </div>

          {/* Sign-in card */}
          <div
            className="rounded-2xl p-8"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E2E0DB",
              boxShadow: "0 4px 24px rgba(30,58,95,0.08), 0 1px 4px rgba(30,58,95,0.06)",
            }}
          >
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Username field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#1E3A5F]" htmlFor="username">
                  Username
                </label>
                <input
                  ref={usernameRef}
                  id="username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoComplete="username"
                  className="w-full rounded-xl px-4 py-3 text-sm text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none transition-all"
                  style={{
                    backgroundColor: "#F8F7F4",
                    border: "1.5px solid #E2E0DB",
                  }}
                  onFocus={e => (e.target.style.borderColor = "#0D9488")}
                  onBlur={e => (e.target.style.borderColor = "#E2E0DB")}
                />
              </div>

              {/* Password field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#1E3A5F]" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className={`w-full rounded-xl px-4 py-3 text-sm text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none transition-all ${shake ? "animate-[shake_0.5s_ease-in-out]" : ""}`}
                  style={{
                    backgroundColor: "#F8F7F4",
                    border: "1.5px solid #E2E0DB",
                  }}
                  onFocus={e => (e.target.style.borderColor = "#0D9488")}
                  onBlur={e => (e.target.style.borderColor = "#E2E0DB")}
                />
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading || !username.trim() || !password.trim()}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 mt-1"
                style={{
                  backgroundColor: "#1E3A5F",
                  boxShadow: "0 4px 16px rgba(30,58,95,0.25)",
                }}
              >
                {isLoading ? "Signing in…" : "Sign In →"}
              </button>
            </form>
          </div>

          {/* Footer note */}
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
