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
  images: ImageHubImages;
  nodes: ImageHubNode[];
  layout?: "portrait" | "fullscreen";
  onToggleMode: () => void;
  registerRef?: (id: string, el: HTMLElement | null) => void;
  centerTourId?: string;
};

type Point = { x: number; y: number };
type PressState = { id: string; node?: ImageHubNode; center?: boolean; pointerId: number } | null;

const reduceMotionQuery = "(prefers-reduced-motion: reduce)";
const FALLBACK_COLORS = ["#F6C74D", "#32D7D2", "#F36A64", "#C084FC", "#34D7D2", "#F5C04C"];

export function orbitVelocityForMode(mode: HubMode): number {
  return mode === "sun" ? 0.055 : 0.018;
}

function triggerLightFeedback() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(8);
  }
}

function triggerCommitFeedback() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate([10, 42, 18]);
  }
}

/**
 * Full-screen kinetic hub used by both command and performance surfaces.
 * Orbital position is calculated from the original destination geometry, then
 * softly pulled toward the active pointer. A held bubble fills; release bursts
 * the bubble before the connected destination opens.
 */
export function ImageHub({
  label,
  mode,
  images,
  nodes,
  layout = "fullscreen",
  onToggleMode,
  registerRef,
  centerTourId,
}: ImageHubProps) {
  const [orbitMs, setOrbitMs] = useState(0);
  const [pointer, setPointer] = useState<Point | null>(null);
  const [pressing, setPressing] = useState<PressState>(null);
  const [bursting, setBursting] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const hubRef = useRef<HTMLElement | null>(null);
  const pressOriginRef = useRef<Point | null>(null);
  const cancelledPressRef = useRef(false);
  const pressStartedAtRef = useRef(0);
  const fillTimerRef = useRef<number | null>(null);
  const navigateTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia(reduceMotionQuery);
    const syncPreference = () => setReduceMotion(mediaQuery.matches);
    syncPreference();
    mediaQuery.addEventListener("change", syncPreference);
    return () => mediaQuery.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    let frameId = 0;
    let lastPaint = 0;
    const tick = (time: number) => {
      if (time - lastPaint > 42) {
        setOrbitMs(time);
        lastPaint = time;
      }
      frameId = window.requestAnimationFrame(tick);
    };
    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [reduceMotion]);

  useEffect(() => () => {
    if (fillTimerRef.current !== null) window.clearTimeout(fillTimerRef.current);
    if (navigateTimerRef.current !== null) window.clearTimeout(navigateTimerRef.current);
  }, []);

  const pointFromEvent = useCallback((event: PointerEvent<HTMLElement>): Point => {
    const rect = hubRef.current?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const orbitPosition = useCallback((node: ImageHubNode, index: number): Point => {
    const dx = node.x - 50;
    const dy = node.y - 50;
    const radius = Math.hypot(dx, dy);
    const startAngle = Math.atan2(dy, dx);
    const seconds = orbitMs / 1000;
    const velocity = orbitVelocityForMode(mode);
    const direction = index % 2 === 0 ? 1 : -1;
    const angle = reduceMotion ? startAngle : startAngle + seconds * velocity * direction;
    let x = 50 + Math.cos(angle) * radius;
    let y = 50 + Math.sin(angle) * radius;

    if (pointer && !reduceMotion) {
      const pointerDx = pointer.x - x;
      const pointerDy = pointer.y - y;
      const distance = Math.hypot(pointerDx, pointerDy);
      const pull = Math.max(0, Math.min(1, 1 - distance / 42));
      x += pointerDx * pull * 0.22;
      y += pointerDy * pull * 0.22;
    }

    return { x, y };
  }, [mode, orbitMs, pointer, reduceMotion]);

  const clearPointer = useCallback(() => {
    setPointer(null);
    pressOriginRef.current = null;
  }, []);

  const cancelPress = useCallback(() => {
    cancelledPressRef.current = true;
    if (fillTimerRef.current !== null) {
      window.clearTimeout(fillTimerRef.current);
      fillTimerRef.current = null;
    }
    setPressing(null);
    clearPointer();
  }, [clearPointer]);

  const handleHubMove = useCallback((event: PointerEvent<HTMLElement>) => {
    const nextPoint = pointFromEvent(event);
    setPointer(nextPoint);
    if (pressOriginRef.current && pressing) {
      const distance = Math.hypot(nextPoint.x - pressOriginRef.current.x, nextPoint.y - pressOriginRef.current.y);
      if (distance > 4.5) {
        cancelledPressRef.current = true;
        setPressing(null);
      }
    }
  }, [pointFromEvent, pressing]);

  const startNodePress = useCallback((event: PointerEvent<HTMLButtonElement>, node: ImageHubNode) => {
    if (bursting || pressing) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    cancelledPressRef.current = false;
    pressOriginRef.current = pointFromEvent(event);
    pressStartedAtRef.current = performance.now();
    setPointer(pressOriginRef.current);
    setPressing({ id: node.id, node, pointerId: event.pointerId });
    triggerLightFeedback();
  }, [bursting, pointFromEvent, pressing]);

  const finishNodePress = useCallback((event: PointerEvent<HTMLButtonElement>, node: ImageHubNode) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const shouldNavigate = pressing?.id === node.id && !cancelledPressRef.current;
    pressOriginRef.current = null;
    if (!shouldNavigate) return;

    const launchBurst = () => {
      fillTimerRef.current = null;
      if (cancelledPressRef.current) return;
      triggerCommitFeedback();
      setPressing(null);
      setBursting(node.id);
      navigateTimerRef.current = window.setTimeout(() => {
        node.onActivate();
        setBursting(null);
        navigateTimerRef.current = null;
      }, reduceMotion ? 0 : 430);
    };

    const minimumFillMs = reduceMotion ? 0 : 280;
    const remainingFillMs = Math.max(0, minimumFillMs - (performance.now() - pressStartedAtRef.current));
    fillTimerRef.current = window.setTimeout(launchBurst, remainingFillMs);
  }, [pressing, reduceMotion]);

  const startCenterPress = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setPressing({ id: "center", center: true, pointerId: event.pointerId });
    triggerLightFeedback();
  }, []);

  const finishCenterPress = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (!pressing?.center) return;
    setPressing(null);
    triggerCommitFeedback();
    onToggleMode();
  }, [onToggleMode, pressing]);

  const modeLabel = mode === "moon" ? "Off the Clock" : "Business Active";
  const coreImage = mode === "sun" ? images.sun : images.moon;

  return (
    <section
      ref={hubRef}
      className={`image-hub image-hub--${layout} image-hub--${mode}`}
      aria-label={`${label}. ${modeLabel}.`}
      onPointerMove={handleHubMove}
      onPointerLeave={clearPointer}
    >
      <div className="image-hub__field" aria-hidden="true" />
      <div className="image-hub__orbit image-hub__orbit--one" aria-hidden="true" />
      <div className="image-hub__orbit image-hub__orbit--two" aria-hidden="true" />

      {nodes.map((node, index) => {
        const position = orbitPosition(node, index);
        const color = node.color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
        const isPressing = pressing?.id === node.id;
        const isBursting = bursting === node.id;
        const nodeStyle = {
          left: `${position.x}%`,
          top: `${position.y}%`,
          "--node-color": color,
        } as CSSProperties;

        return (
          <button
            key={node.id}
            ref={node.tourId && registerRef ? (element) => registerRef(node.tourId!, element) : undefined}
            type="button"
            className={`image-hub__bubble ${isPressing ? "is-pressing" : ""} ${isBursting ? "is-bursting" : ""}`}
            style={nodeStyle}
            aria-label={node.ariaLabel ?? node.label}
            aria-busy={isBursting}
            onPointerDown={(event) => startNodePress(event, node)}
            onPointerUp={(event) => finishNodePress(event, node)}
            onPointerCancel={cancelPress}
            onClick={(event) => event.preventDefault()}
          >
            <span className="image-hub__bubble-glass" aria-hidden="true" />
            <span className="image-hub__bubble-fill" aria-hidden="true" />
            <span className="image-hub__bubble-ring" aria-hidden="true" />
            <span className="image-hub__bubble-icon" aria-hidden="true">{node.icon ?? "✦"}</span>
            <span className="image-hub__bubble-label">{node.label}</span>
          </button>
        );
      })}

      <button
        ref={centerTourId && registerRef ? (element) => registerRef(centerTourId, element) : undefined}
        type="button"
        className={`image-hub__core ${pressing?.center ? "is-pressing" : ""}`}
        aria-label={`Switch all hubs to ${mode === "sun" ? "Off the Clock moon mode" : "Business Active sun mode"}`}
        aria-pressed={mode === "moon"}
        onPointerDown={startCenterPress}
        onPointerUp={finishCenterPress}
        onPointerCancel={cancelPress}
        onClick={(event) => event.preventDefault()}
      >
        <span className="image-hub__core-halo" aria-hidden="true" />
        <img src={coreImage} alt="" aria-hidden="true" className="image-hub__core-image" />
        <span className="image-hub__core-fill" aria-hidden="true" />
        <span className="sr-only">{modeLabel}. Tap to switch modes.</span>
      </button>

      <p className="sr-only" aria-live="polite">{modeLabel}</p>
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
