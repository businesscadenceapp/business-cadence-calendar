import { useEffect, useState } from "react";

/**
 * Two-screen animated splash sequence:
 *   Screen 1 (1.6s): Logo circle + "BusinessCadence" title
 *   Screen 2 (1.6s): Tagline "Stop being out of sync. / Start building a rhythm."
 *   Then fades out and calls onComplete()
 *
 * Runs entirely in React — no Xcode rebuild needed.
 * Respects prefers-reduced-motion: skips animation, shows screen 2 briefly, then exits.
 */

const SPLASH_SHOWN_KEY = "bcc_splash_v1";

interface SplashScreenProps {
  onComplete: () => void;
  /** If true, always show splash (e.g. for testing). Default: only show once per session. */
  forceShow?: boolean;
}

type Phase = "screen1" | "crossfade" | "screen2" | "exit";

export default function SplashScreen({ onComplete, forceShow }: SplashScreenProps) {
  const [phase, setPhase] = useState<Phase>("screen1");
  const [visible, setVisible] = useState(true);

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (prefersReduced) {
      // Skip animation — show screen 2 briefly then exit
      setPhase("screen2");
      const t = setTimeout(() => {
        setVisible(false);
        setTimeout(onComplete, 300);
      }, 1200);
      return () => clearTimeout(t);
    }

    // Normal animated sequence
    // Phase timing:
    //   0ms      → screen1 visible (fade in)
    //   2000ms   → crossfade to screen2
    //   2300ms   → screen2 fully visible
    //   4000ms   → start exit fade
    //   4300ms   → call onComplete

    const t1 = setTimeout(() => setPhase("crossfade"), 2000);
    const t2 = setTimeout(() => setPhase("screen2"), 2300);
    const t3 = setTimeout(() => {
      setPhase("exit");
      setVisible(false);
    }, 4000);
    const t4 = setTimeout(onComplete, 4300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible && phase === "exit") return null;

  const screen1Opacity =
    phase === "screen1" ? 1 : phase === "crossfade" ? 0 : 0;
  const screen2Opacity =
    phase === "screen2" ? 1 : phase === "crossfade" ? 0.5 : phase === "exit" ? 0 : 0;
  const wrapperOpacity = phase === "exit" ? 0 : 1;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#080E2D",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "opacity 0.3s ease-out",
        opacity: wrapperOpacity,
        pointerEvents: phase === "exit" ? "none" : "all",
      }}
    >
      {/* ── SCREEN 1: Logo + Title ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          opacity: screen1Opacity,
          transition: "opacity 0.35s ease-out",
          pointerEvents: "none",
        }}
      >
        {/* Logo circle */}
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "radial-gradient(circle at 40% 40%, #1a4a44 0%, #0d2b28 60%, #080E2D 100%)",
            boxShadow: "0 0 48px 12px rgba(94,236,212,0.25), 0 0 0 3px rgba(94,236,212,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Music note — clean eighth note using standard paths */}
          <svg
            width="48"
            height="48"
            viewBox="0 0 100 100"
            fill="#5EECD4"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Note head: proper oval, slightly tilted */}
            <ellipse cx="30" cy="76" rx="18" ry="13" transform="rotate(-15 30 76)" />
            {/* Stem: tall vertical bar from right of note head */}
            <rect x="46" y="18" width="6" height="60" rx="3" />
            {/* Flag: single clean bezier curve */}
            <path d="M52 18 C80 28 80 52 52 60" strokeWidth="0" />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: "-0.5px",
            lineHeight: 1,
          }}
        >
          <span style={{ color: "#ffffff" }}>Business</span>
          <span style={{ color: "#5EECD4" }}>Cadence</span>
        </div>
      </div>

      {/* ── SCREEN 2: Tagline ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: screen2Opacity,
          transition: "opacity 0.35s ease-out",
          pointerEvents: "none",
          padding: "0 32px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
            fontSize: 26,
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.3,
          }}
        >
          Stop being out of sync.
        </div>
        <div
          style={{
            fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
            fontSize: 26,
            fontWeight: 700,
            color: "#5EECD4",
            lineHeight: 1.3,
          }}
        >
          Start building a rhythm.
        </div>
      </div>
    </div>
  );
}

/**
 * Returns true if the splash should be shown this session.
 * Shows once per browser session (sessionStorage), unless forceShow=true.
 */
export function shouldShowSplash(forceShow?: boolean): boolean {
  if (forceShow) return true;
  if (typeof sessionStorage === "undefined") return false;
  if (sessionStorage.getItem(SPLASH_SHOWN_KEY)) return false;
  sessionStorage.setItem(SPLASH_SHOWN_KEY, "1");
  return true;
}
