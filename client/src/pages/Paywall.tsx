/**
 * Paywall — Full-screen subscription offer shown after onboarding setup.
 *
 * Design goals:
 * - Annual plan emphasized with "Most Popular" badge and clear savings
 * - 7-day free trial CTA prominent
 * - All required App Store legal disclosures present
 * - Consistent with the app's dark navy / teal brand
 * - Works on both native (iOS/Android) and web
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { BrandIcon } from "@/components/BrandLogo";
import { Check, X } from "lucide-react";
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
        {/* Radio indicator */}
        <div
          className={[
            "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200",
            selected ? "border-[#5EEAD4]" : "border-white/30",
          ].join(" ")}
        >
          {selected && (
            <div className="w-2.5 h-2.5 rounded-full bg-[#5EEAD4]" />
          )}
        </div>

        {/* Plan info */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white text-base">{plan.label}</div>
          <div className="text-white/40 text-sm">{plan.description}</div>
        </div>

        {/* Price */}
        <div className="text-right flex-shrink-0">
          <div className="font-bold text-white text-2xl leading-none">
            {plan.price}
          </div>
          <div className="text-white/40 text-xs mt-0.5">{plan.period}</div>
          {plan.perMonth && (
            <div className="text-[#5EEAD4] text-xs font-semibold mt-0.5">
              {plan.perMonth}
            </div>
          )}
          {plan.original && (
            <div className="text-white/25 text-xs line-through">
              {plan.original}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface PaywallProps {
  /** Called when user dismisses the paywall (e.g. back button). Optional. */
  onDismiss?: () => void;
  /** Called when user successfully starts a trial / subscribes. */
  onSubscribe?: (planId: PlanId) => void;
  /** If true, shows a close / "Maybe later" option */
  dismissible?: boolean;
}

export default function Paywall({
  onDismiss,
  onSubscribe,
  dismissible = false,
}: PaywallProps) {
  const [, navigate] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("annual");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async () => {
    setIsLoading(true);
    // TODO: integrate with RevenueCat / App Store / Play Store IAP
    // For now, simulate a brief loading state then call the callback
    await new Promise((r) => setTimeout(r, 800));
    setIsLoading(false);
    if (onSubscribe) {
      onSubscribe(selectedPlan);
    } else {
      navigate("/select-business");
    }
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    } else {
      navigate(-1 as any);
    }
  };

  const handleRestorePurchases = () => {
    // TODO: integrate with RevenueCat restore flow
    alert("Restore Purchases — coming soon.");
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
          aria-label="Close"
        >
          <X className="w-4 h-4 text-white/60" />
        </button>
      )}

      {/* Scrollable content */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="flex flex-col items-center px-6 pt-10 pb-8 max-w-md mx-auto w-full">

          {/* Brand */}
          <div className="flex items-center gap-3 mb-6">
            <BrandIcon size={44} variant="teal" />
            <div className="font-semibold text-xl text-white tracking-tight">
              Business<span className="text-[#5EEAD4]">Cadence</span>
            </div>
          </div>

          {/* Headline */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white leading-tight tracking-tight mb-3">
              Run Your Business.{" "}
              <span className="text-[#5EEAD4]">Protect Your Life.</span>
            </h1>
            <p className="text-white/55 text-base leading-relaxed">
              Unlock the full BusinessCadence operating system for co-preneurs.
              Start your 7-day free trial — cancel anytime.
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
              "Start 7-Day Free Trial"
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
