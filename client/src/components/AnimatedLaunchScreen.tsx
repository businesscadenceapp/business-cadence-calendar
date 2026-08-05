/**
 * AnimatedLaunchScreen — shown immediately after the native splash screen dismisses.
 * Full-screen navy background with the large beating heart and haptic vibration
 * matching each heartbeat. Auto-dismisses after ~2.5 seconds.
 */
import { useEffect, useState } from "react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";

const HEART_SRC = "/manus-storage/heart-transparent-clean_14235c91.png";

async function hapticBeat() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
    await new Promise(r => setTimeout(r, 150));
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch { /* ignore */ }
}

interface Props {
  onDone: () => void;
}

export default function AnimatedLaunchScreen({ onDone }: Props) {
  const [visible, setVisible] = useState(true);
  const [beat, setBeat] = useState(false);

  useEffect(() => {
    // Fire first heartbeat at 300ms
    const t1 = setTimeout(async () => {
      setBeat(true);
      await hapticBeat();
      setTimeout(() => setBeat(false), 300);
    }, 300);

    // Fire second heartbeat at 1100ms
    const t2 = setTimeout(async () => {
      setBeat(true);
      await hapticBeat();
      setTimeout(() => setBeat(false), 300);
    }, 1100);

    // Fire third heartbeat at 1900ms
    const t3 = setTimeout(async () => {
      setBeat(true);
      await hapticBeat();
      setTimeout(() => setBeat(false), 300);
    }, 1900);

    // Start fade-out at 2400ms, call onDone at 2700ms
    const t4 = setTimeout(() => setVisible(false), 2400);
    const t5 = setTimeout(() => onDone(), 2700);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, [onDone]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#0A1929",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease-out",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <img
        src={HEART_SRC}
        alt="Business Cadence"
        style={{
          width: "65vw",
          maxWidth: 320,
          height: "auto",
          objectFit: "contain",
          transform: beat ? "scale(1.18)" : "scale(1)",
          transition: beat
            ? "transform 0.12s cubic-bezier(0.23, 1, 0.32, 1)"
            : "transform 0.25s cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      />
    </div>
  );
}
