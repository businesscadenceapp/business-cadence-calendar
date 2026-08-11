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
const TOP_COMMAND_CENTER_IDS = new Set([
  "tour-hub-tasks",
  "tour-hub-archive",
  "tour-hub-updates",
]);
const BOTTOM_COMMAND_CENTER_IDS = new Set([
  "tour-hub-calendar",
  "tour-hub-issues",
  "tour-hub-needs-attention",
]);

function availableSpaceBelow(spotlight: TourPlacementRect, viewportHeight: number): number {
  return Math.max(0, viewportHeight - (spotlight.y + spotlight.height + CARD_GAP + VIEWPORT_EDGE));
}

function availableSpaceAbove(spotlight: TourPlacementRect): number {
  return Math.max(0, spotlight.y - CARD_GAP - VIEWPORT_EDGE);
}

/**
 * Uses the deliberate Command Center circle map rather than guessing from
 * screen coordinates. Tasks, Archive, and Updates receive a card below; the
 * Calendar, Issues, and Needs Attention circles receive a card above. This
 * preserves both the highlighted circle and the sole Continue action.
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

  if (TOP_COMMAND_CENTER_IDS.has(stepId)) {
    return hasComfortableSpaceBelow || roomBelow >= roomAbove ? "below" : "above";
  }

  if (BOTTOM_COMMAND_CENTER_IDS.has(stepId)) {
    return hasComfortableSpaceAbove || roomAbove >= roomBelow ? "above" : "below";
  }

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

  const cappedHeight = Math.min(COMPACT_CARD_MAX_HEIGHT, available);

  return {
    placement,
    anchorOffset: placement === "below"
      ? spotlight.y + spotlight.height + CARD_GAP
      : viewportHeight - spotlight.y + CARD_GAP,
    // Every normal phone-sized placement keeps enough room for the fixed
    // header and action row. The fallback only applies to exceptionally small
    // viewports, where preserving the visible action takes priority.
    maxHeight: available >= COMPACT_CARD_MIN_HEIGHT
      ? Math.max(COMPACT_CARD_MIN_HEIGHT, cappedHeight)
      : Math.max(112, cappedHeight),
  };
}
