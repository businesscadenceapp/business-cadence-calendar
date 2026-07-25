/**
 * Subscription plan and feature constants for BusinessCadence.
 *
 * Shared between:
 * - client/src/pages/Paywall.tsx (UI rendering)
 * - client/src/pages/SubscriptionOnboarding.tsx (step badges)
 * - server/paywall.test.ts (vitest coverage)
 *
 * Plans:
 *   Core         $39/mo  or $29/mo (annual) — owners only
 *   Core + Team  $49/mo  or $39/mo (annual) — owners + team
 *
 * RevenueCat product IDs must match App Store Connect / Google Play Console.
 */

export type BillingPeriod = "monthly" | "annual";

export const SUBSCRIPTION_PLANS = [
  {
    id: "core" as const,
    label: "Core",
    description: "Both owners — all cadence meetings & board",
    monthly: { price: "$39", period: "/ month", productId: "bc_core_monthly", annualCents: 39 * 12 * 100 },
    annual:  { price: "$29", period: "/ month", productId: "bc_core_annual",  annualCents: 29 * 12 * 100, savingsLabel: "Save $120/yr" },
    popular: false,
  },
  {
    id: "core_team" as const,
    label: "Core + Team",
    description: "Everything in Core, plus unlimited team employees",
    monthly: { price: "$49", period: "/ month", productId: "bc_core_team_monthly", annualCents: 49 * 12 * 100 },
    annual:  { price: "$39", period: "/ month", productId: "bc_core_team_annual",  annualCents: 39 * 12 * 100, savingsLabel: "Save $120/yr" },
    popular: true,
  },
] as const;

export type PlanId = (typeof SUBSCRIPTION_PLANS)[number]["id"];

export const PAYWALL_FEATURES = [
  "Daily, Weekly, Monthly & Quarterly meetings",
  "Business Board — updates, issues & action cards",
  "KPI tracking & goal setting",
  "Meeting logs & AI summaries",
  "Partner access included — no double billing",
  "Core + Team: unlimited employees & team calendar",
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
  if (planId === "core_team") {
    return "Then $49/mo or $39/mo billed annually · Cancel anytime";
  }
  return "Then $39/mo or $29/mo billed annually · Cancel anytime";
}

/**
 * Returns the savings percentage for Core+Team vs Core.
 * Not applicable for month-only plans — returns 0.
 */
export function annualSavingsPercent(): number {
  return 0;
}
