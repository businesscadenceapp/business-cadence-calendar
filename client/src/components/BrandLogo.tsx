/**
 * BrandLogo — SVG-based logo component matching the approved design:
 * Navy pill background, double eighth note icon, "BusinessCadence" text.
 * Renders crisp at any size with no image padding issues.
 *
 * Sizes:
 *   sm  — nav bar on mobile (height ~32px)
 *   md  — nav bar on desktop (height ~44px)
 *   lg  — hero section / login portal (height ~64px)
 *   xl  — large display (height ~88px)
 */

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: { height: 32, fontSize: 13, noteScale: 0.7, gap: 8, px: 12, py: 6, rx: 8 },
  md: { height: 44, fontSize: 17, noteScale: 0.95, gap: 10, px: 16, py: 8, rx: 11 },
  lg: { height: 64, fontSize: 24, noteScale: 1.35, gap: 14, px: 22, py: 12, rx: 16 },
  xl: { height: 88, fontSize: 32, noteScale: 1.85, gap: 18, px: 28, py: 16, rx: 20 },
};

export default function BrandLogo({ size = "md", className = "" }: BrandLogoProps) {
  const s = sizes[size];

  // Double eighth note natural dimensions at scale 1: ~22w x 20h
  const noteW = 22 * s.noteScale;
  const noteH = 20 * s.noteScale;

  // Approximate text width for "BusinessCadence" at given font size
  // Inter: ~0.58 char-width ratio
  const textW = s.fontSize * 0.58 * 16; // "BusinessCadence" = 16 chars

  const totalInnerW = noteW + s.gap + textW;
  const totalW = totalInnerW + s.px * 2;
  const totalH = s.height;

  // Note starts at left padding
  const noteX = s.px;
  const noteY = (totalH - noteH) / 2;

  // Text starts after note + gap, vertically centered
  const textX = s.px + noteW + s.gap;
  const textY = totalH / 2;

  // Scale the note path (designed at 22x20, scale=1)
  const ns = s.noteScale;

  return (
    <svg
      width={totalW}
      height={totalH}
      viewBox={`0 0 ${totalW} ${totalH}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="BusinessCadence"
      role="img"
    >
      {/* Pill background */}
      <rect
        x="0"
        y="0"
        width={totalW}
        height={totalH}
        rx={s.rx}
        fill="#EEF2FF"
      />

      {/* Double eighth note (beamed quavers) */}
      <g transform={`translate(${noteX}, ${noteY})`}>
        {/* Left note head */}
        <ellipse
          cx={3.2 * ns}
          cy={16.5 * ns}
          rx={3.2 * ns}
          ry={2.2 * ns}
          transform={`rotate(-15, ${3.2 * ns}, ${16.5 * ns})`}
          fill="#1E3A5F"
        />
        {/* Left stem */}
        <rect
          x={5.8 * ns}
          y={4.5 * ns}
          width={1.6 * ns}
          height={12 * ns}
          rx={0.8 * ns}
          fill="#1E3A5F"
        />
        {/* Right note head */}
        <ellipse
          cx={14.8 * ns}
          cy={14 * ns}
          rx={3.2 * ns}
          ry={2.2 * ns}
          transform={`rotate(-15, ${14.8 * ns}, ${14 * ns})`}
          fill="#1E3A5F"
        />
        {/* Right stem */}
        <rect
          x={17.4 * ns}
          y={2 * ns}
          width={1.6 * ns}
          height={12 * ns}
          rx={0.8 * ns}
          fill="#1E3A5F"
        />
        {/* Beam connecting the two stems */}
        <path
          d={`M ${5.8 * ns} ${4.5 * ns} L ${19 * ns} ${2 * ns} L ${19 * ns} ${4.8 * ns} L ${5.8 * ns} ${7.3 * ns} Z`}
          fill="#1E3A5F"
        />
      </g>

      {/* Combined text: "Business" regular + "Cadence" bold, no gap */}
      <text
        x={textX}
        y={textY}
        dominantBaseline="middle"
        fontFamily="'Inter', 'Helvetica Neue', Arial, sans-serif"
        fontSize={s.fontSize}
        fill="#1E3A5F"
        letterSpacing="-0.3"
      >
        <tspan fontWeight="400">Business</tspan><tspan fontWeight="700">Cadence</tspan>
      </text>
    </svg>
  );
}
