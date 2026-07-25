/**
 * Subscription plan and feature constants for BusinessCadence.
 *
 * Shared between:
 * - client/src/pages/Paywall.tsx (UI rendering)
 * - client/src/pages/SubscriptionOnboarding.tsx (step badges)
 * - server/paywall.test.ts (vitest coverage)
 *
 * Plans:
 *   Core         $79/mo  — owners only, all cadence meetings
 *   Core + Team  $99/mo  — owners + unlimited team employees
 *
 * RevenueCat product IDs must match App Store Connect / Google Play Console.
 */
export const SUBSCRIPTION_PLANS = [
  {
    id: "core" as const,
    label: "Core",
    description: "Owners only — all cadence meetings & board",
    price: "$79",
    period: "/ month",
    perMonth: null as string | null,
    original: null as string | null,
    popular: false,
    /** RevenueCat / App Store product identifier */
    productId: "bc_core_monthly",
    /** Annual equivalent cost in USD cents (for analytics) */
    annualCents: 79 * 12 * 100,
  },
  {
    id: "core_team" as const,
    label: "Core + Team",
    description: "Everything in Core, plus unlimited team employees",
    price: "$99",
    period: "/ month",
    perMonth: null as string | null,
    original: null as string | null,
    popular: true,
    /** RevenueCat / App Store product identifier */
    productId: "bc_core_team_monthly",
    /** Annual equivalent cost in USD cents */
    annualCents: 99 * 12 * 100,
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
  "Sleep Mode",
  "The Promise",
] as const;

/**
 * Returns the trial sub-text shown below the CTA button.
 * Varies by selected plan.
 */
export function getTrialSubtext(planId: PlanId): string {
  if (planId === "core_team") {
    return "Then $99/mo · Cancel anytime · 14-day free trial";
  }
  return "Then $79/mo · Cancel anytime · 14-day free trial";
}

/**
 * Returns the savings percentage for Core+Team vs Core.
 * Not applicable for month-only plans — returns 0.
 */
export function annualSavingsPercent(): number {
  return 0;
}
