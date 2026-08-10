export interface TourPlacementRect {
  y: number;
  height: number;
}

export type TourCardPlacement = "above" | "below";

export interface TourCardLayout {
  placement: TourCardPlacement;
  anchorOffset: number;
  maxHeight: number;
}

const CARD_GAP = 16;
const VIEWPORT_EDGE = 12;
const COMPACT_CARD_MIN_HEIGHT = 168;
const COMPACT_CARD_MAX_HEIGHT = 360;
const IDEAL_CARD_HEIGHT = 260;

function availableSpaceBelow(spotlight: TourPlacementRect, viewportHeight: number): number {
  return Math.max(0, viewportHeight - (spotlight.y + spotlight.height + CARD_GAP + VIEWPORT_EDGE));
}

function availableSpaceAbove(spotlight: TourPlacementRect): number {
  return Math.max(0, spotlight.y - CARD_GAP - VIEWPORT_EDGE);
}

/**
 * Keeps the prompt opposite the highlighted row of hubs. In the Command and
 * Performance hubs, the upper row receives a card below it and the lower row
 * receives a card above it. The swipe cue is always given the upper position
 * when possible so its target stays visible and the Continue control remains
 * inside the viewport.
 */
export function getTourCardPlacement(
  spotlight: TourPlacementRect,
  viewportHeight: number,
  stepId: string,
): TourCardPlacement {
  const roomAbove = availableSpaceAbove(spotlight);
  const roomBelow = availableSpaceBelow(spotlight, viewportHeight);
  const hasComfortableSpaceAbove = roomAbove >= IDEAL_CARD_HEIGHT;
  const hasComfortableSpaceBelow = roomBelow >= IDEAL_CARD_HEIGHT;

  if (stepId === "tour-hub-swipe") {
    return hasComfortableSpaceAbove || roomAbove >= roomBelow ? "above" : "below";
  }

  const isTopRow = spotlight.y + spotlight.height / 2 <= viewportHeight / 2;
  if (isTopRow) {
    return hasComfortableSpaceBelow || roomBelow >= roomAbove ? "below" : "above";
  }

  return hasComfortableSpaceAbove || roomAbove >= roomBelow ? "above" : "below";
}

/** Returns the safe anchor and viewport-capped height for the one active card. */
export function getTourCardLayout(
  spotlight: TourPlacementRect,
  viewportHeight: number,
  stepId: string,
): TourCardLayout {
  const placement = getTourCardPlacement(spotlight, viewportHeight, stepId);
  const available = placement === "below"
    ? availableSpaceBelow(spotlight, viewportHeight)
    : availableSpaceAbove(spotlight);

  return {
    placement,
    anchorOffset: placement === "below"
      ? spotlight.y + spotlight.height + CARD_GAP
      : viewportHeight - spotlight.y + CARD_GAP,
    maxHeight: Math.max(
      Math.min(COMPACT_CARD_MIN_HEIGHT, available),
      Math.min(COMPACT_CARD_MAX_HEIGHT, available),
    ),
  };
}
