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
  // ── Hub 1: Command Board ──
  {
    id: "tour-hub-center",
    title: "Your Command Board",
    description: "This is your business hub. Everything you and your partner need to run the business together lives here — organized into categories so nothing gets lost.",
    icon: "⚡",
    shape: "circle",
    padding: 16,
  },
  {
    id: "tour-hub-tasks",
    title: "Tasks",
    description: "Assign tasks to yourself or your partner. When it's done, mark it complete — your partner gets notified. No more 'did you do that thing?' at dinner.",
    icon: "☑️",
    shape: "circle",
    padding: 14,
  },
  {
    id: "tour-hub-updates",
    title: "Updates",
    description: "Share wins, progress, and important news with your partner. Good news travels fast — and so does the stuff they need to know before the next meeting.",
    icon: "✅",
    shape: "circle",
    padding: 14,
  },
  {
    id: "tour-hub-issues",
    title: "Issues",
    description: "Log problems as they come up. Flag them as high priority when they need immediate attention. Issues stay in the app — not in the car ride home.",
    icon: "🔥",
    shape: "circle",
    padding: 14,
  },
  {
    id: "tour-hub-needs-attention",
    title: "Needs Attention",
    description: "A combined view of open tasks and unresolved issues. Your quick-glance list of what needs action from either of you — right now.",
    icon: "❗",
    shape: "circle",
    padding: 14,
  },
  {
    id: "tour-hub-calendar",
    title: "Meeting Rhythm",
    description: "Daily huddles. Weekly reviews. Monthly check-ins. Your structured cadence keeps business conversations where they belong — in the meeting, not in the bedroom.",
    icon: "📅",
    shape: "circle",
    padding: 14,
  },
  {
    id: "tour-hub-archive",
    title: "Archive",
    description: "Completed tasks and resolved issues live here. Your record of everything you've handled together — proof that the system works.",
    icon: "📁",
    shape: "circle",
    padding: 14,
  },
  // ── Swipe hint ──
  {
    id: "tour-hub-swipe",
    title: "Swipe for Performance Hub",
    description: "Swipe left to reveal your Performance Hub — Goals, KPIs, and Reports. Two hubs, one screen. Your whole business at your fingertips.",
    icon: "👈",
    shape: "rect",
    padding: 12,
  },
  // ── Hub 2: Performance ──
  {
    id: "tour-perf-center",
    title: "Performance Hub",
    description: "This is where you track how the business is actually doing. Goals you've set, KPIs you're measuring, and reports you've run — all in one place.",
    icon: "📈",
    shape: "circle",
    padding: 16,
  },
  {
    id: "tour-goals",
    title: "Shared Goals",
    description: "Set targets you both own. Track progress together. When you're aligned on what winning looks like, everything else gets easier — including the relationship.",
    icon: "🎯",
    shape: "circle",
    padding: 14,
  },
  {
    id: "tour-kpis",
    title: "KPIs",
    description: "The numbers that tell you if the business is healthy. Revenue, bookings, retention — whatever matters most to your business. Track it here together.",
    icon: "📊",
    shape: "circle",
    padding: 14,
  },
  {
    id: "tour-reports",
    title: "Reports",
    description: "A running record of how your business has performed. Use it in your weekly review so you're always working from facts, not feelings.",
    icon: "📝",
    shape: "circle",
    padding: 14,
  },
  {
    id: "tour-refer",
    title: "Refer a Friend",
    description: "Love the app? Share it with another couple who runs a business together. You both get a free month — because the best relationships are built on good referrals.",
    icon: "🎁",
    shape: "circle",
    padding: 14,
  },
  // ── Sleep mode ──
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
