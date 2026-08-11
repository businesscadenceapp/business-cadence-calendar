import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { advanceTourStep, isTourStepActive } from "../client/src/lib/tour-flow";

const overlaySource = readFileSync(
  fileURLToPath(new URL("../client/src/components/TourOverlay.tsx", import.meta.url)),
  "utf8",
);

describe("Tour flow state", () => {
  it("advances one consecutive step at a time", () => {
    expect(advanceTourStep(0, 20)).toBe(1);
    expect(advanceTourStep(11, 20)).toBe(12);
  });

  it("closes on the final step and remains closed once dismissed", () => {
    expect(advanceTourStep(19, 20)).toBeNull();
    expect(advanceTourStep(null, 20)).toBeNull();
  });

  it("accepts only one valid active index", () => {
    expect(isTourStepActive(0, 20)).toBe(true);
    expect(isTourStepActive(19, 20)).toBe(true);
    expect(isTourStepActive(null, 20)).toBe(false);
    expect(isTourStepActive(20, 20)).toBe(false);
  });
});

describe("Tour overlay cleanup", () => {
  it("contains one dedicated active-step wrapper and one Continue action", () => {
    expect(overlaySource.match(/data-testid="tour-step-wrapper"/g)).toHaveLength(1);
    expect(overlaySource.match(/data-testid="tour-continue-button"/g)).toHaveLength(1);
  });

  it("uses the single progression handler and no legacy step-dot map", () => {
    expect(overlaySource).toContain("onClick={handleContinue}");
    expect(overlaySource).not.toContain("TOUR_STEPS.map");
  });

  it("keeps the Continue action in the interaction layer without absolute positioning", () => {
    const continueButton = overlaySource.match(
      /<button\n\s+data-testid="tour-continue-button"[\s\S]*?<\/button>/,
    )?.[0] ?? "";

    expect(continueButton).toContain("zIndex: 100");
    expect(continueButton).toContain("touchAction: \"manipulation\"");
    expect(continueButton).not.toContain("position:");
  });
});
