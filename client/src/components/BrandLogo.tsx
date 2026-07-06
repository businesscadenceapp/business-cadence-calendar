/**
 * BrandLogo — Inline SVG logo that exactly matches the approved design:
 * lavender pill background, purple double eighth note, "BusinessCadence" text.
 * No image file needed — renders crisply at any size with zero background bleed.
 *
 * BrandIcon — Just the note icon in a circle (no text), same colors.
 * Use this for compact spaces like login cards and sidebar headers.
 */

/**
 * Standalone circular icon — lavender circle with the exact same beamed-quaver double-note
 * as the homepage pill logo. Uses the same noteIcon drawing logic as BrandLogo.
 *
 * Maths (verified in Python):
 *   Note bounding box in 24px space: x=3.3–17.7 (w=14.4), y=3.0–20.9 (h=17.9)
 *   Centre of bounding box: (10.5, 11.9)
 *   Scale so height=65 in 100-unit viewBox: scale = 65/17.9 = 3.631
 *   Translate so scaled centre lands at (50,50): tx=11.9, ty=6.6
 *   All four corners land at distance 41.7 from centre (well inside r=50).
 */
export function BrandIcon({ size = 48, className = "" }: { size?: number; className?: string }) {
  const vb    = 100;    // viewBox is 100×100
  const r     = vb / 2; // circle radius = 50
  const scale = 3.631;  // pre-computed: fits note height in 65 units
  const tx    = 11.9;   // pre-computed translate x
  const ty    = 6.6;    // pre-computed translate y

  const s = (v: number) => v * scale;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${vb} ${vb}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="BusinessCadence"
    >
      {/* Lavender circle — same #EEF2FF as the pill background */}
      <circle cx={r} cy={r} r={r} fill="#EEF2FF" />

      {/* Exact same note as BrandLogo, centred in the circle */}
      <g transform={`translate(${tx}, ${ty})`}>
        {/* Beam */}
        <rect
          x={s(7.5)} y={s(4)}
          width={s(10)} height={s(2.5)}
          rx={s(1)}
          fill="#1E3A5F"
          transform={`rotate(-8, ${s(7.5)}, ${s(4)})`}
        />
        {/* Left stem */}
        <rect
          x={s(7.5)} y={s(5.5)}
          width={s(2)} height={s(12)}
          rx={s(0.5)}
          fill="#1E3A5F"
        />
        {/* Right stem */}
        <rect
          x={s(15.5)} y={s(3.5)}
          width={s(2)} height={s(12)}
          rx={s(0.5)}
          fill="#1E3A5F"
        />
        {/* Left note head */}
        <ellipse
          cx={s(6.5)} cy={s(18.5)}
          rx={s(3.2)} ry={s(2.4)}
          fill="#1E3A5F"
          transform={`rotate(-15, ${s(6.5)}, ${s(18.5)})`}
        />
        {/* Right note head */}
        <ellipse
          cx={s(14.5)} cy={s(16.5)}
          rx={s(3.2)} ry={s(2.4)}
          fill="#1E3A5F"
          transform={`rotate(-15, ${s(14.5)}, ${s(16.5)})`}
        />
      </g>
    </svg>
  );
}

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

// Pill dimensions for each size
const sizes = {
  sm: { w: 180, h: 40,  rx: 10, iconSize: 18, fontSize: 15, gap: 8,  px: 12 },
  md: { w: 240, h: 52,  rx: 13, iconSize: 22, fontSize: 19, gap: 10, px: 16 },
  lg: { w: 320, h: 70,  rx: 17, iconSize: 30, fontSize: 25, gap: 13, px: 20 },
  xl: { w: 420, h: 90,  rx: 22, iconSize: 38, fontSize: 32, gap: 16, px: 26 },
};

export default function BrandLogo({ size = "md", className = "" }: BrandLogoProps) {
  const s = sizes[size];

  // Center content vertically
  const cy = s.h / 2;
  // Icon left edge
  const iconX = s.px;
  // Text left edge (after icon + gap)
  const textX = s.px + s.iconSize + s.gap;

  // Double eighth note SVG path scaled to iconSize
  // Based on the standard beamed quavers shape from the approved logo
  const n = s.iconSize;
  // We'll draw the note using a path scaled within a n×n box
  // The note: two filled ovals at bottom-left and bottom-right,
  // two stems going up, a beam connecting the tops.
  const noteIcon = (x: number, y: number, sz: number) => {
    const scale = sz / 24; // normalize to 24px design
    const tx = x;
    const ty = y - sz / 2; // top-left of the icon bounding box

    // Coordinates in 24px space, then scaled
    const s24 = (v: number) => v * scale;

    // Left note: oval at (5,18), stem from (8,18) to (8,6)
    // Right note: oval at (14,16), stem from (17,16) to (17,4)
    // Beam: from (8,6) to (17,4)

    return (
      <g transform={`translate(${tx}, ${ty})`}>
        {/* Beam */}
        <rect
          x={s24(7.5)} y={s24(4)}
          width={s24(10)} height={s24(2.5)}
          rx={s24(1)}
          fill="#1E3A5F"
          transform={`rotate(-8, ${s24(7.5)}, ${s24(4)})`}
        />
        {/* Left stem */}
        <rect
          x={s24(7.5)} y={s24(5.5)}
          width={s24(2)} height={s24(12)}
          rx={s24(0.5)}
          fill="#1E3A5F"
        />
        {/* Right stem */}
        <rect
          x={s24(15.5)} y={s24(3.5)}
          width={s24(2)} height={s24(12)}
          rx={s24(0.5)}
          fill="#1E3A5F"
        />
        {/* Left note head */}
        <ellipse
          cx={s24(6.5)} cy={s24(18.5)}
          rx={s24(3.2)} ry={s24(2.4)}
          fill="#1E3A5F"
          transform={`rotate(-15, ${s24(6.5)}, ${s24(18.5)})`}
        />
        {/* Right note head */}
        <ellipse
          cx={s24(14.5)} cy={s24(16.5)}
          rx={s24(3.2)} ry={s24(2.4)}
          fill="#1E3A5F"
          transform={`rotate(-15, ${s24(14.5)}, ${s24(16.5)})`}
        />
      </g>
    );
  };

  return (
    <svg
      width={s.w}
      height={s.h}
      viewBox={`0 0 ${s.w} ${s.h}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="BusinessCadence"
    >
      {/* Pill background */}
      <rect
        x={0} y={0}
        width={s.w} height={s.h}
        rx={s.rx} ry={s.rx}
        fill="#EEF2FF"
      />
      {/* Subtle drop shadow via filter */}
      <defs>
        <filter id="logo-shadow" x="-5%" y="-5%" width="110%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#1E3A5F" floodOpacity="0.12" />
        </filter>
      </defs>
      <rect
        x={0} y={0}
        width={s.w} height={s.h}
        rx={s.rx} ry={s.rx}
        fill="#EEF2FF"
        filter="url(#logo-shadow)"
      />

      {/* Musical note icon */}
      {noteIcon(iconX, cy, n)}

      {/* "Business" — regular weight */}
      <text
        x={textX}
        y={cy + s.fontSize * 0.36}
        fontFamily="'Inter', 'Helvetica Neue', Arial, sans-serif"
        fontSize={s.fontSize}
        fontWeight="400"
        fill="#1E3A5F"
        letterSpacing="-0.3"
      >
        Business
      </text>

      {/* "Cadence" — bold, positioned right after "Business" */}
      <text
        x={textX}
        y={cy + s.fontSize * 0.36}
        fontFamily="'Inter', 'Helvetica Neue', Arial, sans-serif"
        fontSize={s.fontSize}
        fontWeight="700"
        fill="#1E3A5F"
        letterSpacing="-0.3"
        dx={`${(size === 'sm' ? 57 : size === 'md' ? 76 : size === 'lg' ? 100 : 131)}px`}
      >
        Cadence
      </text>
    </svg>
  );
}
