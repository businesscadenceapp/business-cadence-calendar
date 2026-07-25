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
  it("has exactly two plans: core and core_team", () => {
    expect(PLANS).toHaveLength(2);
    expect(PLANS.map((p) => p.id)).toEqual(["core", "core_team"]);
  });

  it("core_team plan is marked as popular", () => {
    const coreTeam = PLANS.find((p) => p.id === "core_team");
    expect(coreTeam?.popular).toBe(true);
  });

  it("core plan is not marked as popular", () => {
    const core = PLANS.find((p) => p.id === "core");
    expect(core?.popular).toBe(false);
  });

  it("core plan price is $79/month", () => {
    const core = PLANS.find((p) => p.id === "core");
    expect(core?.price).toBe("$79");
    expect(core?.period).toBe("/ month");
  });

  it("core_team plan price is $99/month", () => {
    const coreTeam = PLANS.find((p) => p.id === "core_team");
    expect(coreTeam?.price).toBe("$99");
    expect(coreTeam?.period).toBe("/ month");
  });

  it("core_team plan costs more than core plan", () => {
    const core = PLANS.find((p) => p.id === "core")!;
    const coreTeam = PLANS.find((p) => p.id === "core_team")!;
    expect(coreTeam.annualCents).toBeGreaterThan(core.annualCents);
  });

  it("both plans have valid RevenueCat product IDs", () => {
    PLANS.forEach((p) => {
      expect(p.productId.trim().length).toBeGreaterThan(0);
      expect(p.productId).toMatch(/^bc_/);
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
  it("getTrialSubtext returns core_team text for core_team plan", () => {
    const text = getTrialSubtext("core_team");
    expect(text).toContain("$99");
    expect(text).toContain("Cancel anytime");
    expect(text).toContain("14-day");
  });

  it("getTrialSubtext returns core text for core plan", () => {
    const text = getTrialSubtext("core");
    expect(text).toContain("$79");
    expect(text).toContain("Cancel anytime");
    expect(text).toContain("14-day");
  });

  it("annualSavingsPercent returns 0 for month-only plans", () => {
    const pct = annualSavingsPercent();
    expect(pct).toBe(0);
  });
});
