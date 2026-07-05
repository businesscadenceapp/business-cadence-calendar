/**
 * AcceptInvite — Employee invite acceptance page.
 * Reached via /accept-invite?token=<token>
 * Employee sets their own password and is immediately logged in.
 */

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { usePerson } from "@/contexts/PersonContext";
import { toast } from "sonner";

export default function AcceptInvite() {
  const [, navigate] = useLocation();
  const { setPerson } = usePerson();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tokenError, setTokenError] = useState(false);

  // Get token from URL
  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  useEffect(() => {
    if (!token) setTokenError(true);
  }, [token]);

  const accept = trpc.person.acceptInvite.useMutation({
    onSuccess: (data) => {
      setIsLoading(false);
      if (data.success && data.person) {
        setPerson(data.person as any);
        toast.success(`Welcome, ${data.person.name}! Your account is ready.`);
        navigate("/app/board");
      } else {
        const reason = (data as any).reason;
        if (reason === "already_accepted") {
          toast.error("This invite has already been used. Please log in instead.");
          navigate("/login");
        } else {
          toast.error("Invalid or expired invite link.");
          setTokenError(true);
        }
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
    accept.mutate({ token, password });
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: "#F8F7F4", fontFamily: "'Inter', sans-serif" }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div style={{ filter: "drop-shadow(0 2px 0px rgba(30,58,95,0.30)) drop-shadow(0 5px 10px rgba(30,58,95,0.18)) saturate(1.4) brightness(0.92)" }}>
            <img
              src="/manus-storage/businesscadence-logo-final-clean_3f67cebb.webp"
              alt="BusinessCadence"
              height={120}
              style={{ height: 120, width: "auto" }}
            />
          </div>
        </div>

        {tokenError ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E2E0DB",
              boxShadow: "0 4px 24px rgba(30,58,95,0.08)",
            }}
          >
            <div className="text-4xl mb-4">🔗</div>
            <h1 className="text-xl font-bold text-[#1E3A5F] mb-2">Invalid Invite Link</h1>
            <p className="text-[#64748B] text-sm mb-6">
              This invite link is invalid or has already been used. Please contact your account owner for a new invite.
            </p>
            <a
              href="/login"
              className="inline-block py-2.5 px-6 rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: "#1E3A5F" }}
            >
              Go to Login
            </a>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-[#1E3A5F] mb-2">You're Invited!</h1>
              <p className="text-[#64748B] text-sm">
                Set your password to activate your BusinessCadence account.
              </p>
            </div>

            <div
              className="rounded-2xl p-8"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #E2E0DB",
                boxShadow: "0 4px 24px rgba(30,58,95,0.08), 0 1px 4px rgba(30,58,95,0.06)",
              }}
            >
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[#1E3A5F]" htmlFor="password">
                    Choose a Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    className="w-full rounded-xl px-4 py-3 text-sm text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none transition-all"
                    style={{
                      backgroundColor: "#F8F7F4",
                      border: "1.5px solid #E2E0DB",
                    }}
                    onFocus={e => (e.target.style.borderColor = "#0D9488")}
                    onBlur={e => (e.target.style.borderColor = "#E2E0DB")}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[#1E3A5F]" htmlFor="confirm">
                    Confirm Password
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    className="w-full rounded-xl px-4 py-3 text-sm text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none transition-all"
                    style={{
                      backgroundColor: "#F8F7F4",
                      border: "1.5px solid #E2E0DB",
                    }}
                    onFocus={e => (e.target.style.borderColor = "#0D9488")}
                    onBlur={e => (e.target.style.borderColor = "#E2E0DB")}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !password || !confirm}
                  className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 mt-1"
                  style={{
                    backgroundColor: "#1E3A5F",
                    boxShadow: "0 4px 16px rgba(30,58,95,0.25)",
                  }}
                >
                  {isLoading ? "Activating…" : "Activate My Account →"}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
