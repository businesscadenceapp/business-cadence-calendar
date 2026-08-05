/**
 * BrandLogo — BusinessCadence logo using the approved geometric faceted heart icon.
 *
 * BrandIcon — Just the heart icon in a circle (no text).
 * Use this for compact spaces like login cards and sidebar headers.
 *
 * BrandLogo — Full logo with heart icon + "BusinessCadence" text.
 *
 * BrandLogoStacked — Vertical layout: heart on top, name + tagline below.
 * Use this for splash screens, onboarding headers, and full-screen welcome views.
 */

/** Transparent-background heart — used on the website and splash screens */
const HEART_SRC = "/manus-storage/heart-transparent-clean_14235c91.png";
/** Square icon with navy bg — used in compact/sidebar contexts */
const ICON_SRC = "/manus-storage/bc-logo-icon-1024_ceff2fb9.png";

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
        src={ICON_SRC}
        alt="BusinessCadence"
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// BrandLogo — icon + "BusinessCadence" text side by side
// Accepts theme and showTagline props
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
  showTagline = false,
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
          flexShrink: 0,
        }}
      >
        <img
          src={HEART_SRC}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span
          style={{
            fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
            fontSize: s.fontSize,
            fontWeight: 700,
            color: "#FFFFFF",
            letterSpacing: "-0.3px",
            lineHeight: 1,
          }}
        >
          Business Cadence
        </span>
        {showTagline && (
        <span
          style={{
            fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
            fontSize: Math.max(10, s.fontSize * 0.55),
            fontWeight: 400,
            color: "rgba(180,210,235,0.85)",
            letterSpacing: "0.1px",
            lineHeight: 1.3,
          }}
        >
          Run your business while protecting your relationship
        </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BrandLogoStacked — vertical layout for splash / onboarding headers
// ---------------------------------------------------------------------------
interface BrandLogoStackedProps {
  iconSize?: number;
  className?: string;
  showTagline?: boolean;
}

export function BrandLogoStacked({
  iconSize = 72,
  className = "",
  showTagline = true,
}: BrandLogoStackedProps) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        userSelect: "none",
      }}
      role="img"
      aria-label="Business Cadence"
    >
      <img
        src={HEART_SRC}
        alt=""
        style={{
          width: iconSize,
          height: iconSize,
          objectFit: "contain",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
        <span
          style={{
            fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
            fontSize: 22,
            fontWeight: 700,
            color: "#FFFFFF",
            letterSpacing: "-0.3px",
            lineHeight: 1.1,
            textAlign: "center",
          }}
        >
          Business Cadence
        </span>
        {showTagline && (
          <span
            style={{
              fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
              fontSize: 11,
              fontWeight: 400,
              color: "rgba(180,210,235,0.85)",
              letterSpacing: "0.2px",
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            Run your business while protecting your relationship
          </span>
        )}
      </div>
    </div>
  );
}
