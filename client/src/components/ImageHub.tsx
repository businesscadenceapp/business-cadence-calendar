import { useCallback, useEffect, useState, type CSSProperties, type PointerEvent } from "react";

export type HubMode = "sun" | "moon";

export type ImageHubNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  onActivate: () => void;
  ariaLabel?: string;
  tourId?: string;
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
  layout?: "square" | "portrait";
  onToggleMode: () => void;
  registerRef?: (id: string, el: HTMLElement | null) => void;
  centerTourId?: string;
};

const reduceMotionQuery = "(prefers-reduced-motion: reduce)";

function triggerLightFeedback() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(7);
  }
}

/**
 * A premium image-backed radial hub. The background art supplies the visual
 * language; transparent buttons preserve native-feeling navigation, keyboard
 * access, and reliable touch targets on iPhone and Android.
 */
export function ImageHub({
  label,
  mode,
  images,
  nodes,
  layout = "square",
  onToggleMode,
  registerRef,
  centerTourId,
}: ImageHubProps) {
  const [magnet, setMagnet] = useState({ x: 0, y: 0 });
  const [rippleNode, setRippleNode] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(reduceMotionQuery);
    const syncPreference = () => setReduceMotion(mediaQuery.matches);
    syncPreference();
    mediaQuery.addEventListener("change", syncPreference);
    return () => mediaQuery.removeEventListener("change", syncPreference);
  }, []);

  const resetMagnet = useCallback(() => setMagnet({ x: 0, y: 0 }), []);

  const handlePointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    if (reduceMotion || event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 6;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 6;
    setMagnet({ x: Math.max(-3, Math.min(3, x)), y: Math.max(-3, Math.min(3, y)) });
  }, [reduceMotion]);

  const startRipple = useCallback((nodeId: string) => {
    triggerLightFeedback();
    if (reduceMotion) return;
    setRippleNode(nodeId);
    window.setTimeout(() => setRippleNode(current => current === nodeId ? null : current), 420);
  }, [reduceMotion]);

  const modeLabel = mode === "moon" ? "Off the Clock" : "Business Active";

  return (
    <section
      className={`image-hub image-hub--${layout}`}
      aria-label={`${label}. ${modeLabel}.`}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetMagnet}
    >
      <img
        src={images.sun}
        alt=""
        aria-hidden="true"
        className={`image-hub__background ${mode === "sun" ? "image-hub__background--active" : ""}`}
      />
      <img
        src={images.moon}
        alt=""
        aria-hidden="true"
        className={`image-hub__background ${mode === "moon" ? "image-hub__background--active" : ""}`}
      />

      {nodes.map((node) => {
        const nodeStyle = {
          "--magnet-x": `${magnet.x}px`,
          "--magnet-y": `${magnet.y}px`,
        } as CSSProperties;

        return (
          <div
            key={node.id}
            className="image-hub__target-position"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <button
              ref={node.tourId && registerRef ? (element) => registerRef(node.tourId!, element) : undefined}
              type="button"
              className="image-hub__node-hit"
              style={nodeStyle}
              aria-label={node.ariaLabel ?? node.label}
              onPointerDown={() => startRipple(node.id)}
              onClick={node.onActivate}
            >
              <span className="sr-only">{node.label}</span>
              {rippleNode === node.id && <span className="image-hub__ripple" aria-hidden="true" />}
            </button>
          </div>
        );
      })}

      <button
        ref={centerTourId && registerRef ? (element) => registerRef(centerTourId, element) : undefined}
        type="button"
        className="image-hub__center-hit"
        aria-label={`Switch all hubs to ${mode === "sun" ? "Off the Clock moon mode" : "Business Active sun mode"}`}
        aria-pressed={mode === "moon"}
        onPointerDown={() => triggerLightFeedback()}
        onClick={onToggleMode}
      >
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
