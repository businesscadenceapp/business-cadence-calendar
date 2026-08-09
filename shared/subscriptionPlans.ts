/**
 * Subscription plan and feature constants for BusinessCadence.
 *
 * Shared between:
 * - client/src/pages/Paywall.tsx (UI rendering)
 * - client/src/pages/SubscriptionOnboarding.tsx (step badges)
 * - server/paywall.test.ts (vitest coverage)
 *
 * Plans:
 *   Co-Owner  $49/mo  or $39/mo (annual, billed $468/yr) — both owners, all features
 *   Growth    $59/mo  or $49/mo (annual, billed $588/yr) — Co-Owner + multiple businesses
 *
 * RevenueCat product IDs must match App Store Connect / Google Play Console.
 */

export type BillingPeriod = "monthly" | "annual";

export const SUBSCRIPTION_PLANS = [
  {
    id: "co_owner" as const,
    label: "Co-Owner",
    description: "Both owners — full access to all features",
    monthly: { price: "$49", period: "/ month", productId: "bc_co_owner_monthly", annualCents: 49 * 12 * 100 },
    annual:  { price: "$39", period: "/ month", productId: "bc_co_owner_annual",  annualCents: 39 * 12 * 100, savingsLabel: "Save $120/yr" },
    popular: true,
    foundingBadge: false,
  },
  {
    id: "co_owner_team" as const,
    label: "Growth",
    description: "Everything in Co-Owner, plus multiple businesses",
    monthly: { price: "$59", period: "/ month", productId: "bc_co_owner_team_monthly", annualCents: 59 * 12 * 100 },
    annual:  { price: "$49", period: "/ month", productId: "bc_co_owner_team_annual",  annualCents: 49 * 12 * 100, savingsLabel: "Save $120/yr" },
    popular: false,
    foundingBadge: false,
  },
] as const;

export type PlanId = (typeof SUBSCRIPTION_PLANS)[number]["id"];

export const PAYWALL_FEATURES = [
  "Shared Business Hub (Command Center)",
  "Meeting Cadence Calendar",
  "Goals & KPI Tracking",
  "AI Tone Check",
  "Quiet Hours / Off the Clock",
  "Both owners included — no double billing",
] as const;

export const ONBOARDING_STEP_BADGES = [
  "For Co-Preneurs",
  "The Problem",
  "The Solution",
  "How It Works",
  "The Promise",
] as const;

/**
 * Returns the trial sub-text shown below the CTA button.
 * Varies by selected plan.
 */
export function getTrialSubtext(planId: PlanId): string {
  if (planId === "co_owner_team") {
    return "Then $59/mo or $49/mo billed annually · Cancel anytime";
  }
  return "Then $49/mo or $39/mo billed annually · Cancel anytime";
}

/**
 * Returns the annual savings percentage.
 */
export function annualSavingsPercent(): number {
  return 20;
}
