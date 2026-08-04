/**
 * TourOverlay — renders the dark overlay with a spotlight cutout and coach mark.
 *
 * Design: full-screen dark scrim with an SVG mask that punches out the
 * highlighted element. A floating tooltip/coach mark appears BELOW (or above
 * when near the bottom) the spotlight with a directional arrow so the user
 * can clearly see both the explanation and the highlighted element.
 */
import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { useTour, TOUR_STEPS } from "@/contexts/TourContext";

interface SpotlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

function getSpotlightRect(
  el: HTMLElement | null,
  shape: "circle" | "rect",
  padding: number
): SpotlightRect | null {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  // Sanity check — element must be visible on screen
  if (rect.width === 0 || rect.height === 0) return null;
  const p = padding;
  const x = rect.left - p;
  const y = rect.top - p;
  const w = rect.width + p * 2;
  const h = rect.height + p * 2;

  if (shape === "circle") {
    const size = Math.max(w, h);
    const cx = rect.left + rect.width / 2 - size / 2;
    const cy = rect.top + rect.height / 2 - size / 2;
    return { x: cx, y: cy, width: size, height: size, radius: size / 2 };
  }
  return { x, y, width: w, height: h, radius: 12 };
}

/** Determines whether the coach mark should appear above or below the spotlight */
function getCoachMarkPosition(spot: SpotlightRect, vh: number): "above" | "below" {
  const spaceBelow = vh - (spot.y + spot.height);
  const spaceAbove = spot.y;
  // Prefer below unless there isn't enough room (need ~240px for the card)
  return spaceBelow >= 240 ? "below" : spaceAbove >= 240 ? "above" : "below";
}

/** Center X of spotlight, clamped so coach mark stays on screen */
function getCoachMarkLeft(spot: SpotlightRect, vw: number, cardWidth: number): number {
  const center = spot.x + spot.width / 2;
  const half = cardWidth / 2;
  return Math.max(16, Math.min(vw - cardWidth - 16, center - half));
}

export default function TourOverlay() {
  const { active, stepIndex, currentStep, next, skip, getRef } = useTour();
  const [spot, setSpot] = useState<SpotlightRect | null>(null);
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const rafRef = useRef<number | null>(null);
  const prevStepRef = useRef<number>(-1);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const measure = useCallback(() => {
    if (!currentStep) return false;
    const el = getRef(currentStep.id);
    const newSpot = getSpotlightRect(el, currentStep.shape, currentStep.padding ?? 10);
    if (newSpot) {
      setSpot(newSpot);
      return true;
    }
    return false;
  }, [currentStep, getRef]);

  // Measure on step change with retries to handle elements that render late
  useLayoutEffect(() => {
    if (!active || !currentStep) {
      setVisible(false);
      return;
    }

    if (prevStepRef.current !== stepIndex) {
      setAnimating(true);
      if (retryRef.current) clearTimeout(retryRef.current);

      const delay = prevStepRef.current === -1 ? 500 : 300;
      const attempt = (retriesLeft: number) => {
        retryRef.current = setTimeout(() => {
          const ok = measure();
          if (!ok && retriesLeft > 0) {
            attempt(retriesLeft - 1);
          } else {
            setAnimating(false);
            setVisible(true);
            prevStepRef.current = stepIndex;
          }
        }, delay);
      };
      attempt(4); // up to 4 retries × delay ms each
      return () => {
        if (retryRef.current) clearTimeout(retryRef.current);
      };
    }
  }, [active, currentStep, stepIndex, measure]);

  // Re-measure on resize / scroll
  useEffect(() => {
    if (!active) return;
    const onResize = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => measure());
    };
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("scroll", onResize, { passive: true, capture: true });
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, measure]);

  // Initial measurement when tour becomes active
  useEffect(() => {
    if (active && currentStep) {
      prevStepRef.current = -1;
      const attempt = (retriesLeft: number) => {
        retryRef.current = setTimeout(() => {
          const ok = measure();
          if (!ok && retriesLeft > 0) {
            attempt(retriesLeft - 1);
          } else {
            setVisible(true);
            prevStepRef.current = 0;
          }
        }, 400);
      };
      attempt(4);
      return () => {
        if (retryRef.current) clearTimeout(retryRef.current);
      };
    }
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!active || !currentStep) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Use fallback centered rect if element not found yet
  const s: SpotlightRect = spot ?? {
    x: vw / 2 - 40,
    y: vh / 2 - 40,
    width: 80,
    height: 80,
    radius: 40,
  };

  const clipId = "tour-spotlight-clip";
  const coachPos = getCoachMarkPosition(s, vh);
  const cardWidth = Math.min(320, vw - 32);
  const cardLeft = getCoachMarkLeft(s, vw, cardWidth);

  // Arrow points from card toward the spotlight
  const arrowUp = coachPos === "below";   // card is below → arrow points up
  const arrowDown = coachPos === "above"; // card is above → arrow points down

  // Spotlight center X relative to card left — for arrow alignment
  const spotCenterX = s.x + s.width / 2;
  const arrowOffset = Math.max(20, Math.min(cardWidth - 20, spotCenterX - cardLeft));

  const totalSteps = TOUR_STEPS.length;
  const isLast = stepIndex === totalSteps - 1;

  // Coach mark vertical positioning
  const coachStyle: React.CSSProperties = {
    position: "absolute",
    left: cardLeft,
    width: cardWidth,
    backgroundColor: "#0F2440",
    border: "1.5px solid rgba(94,234,212,0.3)",
    borderRadius: "20px",
    padding: "20px",
    boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(94,234,212,0.08)",
    transition: "all 300ms cubic-bezier(0.23, 1, 0.32, 1)",
    zIndex: 1,
  };

  if (coachPos === "below") {
    coachStyle.top = s.y + s.height + 20;
  } else {
    coachStyle.bottom = vh - s.y + 20;
  }

  return (
    <div
      className="fixed inset-0 z-[9999]"
      style={{
        opacity: visible && !animating ? 1 : 0,
        transition: "opacity 300ms cubic-bezier(0.23, 1, 0.32, 1)",
        pointerEvents: visible ? "auto" : "none",
      }}
      aria-modal="true"
      role="dialog"
      aria-label={`App tour step ${stepIndex + 1} of ${totalSteps}: ${currentStep.title}`}
    >
      {/* Dark overlay with spotlight cutout via SVG mask */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: "none" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask id={clipId}>
            <rect x="0" y="0" width={vw} height={vh} fill="white" />
            <rect
              x={s.x}
              y={s.y}
              width={s.width}
              height={s.height}
              rx={s.radius}
              ry={s.radius}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width={vw}
          height={vh}
          fill="rgba(0,0,0,0.78)"
          mask={`url(#${clipId})`}
        />
      </svg>

      {/* Spotlight ring glow */}
      <div
        style={{
          position: "absolute",
          left: s.x - 3,
          top: s.y - 3,
          width: s.width + 6,
          height: s.height + 6,
          borderRadius: s.radius + 3,
          border: "2px solid rgba(94,234,212,0.7)",
          boxShadow: "0 0 0 4px rgba(94,234,212,0.15), 0 0 24px rgba(94,234,212,0.3)",
          pointerEvents: "none",
          transition: "all 300ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      />

      {/* Tap-through zone on spotlight — passes clicks to the element underneath */}
      <div
        style={{
          position: "absolute",
          left: s.x,
          top: s.y,
          width: s.width,
          height: s.height,
          borderRadius: s.radius,
          cursor: "pointer",
          pointerEvents: "none", // let clicks fall through to the real element
        }}
        aria-label="Tap to interact with highlighted element"
      />

      {/* Coach mark card */}
      <div style={coachStyle}>
        {/* Arrow pointing toward spotlight */}
        {arrowUp && (
          <div
            style={{
              position: "absolute",
              top: -10,
              left: arrowOffset - 10,
              width: 0,
              height: 0,
              borderLeft: "10px solid transparent",
              borderRight: "10px solid transparent",
              borderBottom: "10px solid rgba(94,234,212,0.3)",
            }}
          />
        )}
        {arrowUp && (
          <div
            style={{
              position: "absolute",
              top: -8,
              left: arrowOffset - 9,
              width: 0,
              height: 0,
              borderLeft: "9px solid transparent",
              borderRight: "9px solid transparent",
              borderBottom: "9px solid #0F2440",
            }}
          />
        )}
        {arrowDown && (
          <div
            style={{
              position: "absolute",
              bottom: -10,
              left: arrowOffset - 10,
              width: 0,
              height: 0,
              borderLeft: "10px solid transparent",
              borderRight: "10px solid transparent",
              borderTop: "10px solid rgba(94,234,212,0.3)",
            }}
          />
        )}
        {arrowDown && (
          <div
            style={{
              position: "absolute",
              bottom: -8,
              left: arrowOffset - 9,
              width: 0,
              height: 0,
              borderLeft: "9px solid transparent",
              borderRight: "9px solid transparent",
              borderTop: "9px solid #0F2440",
            }}
          />
        )}

        {/* Step counter + Skip */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === stepIndex ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i === stepIndex ? "#5EEAD4" : "rgba(255,255,255,0.2)",
                  transition: "all 300ms cubic-bezier(0.23, 1, 0.32, 1)",
                }}
              />
            ))}
          </div>
          <button
            onClick={skip}
            style={{
              fontSize: "11px",
              color: "rgba(255,255,255,0.35)",
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              letterSpacing: "0.02em",
              padding: "4px 8px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.1)",
              backgroundColor: "transparent",
              cursor: "pointer",
              transition: "all 150ms ease-out",
            }}
          >
            Skip tour
          </button>
        </div>

        {/* Icon + Title */}
        <div className="flex items-center gap-3 mb-2">
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "12px",
              background: "linear-gradient(135deg, rgba(94,234,212,0.2) 0%, rgba(94,234,212,0.08) 100%)",
              border: "1px solid rgba(94,234,212,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              flexShrink: 0,
              boxShadow: "0 0 12px rgba(94,234,212,0.12)",
            }}
          >
            {currentStep.icon}
          </div>
          <h3
            style={{
              fontSize: "17px",
              fontWeight: 800,
              color: "white",
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            {currentStep.title}
          </h3>
        </div>

        {/* Description */}
        <p
          style={{
            fontSize: "13px",
            color: "rgba(255,255,255,0.65)",
            lineHeight: 1.55,
            marginBottom: "18px",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {currentStep.description}
        </p>

        {/* Got it button */}
        <button
          onClick={next}
          style={{
            width: "100%",
            padding: "12px 20px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #5EEAD4, #38BDF8)",
            color: "#0F2440",
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 800,
            fontSize: "14px",
            letterSpacing: "0.01em",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            transition: "transform 160ms cubic-bezier(0.23, 1, 0.32, 1), box-shadow 160ms ease-out",
            boxShadow: "0 4px 16px rgba(94,234,212,0.3)",
          }}
          onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)"; }}
          onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
          onTouchStart={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)"; }}
          onTouchEnd={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
        >
          {isLast ? "Let's go! 🚀" : "Got it →"}
        </button>
      </div>
    </div>
  );
}
