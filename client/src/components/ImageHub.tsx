/**
 * ImageHub — uses the approved mockup images as the visual background,
 * with invisible circular tap targets precisely positioned over each circle.
 * Tapping the center gem toggles between sun (active) and moon (off the clock).
 * The image crossfades smoothly between states.
 */

import { useState, useRef, useCallback } from "react";

const SUN_IMAGE = "/manus-storage/hub-sun-crystal_3d902fbb.webp";
const MOON_IMAGE = "/manus-storage/hub-moon-crystal_88bf7983.webp";

// Circle positions as % of image dimensions (image is 9:16 ratio)
// x, y = center position as % of image width/height
// r = radius as % of image width
const CIRCLE_MAP = {
  tasks:           { x: 0.22, y: 0.25, r: 0.145 },
  updates:         { x: 0.62, y: 0.28, r: 0.115 },
  archive:         { x: 0.14, y: 0.52, r: 0.105 },
  issues:          { x: 0.78, y: 0.52, r: 0.105 },
  calendar:        { x: 0.22, y: 0.78, r: 0.115 },
  needs_attention: { x: 0.62, y: 0.78, r: 0.115 },
  center:          { x: 0.50, y: 0.52, r: 0.155 },
};

export interface ImageHubNode {
  key: keyof typeof CIRCLE_MAP;
  label: string;
  onClick: () => void;
  tourId?: string;
}

interface ImageHubProps {
  nodes: ImageHubNode[];
  isOffTheClock: boolean;
  onToggleOffTheClock: () => void;
  registerRef?: (id: string, el: HTMLElement | null) => void;
  centerTourId?: string;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
  color: string;
}

export function ImageHub({ nodes, isOffTheClock, onToggleOffTheClock, registerRef, centerTourId }: ImageHubProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleId = useRef(0);

  const triggerRipple = useCallback((x: number, y: number, color: string) => {
    const id = rippleId.current++;
    setRipples(prev => [...prev, { id, x, y, color }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);
  }, []);

  const handleNodeTap = useCallback((node: ImageHubNode, e: React.TouchEvent | React.MouseEvent) => {
    if (isOffTheClock) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : (e as React.MouseEvent).clientY;
      triggerRipple(clientX - rect.left, clientY - rect.top, "rgba(255,200,50,0.6)");
    }
    setTimeout(() => node.onClick(), 200);
  }, [isOffTheClock, triggerRipple]);

  const handleCenterTap = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : (e as React.MouseEvent).clientY;
      triggerRipple(clientX - rect.left, clientY - rect.top, isOffTheClock ? "rgba(200,220,255,0.6)" : "rgba(255,200,50,0.6)");
    }
    onToggleOffTheClock();
  }, [isOffTheClock, onToggleOffTheClock, triggerRipple]);

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{
        // 9:16 aspect ratio container
        aspectRatio: "9 / 16",
        maxHeight: "calc(100vh - 60px)",
        maxWidth: "calc((100vh - 60px) * 9 / 16)",
        margin: "0 auto",
        overflow: "hidden",
      }}
    >
      {/* Sun image (active mode) */}
      <img
        src={SUN_IMAGE}
        alt="Business Hub Active"
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          opacity: isOffTheClock ? 0 : 1,
          transition: "opacity 0.7s cubic-bezier(0.23,1,0.32,1)",
          userSelect: "none",
          WebkitUserSelect: "none",
          pointerEvents: "none",
        }}
        draggable={false}
      />
      {/* Moon image (off the clock mode) */}
      <img
        src={MOON_IMAGE}
        alt="Business Hub Off The Clock"
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          opacity: isOffTheClock ? 1 : 0,
          transition: "opacity 0.7s cubic-bezier(0.23,1,0.32,1)",
          userSelect: "none",
          WebkitUserSelect: "none",
          pointerEvents: "none",
        }}
        draggable={false}
      />

      {/* ── Invisible tap targets positioned over each circle ── */}
      {nodes.map((node) => {
        const pos = CIRCLE_MAP[node.key];
        if (!pos) return null;
        return (
          <button
            key={node.key}
            ref={node.tourId && registerRef ? (el) => registerRef(node.tourId!, el) : undefined}
            aria-label={node.label}
            onTouchStart={(e) => handleNodeTap(node, e)}
            onClick={(e) => handleNodeTap(node, e)}
            className="absolute rounded-full"
            style={{
              left: `${(pos.x - pos.r) * 100}%`,
              top: `${(pos.y - pos.r * (16/9)) * 100}%`,
              width: `${pos.r * 2 * 100}%`,
              height: `${pos.r * 2 * (9/16) * 100}%`,  // adjust for 9:16 ratio
              // Debug: uncomment to see tap zones
              // border: "2px solid rgba(255,0,0,0.5)",
              background: "transparent",
              cursor: isOffTheClock ? "default" : "pointer",
              WebkitTapHighlightColor: "transparent",
              zIndex: 10,
            }}
          />
        );
      })}

      {/* ── Center gem tap target ── */}
      <button
        ref={centerTourId && registerRef ? (el) => registerRef(centerTourId, el) : undefined}
        aria-label={isOffTheClock ? "Wake up — tap to go back to business mode" : "Off the Clock — tap to sleep"}
        onTouchStart={handleCenterTap}
        onClick={handleCenterTap}
        className="absolute rounded-full active:scale-[0.92]"
        style={{
          left: `${(CIRCLE_MAP.center.x - CIRCLE_MAP.center.r) * 100}%`,
          top: `${(CIRCLE_MAP.center.y - CIRCLE_MAP.center.r * (16/9)) * 100}%`,
          width: `${CIRCLE_MAP.center.r * 2 * 100}%`,
          height: `${CIRCLE_MAP.center.r * 2 * (9/16) * 100}%`,
          background: "transparent",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
          transition: "transform 0.16s cubic-bezier(0.23,1,0.32,1)",
          zIndex: 11,
        }}
      />

      {/* ── Ripple effects ── */}
      {ripples.map((r) => (
        <div
          key={r.id}
          className="absolute pointer-events-none rounded-full"
          style={{
            left: r.x - 30,
            top: r.y - 30,
            width: 60,
            height: 60,
            background: `radial-gradient(circle, ${r.color} 0%, transparent 70%)`,
            animation: "rippleExpand 0.6s ease-out forwards",
            zIndex: 20,
          }}
        />
      ))}
    </div>
  );
}
