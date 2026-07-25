/**
 * Paywall — Full-screen subscription offer shown after onboarding setup.
 *
 * Design goals:
 * - Native-feeling, not like a website
 * - 14-day free trial CTA prominent
 * - Core ($79/mo) and Core + Team ($99/mo) plans
 * - Apple/Google handles payment natively via RevenueCat
 * - All required App Store legal disclosures present
 * - Partners bypass this screen entirely (handled by EntitlementGuard)
 *
 * RevenueCat integration:
 *   - On native (iOS/Android): calls Purchases.purchasePackage() via @revenuecat/purchases-capacitor
 *   - On web (dev/preview): calls trpc.subscription.startTrial to simulate a purchase
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { usePerson } from "@/contexts/PersonContext";
import { toast } from "sonner";
import { BrandIcon } from "@/components/BrandLogo";
import { Check, X } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import {
  SUBSCRIPTION_PLANS as PLANS,
  PAYWALL_FEATURES as FEATURES,
  getTrialSubtext,
  type PlanId,
} from "@shared/subscriptionPlans";

// ─── Sub-components ───────────────────────────────────────────────────────────
function PlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan: (typeof PLANS)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={[
        "relative w-full text-left rounded-2xl border-2 p-5 transition-all duration-200 active:scale-[0.98]",
        selected
          ? "border-[#5EEAD4] bg-[#5EEAD4]/8"
          : "border-white/10 bg-white/4 hover:border-white/20",
      ].join(" ")}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#5EEAD4] to-[#0D9488] text-[#0A1628] text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wide whitespace-nowrap">
          Most Popular
        </div>
      )}
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-bold text-base">{plan.label}</span>
            {plan.perMonth && (
              <span className="text-[#5EEAD4] text-xs font-semibold bg-[#5EEAD4]/10 px-2 py-0.5 rounded-full">
                {plan.perMonth}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-white/90 font-bold text-2xl">{plan.price}</span>
            <span className="text-white/40 text-sm">{plan.period}</span>
            {plan.original && (
              <span className="text-white/30 text-xs line-through ml-1">{plan.original}</span>
            )}
          </div>
          <p className="text-white/45 text-xs mt-1">{plan.description}</p>
        </div>
        <div
          className={[
            "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
            selected
              ? "border-[#5EEAD4] bg-[#5EEAD4]"
              : "border-white/25 bg-transparent",
          ].join(" ")}
        >
          {selected && <Check className="w-3.5 h-3.5 text-[#0A1628]" strokeWidth={3} />}
        </div>
      </div>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface PaywallProps {
  /** When true, shows an X button to dismiss (e.g. from Settings). */
  dismissible?: boolean;
  /** Called when the user completes a purchase. */
  onSubscribe?: (plan: PlanId) => void;
  /** Called when the user taps the dismiss button. */
  onDismiss?: () => void;
}

export default function Paywall({ dismissible, onSubscribe, onDismiss }: PaywallProps) {
  const [, navigate] = useLocation();
  const { person } = usePerson();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(
    PLANS.find((p) => p.popular)?.id ?? PLANS[0].id
  );
  const [isLoading, setIsLoading] = useState(false);

  // ─── tRPC mutations ───────────────────────────────────────────────────────
  const startTrial = trpc.subscription.startTrial.useMutation({
    onSuccess: () => {
      setIsLoading(false);
      toast.success("Your 14-day free trial has started!");
      if (onSubscribe) {
        onSubscribe(selectedPlan);
      } else {
        navigate("/app/board");
      }
    },
    onError: (err) => {
      setIsLoading(false);
      toast.error(err.message || "Could not start trial. Please try again.");
    },
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSubscribe = async () => {
    setIsLoading(true);

    if (Capacitor.isNativePlatform()) {
      // Native: use RevenueCat Purchases SDK
      try {
        const { Purchases } = await import("@revenuecat/purchases-capacitor");
        const offerings = await Purchases.getOfferings();
        const current = offerings.current;
        if (!current) throw new Error("No offerings available. Please try again later.");

        // Find the matching package by product ID
        const planData = PLANS.find((p) => p.id === selectedPlan);
        const pkg =
          current.availablePackages.find(
            (p: any) => p.product?.identifier === planData?.productId
          ) ?? current.availablePackages[0];

        if (!pkg) throw new Error("Plan not available in your region.");

        await Purchases.purchasePackage({ aPackage: pkg });
        // RevenueCat webhook will update the subscription server-side.
        // Give the webhook a moment to process, then navigate.
        setTimeout(() => {
          setIsLoading(false);
          toast.success("Welcome to BusinessCadence!");
          if (onSubscribe) {
            onSubscribe(selectedPlan);
          } else {
            navigate("/app/board");
          }
        }, 1500);
      } catch (err: any) {
        setIsLoading(false);
        // Error code 1 = user cancelled — silent
        if (err?.code !== "1" && err?.code !== 1) {
          toast.error(err?.message || "Purchase failed. Please try again.");
        }
      }
    } else {
      // Web / dev: start a server-side 14-day trial
      if (!person) {
        setIsLoading(false);
        toast.error("Please sign in first.");
        navigate("/login");
        return;
      }
      startTrial.mutate({ accountId: person.accountId, personId: person.id });
    }
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    } else {
      navigate(-1 as any);
    }
  };

  const handleRestorePurchases = async () => {
    if (!Capacitor.isNativePlatform()) {
      toast.info("Restore is only available on iOS and Android.");
      return;
    }
    try {
      const { Purchases } = await import("@revenuecat/purchases-capacitor");
      await Purchases.restorePurchases();
      toast.success("Purchases restored! Checking your subscription…");
      setTimeout(() => navigate("/app/board"), 1500);
    } catch (err: any) {
      toast.error(err?.message || "Could not restore purchases.");
    }
  };

  const selectedPlanData = PLANS.find((p) => p.id === selectedPlan)!;
  const trialSubtext = getTrialSubtext(selectedPlan);

  return (
    <div
      className="fixed inset-0 flex flex-col bg-[#0A1628] overflow-hidden"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(94,234,212,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(94,234,212,0.025) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Top gradient glow */}
      <div
        className="absolute top-0 left-0 right-0 h-64 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(94,234,212,0.08) 0%, transparent 100%)",
        }}
      />
      {/* Dismiss button */}
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/15 transition-colors"
          style={{ marginTop: "env(safe-area-inset-top)" }}
        >
          <X className="w-4 h-4 text-white/60" />
        </button>
      )}
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center px-6 pt-10 pb-8 max-w-md mx-auto">
          {/* Brand mark */}
          <div className="mb-6 flex items-center gap-2">
            <BrandIcon size={32} />
            <span className="text-white font-bold text-lg tracking-tight">
              Business<span className="text-[#5EEAD4]">Cadence</span>
            </span>
          </div>
          {/* Headline */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white leading-tight tracking-tight mb-3">
              Run Your Business.{" "}
              <span className="text-[#5EEAD4]">Protect Your Life.</span>
            </h1>
            <p className="text-white/55 text-base leading-relaxed">
              Unlock the full BusinessCadence operating system for co-preneurs.
              Start your 14-day free trial — cancel anytime.
            </p>
          </div>
          {/* Plan cards */}
          <div className="w-full flex flex-col gap-4 mb-6">
            {PLANS.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                selected={selectedPlan === plan.id}
                onSelect={() => setSelectedPlan(plan.id)}
              />
            ))}
          </div>
          {/* Feature list */}
          <div className="w-full flex flex-col gap-3 mb-8">
            {FEATURES.map((feat) => (
              <div key={feat} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#5EEAD4]/15 border border-[#5EEAD4]/30 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-[#5EEAD4]" strokeWidth={2.5} />
                </div>
                <span className="text-white/75 text-sm">{feat}</span>
              </div>
            ))}
          </div>
          {/* CTA button */}
          <button
            onClick={handleSubscribe}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-[#5EEAD4] to-[#0D9488] text-[#0A1628] font-bold text-lg py-4 px-8 rounded-2xl transition-all duration-200 active:scale-[0.97] disabled:opacity-60 shadow-lg shadow-[#5EEAD4]/20 mb-3"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Processing…
              </span>
            ) : (
              "Start 14-Day Free Trial"
            )}
          </button>
          {/* Sub-CTA text */}
          <p className="text-white/35 text-xs text-center mb-4">{trialSubtext}</p>
          {/* Restore Purchases */}
          <button
            onClick={handleRestorePurchases}
            className="text-white/30 text-xs underline underline-offset-2 hover:text-white/50 transition-colors mb-6"
          >
            Restore Purchases
          </button>
          {/* App Store legal disclosure */}
          <p className="text-white/20 text-[10px] text-center leading-relaxed max-w-xs">
            Payment will be charged to your Apple ID / Google Play account at
            confirmation of purchase. Subscription automatically renews unless
            auto-renew is turned off at least 24 hours before the end of the
            current period. You can manage subscriptions in your Account
            Settings after purchase.{" "}
            <a
              href="https://businesscadence.com/privacy"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>{" "}
            ·{" "}
            <a
              href="https://businesscadence.com/terms"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms of Use
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
