/**
 * BrandLogo — BusinessCadence brand identity components.
 * Uses the official app logo (interlocking heart puzzle pieces on teal background).
 *
 * BrandIcon — Just the square logo icon (no text), for compact spaces.
 * BrandLogo — Full horizontal lockup with icon + "BusinessCadence" wordmark.
 */

const LOGO_URL = "/manus-storage/app-logo_a4d9bc44.jpeg";

// ---------------------------------------------------------------------------
// BrandIcon — square rounded logo icon only, no text
// ---------------------------------------------------------------------------
export function BrandIcon({
  size = 48,
  className = "",
}: {
  size?: number;
  className?: string;
  variant?: "purple" | "teal"; // kept for API compatibility, ignored
}) {
  return (
    <img
      src={LOGO_URL}
      alt="BusinessCadence"
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.22),
        objectFit: "cover",
        flexShrink: 0,
        display: "block",
      }}
      className={className}
    />
  );
}

// ---------------------------------------------------------------------------
// BrandLogo — horizontal lockup: icon + wordmark
// ---------------------------------------------------------------------------
interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: { iconSize: 28, fontSize: 15, gap: 8 },
  md: { iconSize: 36, fontSize: 19, gap: 10 },
  lg: { iconSize: 48, fontSize: 25, gap: 13 },
  xl: { iconSize: 64, fontSize: 32, gap: 16 },
};

export default function BrandLogo({ size = "md", className = "" }: BrandLogoProps) {
  const s = sizes[size];
  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: s.gap,
        userSelect: "none",
      }}
      role="img"
      aria-label="BusinessCadence"
    >
      <BrandIcon size={s.iconSize} />
      <span
        style={{
          fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
          fontSize: s.fontSize,
          fontWeight: 400,
          color: "#1E3A5F",
          letterSpacing: "-0.3px",
          lineHeight: 1,
        }}
      >
        Business
        <span style={{ fontWeight: 700 }}>Cadence</span>
      </span>
    </div>
  );
}
