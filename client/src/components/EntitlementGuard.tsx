/**
 * EntitlementGuard — checks subscription access on every protected page load.
 *
 * Logic:
 * 1. If no person is logged in → let PasswordGate handle it (not our concern here)
 * 2. Query subscription.getEntitlement for the current person
 * 3. While loading → show a spinner (blocks protected UI until resolved)
 * 4. If hasAccess → render children
 * 5. If no subscription → redirect to /subscribe-intro (first-time owner)
 * 6. If trial expired or lapsed → redirect to /paywall with a message
 * 7. Partners (isPartner=true) get access if owner's subscription is active
 * 8. On network error → let user in (server is the authoritative check)
 *
 * This guard runs on every navigation to a protected route, so lapsed
 * subscriptions are caught immediately on the next app open.
 */

import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { usePerson } from "@/contexts/PersonContext";
import { toast } from "sonner";

interface EntitlementGuardProps {
  children: React.ReactNode;
}

export default function EntitlementGuard({ children }: EntitlementGuardProps) {
  const { person } = usePerson();
  const [, navigate] = useLocation();
  const hasRedirected = useRef(false);

  const entitlementQuery = trpc.subscription.getEntitlement.useQuery(
    { accountId: person?.accountId ?? 0, personId: person?.id ?? "" },
    {
      enabled: !!person,
      // Re-check on every focus (app foreground) — catches lapsed subs
      refetchOnWindowFocus: true,
      // Don't retry aggressively — prefer to let user in on network failure
      retry: 1,
      // Stale time: 5 minutes — don't re-check on every component mount
      staleTime: 5 * 60 * 1000,
    }
  );

  useEffect(() => {
    if (!person) return;
    if (entitlementQuery.isLoading || entitlementQuery.isFetching) return;
    if (entitlementQuery.isError) {
      // Network error — let user in (server is the authoritative check)
      return;
    }
    if (!entitlementQuery.data) return;
    if (hasRedirected.current) return;

    const { hasAccess, reason } = entitlementQuery.data;

    if (hasAccess) {
      // All good — reset redirect flag in case they come back after fixing
      hasRedirected.current = false;
      return;
    }

    // No access — redirect based on reason
    hasRedirected.current = true;

    if (reason === "no_subscription") {
      // First-time owner — send to subscription onboarding intro
      navigate("/subscribe-intro");
      return;
    }

    if (reason === "trial_expired") {
      toast.error("Your 14-day free trial has ended. Choose a plan to continue.", {
        duration: 6000,
      });
      navigate("/paywall");
      return;
    }

    if (reason === "lapsed") {
      toast.error("Your subscription has lapsed. Please renew to continue.", {
        duration: 6000,
      });
      navigate("/paywall");
      return;
    }

    // Any other reason (db_unavailable, etc.) — let user in
    hasRedirected.current = false;
  }, [entitlementQuery.data, entitlementQuery.isLoading, entitlementQuery.isFetching, entitlementQuery.isError, person, navigate]);

  // No person → PasswordGate handles this, render nothing
  if (!person) return null;

  // While loading the first entitlement check, show a spinner
  // (subsequent navigations use stale data so no spinner flash)
  if (entitlementQuery.isLoading && !entitlementQuery.data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0F2440" }}>
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-teal-400/30 border-t-teal-400 animate-spin mx-auto mb-3" />
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Checking access…</p>
        </div>
      </div>
    );
  }

  // On error or after redirect decision — render children
  // (redirect happens asynchronously via useEffect above)
  return <>{children}</>;
}
