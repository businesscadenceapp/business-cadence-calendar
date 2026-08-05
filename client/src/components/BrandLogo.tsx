/**
 * BrandLogo — BusinessCadence logo using the approved geometric faceted heart icon.
 *
 * BrandIcon — Just the heart icon in a circle (no text).
 * Use this for compact spaces like login cards and sidebar headers.
 *
 * BrandLogo — Full logo with heart icon + "BusinessCadence" text.
 */

const LOGO_SRC = "/manus-storage/bc-logo-icon-1024_ceff2fb9.png";

// ---------------------------------------------------------------------------
// BrandIcon — circular icon only, no text
// Accepts variant prop for backward compatibility (ignored — always uses heart)
// ---------------------------------------------------------------------------
export function BrandIcon({
  size = 48,
  className = "",
  variant: _variant = "teal",
}: {
  size?: number;
  className?: string;
  variant?: "purple" | "teal";
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "22%",
        background: "#0F2440",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "hidden",
      }}
      className={className}
      role="img"
      aria-label="BusinessCadence"
    >
      <img
        src={LOGO_SRC}
        alt="BusinessCadence"
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// BrandLogo — icon + "BusinessCadence" text side by side
// Accepts theme and showTagline props for backward compatibility
// ---------------------------------------------------------------------------
interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  theme?: string;
  showTagline?: boolean;
}

const sizes = {
  sm: { iconSize: 28, fontSize: 15, gap: 8 },
  md: { iconSize: 36, fontSize: 19, gap: 10 },
  lg: { iconSize: 48, fontSize: 25, gap: 13 },
  xl: { iconSize: 60, fontSize: 32, gap: 16 },
};

export default function BrandLogo({
  size = "md",
  className = "",
  theme: _theme,
  showTagline: _showTagline,
}: BrandLogoProps) {
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
      <div
        style={{
          width: s.iconSize,
          height: s.iconSize,
          borderRadius: "22%",
          background: "#0F2440",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <img
          src={LOGO_SRC}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <span
        style={{
          fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
          fontSize: s.fontSize,
          fontWeight: 400,
          color: "#FFFFFF",
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
