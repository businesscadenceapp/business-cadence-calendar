/**
 * BrandLogo — Inline SVG logo that exactly matches the approved design:
 * lavender pill background, navy double eighth note, "BusinessCadence" text.
 *
 * BrandIcon — Just the note icon in a circle (no text), same colors.
 * Use this for compact spaces like login cards and sidebar headers.
 */

// ---------------------------------------------------------------------------
// Shared note drawing function — used by both BrandLogo and BrandIcon
// Draws a beamed double eighth note in a `sz × sz` box, top-left at (tx, ty).
// Coordinates are in 24px design space, scaled by sz/24.
// ---------------------------------------------------------------------------
function drawNote(tx: number, ty: number, sz: number) {
  const sc = sz / 24;
  const s = (v: number) => v * sc;
  return (
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
  );
}

// ---------------------------------------------------------------------------
// BrandIcon — circular icon only, no text
// Uses the actual logo note PNG for pixel-perfect rendering.
// ---------------------------------------------------------------------------
export function BrandIcon({ size = 48, className = "", variant = "purple" }: { size?: number; className?: string; variant?: "purple" | "teal" }) {
  const bg = variant === "teal" ? "rgba(94,234,212,0.18)" : "#EDE9FE";
  const filter = variant === "teal" ? "brightness(0) saturate(100%) invert(86%) sepia(42%) saturate(400%) hue-rotate(120deg) brightness(105%)" : undefined;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: variant === "teal" ? "0 0 0 1px rgba(94,234,212,0.3)" : undefined,
      }}
      className={className}
      role="img"
      aria-label="BusinessCadence"
    >
      <img
        src="/manus-storage/businesscadence-note-clean2_36202558.png"
        alt="BusinessCadence"
        style={{ width: '65%', height: '65%', objectFit: 'contain', filter }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// BrandLogo — full pill with text
// ---------------------------------------------------------------------------
interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: { w: 180, h: 40,  rx: 10, iconSize: 18, fontSize: 15, gap: 8,  px: 12 },
  md: { w: 240, h: 52,  rx: 13, iconSize: 22, fontSize: 19, gap: 10, px: 16 },
  lg: { w: 320, h: 70,  rx: 17, iconSize: 30, fontSize: 25, gap: 13, px: 20 },
  xl: { w: 420, h: 90,  rx: 22, iconSize: 38, fontSize: 32, gap: 16, px: 26 },
};

export default function BrandLogo({ size = "md", className = "" }: BrandLogoProps) {
  const s = sizes[size];

  const cy    = s.h / 2;
  const iconX = s.px;
  const textX = s.px + s.iconSize + s.gap;

  // Note top-left: (iconX, cy - iconSize/2)
  const noteTx = iconX;
  const noteTy = cy - s.iconSize / 2;

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
      <defs>
        <filter id="logo-shadow" x="-5%" y="-5%" width="110%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#1E3A5F" floodOpacity="0.12" />
        </filter>
      </defs>
      <rect x={0} y={0} width={s.w} height={s.h} rx={s.rx} ry={s.rx} fill="#EEF2FF" filter="url(#logo-shadow)" />

      {/* Musical note icon */}
      {drawNote(noteTx, noteTy, s.iconSize)}

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

      {/* "Cadence" — bold */}
      <text
        x={textX}
        y={cy + s.fontSize * 0.36}
        fontFamily="'Inter', 'Helvetica Neue', Arial, sans-serif"
        fontSize={s.fontSize}
        fontWeight="700"
        fill="#1E3A5F"
        letterSpacing="-0.3"
        dx={`${size === 'sm' ? 57 : size === 'md' ? 76 : size === 'lg' ? 100 : 131}px`}
      >
        Cadence
      </text>
    </svg>
  );
}
