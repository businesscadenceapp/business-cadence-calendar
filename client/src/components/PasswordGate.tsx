/**
 * PasswordGate — guards all /app routes.
 *
 * Authentication is now per-person: the user must have a valid PersonSession
 * stored in PersonContext (set after signing in via /login).
 *
 * If no person session exists, the user is redirected to /login.
 */

import { useEffect } from "react";
import { useLocation } from "wouter";
import { usePerson } from "@/contexts/PersonContext";

/** @deprecated No longer used — auth is now per-person via PersonContext. */
export function isAuthenticated(): boolean {
  try {
    return localStorage.getItem("bcc_auth_v1") === "granted";
  } catch {
    return false;
  }
}

/** @deprecated No longer used — sign-out is handled by PersonContext.setPerson(null). */
export function clearAuth(): void {
  try {
    localStorage.removeItem("bcc_auth_v1");
    localStorage.removeItem("bcc_selected_business");
    localStorage.removeItem("bcc_person_v1");
    localStorage.removeItem("bcc_account_id");
  } catch { /* ignore */ }
}

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [, navigate] = useLocation();
  const { person, isLoading } = usePerson();

  useEffect(() => {
    // Wait for PersonContext to finish verifying the saved session before redirecting
    if (!isLoading && !person) {
      navigate("/login");
    }
  }, [person, isLoading, navigate]);

  // While verifying session, show a brief loading state
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#F8F7F4" }}
      >
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#1E3A5F] border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#64748B]">Loading…</p>
        </div>
      </div>
    );
  }

  // Not logged in — redirect is in progress
  if (!person) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#F8F7F4" }}
      >
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#1E3A5F] border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#64748B]">Redirecting to sign in…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
