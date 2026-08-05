/**
 * BrandLogo — Transparent inline logo: crystal heart icon + "BusinessCadence" wordmark.
 * No background. Floats cleanly on any surface (navy, white, gradient).
 *
 * BrandIcon — Just the crystal heart in a circle, no text.
 */

// ---------------------------------------------------------------------------
// BrandIcon — compact circular icon, no text
// ---------------------------------------------------------------------------
export function BrandIcon({
  size = 48,
  className = "",
  variant: _variant,
}: {
  size?: number;
  className?: string;
  /** @deprecated kept for API compatibility — no longer changes appearance */
  variant?: string;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      className={className}
      role="img"
      aria-label="BusinessCadence"
    >
      <img
        src="/manus-storage/app-icon_a22c8062.png"
        alt="BusinessCadence"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// BrandLogo — transparent horizontal lockup (heart + wordmark + tagline)
// ---------------------------------------------------------------------------
interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** "dark" = white text (for navy/dark backgrounds); "light" = navy text (for white/light backgrounds) */
  theme?: "dark" | "light";
  /** Show the tagline below the wordmark. Hidden on "sm". */
  showTagline?: boolean;
}

const SIZES = {
  sm: { iconSize: 28, fontSize: 16, tagSize: 0,  gap: 8  },
  md: { iconSize: 36, fontSize: 20, tagSize: 11, gap: 10 },
  lg: { iconSize: 50, fontSize: 27, tagSize: 13, gap: 12 },
  xl: { iconSize: 68, fontSize: 36, tagSize: 16, gap: 16 },
};

export default function BrandLogo({
  size = "md",
  className = "",
  theme = "dark",
  showTagline = true,
}: BrandLogoProps) {
  const s = SIZES[size];
  const businessColor = theme === "dark" ? "#FFFFFF" : "#1E3A5F";
  const cadenceColor  = "#3B9EE8";
  const tagColor      = theme === "dark" ? "rgba(255,255,255,0.50)" : "rgba(30,58,95,0.55)";

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        background: 'none',
        userSelect: 'none',
      }}
      role="img"
      aria-label="BusinessCadence"
    >
      {/* Crystal heart — no background, just the image */}
      <img
        src="/manus-storage/heart-transparent_d96be877.png"
        alt=""
        aria-hidden="true"
        style={{
          width: s.iconSize,
          height: s.iconSize,
          objectFit: 'contain',
          flexShrink: 0,
          display: 'block',
        }}
      />

      {/* Text column */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span
            style={{
              fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
              fontSize: s.fontSize,
              fontWeight: 400,
              letterSpacing: '-0.025em',
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
              letterSpacing: '-0.025em',
              color: cadenceColor,
            }}
          >
            Cadence
          </span>
        </div>

        {/* Tagline */}
        {showTagline && size !== 'sm' && s.tagSize > 0 && (
          <span
            style={{
              fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
              fontSize: s.tagSize,
              fontWeight: 400,
              letterSpacing: '0.005em',
              color: tagColor,
              marginTop: 2,
              whiteSpace: 'nowrap',
            }}
          >
            Run your business while protecting your relationship.
          </span>
        )}
      </div>
    </div>
  );
}
