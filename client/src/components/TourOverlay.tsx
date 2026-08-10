/**
 * TourOverlay renders exactly one coach-mark step from TourContext.
 * The informational copy may scroll on compact phones, while the action row
 * stays in the same flex column and remains available above the safe area.
 */
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { TOUR_STEPS, useTour } from "@/contexts/TourContext";
import { getTourCardLayout } from "@/lib/tour-placement";

interface SpotlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

function getSpotlightRect(
  element: HTMLElement | null,
  shape: "circle" | "rect",
  padding: number,
): SpotlightRect | null {
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  const width = rect.width + padding * 2;
  const height = rect.height + padding * 2;

  if (shape === "circle") {
    const size = Math.max(width, height);
    return {
      x: rect.left + rect.width / 2 - size / 2,
      y: rect.top + rect.height / 2 - size / 2,
      width: size,
      height: size,
      radius: size / 2,
    };
  }

  return {
    x: rect.left - padding,
    y: rect.top - padding,
    width,
    height,
    radius: 14,
  };
}

export default function TourOverlay() {
  const { active, stepIndex, currentStep, next, skip, getRef } = useTour();
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const advanceLockedRef = useRef(false);
  const maskId = useId().replace(/:/g, "");

  const measureSpotlight = useCallback(() => {
    if (!currentStep) {
      setSpotlight(null);
      return;
    }

    setSpotlight(
      getSpotlightRect(
        getRef(currentStep.id),
        currentStep.shape,
        currentStep.padding ?? 12,
      ),
    );
  }, [currentStep, getRef]);

  useLayoutEffect(() => {
    if (!active || !currentStep) {
      setSpotlight(null);
      return;
    }

    const frameId = requestAnimationFrame(measureSpotlight);
    return () => cancelAnimationFrame(frameId);
  }, [active, currentStep, stepIndex, measureSpotlight]);

  useEffect(() => {
    if (!active) return;

    const updateSpotlight = () => requestAnimationFrame(measureSpotlight);
    window.addEventListener("resize", updateSpotlight, { passive: true });
    window.addEventListener("orientationchange", updateSpotlight, { passive: true });
    window.addEventListener("scroll", updateSpotlight, { capture: true, passive: true });

    return () => {
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("orientationchange", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight, true);
    };
  }, [active, measureSpotlight]);

  useEffect(() => {
    advanceLockedRef.current = false;
  }, [stepIndex]);

  const handleContinue = useCallback(() => {
    // A fast double-tap must never advance two tour steps.
    if (advanceLockedRef.current) return;
    advanceLockedRef.current = true;
    next();
  }, [next]);

  if (!active || !currentStep) return null;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const fallbackSpotlight: SpotlightRect = {
    x: viewportWidth / 2 - 42,
    y: viewportHeight / 2 - 42,
    width: 84,
    height: 84,
    radius: 42,
  };
  const currentSpotlight = spotlight ?? fallbackSpotlight;
  const totalSteps = TOUR_STEPS.length;
  const isLastStep = stepIndex === totalSteps - 1;
  const cardLayout = getTourCardLayout(currentSpotlight, viewportHeight, currentStep.id);
  const cardAnchorStyle = cardLayout.placement === "below"
    ? { top: cardLayout.anchorOffset }
    : { bottom: cardLayout.anchorOffset };

  return (
    <div
      className="fixed inset-0 z-[9999]"
      style={{ isolation: "isolate", pointerEvents: "auto" }}
      role="dialog"
      aria-modal="true"
      aria-label={`App tour step ${stepIndex + 1} of ${totalSteps}: ${currentStep.title}`}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        style={{ pointerEvents: "none" }}
        aria-hidden="true"
      >
        <defs>
          <mask id={maskId}>
            <rect width={viewportWidth} height={viewportHeight} fill="white" />
            <rect
              x={currentSpotlight.x}
              y={currentSpotlight.y}
              width={currentSpotlight.width}
              height={currentSpotlight.height}
              rx={currentSpotlight.radius}
              ry={currentSpotlight.radius}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width={viewportWidth}
          height={viewportHeight}
          fill="rgba(2, 10, 22, 0.80)"
          mask={`url(#${maskId})`}
        />
      </svg>

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: currentSpotlight.x - 3,
          top: currentSpotlight.y - 3,
          width: currentSpotlight.width + 6,
          height: currentSpotlight.height + 6,
          borderRadius: currentSpotlight.radius + 3,
          border: "2px solid rgba(51, 162, 219, 0.8)",
          boxShadow: "0 0 0 4px rgba(51,162,219,0.16), 0 0 28px rgba(51,162,219,0.38)",
          pointerEvents: "none",
        }}
      />

      <section
        data-testid="tour-step-wrapper"
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          width: "calc(100vw - 32px)",
          maxWidth: 420,
          maxHeight: cardLayout.maxHeight,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid rgba(84, 190, 239, 0.35)",
          borderRadius: 20,
          backgroundColor: "#0F2440",
          boxShadow: "0 12px 42px rgba(0,0,0,0.56)",
          zIndex: 90,
          pointerEvents: "auto",
          ...cardAnchorStyle,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 16px 10px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              color: "#8CD8FB",
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.04em",
            }}
          >
            Step {stepIndex + 1} of {totalSteps}
          </span>
          <button
            type="button"
            onClick={skip}
            style={{
              padding: "6px 8px",
              border: 0,
              borderRadius: 8,
              background: "transparent",
              color: "rgba(255,255,255,0.68)",
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              touchAction: "manipulation",
            }}
          >
            Skip tour
          </button>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            flex: "1 1 auto",
            minHeight: 0,
            overflowY: "auto",
            overscrollBehavior: "contain",
            padding: "16px 16px 12px",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <span
              aria-hidden="true"
              style={{
                display: "grid",
                width: 42,
                height: 42,
                flexShrink: 0,
                placeItems: "center",
                border: "1px solid rgba(51,162,219,0.38)",
                borderRadius: 12,
                background: "rgba(51,162,219,0.14)",
                fontSize: 21,
              }}
            >
              {currentStep.icon}
            </span>
            <div style={{ minWidth: 0 }}>
              <h2
                style={{
                  margin: 0,
                  color: "#FFFFFF",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 18,
                  fontWeight: 800,
                  lineHeight: 1.2,
                }}
              >
                {currentStep.title}
              </h2>
              <p
                style={{
                  margin: "8px 0 0",
                  color: "rgba(255,255,255,0.76)",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14,
                  lineHeight: 1.52,
                }}
              >
                {currentStep.description}
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: "12px 16px 16px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        >
          <button
            data-testid="tour-continue-button"
            type="button"
            onClick={handleContinue}
            style={{
              width: "100%",
              minHeight: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px 18px",
              border: 0,
              borderRadius: 14,
              background: "linear-gradient(135deg, #33A2DB, #65D5FF)",
              boxShadow: "0 5px 18px rgba(51,162,219,0.34)",
              color: "#0B1F37",
              cursor: "pointer",
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 15,
              fontWeight: 800,
              touchAction: "manipulation",
              zIndex: 100,
              pointerEvents: "auto",
            }}
          >
            {isLastStep ? "Finish tour" : "Continue"}
          </button>
        </div>
      </section>
    </div>
  );
}
