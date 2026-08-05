/**
 * BrandLogo — Full horizontal lockup: crystal heart icon + "BusinessCadence" wordmark.
 * BrandIcon — Just the crystal heart icon in a circle (no text).
 *
 * The crystal heart mark: left half blue/cyan, right half orange/amber.
 * Represents two partners building something strong together.
 */

// ---------------------------------------------------------------------------
// BrandIcon — circular icon only, no text
// ---------------------------------------------------------------------------
export function BrandIcon({
  size = 48,
  className = "",
}: {
  size?: number;
  className?: string;
  /** @deprecated variant is no longer used — kept for API compatibility */
  variant?: string;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'rgba(15, 36, 64, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 0 0 1px rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}
      className={className}
      role="img"
      aria-label="BusinessCadence"
    >
      <img
        src="/manus-storage/app-icon_a22c8062.png"
        alt="BusinessCadence"
        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// BrandLogo — horizontal lockup: heart icon + wordmark
// ---------------------------------------------------------------------------
interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** "dark" = white text on navy bg (default); "light" = navy text on white bg */
  theme?: "dark" | "light";
}

const sizes = {
  sm: { iconSize: 28, fontSize: 14, gap: 8,  subtitleSize: 9  },
  md: { iconSize: 36, fontSize: 18, gap: 10, subtitleSize: 11 },
  lg: { iconSize: 48, fontSize: 24, gap: 13, subtitleSize: 13 },
  xl: { iconSize: 64, fontSize: 32, gap: 16, subtitleSize: 16 },
};

export default function BrandLogo({ size = "md", className = "", theme = "dark" }: BrandLogoProps) {
  const s = sizes[size];
  const businessColor = theme === "dark" ? "#FFFFFF" : "#1E3A5F";
  const cadenceColor  = "#3B9EE8";
  const taglineColor  = theme === "dark" ? "rgba(255,255,255,0.45)" : "rgba(30,58,95,0.55)";

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        userSelect: 'none',
      }}
      role="img"
      aria-label="BusinessCadence"
    >
      {/* Crystal heart icon */}
      <img
        src="/manus-storage/app-icon_a22c8062.png"
        alt=""
        aria-hidden="true"
        style={{
          width: s.iconSize,
          height: s.iconSize,
          objectFit: 'cover',
          borderRadius: '22%',
          flexShrink: 0,
        }}
      />

      {/* Wordmark */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span style={{ display: 'inline-flex', alignItems: 'baseline' }}>
          <span
            style={{
              fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
              fontSize: s.fontSize,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              color: businessColor,
            }}
          >
            Business
          </span>
          <span
            style={{
              fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
              fontSize: s.fontSize,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: cadenceColor,
            }}
          >
            Cadence
          </span>
        </span>
        {size !== 'sm' && (
          <span
            style={{
              fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
              fontSize: s.subtitleSize,
              fontWeight: 400,
              letterSpacing: '0.01em',
              color: taglineColor,
              marginTop: 1,
            }}
          >
            Run your business while protecting your relationship.
          </span>
        )}
      </div>
    </div>
  );
}
