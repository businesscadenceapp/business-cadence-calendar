/**
 * PasswordGate — guards the /app routes.
 * Authentication now happens via the ClientLogin page (/login).
 * If the user is not authenticated, redirect them to /login.
 */

import { useEffect } from "react";
import { useLocation } from "wouter";

const STORAGE_KEY = "bcc_auth_v1";

export function isAuthenticated(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "granted";
  } catch {
    return false;
  }
}

export function clearAuth(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("bcc_selected_business");
  } catch { /* ignore */ }
}

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [, navigate] = useLocation();

  const authenticated = isAuthenticated();

  useEffect(() => {
    if (!authenticated) {
      navigate("/login");
    }
  }, [authenticated, navigate]);

  if (!authenticated) {
    // Show a brief loading state while redirecting
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#F8F7F4" }}
      >
        <div className="text-center">
          <div
            className="w-8 h-8 rounded-full border-2 border-[#1E3A5F] border-t-transparent animate-spin mx-auto mb-3"
          />
          <p className="text-sm text-[#64748B]">Redirecting to login…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
