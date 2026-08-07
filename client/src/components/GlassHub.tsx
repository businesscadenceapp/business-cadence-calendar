/**
 * GlassHub — Premium interactive hub with liquid glass circles,
 * sun/moon center toggle, and magnetic pull effect.
 *
 * Design reference: frosted glass bubbles with neon glow rings,
 * golden sun center (active) / silver moon center (off the clock).
 */

import { useState, useRef, useCallback, useEffect } from "react";

/* ── Types ── */
export interface GlassNodeData {
  key: string;
  label: string;
  icon: string;
  /** Neon glow color (hex or rgba) */
  glowColor: string;
  /** Border/ring color */
  ringColor: string;
  /** Text label color */
  textColor: string;
  /** Badge count (-1 = hide) */
  count: number;
  /** Angle in degrees (0 = top, clockwise) */
  angle: number;
  onClick: () => void;
  tourId?: string;
}

interface GlassHubProps {
  nodes: GlassNodeData[];
  isOffTheClock: boolean;
  onToggleOffTheClock: () => void;
  registerRef?: (id: string, el: HTMLElement | null) => void;
  centerTourId?: string;
}

/* ── Constants ── */
const HUB_SIZE = 340;
const CENTER_SIZE = 96;
const NODE_SIZE = 76;
const ORBIT_RADIUS = 118;
const MAGNETIC_STRENGTH = 8; // px max displacement

/* ── Ripple Particle ── */
interface Particle {
  id: number;
  x: number;
  y: number;
  angle: number;
  color: string;
}

/* ── Component ── */
export function GlassHub({ nodes, isOffTheClock, onToggleOffTheClock, registerRef, centerTourId }: GlassHubProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [liquidFillNode, setLiquidFillNode] = useState<string | null>(null);
  const particleId = useRef(0);

  /* ── Pointer tracking for magnetic pull ── */
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPointer({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const handlePointerLeave = useCallback(() => {
    setPointer(null);
  }, []);

  /* ── Ripple burst on tap ── */
  const triggerRipple = useCallback((cx: number, cy: number, color: string) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 8; i++) {
      newParticles.push({
        id: particleId.current++,
        x: cx,
        y: cy,
        angle: (i * 45) * (Math.PI / 180),
        color,
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.includes(p)));
    }, 600);
  }, []);

  /* ── Node click handler with liquid fill + ripple ── */
  const handleNodeClick = useCallback((node: GlassNodeData, cx: number, cy: number) => {
    if (isOffTheClock) return; // Disabled in moon mode
    setLiquidFillNode(node.key);
    triggerRipple(cx, cy, node.glowColor);
    setTimeout(() => {
      setLiquidFillNode(null);
      node.onClick();
    }, 280);
  }, [isOffTheClock, triggerRipple]);

  /* ── Calculate magnetic displacement ── */
  const getMagneticOffset = useCallback((nodeCx: number, nodeCy: number) => {
    if (!pointer || isOffTheClock) return { dx: 0, dy: 0 };
    const dist = Math.sqrt((pointer.x - nodeCx) ** 2 + (pointer.y - nodeCy) ** 2);
    const maxDist = 120;
    if (dist > maxDist || dist < 5) return { dx: 0, dy: 0 };
    const strength = (1 - dist / maxDist) * MAGNETIC_STRENGTH;
    const angle = Math.atan2(pointer.y - nodeCy, pointer.x - nodeCx);
    return {
      dx: Math.cos(angle) * strength,
      dy: Math.sin(angle) * strength,
    };
  }, [pointer, isOffTheClock]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center"
      style={{ width: HUB_SIZE, height: HUB_SIZE, margin: "0 auto" }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* ── Connector lines (SVG) ── */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        viewBox={`0 0 ${HUB_SIZE} ${HUB_SIZE}`}
      >
        {nodes.map((node, i) => {
          const rad = ((node.angle - 90) * Math.PI) / 180;
          const cx = HUB_SIZE / 2 + ORBIT_RADIUS * Math.cos(rad);
          const cy = HUB_SIZE / 2 + ORBIT_RADIUS * Math.sin(rad);
          return (
            <line
              key={node.key}
              x1={HUB_SIZE / 2}
              y1={HUB_SIZE / 2}
              x2={cx}
              y2={cy}
              stroke={isOffTheClock ? "rgba(255,255,255,0.08)" : node.glowColor.replace(/[\d.]+\)$/, "0.25)")}
              strokeWidth="1.5"
              strokeDasharray="4 4"
              style={{
                transition: "stroke 0.6s ease",
                filter: isOffTheClock ? "none" : `drop-shadow(0 0 3px ${node.glowColor})`,
              }}
            />
          );
        })}
      </svg>

      {/* ── Center Sun/Moon Toggle ── */}
      <button
        ref={centerTourId && registerRef ? (el) => registerRef(centerTourId, el) : undefined}
        onClick={onToggleOffTheClock}
        className="absolute z-10 flex items-center justify-center transition-all active:scale-[0.92]"
        style={{
          width: CENTER_SIZE,
          height: CENTER_SIZE,
          borderRadius: "50%",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          background: isOffTheClock
            ? "radial-gradient(circle, rgba(200,210,230,0.15) 0%, rgba(100,120,150,0.05) 100%)"
            : "radial-gradient(circle, rgba(255,200,50,0.3) 0%, rgba(255,150,0,0.08) 100%)",
          border: isOffTheClock
            ? "2px solid rgba(200,210,230,0.35)"
            : "2px solid rgba(255,180,50,0.6)",
          boxShadow: isOffTheClock
            ? "0 0 30px rgba(200,210,230,0.15), inset 0 0 20px rgba(200,210,230,0.08)"
            : "0 0 40px rgba(255,180,50,0.35), 0 0 80px rgba(255,150,0,0.15), inset 0 0 20px rgba(255,200,50,0.12)",
          transition: "all 0.6s cubic-bezier(0.23,1,0.32,1)",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {/* Sun icon */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: isOffTheClock ? 0 : 1,
            transform: isOffTheClock ? "scale(0.5) rotate(-90deg)" : "scale(1) rotate(0deg)",
            transition: "all 0.6s cubic-bezier(0.23,1,0.32,1)",
          }}
        >
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            {/* Sun rays */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
              const rad = (angle * Math.PI) / 180;
              const x1 = 26 + 14 * Math.cos(rad);
              const y1 = 26 + 14 * Math.sin(rad);
              const x2 = 26 + 22 * Math.cos(rad);
              const y2 = 26 + 22 * Math.sin(rad);
              return (
                <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
              );
            })}
            {/* Sun body */}
            <circle cx="26" cy="26" r="12" fill="url(#sunGrad)" />
            <defs>
              <radialGradient id="sunGrad" cx="0.4" cy="0.35" r="0.7">
                <stop offset="0%" stopColor="#FFF3B0" />
                <stop offset="40%" stopColor="#FFD700" />
                <stop offset="100%" stopColor="#FF8C00" />
              </radialGradient>
            </defs>
          </svg>
        </div>

        {/* Moon icon */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: isOffTheClock ? 1 : 0,
            transform: isOffTheClock ? "scale(1) rotate(0deg)" : "scale(0.5) rotate(90deg)",
            transition: "all 0.6s cubic-bezier(0.23,1,0.32,1)",
          }}
        >
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <path
              d="M28 6C20.268 6 14 12.268 14 20C14 27.732 20.268 34 28 34C30.252 34 32.38 33.46 34.268 32.5C31.5 36.5 27 39 22 39C14.268 39 8 32.732 8 25C8 17.268 14.268 11 22 11C24.252 11 26.38 11.54 28.268 12.5C28.18 10.28 28.09 8.14 28 6Z"
              fill="url(#moonGrad)"
            />
            <defs>
              <linearGradient id="moonGrad" x1="8" y1="11" x2="34" y2="39">
                <stop offset="0%" stopColor="#E8EDF5" />
                <stop offset="50%" stopColor="#C8D4E8" />
                <stop offset="100%" stopColor="#9BAFC8" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </button>

      {/* ── Orbital ring around center ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: CENTER_SIZE + 16,
          height: CENTER_SIZE + 16,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          border: isOffTheClock
            ? "1.5px solid rgba(200,210,230,0.2)"
            : "1.5px solid rgba(255,180,50,0.4)",
          boxShadow: isOffTheClock
            ? "0 0 12px rgba(200,210,230,0.1)"
            : "0 0 20px rgba(255,180,50,0.2)",
          transition: "all 0.6s ease",
          animation: isOffTheClock ? "none" : "hubOrbitalPulse 3s ease-in-out infinite",
        }}
      />

      {/* ── Glass Nodes ── */}
      {nodes.map((node) => {
        const rad = ((node.angle - 90) * Math.PI) / 180;
        const baseCx = HUB_SIZE / 2 + ORBIT_RADIUS * Math.cos(rad);
        const baseCy = HUB_SIZE / 2 + ORBIT_RADIUS * Math.sin(rad);
        const { dx, dy } = getMagneticOffset(baseCx, baseCy);
        const cx = baseCx + dx;
        const cy = baseCy + dy;
        const isFilling = liquidFillNode === node.key;

        return (
          <button
            key={node.key}
            ref={node.tourId && registerRef ? (el) => registerRef(node.tourId!, el) : undefined}
            onClick={() => handleNodeClick(node, baseCx, baseCy)}
            className="absolute flex flex-col items-center gap-1 transition-transform active:scale-[0.88]"
            style={{
              left: cx - NODE_SIZE / 2,
              top: cy - NODE_SIZE / 2,
              width: NODE_SIZE,
              transition: "left 0.15s ease-out, top 0.15s ease-out, transform 0.16s ease-out, opacity 0.6s ease",
              opacity: isOffTheClock ? 0.35 : 1,
              cursor: isOffTheClock ? "default" : "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {/* Glass circle */}
            <div
              className="relative flex items-center justify-center overflow-hidden"
              style={{
                width: NODE_SIZE,
                height: NODE_SIZE,
                borderRadius: "50%",
                background: isOffTheClock
                  ? "rgba(40,50,70,0.4)"
                  : `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.12) 0%, transparent 60%), rgba(20,30,50,0.6)`,
                border: isOffTheClock
                  ? "1.5px solid rgba(100,120,150,0.3)"
                  : `2px solid ${node.ringColor}`,
                boxShadow: isOffTheClock
                  ? "none"
                  : `0 0 20px ${node.glowColor}, inset 0 1px 2px rgba(255,255,255,0.1)`,
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                transition: "all 0.6s ease",
              }}
            >
              {/* Liquid fill animation */}
              {isFilling && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "100%",
                    background: `linear-gradient(to top, ${node.glowColor}, transparent)`,
                    animation: "liquidFill 0.28s ease-out forwards",
                    borderRadius: "50%",
                    opacity: 0.5,
                  }}
                />
              )}
              {/* Icon */}
              <span
                style={{
                  fontSize: NODE_SIZE * 0.36,
                  filter: isOffTheClock ? "grayscale(1) opacity(0.5)" : "none",
                  transition: "filter 0.6s ease",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {node.icon}
              </span>
              {/* Count badge */}
              {node.count > 0 && !isOffTheClock && (
                <span
                  className="absolute -top-1 -right-1 min-w-[20px] h-[20px] rounded-full flex items-center justify-center text-[10px] font-black"
                  style={{
                    backgroundColor: node.ringColor,
                    color: "#0A1929",
                    border: "1.5px solid rgba(10,25,41,0.8)",
                    fontFamily: "'Space Grotesk', sans-serif",
                    padding: "0 4px",
                    zIndex: 2,
                  }}
                >
                  {node.count}
                </span>
              )}
              {/* Glass highlight (top-left) */}
              <div
                className="absolute pointer-events-none"
                style={{
                  top: "8%",
                  left: "12%",
                  width: "35%",
                  height: "20%",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 100%)",
                  opacity: isOffTheClock ? 0.2 : 1,
                  transition: "opacity 0.6s ease",
                }}
              />
            </div>
            {/* Label */}
            <span
              className="text-[9px] font-bold uppercase tracking-wider text-center leading-tight"
              style={{
                color: isOffTheClock ? "rgba(150,160,180,0.5)" : node.textColor,
                fontFamily: "'Space Grotesk', sans-serif",
                maxWidth: NODE_SIZE + 16,
                transition: "color 0.6s ease",
              }}
            >
              {node.label}
            </span>
          </button>
        );
      })}

      {/* ── Ripple Particles ── */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute pointer-events-none"
          style={{
            left: p.x,
            top: p.y,
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: p.color,
            boxShadow: `0 0 8px ${p.color}`,
            animation: "rippleParticle 0.6s ease-out forwards",
            transform: `translate(-50%, -50%)`,
            "--ripple-dx": `${Math.cos(p.angle) * 40}px`,
            "--ripple-dy": `${Math.sin(p.angle) * 40}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/* ── CSS Keyframes (inject once) ── */
export const glassHubStyles = `
@keyframes hubOrbitalPulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  50% { transform: translate(-50%, -50%) scale(1.06); opacity: 0.7; }
}

@keyframes liquidFill {
  0% { transform: scaleY(0); transform-origin: bottom; }
  100% { transform: scaleY(1); transform-origin: bottom; }
}

@keyframes rippleParticle {
  0% { transform: translate(-50%, -50%) translate(0, 0); opacity: 1; }
  100% { transform: translate(-50%, -50%) translate(var(--ripple-dx), var(--ripple-dy)); opacity: 0; }
}

@keyframes glassNodeEnter {
  0% { opacity: 0; transform: scale(0.7); }
  100% { opacity: 1; transform: scale(1); }
}
`;
