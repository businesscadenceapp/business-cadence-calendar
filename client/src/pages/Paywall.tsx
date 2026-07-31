/**
 * Paywall — Full-screen subscription offer shown after onboarding intro.
 *
 * Plans:
 *   Core         $39/mo  or $29/mo (annual, billed $348/yr)
 *   Core + Team  $49/mo  or $39/mo (annual, billed $468/yr)
 *
 * Annual is the default selection. A billing toggle switches between monthly/annual.
 * After subscribing, routes to /invite-partner-setup.
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
  type BillingPeriod,
} from "@shared/subscriptionPlans";

// Simulator bypass — only visible when running in the iOS/Android simulator (not a real device)
const IS_SIMULATOR = Capacitor.isNativePlatform() && !Capacitor.getPlatform().includes("web") && (() => {
  try { return (window as any).__CAPACITOR_SIMULATOR__ === true; } catch { return false; }
})();
// Also show bypass in web browser (non-native) for easy testing
const SHOW_TESTER_BYPASS = !Capacitor.isNativePlatform() || IS_SIMULATOR;

// ─── Plan Card ────────────────────────────────────────────────────────────────
function PlanCard({
  plan,
  billing,
  selected,
  onSelect,
}: {
  plan: (typeof PLANS)[number];
  billing: BillingPeriod;
  selected: boolean;
  onSelect: () => void;
}) {
  const pricing = billing === "annual" ? plan.annual : plan.monthly;
  const savingsLabel = billing === "annual" ? plan.annual.savingsLabel : null;

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
            {savingsLabel && (
              <span className="text-[#5EEAD4] text-xs font-semibold bg-[#5EEAD4]/10 px-2 py-0.5 rounded-full">
                {savingsLabel}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-white/90 font-bold text-2xl">{pricing.price}</span>
            <span className="text-white/40 text-sm">{pricing.period}</span>
            {billing === "annual" && (
              <span className="text-white/30 text-xs ml-1">
                billed ${parseInt(pricing.price.replace("$", "")) * 12}/yr
              </span>
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

// ─── Billing Toggle ───────────────────────────────────────────────────────────
function BillingToggle({
  billing,
  onChange,
}: {
  billing: BillingPeriod;
  onChange: (b: BillingPeriod) => void;
}) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-white/6 border border-white/10 mb-6">
      {(["monthly", "annual"] as BillingPeriod[]).map((b) => (
        <button
          key={b}
          onClick={() => onChange(b)}
          className={[
            "flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200",
            billing === b
              ? "bg-[#5EEAD4] text-[#0A1628]"
              : "text-white/45 hover:text-white/70",
          ].join(" ")}
        >
          {b === "monthly" ? "Monthly" : "Annual · Save $120"}
        </button>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface PaywallProps {
  dismissible?: boolean;
  onSubscribe?: (plan: PlanId) => void;
  onDismiss?: () => void;
}

export default function Paywall({ dismissible, onSubscribe, onDismiss }: PaywallProps) {
  const [, navigate] = useLocation();
  const { person } = usePerson();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(
    PLANS.find((p) => p.popular)?.id ?? PLANS[0].id
  );
  const [billing, setBilling] = useState<BillingPeriod>("annual");
  const [isLoading, setIsLoading] = useState(false);

  const startTrial = trpc.subscription.startTrial.useMutation({
    onSuccess: () => {
      setIsLoading(false);
      toast.success("Your 14-day free trial has started!");
      if (onSubscribe) {
        onSubscribe(selectedPlan);
      } else {
        navigate("/invite-partner-setup");
      }
    },
    onError: (err) => {
      setIsLoading(false);
      toast.error(err.message || "Could not start trial. Please try again.");
    },
  });

  const handleSubscribe = async () => {
    setIsLoading(true);

    if (Capacitor.isNativePlatform()) {
      try {
        const { Purchases } = await import("@revenuecat/purchases-capacitor");
        const offerings = await Purchases.getOfferings();
        const current = offerings.current;
        if (!current) throw new Error("No offerings available. Please try again later.");

        const planData = PLANS.find((p) => p.id === selectedPlan);
        const productId = billing === "annual" ? planData?.annual.productId : planData?.monthly.productId;
        const pkg =
          current.availablePackages.find(
            (p: any) => p.product?.identifier === productId
          ) ?? current.availablePackages[0];

        if (!pkg) throw new Error("Plan not available in your region.");

        await Purchases.purchasePackage({ aPackage: pkg });
        setTimeout(() => {
          setIsLoading(false);
          toast.success("Welcome to BusinessCadence!");
          if (onSubscribe) {
            onSubscribe(selectedPlan);
          } else {
            navigate("/invite-partner-setup");
          }
        }, 1500);
      } catch (err: any) {
        setIsLoading(false);
        if (err?.code !== "1" && err?.code !== 1) {
          toast.error(err?.message || "Purchase failed. Please try again.");
        }
      }
    } else {
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
    if (onDismiss) onDismiss();
    else navigate(-1 as any);
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
      <div
        className="absolute top-0 left-0 right-0 h-64 pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(94,234,212,0.08) 0%, transparent 100%)" }}
      />

      {dismissible && (
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/15 transition-colors"
          style={{ marginTop: "env(safe-area-inset-top)" }}
        >
          <X className="w-4 h-4 text-white/60" />
        </button>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center px-6 pt-10 pb-8 max-w-md mx-auto">
          {/* Brand */}
          <div className="mb-6 flex items-center gap-2">
            <BrandIcon size={32} />
            <span className="text-white font-bold text-lg tracking-tight">
              Business<span className="text-[#5EEAD4]">Cadence</span>
            </span>
          </div>

          {/* Headline */}
          <div className="text-center mb-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/35 mb-2">
              Run your business. Protect your life.
            </p>
            <h1 className="text-3xl font-bold text-white leading-tight tracking-tight mb-3">
              Try free for{" "}
              <span className="text-[#5EEAD4]">14 days</span>
            </h1>
            <p className="text-white/55 text-base leading-relaxed">
              Full access to everything. Cancel anytime — no charge until your trial ends.
            </p>
          </div>

          {/* Billing toggle */}
          <div className="w-full">
            <BillingToggle billing={billing} onChange={setBilling} />
          </div>

          {/* Plan cards */}
          <div className="w-full flex flex-col gap-4 mb-6">
            {PLANS.map((plan) => (
              <div key={plan.id} className={plan.popular ? "mt-4" : ""}>
              <PlanCard
                plan={plan}
                billing={billing}
                selected={selectedPlan === plan.id}
                onSelect={() => setSelectedPlan(plan.id)}
              />
              </div>
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

          {/* CTA */}
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

          <p className="text-white/35 text-xs text-center mb-4">{trialSubtext}</p>

          <button
            onClick={handleRestorePurchases}
            className="text-white/30 text-xs underline underline-offset-2 hover:text-white/50 transition-colors mb-6"
          >
            Restore Purchases
          </button>

          {/* ── Simulator / Tester bypass ── */}
          {SHOW_TESTER_BYPASS && (
            <button
              onClick={() => {
                if (onSubscribe) {
                  onSubscribe(selectedPlan);
                } else {
                  navigate("/invite-partner-setup");
                }
              }}
              className="mt-2 mb-2 text-yellow-400/60 text-xs underline underline-offset-2 hover:text-yellow-400/90 transition-colors"
            >
              🧪 Continue as Tester (skip payment)
            </button>
          )}

          <p className="text-white/20 text-[10px] text-center leading-relaxed max-w-xs">
            Payment will be charged to your Apple ID / Google Play account at
            confirmation of purchase. Subscription automatically renews unless
            auto-renew is turned off at least 24 hours before the end of the
            current period. You can manage subscriptions in your Account
            Settings after purchase.{" "}
            <a href="https://businesscadence.com/privacy" className="underline" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </a>{" "}
            ·{" "}
            <a href="https://businesscadence.com/terms" className="underline" target="_blank" rel="noopener noreferrer">
              Terms of Use
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
