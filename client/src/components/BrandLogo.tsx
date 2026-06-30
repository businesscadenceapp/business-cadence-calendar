/**
 * BrandLogo — Inline SVG + text logo for BusinessCadence.
 * Renders crisply at any size on both retina and standard displays.
 * No image file dependency — scales perfectly on mobile and desktop.
 */

interface BrandLogoProps {
  /** Controls overall scale. Default: "md" */
  size?: "sm" | "md" | "lg" | "xl";
  /** Color theme. Default: "dark" (navy on transparent) */
  theme?: "dark" | "light" | "white";
  /** Show only the icon, no text */
  iconOnly?: boolean;
  className?: string;
}

const SIZE_CONFIG = {
  sm: { iconSize: 18, fontSize: 15, gap: 6, fontWeight: 600 },
  md: { iconSize: 24, fontSize: 19, gap: 8, fontWeight: 600 },
  lg: { iconSize: 32, fontSize: 26, gap: 10, fontWeight: 700 },
  xl: { iconSize: 44, fontSize: 36, gap: 14, fontWeight: 700 },
};

const THEME_CONFIG = {
  dark: { iconColor: "#1E3A5F", textColor: "#1E3A5F", accentColor: "#0D9488" },
  light: { iconColor: "#FFFFFF", textColor: "#FFFFFF", accentColor: "#5EEAD4" },
  white: { iconColor: "#FFFFFF", textColor: "#FFFFFF", accentColor: "#A5F3FC" },
};

export default function BrandLogo({
  size = "md",
  theme = "dark",
  iconOnly = false,
  className = "",
}: BrandLogoProps) {
  const { iconSize, fontSize, gap, fontWeight } = SIZE_CONFIG[size];
  const { iconColor, textColor, accentColor } = THEME_CONFIG[theme];

  return (
    <div
      className={`flex items-center select-none ${className}`}
      style={{ gap }}
      aria-label="BusinessCadence"
    >
      {/* Musical note icon — double eighth notes (beamed quavers) */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        {/* Beam connecting the two notes */}
        <rect x="8.5" y="3" width="9" height="2.2" rx="1.1" fill={iconColor} />
        {/* Left note stem */}
        <rect x="8.5" y="3" width="2" height="11" rx="1" fill={iconColor} />
        {/* Right note stem */}
        <rect x="15.5" y="3" width="2" height="9" rx="1" fill={iconColor} />
        {/* Left note head */}
        <ellipse cx="9.5" cy="15.5" rx="3.2" ry="2.2" transform="rotate(-15 9.5 15.5)" fill={iconColor} />
        {/* Right note head */}
        <ellipse cx="16.5" cy="13.5" rx="3.2" ry="2.2" transform="rotate(-15 16.5 13.5)" fill={accentColor} />
      </svg>

      {/* Brand text */}
      {!iconOnly && (
        <span
          style={{
            fontSize,
            fontWeight,
            fontFamily: "'Inter', 'Space Grotesk', system-ui, sans-serif",
            letterSpacing: "-0.02em",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color: textColor, fontWeight: fontWeight - 100 }}>Business</span>
          <span style={{ color: accentColor, fontWeight }}>Cadence</span>
        </span>
      )}
    </div>
  );
}
