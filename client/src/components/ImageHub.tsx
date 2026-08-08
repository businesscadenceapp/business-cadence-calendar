import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";

export type HubMode = "sun" | "moon";

export type ImageHubNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  onActivate: () => void;
  ariaLabel?: string;
  tourId?: string;
  icon?: string;
  color?: string;
};

export type ImageHubImages = {
  sun: string;
  moon: string;
};

type ImageHubProps = {
  label: string;
  mode: HubMode;
  images?: ImageHubImages;
  nodes: ImageHubNode[];
  layout?: "portrait" | "fullscreen";
  onToggleMode: () => void;
  registerRef?: (id: string, el: HTMLElement | null) => void;
  centerTourId?: string;
};

const FALLBACK_COLORS = ["#F6C74D", "#32D7D2", "#F6C74D", "#F36A64", "#32D7D2", "#C084FC"];
const MINIMUM_FILL_MS = 170;

function triggerLightFeedback() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(8);
  }
}

function triggerBurstFeedback() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate([10, 38, 16]);
  }
}

/**
 * Reference-aligned hub: both sun and moon preserve the same six fixed app
 * locations. Moon state visually shuts the apps down and gates navigation;
 * active app crystals fill and burst before opening their destination.
 */
export function ImageHub({
  label,
  mode,
  nodes,
  layout = "fullscreen",
  onToggleMode,
  registerRef,
  centerTourId,
}: ImageHubProps) {
  const [pressingId, setPressingId] = useState<string | null>(null);
  const [burstingId, setBurstingId] = useState<string | null>(null);
  const pressStartedAtRef = useRef(0);
  const fillTimerRef = useRef<number | null>(null);
  const navigateTimerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => () => {
    if (fillTimerRef.current !== null) window.clearTimeout(fillTimerRef.current);
    if (navigateTimerRef.current !== null) window.clearTimeout(navigateTimerRef.current);
  }, []);

  const clearPending = useCallback(() => {
    cancelledRef.current = true;
    if (fillTimerRef.current !== null) {
      window.clearTimeout(fillTimerRef.current);
      fillTimerRef.current = null;
    }
    setPressingId(null);
  }, []);

  const startNodePress = useCallback((event: PointerEvent<HTMLButtonElement>, nodeId: string) => {
    if (mode === "moon" || burstingId || pressingId) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    cancelledRef.current = false;
    pressStartedAtRef.current = performance.now();
    setPressingId(nodeId);
    triggerLightFeedback();
  }, [burstingId, mode, pressingId]);

  const finishNodePress = useCallback((event: PointerEvent<HTMLButtonElement>, node: ImageHubNode) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (mode === "moon" || pressingId !== node.id || cancelledRef.current) return;

    const launchBurst = () => {
      fillTimerRef.current = null;
      if (cancelledRef.current) return;
      setPressingId(null);
      setBurstingId(node.id);
      triggerBurstFeedback();
      navigateTimerRef.current = window.setTimeout(() => {
        node.onActivate();
        setBurstingId(null);
        navigateTimerRef.current = null;
      }, 410);
    };

    const remainingFillMs = Math.max(0, MINIMUM_FILL_MS - (performance.now() - pressStartedAtRef.current));
    fillTimerRef.current = window.setTimeout(launchBurst, remainingFillMs);
  }, [mode, pressingId]);

  const handleCenterTap = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    clearPending();
    triggerBurstFeedback();
    onToggleMode();
  }, [clearPending, onToggleMode]);

  const isShutdown = mode === "moon";
  const stateLabel = isShutdown ? "Off the Clock. Apps are shut down." : "Business Active. Apps are available.";

  return (
    <section className={`image-hub image-hub--${layout} image-hub--${mode} image-hub--fixed`} aria-label={`${label}. ${stateLabel}`}>
      <div className="image-hub__field" aria-hidden="true" />

      {nodes.map((node, index) => {
        const isPressing = pressingId === node.id;
        const isBursting = burstingId === node.id;
        const color = node.color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
        const nodeStyle = {
          left: `${node.x}%`,
          top: `${node.y}%`,
          "--node-color": color,
        } as CSSProperties;

        return (
          <button
            key={node.id}
            ref={node.tourId && registerRef ? (element) => registerRef(node.tourId!, element) : undefined}
            type="button"
            className={`image-hub__bubble ${isPressing ? "is-pressing" : ""} ${isBursting ? "is-bursting" : ""}`}
            style={nodeStyle}
            aria-label={isShutdown ? `${node.label} is unavailable while Off the Clock` : (node.ariaLabel ?? node.label)}
            aria-disabled={isShutdown}
            disabled={isShutdown}
            aria-busy={isBursting}
            onPointerDown={(event) => startNodePress(event, node.id)}
            onPointerUp={(event) => finishNodePress(event, node)}
            onPointerCancel={clearPending}
            onClick={(event) => event.preventDefault()}
          >
            <span className="image-hub__bubble-glass" aria-hidden="true" />
            <span className="image-hub__bubble-fill" aria-hidden="true" />
            <span className="image-hub__bubble-icon" aria-hidden="true">{node.icon ?? "✦"}</span>
            <span className="image-hub__bubble-label">{node.label}</span>
          </button>
        );
      })}

      <button
        ref={centerTourId && registerRef ? (element) => registerRef(centerTourId, element) : undefined}
        type="button"
        className="image-hub__core"
        aria-label={isShutdown ? "Turn business apps back on" : "Shut down all business apps for Off the Clock"}
        aria-pressed={isShutdown}
        onPointerUp={handleCenterTap}
        onPointerCancel={clearPending}
        onClick={(event) => event.preventDefault()}
      >
        <span className="image-hub__core-facet" aria-hidden="true" />
        <span className="sr-only">{stateLabel}</span>
      </button>

      <p className="sr-only" aria-live="polite">{stateLabel}</p>
    </section>
  );
}

export const COMMAND_HUB_DESTINATIONS = [
  "tasks",
  "updates",
  "issues",
  "needs_attention",
  "calendar",
  "archive",
] as const;

export const PERFORMANCE_HUB_DESTINATIONS = [
  "/app/goals",
  "/app/messages",
  "/app/kpi",
  "/app/reports",
  "refer",
  "/app/settings",
] as const;

export function modeFromDndState(dndActive: boolean): HubMode {
  return dndActive ? "moon" : "sun";
}

export function hubIsInteractive(mode: HubMode): boolean {
  return mode === "sun";
}
