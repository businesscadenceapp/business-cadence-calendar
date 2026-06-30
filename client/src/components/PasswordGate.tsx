/**
 * PasswordGate — wraps the entire app and requires a shared password before showing any content.
 * Authentication state is stored in localStorage so users are not prompted on every visit.
 */

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getBusinessSelection } from "../pages/ClientLogin";
import BrandLogo from "./BrandLogo";

const STORAGE_KEY = "bcc_auth_v1";

const BUSINESS_LABELS: Record<string, { name: string; icon: string }> = {
  chiro: { name: "New Beginnings Chiropractic", icon: "🏥" },
  crossfit: { name: "Evolved CrossFit", icon: "💪" },
  all: { name: "All Three Businesses", icon: "🗂️" },
};

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "granted";
    } catch {
      return false;
    }
  });
  const [password, setPassword] = useState("");
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const verify = trpc.gate.verify.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        try { localStorage.setItem(STORAGE_KEY, "granted"); } catch { /* ignore */ }
        setUnlocked(true);
      } else {
        setPassword("");
        setShake(true);
        setTimeout(() => setShake(false), 600);
        toast.error("Incorrect password. Please try again.");
        inputRef.current?.focus();
      }
    },
    onError: () => {
      toast.error("Could not verify password. Please try again.");
    },
  });

  useEffect(() => {
    if (!unlocked) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [unlocked]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    verify.mutate({ password: password.trim() });
  };

  if (unlocked) return <>{children}</>;

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "oklch(0.14 0.025 240)" }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(oklch(1 0 0 / 2.5%) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 2.5%) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Logo / header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <BrandLogo size="lg" theme="light" />
          </div>
          {(() => {
            const sel = getBusinessSelection();
            const biz = BUSINESS_LABELS[sel];
            return biz ? (
              <p
                className="text-[12px] text-white/35"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {biz.icon} {biz.name}
              </p>
            ) : null;
          })()}
        </div>

        {/* Password card */}
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: "oklch(0.17 0.022 240)",
            border: "1px solid oklch(1 0 0 / 10%)",
            boxShadow: "0 24px 48px oklch(0 0 0 / 40%)",
          }}
        >
          <p
            className="text-[13px] text-white/50 mb-5 text-center"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Enter your access password to continue
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              className={`w-full rounded-xl px-4 py-3 text-[14px] text-white placeholder-white/20 focus:outline-none transition-all ${shake ? "animate-[shake_0.5s_ease-in-out]" : ""}`}
              style={{
                backgroundColor: "oklch(1 0 0 / 5%)",
                border: "1px solid oklch(1 0 0 / 12%)",
                fontFamily: "'Inter', sans-serif",
              }}
              onFocus={e => (e.target.style.borderColor = "oklch(0.55 0.18 260 / 60%)")}
              onBlur={e => (e.target.style.borderColor = "oklch(1 0 0 / 12%)")}
            />

            <button
              type="submit"
              disabled={verify.isPending || !password.trim()}
              className="w-full py-3 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, oklch(0.55 0.18 260) 0%, oklch(0.50 0.20 290) 100%)",
                fontFamily: "'Space Grotesk', sans-serif",
                boxShadow: "0 4px 16px oklch(0.55 0.18 260 / 25%)",
              }}
            >
              {verify.isPending ? "Verifying…" : "Unlock →"}
            </button>
          </form>
        </div>

        <p
          className="text-center text-[10px] text-white/15 mt-6"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Private — Matt &amp; Lynn only
        </p>
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
