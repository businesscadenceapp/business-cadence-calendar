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
  // ── Step 1: Welcome ──
  {
    id: "tour-hub-center",
    title: "Welcome to BusinessCadence",
    description: "Your business runs on rhythm. Two hubs, one mission — keep the business in the boardroom and out of your relationship. Let's take a quick tour.",
    icon: "🎵",
    shape: "circle",
    padding: 16,
  },
  // ── Steps 2–3: Calendar first ──
  {
    id: "tour-hub-calendar",
    title: "Your Year at a Glance",
    description: "This is what a structured business looks like. Every dot is a scheduled meeting — daily huddles, weekly reviews, monthly check-ins, quarterly offsites. Tap to see your full calendar.",
    icon: "📅",
    shape: "circle",
    padding: 14,
  },
  {
    id: "tour-hub-calendar",
    title: "Color-Coded Cadence",
    description: "Each color is a different meeting type. Purple = Daily Huddle. Teal = Weekly Review. Green = Monthly Financial. Red = Quarterly Offsite. You'll build this automatically when you set your schedule.",
    icon: "🎨",
    shape: "circle",
    padding: 14,
  },
  // ── Step 4: Command Center intro ──
  {
    id: "tour-hub-center",
    title: "Command Center",
    description: "Now let's meet the engine behind that calendar. Every circle is a category — tap one to dive in. Here's what each one does.",
    icon: "⚡",
    shape: "circle",
    padding: 16,
  },
  // ── Steps 5–11: Command Center circles ──
  {
    id: "tour-hub-tasks",
    title: "Tasks ✅",
    description: "Assign tasks to yourself or your partner. When it's done, mark it complete — your partner gets notified. No more 'did you do that thing?' at dinner.",
    icon: "☑️",
    shape: "circle",
    padding: 14,
  },
  {
    id: "tour-hub-updates",
    title: "Updates 📣",
    description: "Share wins, progress, and important news with your partner. Good news travels fast — and so does the stuff they need to know before the next meeting.",
    icon: "✅",
    shape: "circle",
    padding: 14,
  },
  {
    id: "tour-hub-issues",
    title: "Issues 🔥",
    description: "Log problems as they come up. Flag them as high priority when they need immediate attention. Issues stay in the app — not in the car ride home.",
    icon: "🔥",
    shape: "circle",
    padding: 14,
  },
  {
    id: "tour-hub-needs-attention",
    title: "Needs Attention ❗",
    description: "A combined view of open tasks and unresolved issues. Your quick-glance list of what needs action from either of you — right now. Red means act now.",
    icon: "❗",
    shape: "circle",
    padding: 14,
  },
  {
    id: "tour-hub-archive",
    title: "Archive 📂",
    description: "Completed tasks and resolved issues move here automatically. Your record of everything you've handled together — proof that the system works.",
    icon: "📂",
    shape: "circle",
    padding: 14,
  },
  // ── Step 12: Swipe hint ──
  {
    id: "tour-hub-swipe",
    title: "Swipe Left → Performance Hub",
    description: "Swipe left to unlock your Performance Hub — Goals, KPIs, Reports, and more. Two hubs, one screen. Your whole business at your fingertips.",
    icon: "👈",
    shape: "rect",
    padding: 12,
  },
  // ── Step 13: Performance Hub intro ──
  {
    id: "tour-perf-center",
    title: "Performance Hub",
    description: "This is where you track how the business is actually doing. Goals, KPIs, reports, and communication — all in one place.",
    icon: "📈",
    shape: "circle",
    padding: 16,
  },
  // ── Steps 14–19: Performance Hub circles ──
  {
    id: "tour-goals",
    title: "Goals 🎯",
    description: "Set targets you both own. Track progress together. When you're aligned on what winning looks like, everything else gets easier — including the relationship.",
    icon: "🎯",
    shape: "circle",
    padding: 14,
  },
  {
    id: "tour-kpis",
    title: "KPIs 📊",
    description: "The numbers that tell you if the business is healthy. Revenue, bookings, retention — whatever matters most. Track it here together so you're always working from facts.",
    icon: "📊",
    shape: "circle",
    padding: 14,
  },
  {
    id: "tour-reports",
    title: "Reports 📝",
    description: "Weekly snapshots of how the business performed. One owner fills it in, both see it. Use it in your weekly review so you're never working from memory.",
    icon: "📝",
    shape: "circle",
    padding: 14,
  },
  {
    id: "tour-inbox",
    title: "Co-Owner Inbox 💬",
    description: "Async communication between you and your partner. Business messages stay in the app — not in your personal texts, not at the dinner table.",
    icon: "💬",
    shape: "circle",
    padding: 14,
  },
  {
    id: "tour-settings",
    title: "Settings ⚙️",
    description: "Customize your meeting schedule, business profile, and notification preferences. Set it once, and the calendar builds itself.",
    icon: "⚙️",
    shape: "circle",
    padding: 14,
  },
  {
    id: "tour-refer",
    title: "Refer a Friend 🎁",
    description: "Love the app? Share it with another couple who runs a business together. You both get a free month — because great systems are worth sharing.",
    icon: "🎁",
    shape: "circle",
    padding: 14,
  },
  // ── Step 20: Closing ──
  {
    id: "tour-hub",
    title: "You're Ready 🎉",
    description: "Your business now has a heartbeat. Structured meetings, shared goals, and a clear cadence — so the business stays in the boardroom and your relationship stays yours.",
    icon: "🎵",
    shape: "rect",
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
