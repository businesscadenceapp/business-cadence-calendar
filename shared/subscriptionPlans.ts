/**
 * Subscription plan and feature constants for BusinessCadence.
 *
 * Shared between:
 * - client/src/pages/Paywall.tsx (UI rendering)
 * - client/src/pages/SubscriptionOnboarding.tsx (step badges)
 * - server/paywall.test.ts (vitest coverage)
 *
 * Plans:
 *   Founding Member  $39/mo locked (early adopter, limited availability)
 *   Co-Owner         $69/mo  or $52/mo (annual, billed $624/yr) — owners only
 *   Co-Owner + Team  $79/mo  or $59/mo (annual, billed $708/yr) — owners + team
 *
 * RevenueCat product IDs must match App Store Connect / Google Play Console.
 */

export type BillingPeriod = "monthly" | "annual";

export const SUBSCRIPTION_PLANS = [
  {
    id: "founding" as const,
    label: "Founding Member",
    description: "Early adopter rate — locked in forever",
    monthly: { price: "$39", period: "/ month", productId: "bc_founding_monthly", annualCents: 39 * 12 * 100 },
    annual:  { price: "$29", period: "/ month", productId: "bc_founding_annual",  annualCents: 29 * 12 * 100, savingsLabel: "Save $120/yr" },
    popular: false,
    foundingBadge: true,
  },
  {
    id: "co_owner" as const,
    label: "Co-Owner",
    description: "Both owners — all cadence meetings & board",
    monthly: { price: "$69", period: "/ month", productId: "bc_co_owner_monthly", annualCents: 69 * 12 * 100 },
    annual:  { price: "$52", period: "/ month", productId: "bc_co_owner_annual",  annualCents: 52 * 12 * 100, savingsLabel: "Save $204/yr" },
    popular: false,
    foundingBadge: false,
  },
  {
    id: "co_owner_team" as const,
    label: "Co-Owner + Team",
    description: "Everything in Co-Owner, plus unlimited team employees",
    monthly: { price: "$79", period: "/ month", productId: "bc_co_owner_team_monthly", annualCents: 79 * 12 * 100 },
    annual:  { price: "$59", period: "/ month", productId: "bc_co_owner_team_annual",  annualCents: 59 * 12 * 100, savingsLabel: "Save $240/yr" },
    popular: true,
    foundingBadge: false,
  },
] as const;

export type PlanId = (typeof SUBSCRIPTION_PLANS)[number]["id"];

export const PAYWALL_FEATURES = [
  "Daily, Weekly, Monthly & Quarterly meetings",
  "Business Board — updates, issues & action cards",
  "KPI tracking & goal setting",
  "Meeting logs & AI summaries",
  "Partner access included — no double billing",
  "Co-Owner + Team: unlimited employees & team calendar",
] as const;

export const ONBOARDING_STEP_BADGES = [
  "For Co-Preneurs",
  "The Problem",
  "The Solution",
  "The Promise",
] as const;

/**
 * Returns the trial sub-text shown below the CTA button.
 * Varies by selected plan.
 */
export function getTrialSubtext(planId: PlanId): string {
  if (planId === "co_owner_team") {
    return "Then $79/mo or $59/mo billed annually · Cancel anytime";
  }
  if (planId === "co_owner") {
    return "Then $69/mo or $52/mo billed annually · Cancel anytime";
  }
  return "Founding rate locked in forever · Cancel anytime";
}

/**
 * Returns the annual savings percentage.
 */
export function annualSavingsPercent(): number {
  return 25;
}
