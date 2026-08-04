/**
 * Paywall unit tests — validates the plan data and feature list
 * that the Paywall component renders.
 *
 * These tests run on the server side (vitest) but validate shared constants
 * that are imported by the client component.
 */

import { describe, it, expect } from "vitest";

// ─── Import from shared module (same source the component uses) ───────────────
import {
  SUBSCRIPTION_PLANS as PLANS,
  PAYWALL_FEATURES as FEATURES,
  ONBOARDING_STEP_BADGES,
  getTrialSubtext,
  annualSavingsPercent,
} from "../shared/subscriptionPlans";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Paywall plan data", () => {
  it("has exactly three plans: founding, co_owner, and co_owner_team", () => {
    expect(PLANS).toHaveLength(3);
    expect(PLANS.map((p) => p.id)).toEqual(["founding", "co_owner", "co_owner_team"]);
  });

  it("co_owner_team plan is marked as popular", () => {
    const popular = PLANS.find((p) => p.popular);
    expect(popular?.id).toBe("co_owner_team");
  });

  it("founding plan has foundingBadge true", () => {
    const founding = PLANS.find((p) => p.id === "founding");
    expect(founding?.foundingBadge).toBe(true);
  });

  it("founding plan is $39/mo monthly and $29/mo annual", () => {
    const founding = PLANS.find((p) => p.id === "founding")!;
    expect(founding.monthly.price).toBe("$39");
    expect(founding.annual.price).toBe("$29");
    expect(founding.monthly.period).toBe("/ month");
    expect(founding.annual.period).toBe("/ month");
  });

  it("co_owner plan is $69/mo monthly and $52/mo annual", () => {
    const coOwner = PLANS.find((p) => p.id === "co_owner")!;
    expect(coOwner.monthly.price).toBe("$69");
    expect(coOwner.annual.price).toBe("$52");
  });

  it("co_owner_team plan is $79/mo monthly and $59/mo annual", () => {
    const coOwnerTeam = PLANS.find((p) => p.id === "co_owner_team")!;
    expect(coOwnerTeam.monthly.price).toBe("$79");
    expect(coOwnerTeam.annual.price).toBe("$59");
  });

  it("co_owner_team plan costs more than co_owner plan", () => {
    const coOwner = PLANS.find((p) => p.id === "co_owner")!;
    const coOwnerTeam = PLANS.find((p) => p.id === "co_owner_team")!;
    expect(coOwnerTeam.monthly.annualCents).toBeGreaterThan(coOwner.monthly.annualCents);
    expect(coOwnerTeam.annual.annualCents).toBeGreaterThan(coOwner.annual.annualCents);
  });

  it("all billing options have valid RevenueCat product IDs", () => {
    PLANS.forEach((p) => {
      for (const opt of [p.monthly, p.annual]) {
        expect(opt.productId.trim().length).toBeGreaterThan(0);
        expect(opt.productId).toMatch(/^bc_/);
      }
    });
  });
});

describe("Paywall feature list", () => {
  it("has at least 4 features", () => {
    expect(FEATURES.length).toBeGreaterThanOrEqual(4);
  });

  it("includes meeting cadence", () => {
    expect(FEATURES.some((f) => f.toLowerCase().includes("meeting"))).toBe(true);
  });

  it("includes partner access callout", () => {
    expect(FEATURES.some((f) => f.toLowerCase().includes("partner"))).toBe(true);
  });

  it("includes KPI or goal tracking", () => {
    expect(FEATURES.some((f) => f.toLowerCase().includes("kpi") || f.toLowerCase().includes("goal"))).toBe(true);
  });

  it("all feature strings are non-empty", () => {
    FEATURES.forEach((f) => {
      expect(f.trim().length).toBeGreaterThan(0);
    });
  });
});

describe("Subscription onboarding steps", () => {
  it("has exactly 4 onboarding steps", () => {
    expect(ONBOARDING_STEP_BADGES).toHaveLength(4);
  });

  it("steps follow the correct emotional arc", () => {
    expect(ONBOARDING_STEP_BADGES[0]).toContain("Co-Preneurs");
    expect(ONBOARDING_STEP_BADGES[1]).toContain("Problem");
    expect(ONBOARDING_STEP_BADGES[2]).toContain("Solution");
    expect(ONBOARDING_STEP_BADGES[3]).toContain("Promise");
  });

  it("all badge strings are non-empty", () => {
    ONBOARDING_STEP_BADGES.forEach((b) => {
      expect(b.trim().length).toBeGreaterThan(0);
    });
  });
});

describe("Subscription helper functions", () => {
  it("getTrialSubtext returns co_owner_team text for co_owner_team plan", () => {
    const text = getTrialSubtext("co_owner_team");
    expect(text).toContain("$79");
    expect(text).toContain("$59");
    expect(text).toContain("Cancel anytime");
  });

  it("getTrialSubtext returns co_owner text for co_owner plan", () => {
    const text = getTrialSubtext("co_owner");
    expect(text).toContain("$69");
    expect(text).toContain("$52");
    expect(text).toContain("Cancel anytime");
  });

  it("getTrialSubtext returns founding locked text for founding plan", () => {
    const text = getTrialSubtext("founding");
    expect(text.toLowerCase()).toContain("founding");
  });

  it("annualSavingsPercent returns 25 for annual plans", () => {
    const pct = annualSavingsPercent();
    expect(pct).toBe(25);
  });
});
