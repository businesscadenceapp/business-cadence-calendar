/**
 * Subscription plan and feature constants for BusinessCadence.
 *
 * Shared between:
 * - client/src/pages/Paywall.tsx (UI rendering)
 * - client/src/pages/SubscriptionOnboarding.tsx (step badges)
 * - server/paywall.test.ts (vitest coverage)
 *
 * When integrating with RevenueCat or App Store Connect, update the
 * `productId` fields to match your IAP product identifiers.
 */

export const SUBSCRIPTION_PLANS = [
  {
    id: "monthly" as const,
    label: "Monthly",
    description: "Billed month-to-month",
    price: "$29",
    period: "/ month",
    perMonth: null as string | null,
    original: null as string | null,
    popular: false,
    /** RevenueCat / App Store product identifier — set before IAP integration */
    productId: "com.businesscadence.monthly",
    /** Annual equivalent cost in USD cents (for analytics) */
    annualCents: 29 * 12 * 100,
  },
  {
    id: "annual" as const,
    label: "Annual",
    description: "Billed once per year",
    price: "$179",
    period: "/ year",
    perMonth: "$14.92 / mo",
    original: "$348 / yr",
    popular: true,
    /** RevenueCat / App Store product identifier — set before IAP integration */
    productId: "com.businesscadence.annual",
    /** Annual cost in USD cents */
    annualCents: 179 * 100,
  },
] as const;

export type PlanId = (typeof SUBSCRIPTION_PLANS)[number]["id"];

export const PAYWALL_FEATURES = [
  "Full meeting cadence calendar",
  "Owner Board — updates, issues & tasks",
  "AI meeting summaries & action items",
  "Team KPI tracking & weekly reports",
  "Up to 5 businesses per account",
  "Unlimited team members",
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
  if (planId === "annual") {
    return "Then $14.92/mo (billed $179/yr) · Cancel anytime";
  }
  return "Then $29/mo · Cancel anytime";
}

/**
 * Returns the savings percentage for the annual plan vs monthly.
 * Used for the "Save X%" badge.
 */
export function annualSavingsPercent(): number {
  const monthlyAnnual = 29 * 12;
  const annual = 179;
  return Math.round(((monthlyAnnual - annual) / monthlyAnnual) * 100);
}
