/**
 * Pure state helpers for the app tour.
 * A null value represents a closed tour; any number represents the only
 * currently active step. Keeping this rule outside the UI prevents multiple
 * steps or action controls from being rendered at the same time.
 */
export function advanceTourStep(
  activeStepIndex: number | null,
  totalSteps: number,
): number | null {
  if (activeStepIndex === null || totalSteps <= 0) return null;

  const nextStepIndex = activeStepIndex + 1;
  return nextStepIndex >= totalSteps ? null : nextStepIndex;
}

export function isTourStepActive(
  activeStepIndex: number | null,
  totalSteps: number,
): activeStepIndex is number {
  return (
    Number.isInteger(activeStepIndex) &&
    activeStepIndex !== null &&
    activeStepIndex >= 0 &&
    activeStepIndex < totalSteps
  );
}
