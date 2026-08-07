/**
 * GlassHub — Premium interactive hub matching the mockup exactly:
 * - Near-black background
 * - Large neon-glowing glass circles (100px+)
 * - Thick bright ring borders with heavy outer glow
 * - SVG line-art icons (not emoji)
 * - Large center sun/moon toggle (140px)
 * - Fills the entire available height
 * - Magnetic pull + ripple + liquid fill interactions
 */

import { useState, useRef, useCallback } from "react";

/* ── Types ── */
export interface GlassNodeData {
  key: string;
  label: string;
  icon: string;
  /** Neon glow color */
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

/* ── SVG Icons (line-art style matching mockup) ── */
const SVG_ICONS: Record<string, (color: string) => ReactElement> = {
  tasks: (c) => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="20" height="24" rx="2" />
      <path d="M10 12l2 2 4-4" />
      <path d="M10 19l2 2 4-4" />
      <line x1="20" y1="12" x2="22" y2="12" />
      <line x1="20" y1="19" x2="22" y2="19" />
    </svg>
  ),
  updates: (c) => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 22l2-2h16a2 2 0 002-2V8a2 2 0 00-2-2H8a2 2 0 00-2 2v14z" />
      <circle cx="12" cy="13" r="1" fill={c} stroke="none" />
      <circle cx="16" cy="13" r="1" fill={c} stroke="none" />
      <circle cx="20" cy="13" r="1" fill={c} stroke="none" />
    </svg>
  ),
  issues: (c) => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 6L4 26h24L16 6z" />
      <line x1="16" y1="14" x2="16" y2="19" />
      <circle cx="16" cy="22" r="0.5" fill={c} stroke="none" />
    </svg>
  ),
  needs_attention: (c) => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4a4 4 0 014 4v8a4 4 0 01-8 0V8a4 4 0 014-4z" />
      <path d="M8 18a8 8 0 0016 0" />
      <path d="M13 28h6" />
      <line x1="16" y1="24" x2="16" y2="28" />
    </svg>
  ),
  calendar: (c) => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="6" width="22" height="22" rx="2" />
      <line x1="5" y1="12" x2="27" y2="12" />
      <line x1="10" y1="4" x2="10" y2="8" />
      <line x1="22" y1="4" x2="22" y2="8" />
      <rect x="9" y="16" width="4" height="4" rx="0.5" />
      <rect x="14" y="16" width="4" height="4" rx="0.5" />
      <rect x="19" y="16" width="4" height="4" rx="0.5" />
      <rect x="9" y="21" width="4" height="4" rx="0.5" />
      <rect x="14" y="21" width="4" height="4" rx="0.5" />
    </svg>
  ),
  archive: (c) => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h24v4H4z" />
      <path d="M6 12v14a2 2 0 002 2h16a2 2 0 002-2V12" />
      <path d="M13 18h6" />
    </svg>
  ),
  goals: (c) => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="16" cy="16" r="12" />
      <circle cx="16" cy="16" r="8" />
      <circle cx="16" cy="16" r="4" />
      <circle cx="16" cy="16" r="1" fill={c} stroke="none" />
    </svg>
  ),
  kpis: (c) => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="18" width="5" height="10" rx="1" />
      <rect x="13" y="12" width="5" height="16" rx="1" />
      <rect x="21" y="6" width="5" height="22" rx="1" />
    </svg>
  ),
  reports: (c) => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4h12l6 6v18a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z" />
      <path d="M20 4v6h6" />
      <line x1="10" y1="16" x2="22" y2="16" />
      <line x1="10" y1="20" x2="22" y2="20" />
      <line x1="10" y1="24" x2="16" y2="24" />
    </svg>
  ),
  refer: (c) => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="10" width="20" height="18" rx="2" />
      <path d="M16 10V8a4 4 0 00-4-4h0a4 4 0 00-4 4v2" />
      <path d="M24 10V8a4 4 0 00-4-4h0a4 4 0 00-4 4v2" />
      <line x1="16" y1="15" x2="16" y2="23" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  ),
  settings: (c) => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="16" cy="16" r="4" />
      <path d="M16 4v3M16 25v3M4 16h3M25 16h3M7.5 7.5l2.1 2.1M22.4 22.4l2.1 2.1M7.5 24.5l2.1-2.1M22.4 9.6l2.1-2.1" />
    </svg>
  ),
  off_the_clock: (c) => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 18A10 10 0 1114 8a8 8 0 0010 10z" />
    </svg>
  ),
};

/* ── Constants — LARGE to fill the screen ── */
const HUB_SIZE = 380;
const CENTER_SIZE = 130;
const NODE_SIZE = 90;
const ORBIT_RADIUS = 140;
const MAGNETIC_STRENGTH = 12;

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

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPointer({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const handlePointerLeave = useCallback(() => setPointer(null), []);

  const triggerRipple = useCallback((cx: number, cy: number, color: string) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 10; i++) {
      newParticles.push({ id: particleId.current++, x: cx, y: cy, angle: (i * 36) * (Math.PI / 180), color });
    }
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => setParticles(prev => prev.filter(p => !newParticles.includes(p))), 700);
  }, []);

  const handleNodeClick = useCallback((node: GlassNodeData, cx: number, cy: number) => {
    if (isOffTheClock) return;
    setLiquidFillNode(node.key);
    triggerRipple(cx, cy, node.glowColor);
    setTimeout(() => { setLiquidFillNode(null); node.onClick(); }, 320);
  }, [isOffTheClock, triggerRipple]);

  const getMagneticOffset = useCallback((nodeCx: number, nodeCy: number) => {
    if (!pointer || isOffTheClock) return { dx: 0, dy: 0 };
    const dist = Math.sqrt((pointer.x - nodeCx) ** 2 + (pointer.y - nodeCy) ** 2);
    if (dist > 140 || dist < 5) return { dx: 0, dy: 0 };
    const strength = (1 - dist / 140) * MAGNETIC_STRENGTH;
    const angle = Math.atan2(pointer.y - nodeCy, pointer.x - nodeCx);
    return { dx: Math.cos(angle) * strength, dy: Math.sin(angle) * strength };
  }, [pointer, isOffTheClock]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center"
      style={{
        width: HUB_SIZE,
        height: HUB_SIZE,
        margin: "0 auto",
      }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* ── Connector lines — glowing dotted ── */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        viewBox={`0 0 ${HUB_SIZE} ${HUB_SIZE}`}
      >
        {nodes.map((node) => {
          const rad = ((node.angle - 90) * Math.PI) / 180;
          const cx = HUB_SIZE / 2 + ORBIT_RADIUS * Math.cos(rad);
          const cy = HUB_SIZE / 2 + ORBIT_RADIUS * Math.sin(rad);
          const lineColor = isOffTheClock ? "rgba(255,255,255,0.06)" : node.ringColor;
          return (
            <line
              key={node.key}
              x1={HUB_SIZE / 2}
              y1={HUB_SIZE / 2}
              x2={cx}
              y2={cy}
              stroke={lineColor}
              strokeWidth="2"
              strokeDasharray="3 6"
              opacity={isOffTheClock ? 0.3 : 0.7}
              style={{
                filter: isOffTheClock ? "none" : `drop-shadow(0 0 4px ${node.glowColor})`,
                transition: "all 0.6s ease",
              }}
            />
          );
        })}
        {/* Connection dots at node endpoints */}
        {!isOffTheClock && nodes.map((node) => {
          const rad = ((node.angle - 90) * Math.PI) / 180;
          const cx = HUB_SIZE / 2 + (ORBIT_RADIUS - NODE_SIZE / 2 - 4) * Math.cos(rad);
          const cy = HUB_SIZE / 2 + (ORBIT_RADIUS - NODE_SIZE / 2 - 4) * Math.sin(rad);
          return (
            <circle
              key={`dot-${node.key}`}
              cx={cx}
              cy={cy}
              r="3"
              fill={node.ringColor}
              style={{ filter: `drop-shadow(0 0 4px ${node.glowColor})` }}
            />
          );
        })}
      </svg>

      {/* ── Center Sun/Moon Toggle ── */}
      <button
        ref={centerTourId && registerRef ? (el) => registerRef(centerTourId, el) : undefined}
        onClick={onToggleOffTheClock}
        className="absolute z-10 flex items-center justify-center active:scale-[0.92]"
        style={{
          width: CENTER_SIZE,
          height: CENTER_SIZE,
          borderRadius: "50%",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          background: isOffTheClock
            ? "radial-gradient(circle, rgba(180,200,230,0.08) 0%, rgba(80,100,130,0.03) 100%)"
            : "radial-gradient(circle at 40% 35%, #FFF3B0 0%, #FFD700 25%, #FF8C00 60%, #CC5500 100%)",
          border: isOffTheClock
            ? "2.5px solid rgba(180,200,230,0.3)"
            : "3px solid rgba(255,200,50,0.8)",
          boxShadow: isOffTheClock
            ? "0 0 20px rgba(180,200,230,0.1), inset 0 0 15px rgba(180,200,230,0.05)"
            : "0 0 60px rgba(255,180,50,0.5), 0 0 120px rgba(255,150,0,0.25), 0 0 200px rgba(255,100,0,0.1), inset 0 0 30px rgba(255,255,200,0.2)",
          transition: "all 0.6s cubic-bezier(0.23,1,0.32,1)",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {/* Sun rays (visible in sun mode) */}
        <div
          style={{
            position: "absolute",
            inset: "-20px",
            opacity: isOffTheClock ? 0 : 0.6,
            transition: "opacity 0.6s ease",
            pointerEvents: "none",
          }}
        >
          <svg width="100%" height="100%" viewBox="0 0 170 170" fill="none">
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => {
              const rad = (angle * Math.PI) / 180;
              const x1 = 85 + 55 * Math.cos(rad);
              const y1 = 85 + 55 * Math.sin(rad);
              const x2 = 85 + 75 * Math.cos(rad);
              const y2 = 85 + 75 * Math.sin(rad);
              return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FFD700" strokeWidth="2" strokeLinecap="round" opacity="0.7" />;
            })}
          </svg>
        </div>

        {/* Moon crescent (visible in moon mode) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: isOffTheClock ? 1 : 0,
            transform: isOffTheClock ? "scale(1) rotate(0deg)" : "scale(0.4) rotate(90deg)",
            transition: "all 0.6s cubic-bezier(0.23,1,0.32,1)",
          }}
        >
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <path
              d="M40 8C29.5 8 21 16.5 21 27s8.5 19 19 19c3.2 0 6.2-.8 8.8-2.1C44.5 49.5 38.6 53 32 53c-11.6 0-21-9.4-21-21s9.4-21 21-21c3.2 0 6.2.8 8.8 2.1C40.5 11.5 40.2 9.7 40 8z"
              fill="url(#moonGradLg)"
            />
            <defs>
              <linearGradient id="moonGradLg" x1="11" y1="11" x2="49" y2="53">
                <stop offset="0%" stopColor="#F0F4FA" />
                <stop offset="50%" stopColor="#D4DEF0" />
                <stop offset="100%" stopColor="#A8B8D8" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </button>

      {/* ── Orbital ring around center ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: CENTER_SIZE + 24,
          height: CENTER_SIZE + 24,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          border: isOffTheClock
            ? "2px solid rgba(180,200,230,0.15)"
            : "2.5px solid rgba(255,180,50,0.5)",
          boxShadow: isOffTheClock
            ? "0 0 10px rgba(180,200,230,0.08)"
            : "0 0 30px rgba(255,180,50,0.3), inset 0 0 15px rgba(255,180,50,0.1)",
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
        const iconRenderer = SVG_ICONS[node.key];

        return (
          <button
            key={node.key}
            ref={node.tourId && registerRef ? (el) => registerRef(node.tourId!, el) : undefined}
            onClick={() => handleNodeClick(node, baseCx, baseCy)}
            className="absolute flex flex-col items-center gap-1.5 active:scale-[0.88]"
            style={{
              left: cx - NODE_SIZE / 2,
              top: cy - NODE_SIZE / 2,
              width: NODE_SIZE,
              transition: "left 0.15s ease-out, top 0.15s ease-out, transform 0.16s cubic-bezier(0.23,1,0.32,1), opacity 0.6s ease",
              opacity: isOffTheClock ? 0.3 : 1,
              cursor: isOffTheClock ? "default" : "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {/* Neon glass circle */}
            <div
              className="relative flex items-center justify-center overflow-hidden"
              style={{
                width: NODE_SIZE,
                height: NODE_SIZE,
                borderRadius: "50%",
                background: isOffTheClock
                  ? "rgba(20,30,50,0.5)"
                  : "radial-gradient(circle at 35% 25%, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.3) 100%)",
                border: isOffTheClock
                  ? "2px solid rgba(80,100,130,0.25)"
                  : `3px solid ${node.ringColor}`,
                boxShadow: isOffTheClock
                  ? "none"
                  : `0 0 30px ${node.glowColor}, 0 0 60px ${node.glowColor.replace(/[\d.]+\)$/, "0.3)")}, inset 0 0 15px ${node.glowColor.replace(/[\d.]+\)$/, "0.15)")}`,
                transition: "all 0.6s ease",
              }}
            >
              {/* Liquid fill */}
              {isFilling && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "100%",
                    background: `linear-gradient(to top, ${node.glowColor}, transparent)`,
                    animation: "liquidFill 0.3s ease-out forwards",
                    borderRadius: "50%",
                    opacity: 0.6,
                  }}
                />
              )}
              {/* SVG Icon or fallback emoji */}
              <div style={{ position: "relative", zIndex: 1, filter: isOffTheClock ? "grayscale(1) opacity(0.4)" : "none", transition: "filter 0.6s ease" }}>
                {iconRenderer ? iconRenderer(isOffTheClock ? "rgba(150,160,180,0.5)" : node.textColor) : (
                  <span style={{ fontSize: 28 }}>{node.icon}</span>
                )}
              </div>
              {/* Glass highlight */}
              <div
                className="absolute pointer-events-none"
                style={{
                  top: "6%",
                  left: "10%",
                  width: "40%",
                  height: "25%",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 100%)",
                  opacity: isOffTheClock ? 0.1 : 0.8,
                  transition: "opacity 0.6s ease",
                }}
              />
              {/* Count badge */}
              {node.count > 0 && !isOffTheClock && (
                <span
                  className="absolute flex items-center justify-center text-[10px] font-black"
                  style={{
                    top: -2,
                    right: -2,
                    minWidth: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: node.ringColor,
                    color: "#050A15",
                    border: "2px solid #050A15",
                    fontFamily: "'Space Grotesk', sans-serif",
                    padding: "0 5px",
                    zIndex: 2,
                    boxShadow: `0 0 8px ${node.glowColor}`,
                  }}
                >
                  {node.count}
                </span>
              )}
            </div>
            {/* Label */}
            <span
              className="text-[10px] font-semibold text-center leading-tight"
              style={{
                color: isOffTheClock ? "rgba(150,160,180,0.4)" : "rgba(255,255,255,0.9)",
                fontFamily: "'Space Grotesk', sans-serif",
                maxWidth: NODE_SIZE + 20,
                transition: "color 0.6s ease",
                textShadow: isOffTheClock ? "none" : `0 0 8px ${node.glowColor.replace(/[\d.]+\)$/, "0.3)")}`,
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
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: p.color,
            boxShadow: `0 0 12px ${p.color}`,
            animation: "rippleParticle 0.7s ease-out forwards",
            transform: "translate(-50%, -50%)",
            "--ripple-dx": `${Math.cos(p.angle) * 50}px`,
            "--ripple-dy": `${Math.sin(p.angle) * 50}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export const glassHubStyles = "";
import type { ReactElement } from "react";
