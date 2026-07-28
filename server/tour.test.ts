/**
 * Tour state persistence tests.
 * These tests verify the localStorage key logic used by TourContext
 * to ensure the tour only shows once and can be replayed.
 */
import { describe, it, expect, beforeEach } from "vitest";

const TOUR_STORAGE_KEY = "bcc_tour_completed_v1";

// Simulate the TourContext state machine logic in isolation
function isTourCompleted(storage: Record<string, string>): boolean {
  return storage[TOUR_STORAGE_KEY] === "true";
}

function completeTour(storage: Record<string, string>): Record<string, string> {
  return { ...storage, [TOUR_STORAGE_KEY]: "true" };
}

function replayTour(storage: Record<string, string>): Record<string, string> {
  const next = { ...storage };
  delete next[TOUR_STORAGE_KEY];
  return next;
}

describe("Tour state persistence", () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
  });

  it("tour is not completed on fresh install", () => {
    expect(isTourCompleted(storage)).toBe(false);
  });

  it("tour is marked completed after user finishes it", () => {
    storage = completeTour(storage);
    expect(isTourCompleted(storage)).toBe(true);
  });

  it("tour is not completed after replay clears the key", () => {
    storage = completeTour(storage);
    storage = replayTour(storage);
    expect(isTourCompleted(storage)).toBe(false);
  });

  it("completing tour again after replay marks it completed again", () => {
    storage = completeTour(storage);
    storage = replayTour(storage);
    storage = completeTour(storage);
    expect(isTourCompleted(storage)).toBe(true);
  });

  it("storage key is exactly bcc_tour_completed_v1", () => {
    expect(TOUR_STORAGE_KEY).toBe("bcc_tour_completed_v1");
  });

  it("replay removes the key entirely (not just sets to false)", () => {
    storage = completeTour(storage);
    storage = replayTour(storage);
    expect(Object.prototype.hasOwnProperty.call(storage, TOUR_STORAGE_KEY)).toBe(false);
  });

  it("multiple complete calls are idempotent", () => {
    storage = completeTour(storage);
    storage = completeTour(storage);
    expect(isTourCompleted(storage)).toBe(true);
    expect(Object.keys(storage).filter(k => k === TOUR_STORAGE_KEY)).toHaveLength(1);
  });
});
