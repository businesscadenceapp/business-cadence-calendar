/**
 * Paywall — shown after onboarding, before the Board.
 *
 * Design goals:
 *   - Feels native, not like a website
 *   - One big CTA button per plan
 *   - Apple/Google handles payment natively via RevenueCat
 *   - 14-day free trial prominently featured
 *   - Partners bypass this screen entirely (handled by EntitlementGuard)
 *
 * RevenueCat integration:
 *   - On native (iOS/Android): calls Purchases.purchasePackage() via @revenuecat/purchases-capacitor
 *   - On web (dev/preview): calls trpc.subscription.adminActivate to simulate a purchase
 *
 * Plans:
 *   Core         $79/mo  — owners only, all cadence meetings
 *   Core + Team  $99/mo  — owners + unlimited team employees
 *
 * Dark navy theme: #0F2440 bg, #5EEAD4 teal accent
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { usePerson } from "@/contexts/PersonContext";
import { toast } from "sonner";
import { Check, Sparkles, Users, ChevronRight, Shield, RotateCcw } from "lucide-react";
import { Capacitor } from "@capacitor/core";

type Plan = "core" | "core_team";

const PLANS = [
  {
    id: "core" as Plan,
    name: "Core",
    price: "$79",
    period: "/month",
    tagline: "Everything you need to run your business cadence",
    productId: "bc_core_monthly",
    features: [
      "Daily, Weekly, Monthly & Quarterly meetings",
      "Business Board with action cards",
      "KPI tracking & goal setting",
      "Meeting logs & summaries",
      "Partner access included (no extra charge)",
    ],
    highlight: false,
  },
  {
    id: "core_team" as Plan,
    name: "Core + Team",
    price: "$99",
    period: "/month",
    tagline: "Everything in Core, plus unlimited team employees",
    productId: "bc_core_team_monthly",
    features: [
      "Everything in Core",
      "Unlimited team employees",
      "Team calendar & scheduling",
      "Employee weekly reports",
      "Business hours & DND controls",
    ],
    highlight: true,
  },
];

export default function Paywall() {
  const [, navigate] = useLocation();
  const { person } = usePerson();
  const [selectedPlan, setSelectedPlan] = useState<Plan>("core");
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const startTrial = trpc.subscription.startTrial.useMutation({
    onSuccess: () => {
      setIsLoading(false);
      toast.success("Your 14-day free trial has started!");
      navigate("/app/board");
    },
    onError: (err) => {
      setIsLoading(false);
      toast.error(err.message || "Could not start trial. Please try again.");
    },
  });

  const adminActivate = trpc.subscription.adminActivate.useMutation({
    onSuccess: () => {
      setIsLoading(false);
      toast.success("Subscription activated!");
      navigate("/app/board");
    },
    onError: (err) => {
      setIsLoading(false);
      toast.error(err.message || "Purchase failed. Please try again.");
    },
  });

  const handleStartTrial = async () => {
    if (!person) {
      toast.error("Please sign in first.");
      navigate("/login");
      return;
    }
    setIsLoading(true);

    if (Capacitor.isNativePlatform()) {
      // Native: use RevenueCat Purchases SDK
      try {
        // Dynamic import so web bundle doesn't break
        const { Purchases } = await import("@revenuecat/purchases-capacitor");
        const offerings = await Purchases.getOfferings();
        const current = offerings.current;
        if (!current) {
          throw new Error("No offerings available. Please try again later.");
        }
        // Find the matching package
        const plan = PLANS.find(p => p.id === selectedPlan);
        const pkg = current.availablePackages.find(
          (p: any) => p.product?.identifier === plan?.productId
        ) ?? current.availablePackages[0];

        if (!pkg) {
          throw new Error("Plan not available in your region.");
        }

        await Purchases.purchasePackage({ aPackage: pkg });
        // RevenueCat webhook will update the subscription server-side
        // Give it a moment then navigate
        setTimeout(() => {
          setIsLoading(false);
          toast.success("Welcome to BusinessCadence!");
          navigate("/app/board");
        }, 1500);
      } catch (err: any) {
        setIsLoading(false);
        if (err?.code === "1") {
          // User cancelled — silent
        } else {
          toast.error(err?.message || "Purchase failed. Please try again.");
        }
      }
    } else {
      // Web / dev: start a server-side trial
      startTrial.mutate({
        accountId: person.accountId,
        personId: person.id,
      });
    }
  };

  const handleRestorePurchases = async () => {
    if (!Capacitor.isNativePlatform()) {
      toast.info("Restore is only available on iOS and Android.");
      return;
    }
    setIsRestoring(true);
    try {
      const { Purchases } = await import("@revenuecat/purchases-capacitor");
      await Purchases.restorePurchases();
      toast.success("Purchases restored! Checking your subscription…");
      setTimeout(() => {
        setIsRestoring(false);
        navigate("/app/board");
      }, 1500);
    } catch (err: any) {
      setIsRestoring(false);
      toast.error(err?.message || "Could not restore purchases.");
    }
  };

  const selectedPlanData = PLANS.find(p => p.id === selectedPlan)!;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "linear-gradient(180deg, #0A1929 0%, #0F2440 40%, #0A1929 100%)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 100% 60% at 50% 0%, rgba(94,234,212,0.07) 0%, transparent 65%)",
        }}
      />

      <div
        className="flex-1 flex flex-col px-5 relative z-10"
        style={{ paddingTop: "env(safe-area-inset-top, 48px)", paddingBottom: "env(safe-area-inset-bottom, 32px)" }}
      >
        {/* Trial badge */}
        <div className="flex justify-center mt-4 mb-6">
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full"
            style={{
              background: "linear-gradient(135deg, rgba(94,234,212,0.15), rgba(45,212,191,0.1))",
              border: "1px solid rgba(94,234,212,0.3)",
              boxShadow: "0 0 20px rgba(94,234,212,0.1)",
            }}
          >
            <Sparkles size={14} style={{ color: "#5EEAD4" }} />
            <span className="text-sm font-semibold" style={{ color: "#5EEAD4" }}>
              14-Day Free Trial — No charge today
            </span>
          </div>
        </div>

        {/* Headline */}
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-bold text-white mb-2 leading-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Run Your Business<br />
            <span style={{ color: "#5EEAD4" }}>Together.</span>
          </h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
            Choose the plan that fits your business. Cancel anytime.
          </p>
        </div>

        {/* Plan selector */}
        <div className="flex gap-3 mb-6">
          {PLANS.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className="flex-1 rounded-2xl p-4 text-left transition-all active:scale-[0.98]"
              style={{
                backgroundColor: selectedPlan === plan.id
                  ? "rgba(94,234,212,0.1)"
                  : "rgba(255,255,255,0.04)",
                border: selectedPlan === plan.id
                  ? "1.5px solid rgba(94,234,212,0.5)"
                  : "1.5px solid rgba(255,255,255,0.08)",
                boxShadow: selectedPlan === plan.id
                  ? "0 0 20px rgba(94,234,212,0.12)"
                  : "none",
                position: "relative",
              }}
            >
              {plan.highlight && (
                <div
                  className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold"
                  style={{
                    background: "linear-gradient(135deg, #5EEAD4, #2DD4BF)",
                    color: "#0F2440",
                    whiteSpace: "nowrap",
                  }}
                >
                  MOST POPULAR
                </div>
              )}
              <div className="flex items-start justify-between mb-1">
                <p className="text-sm font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {plan.name}
                </p>
                {selectedPlan === plan.id && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "#5EEAD4" }}
                  >
                    <Check size={12} style={{ color: "#0F2440" }} />
                  </div>
                )}
              </div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {plan.price}
                </span>
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{plan.period}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Feature list for selected plan */}
        <div
          className="rounded-2xl p-5 mb-6"
          style={{
            backgroundColor: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <p className="text-xs font-semibold mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>
            WHAT'S INCLUDED
          </p>
          <div className="flex flex-col gap-2.5">
            {selectedPlanData.features.map((feature) => (
              <div key={feature} className="flex items-start gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: "rgba(94,234,212,0.15)", border: "1px solid rgba(94,234,212,0.3)" }}
                >
                  <Check size={11} style={{ color: "#5EEAD4" }} />
                </div>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>{feature}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Partner access callout */}
        <div
          className="rounded-xl px-4 py-3 mb-6 flex items-center gap-3"
          style={{
            backgroundColor: "rgba(94,234,212,0.06)",
            border: "1px solid rgba(94,234,212,0.15)",
          }}
        >
          <Users size={18} style={{ color: "#5EEAD4", flexShrink: 0 }} />
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
            <span className="font-semibold text-white">One subscription, two people.</span>{" "}
            Your business partner downloads free and gets full access via your invite link — no double billing.
          </p>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* CTA */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleStartTrial}
            disabled={isLoading}
            className="w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, #5EEAD4, #2DD4BF)",
              color: "#0F2440",
              boxShadow: "0 6px 24px rgba(94,234,212,0.35)",
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "1rem",
            }}
          >
            {isLoading ? (
              <>
                <div
                  className="w-5 h-5 rounded-full border-2 animate-spin"
                  style={{ borderColor: "rgba(15,36,64,0.3)", borderTopColor: "#0F2440" }}
                />
                Processing…
              </>
            ) : (
              <>
                Start Free Trial
                <ChevronRight size={18} />
              </>
            )}
          </button>

          <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.35)" }}>
            Free for 14 days, then {selectedPlanData.price}/month.{" "}
            {Capacitor.isNativePlatform()
              ? "Billed through your App Store account. Cancel anytime in Settings."
              : "Cancel anytime."}
          </p>

          {/* Legal / restore row */}
          <div className="flex items-center justify-center gap-4 mt-1">
            <button
              onClick={handleRestorePurchases}
              disabled={isRestoring}
              className="flex items-center gap-1.5 text-xs transition-all"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              <RotateCcw size={11} />
              {isRestoring ? "Restoring…" : "Restore Purchases"}
            </button>
            <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
            <a
              href="https://businesscadence.com/privacy"
              className="text-xs"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              Privacy
            </a>
            <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
            <a
              href="https://businesscadence.com/terms"
              className="text-xs"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              Terms
            </a>
          </div>

          {/* Security badge */}
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <Shield size={11} style={{ color: "rgba(255,255,255,0.2)" }} />
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
              Secured by {Capacitor.isNativePlatform() ? "Apple / Google" : "RevenueCat"} · No card stored by BusinessCadence
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
