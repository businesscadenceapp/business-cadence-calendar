/**
 * TourContext — manages the first-login tutorial tour state.
 *
 * Tour steps spotlight key areas of the app one at a time using
 * a dark overlay with a circular/rectangular cutout over the target element.
 *
 * State is persisted to localStorage so the tour only shows once,
 * but can be re-triggered from Settings → "Replay app tour".
 */
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { advanceTourStep, isTourStepActive } from "@/lib/tour-flow";

// ─── Tour Step Definitions ────────────────────────────────────────────────────

export interface TourStep {
  /** Unique key used as data-tour attribute on the target element */
  id: string;
  /** Headline shown in the coach mark */
  title: string;
  /** Body copy shown in the coach mark */
  description: string;
  /** Emoji icon shown in the coach mark */
  icon: string;
  /** Shape of the spotlight cutout */
  shape: "circle" | "rect";
  /** Extra padding (px) around the target element for the spotlight */
  padding?: number;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "tour-hub-center",
    title: "Work Mode & Sleep Mode",
    description: "The center sun automatically becomes a moon outside your personal business hours. Tap it anytime to manually pause partner notifications and protect home time.",
    icon: "☀️",
    shape: "circle",
    padding: 16,
  },
  {
    id: "tour-hub-calendar",
    title: "Your shared rhythm",
    description: "The Calendar turns your meeting cadence into a visible rhythm, so the important conversations have a place and do not spill into every evening.",
    icon: "📅",
    shape: "circle",
    padding: 14,
  },
  {
    id: "tour-hub-tasks",
    title: "Capture, don’t interrupt",
    description: "Tasks, Updates, and Issues give a business thought a home. Put it here instead of texting your partner during family time.",
    icon: "💭",
    shape: "circle",
    padding: 14,
  },
  {
    id: "tour-hub-swipe",
    title: "Swipe to the Productivity Hub",
    description: "Swipe left when you are ready to work on the business: Goals, KPIs, Reports, Settings, and referrals live in the second hub.",
    icon: "👈",
    shape: "rect",
    padding: 12,
  },
  {
    id: "tour-perf-center",
    title: "Build forward together",
    description: "The Productivity Hub gives you a shared view of what matters next. Detailed guidance appears only when you use each tool for the first time.",
    icon: "📈",
    shape: "circle",
    padding: 16,
  },
];

const TOUR_STORAGE_KEY = "bcc_tour_completed_v1";

// ─── Context Types ────────────────────────────────────────────────────────────

interface TourCtx {
  /** Whether the tour overlay is currently visible */
  active: boolean;
  /** Index of the current step (0-based) */
  stepIndex: number;
  /** Current step definition */
  currentStep: TourStep | null;
  /** Advance to next step (or complete tour if on last step) */
  next: () => void;
  /** Skip and dismiss the entire tour */
  skip: () => void;
  /** Re-trigger the tour from the beginning */
  replay: () => void;
  /** Register a DOM ref for a tour target element */
  registerRef: (id: string, el: HTMLElement | null) => void;
  /** Get the registered DOM element for a step id */
  getRef: (id: string) => HTMLElement | null;
}

const TourContext = createContext<TourCtx>({
  active: false,
  stepIndex: 0,
  currentStep: null,
  next: () => {},
  skip: () => {},
  replay: () => {},
  registerRef: () => {},
  getRef: () => null,
});

export function useTour() {
  return useContext(TourContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function TourProvider({ children }: { children: ReactNode }) {
  // `null` means the tour is closed. A valid index is the one and only step
  // allowed to render, which rules out overlapping coach marks by design.
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const activeStepIndexRef = useRef<number | null>(null);
  const refsMap = useRef<Map<string, HTMLElement>>(new Map());

  const setOnlyActiveStep = useCallback((nextStepIndex: number | null) => {
    activeStepIndexRef.current = nextStepIndex;
    setActiveStepIndex(nextStepIndex);
  }, []);

  const complete = useCallback(() => {
    setOnlyActiveStep(null);
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
  }, [setOnlyActiveStep]);

  const next = useCallback(() => {
    const nextStepIndex = advanceTourStep(activeStepIndexRef.current, TOUR_STEPS.length);

    if (nextStepIndex === activeStepIndexRef.current) return;
    if (nextStepIndex === null) {
      localStorage.setItem(TOUR_STORAGE_KEY, "true");
    }

    setOnlyActiveStep(nextStepIndex);
  }, [setOnlyActiveStep]);

  const skip = useCallback(() => {
    complete();
  }, [complete]);

  const replay = useCallback(() => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    setOnlyActiveStep(0);
  }, [setOnlyActiveStep]);

  const registerRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) {
      refsMap.current.set(id, el);
    } else {
      refsMap.current.delete(id);
    }
  }, []);

  const getRef = useCallback((id: string) => {
    return refsMap.current.get(id) ?? null;
  }, []);

  const active = isTourStepActive(activeStepIndex, TOUR_STEPS.length);
  const stepIndex = activeStepIndex ?? 0;
  const currentStep = active ? TOUR_STEPS[stepIndex] : null;

  return (
    <TourContext.Provider
      value={{
        active,
        stepIndex,
        currentStep,
        next,
        skip,
        replay,
        registerRef,
        getRef,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

// Re-export storage key for Settings page
export { TOUR_STORAGE_KEY };
/** Set this key to "1" before navigating to Board to auto-start the tour */
export const TOUR_PENDING_KEY = "bcc_tour_pending_v1";
