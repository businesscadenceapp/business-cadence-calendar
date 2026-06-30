/**
 * BrandLogo — Uses Lucide's Music2 icon (clean double eighth note) for a
 * professional, pixel-perfect musical note. Navy pill background with
 * "Business" (regular) + "Cadence" (bold) text in navy.
 */

import { Music2 } from "lucide-react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const config = {
  sm: { height: 32, px: 10, py: 5, rx: 8,  iconSize: 16, fontSize: 14, gap: 7 },
  md: { height: 42, px: 14, py: 7, rx: 10, iconSize: 20, fontSize: 17, gap: 9 },
  lg: { height: 60, px: 20, py: 10, rx: 14, iconSize: 28, fontSize: 24, gap: 12 },
  xl: { height: 80, px: 26, py: 13, rx: 18, iconSize: 36, fontSize: 30, gap: 15 },
};

export default function BrandLogo({ size = "md", className = "" }: BrandLogoProps) {
  const c = config[size];

  return (
    <div
      className={`inline-flex items-center ${className}`}
      style={{
        height: c.height,
        backgroundColor: "#EEF2FF",
        borderRadius: c.rx,
        paddingLeft: c.px,
        paddingRight: c.px,
        gap: c.gap,
        flexShrink: 0,
      }}
      aria-label="BusinessCadence"
      role="img"
    >
      <Music2
        size={c.iconSize}
        strokeWidth={2}
        color="#1E3A5F"
        style={{ flexShrink: 0 }}
      />
      <span
        style={{
          fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
          fontSize: c.fontSize,
          lineHeight: 1,
          color: "#1E3A5F",
          letterSpacing: "-0.02em",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontWeight: 400 }}>Business</span>
        <span style={{ fontWeight: 700 }}>Cadence</span>
      </span>
    </div>
  );
}
