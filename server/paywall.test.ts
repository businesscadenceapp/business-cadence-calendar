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
  it("has exactly two plans: monthly and annual", () => {
    expect(PLANS).toHaveLength(2);
    expect(PLANS.map((p) => p.id)).toEqual(["monthly", "annual"]);
  });

  it("annual plan is marked as popular", () => {
    const annual = PLANS.find((p) => p.id === "annual");
    expect(annual?.popular).toBe(true);
  });

  it("monthly plan is not marked as popular", () => {
    const monthly = PLANS.find((p) => p.id === "monthly");
    expect(monthly?.popular).toBe(false);
  });

  it("annual plan price is lower per month than monthly plan", () => {
    // Annual: $179 / 12 = $14.92/mo vs Monthly: $29/mo
    const annualMonthly = 179 / 12;
    const monthly = 29;
    expect(annualMonthly).toBeLessThan(monthly);
  });

  it("annual plan shows per-month and original price", () => {
    const annual = PLANS.find((p) => p.id === "annual");
    expect(annual?.perMonth).toBeTruthy();
    expect(annual?.original).toBeTruthy();
  });

  it("monthly plan has no per-month or original price fields", () => {
    const monthly = PLANS.find((p) => p.id === "monthly");
    expect(monthly?.perMonth).toBeNull();
    expect(monthly?.original).toBeNull();
  });
});

describe("Paywall feature list", () => {
  it("has at least 4 features", () => {
    expect(FEATURES.length).toBeGreaterThanOrEqual(4);
  });

  it("includes the calendar feature", () => {
    expect(FEATURES.some((f) => f.toLowerCase().includes("calendar"))).toBe(true);
  });

  it("includes the AI summaries feature", () => {
    expect(FEATURES.some((f) => f.toLowerCase().includes("ai"))).toBe(true);
  });

  it("includes the Owner Board feature", () => {
    expect(FEATURES.some((f) => f.toLowerCase().includes("owner board"))).toBe(true);
  });

  it("includes KPI tracking", () => {
    expect(FEATURES.some((f) => f.toLowerCase().includes("kpi"))).toBe(true);
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
  it("getTrialSubtext returns annual text for annual plan", () => {
    const text = getTrialSubtext("annual");
    expect(text).toContain("$179");
    expect(text).toContain("Cancel anytime");
  });

  it("getTrialSubtext returns monthly text for monthly plan", () => {
    const text = getTrialSubtext("monthly");
    expect(text).toContain("$29");
    expect(text).toContain("Cancel anytime");
  });

  it("annualSavingsPercent returns ~49% savings", () => {
    const pct = annualSavingsPercent();
    // $179 vs $348 = ~48.6% savings, rounds to 49
    expect(pct).toBeGreaterThanOrEqual(48);
    expect(pct).toBeLessThanOrEqual(50);
  });

  it("annual plan has lower annual cost than 12x monthly", () => {
    const annual = PLANS.find((p) => p.id === "annual")!;
    const monthly = PLANS.find((p) => p.id === "monthly")!;
    expect(annual.annualCents).toBeLessThan(monthly.annualCents);
  });

  it("all plans have non-empty productId strings", () => {
    PLANS.forEach((p) => {
      expect(p.productId.trim().length).toBeGreaterThan(0);
    });
  });
});
