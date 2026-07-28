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

  it("core plan is $39/mo monthly and $29/mo annual", () => {
    const core = PLANS.find((p) => p.id === "core")!;
    expect(core.monthly.price).toBe("$39");
    expect(core.annual.price).toBe("$29");
    expect(core.monthly.period).toBe("/ month");
    expect(core.annual.period).toBe("/ month");
  });

  it("core_team plan is $49/mo monthly and $39/mo annual", () => {
    const coreTeam = PLANS.find((p) => p.id === "core_team")!;
    expect(coreTeam.monthly.price).toBe("$49");
    expect(coreTeam.annual.price).toBe("$39");
  });

  it("annual billing totals are correct ($348 core, $468 core_team)", () => {
    const core = PLANS.find((p) => p.id === "core")!;
    const coreTeam = PLANS.find((p) => p.id === "core_team")!;
    expect(core.annual.annualCents).toBe(348 * 100);
    expect(coreTeam.annual.annualCents).toBe(468 * 100);
  });

  it("core_team plan costs more than core plan", () => {
    const core = PLANS.find((p) => p.id === "core")!;
    const coreTeam = PLANS.find((p) => p.id === "core_team")!;
    expect(coreTeam.monthly.annualCents).toBeGreaterThan(core.monthly.annualCents);
    expect(coreTeam.annual.annualCents).toBeGreaterThan(core.annual.annualCents);
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
  it("getTrialSubtext returns core_team text for core_team plan", () => {
    const text = getTrialSubtext("core_team");
    expect(text).toContain("$49");
    expect(text).toContain("$39");
    expect(text).toContain("Cancel anytime");
  });

  it("getTrialSubtext returns core text for core plan", () => {
    const text = getTrialSubtext("core");
    expect(text).toContain("$39");
    expect(text).toContain("$29");
    expect(text).toContain("Cancel anytime");
  });

  it("annualSavingsPercent returns 0 for month-only plans", () => {
    const pct = annualSavingsPercent();
    expect(pct).toBe(0);
  });
});
