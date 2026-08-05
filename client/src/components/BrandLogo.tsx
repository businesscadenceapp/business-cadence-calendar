/**
 * BrandLogo — Transparent inline logo lockup.
 * Uses the clean transparent crystal heart PNG + pure CSS text.
 * Floats on any background — no box, no border, no background color.
 *
 * BrandIcon — Compact circular icon only (no text).
 */

// ---------------------------------------------------------------------------
// BrandIcon — small circular icon for sidebar / compact spaces
// ---------------------------------------------------------------------------
export function BrandIcon({
  size = 48,
  className = "",
  variant: _variant,
}: {
  size?: number;
  className?: string;
  /** @deprecated kept for API compatibility */
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
        background: 'none',
      }}
      className={className}
      role="img"
      aria-label="BusinessCadence"
    >
      <img
        src="/manus-storage/heart-transparent-clean_14235c91.png"
        alt="BusinessCadence"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// BrandLogo — full horizontal lockup: heart + wordmark + optional tagline
// ---------------------------------------------------------------------------
interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** "dark" = white text (navy/dark bg); "light" = navy text (white/light bg) */
  theme?: "dark" | "light";
  showTagline?: boolean;
}

const SIZES = {
  //          icon  name  tag   gap
  sm: { icon: 28,  name: 16,  tag: 0,   gap: 8  },
  md: { icon: 38,  name: 21,  tag: 11,  gap: 10 },
  lg: { icon: 54,  name: 29,  tag: 13,  gap: 13 },
  xl: { icon: 72,  name: 38,  tag: 16,  gap: 16 },
};

export default function BrandLogo({
  size = "md",
  className = "",
  theme = "dark",
  showTagline = true,
}: BrandLogoProps) {
  const s = SIZES[size];
  const nameColor    = theme === "dark" ? "#FFFFFF"              : "#1E3A5F";
  const cadenceColor = "#3B9EE8";
  const tagColor     = theme === "dark" ? "rgba(255,255,255,0.50)" : "rgba(30,58,95,0.55)";

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        background: 'none',
        userSelect: 'none',
        lineHeight: 1,
      }}
      role="img"
      aria-label="BusinessCadence — Run your business while protecting your relationship."
    >
      {/* Clean transparent crystal heart — no background */}
      <img
        src="/manus-storage/heart-transparent-clean_14235c91.png"
        alt=""
        aria-hidden="true"
        style={{
          width: s.icon,
          height: s.icon,
          objectFit: 'contain',
          flexShrink: 0,
          display: 'block',
        }}
      />

      {/* Text column */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
        {/* Wordmark: Business (regular) + Cadence (bold) */}
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{
            fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
            fontSize: s.name,
            fontWeight: 400,
            letterSpacing: '-0.025em',
            color: nameColor,
          }}>
            Business
          </span>
          <span style={{
            fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
            fontSize: s.name,
            fontWeight: 700,
            letterSpacing: '-0.025em',
            color: cadenceColor,
          }}>
            Cadence
          </span>
        </div>

        {/* Tagline */}
        {showTagline && size !== 'sm' && s.tag > 0 && (
          <span style={{
            fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
            fontSize: s.tag,
            fontWeight: 400,
            letterSpacing: '0.005em',
            color: tagColor,
            marginTop: 3,
            whiteSpace: 'nowrap',
          }}>
            Run your business while protecting your relationship.
          </span>
        )}
      </div>
    </div>
  );
}
