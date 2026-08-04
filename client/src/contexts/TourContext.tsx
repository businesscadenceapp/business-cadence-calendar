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
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

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
    id: "tour-hub",
    title: "Your Command Board",
    description: "This is where you run the business together. Post tasks, updates, and issues — your partner sees everything in real time. No more dinner-table debriefs.",
    icon: "⚡",
    shape: "circle",
    padding: 14,
  },
  {
    id: "tour-calendar",
    title: "Meeting Rhythm",
    description: "Daily huddles. Weekly reviews. Monthly check-ins. Your structured cadence keeps business conversations where they belong — in the meeting, not in the bedroom.",
    icon: "📅",
    shape: "rect",
    padding: 10,
  },
  {
    id: "tour-goals",
    title: "Shared Goals",
    description: "Set targets you both own. Track progress together. When you're aligned on what winning looks like, everything else gets easier — including the relationship.",
    icon: "🎯",
    shape: "rect",
    padding: 10,
  },
  {
    id: "tour-sleep",
    title: "Off the Clock",
    description: "Tap this when the workday ends. Notifications pause so you can be a partner first, a business owner second. The business will still be there tomorrow.",
    icon: "🌙",
    shape: "rect",
    padding: 8,
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
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const refsMap = useRef<Map<string, HTMLElement>>(new Map());

  const complete = useCallback(() => {
    setActive(false);
    setStepIndex(0);
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
  }, []);

  const next = useCallback(() => {
    setStepIndex(prev => {
      const nextIdx = prev + 1;
      if (nextIdx >= TOUR_STEPS.length) {
        // Last step — complete the tour
        setActive(false);
        localStorage.setItem(TOUR_STORAGE_KEY, "true");
        return 0;
      }
      return nextIdx;
    });
  }, []);

  const skip = useCallback(() => {
    complete();
  }, [complete]);

  const replay = useCallback(() => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    setStepIndex(0);
    setActive(true);
  }, []);

  /** Called by Board page — starts tour if pending flag is set OR tour has never been seen */
  const startIfPending = useCallback(() => {
    const pending = localStorage.getItem(TOUR_PENDING_KEY);
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    if (pending === "1" || !completed) {
      localStorage.removeItem(TOUR_PENDING_KEY);
      setStepIndex(0);
      setActive(true);
    }
  }, []);

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

  const currentStep = active ? (TOUR_STEPS[stepIndex] ?? null) : null;

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
      {/* Expose startIfPending via a side-channel so Board can call it */}
      <TourStartBridge startIfPending={startIfPending} />
      {children}
    </TourContext.Provider>
  );
}

// ─── Start Bridge ─────────────────────────────────────────────────────────────
// Allows Board to trigger tour start without prop-drilling

const TourStartContext = createContext<{ startIfPending: () => void }>({
  startIfPending: () => {},
});

function TourStartBridge({ startIfPending }: { startIfPending: () => void }) {
  return (
    <TourStartContext.Provider value={{ startIfPending }}>
      {/* no children — just provides the context value */}
    </TourStartContext.Provider>
  );
}

export function useTourStart() {
  return useContext(TourStartContext);
}

// Re-export storage key for Settings page
export { TOUR_STORAGE_KEY };
/** Set this key to "1" before navigating to Board to auto-start the tour */
export const TOUR_PENDING_KEY = "bcc_tour_pending_v1";
