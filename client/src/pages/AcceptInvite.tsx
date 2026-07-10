/**
 * AcceptInvite — Employee invite acceptance page.
 * Reached via /accept-invite?token=<token>
 * Employee sets their own password and is immediately logged in.
 * Dark navy theme: #0F2440 bg, #5EEAD4 teal accent, white text
 */

import { useState } from "react";
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

  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const { data: inviteData, isLoading: tokenLoading } = trpc.person.lookupInvite.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const tokenError = !token || (!tokenLoading && (!inviteData || !inviteData.valid));

  const accept = trpc.person.acceptInvite.useMutation({
    onSuccess: (data) => {
      setIsLoading(false);
      if (data.success && data.person) {
        setPerson(data.person as any);
        try {
          localStorage.setItem("bcc_account_id", String(data.person.accountId));
          localStorage.setItem("bcc_auth_v1", "granted");
        } catch { /* ignore */ }
        toast.success(`Welcome, ${data.person.name}! Your account is ready.`);
        // Employees land on the Team Board; owners/co-owners go to the main board
        const role = (data.person as any).role;
        navigate(role === "employee" ? "/app/team" : "/app/board");
      } else {
        const reason = (data as any).reason;
        if (reason === "already_accepted") {
          toast.error("This invite has already been used. Please sign in instead.");
          navigate("/login");
        } else {
          toast.error("Invalid or expired invite link.");
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
      style={{
        background: "linear-gradient(135deg, #0A1929 0%, #0F2440 50%, #0D2035 100%)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Subtle background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(94,234,212,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="/manus-storage/businesscadence-logo-final-clean_3f67cebb.webp"
            alt="BusinessCadence"
            height={100}
            style={{ height: 100, width: "auto", filter: "brightness(1.1)" }}
          />
        </div>

        {tokenError ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            }}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"
              style={{ backgroundColor: "rgba(225,29,72,0.15)", border: "1px solid rgba(225,29,72,0.3)" }}>
              🔗
            </div>
            <h1 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Invalid Invite Link
            </h1>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
              This invite link is invalid or has already been used. Please contact your account owner for a new invite.
            </p>
            <a
              href="/login"
              className="inline-block py-2.5 px-6 rounded-xl text-sm font-bold transition-all hover:opacity-90"
              style={{ backgroundColor: "#5EEAD4", color: "#0F2440" }}
            >
              Go to Login
            </a>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              {/* Teal invite badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
                style={{ backgroundColor: "rgba(94,234,212,0.12)", border: "1px solid rgba(94,234,212,0.25)" }}>
                <span className="text-xs font-semibold" style={{ color: "#5EEAD4" }}>✉ You've been invited</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {inviteData?.name ? `Welcome, ${inviteData.name}!` : "You're Invited!"}
              </h1>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                Set your password to activate your BusinessCadence account.
              </p>
            </div>

            <div
              className="rounded-2xl p-8"
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(94,234,212,0.2)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(94,234,212,0.05)",
              }}
            >
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.7)" }} htmlFor="password">
                    Choose a Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none transition-all"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.06)",
                      border: "1.5px solid rgba(255,255,255,0.12)",
                    }}
                    onFocus={e => (e.target.style.borderColor = "#5EEAD4")}
                    onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.7)" }} htmlFor="confirm">
                    Confirm Password
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none transition-all"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.06)",
                      border: "1.5px solid rgba(255,255,255,0.12)",
                    }}
                    onFocus={e => (e.target.style.borderColor = "#5EEAD4")}
                    onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !password || !confirm}
                  className="w-full py-3.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 mt-1"
                  style={{
                    background: "linear-gradient(135deg, #5EEAD4, #2DD4BF)",
                    color: "#0F2440",
                    boxShadow: "0 4px 16px rgba(94,234,212,0.25)",
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  {isLoading ? "Activating…" : "Activate My Account →"}
                </button>
              </form>
            </div>

            <p className="text-center text-xs mt-6" style={{ color: "rgba(255,255,255,0.3)" }}>
              Already have an account?{" "}
              <a href="/login" className="underline" style={{ color: "rgba(94,234,212,0.7)" }}>Sign in</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
