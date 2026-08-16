import { useEffect, useState } from "react";

export const FIRST_USE_GUIDE_PREFIX = "tarsa_first_use_";

export function FirstUseGuide({
  guideId,
  icon,
  title,
  body,
}: {
  guideId: string;
  icon: string;
  title: string;
  body: string;
}) {
  const storageKey = `${FIRST_USE_GUIDE_PREFIX}${guideId}_v1`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(storageKey) !== "seen");
    } catch {
      setVisible(true);
    }
  }, [storageKey]);

  if (!visible) return null;

  const dismiss = () => {
    try { localStorage.setItem(storageKey, "seen"); } catch { /* ignore */ }
    setVisible(false);
  };

  return (
    <div
      className="rounded-xl px-3.5 py-3 flex items-start gap-3"
      style={{ background: "rgba(51,162,219,0.10)", border: "1px solid rgba(125,211,252,0.28)" }}
    >
      <span className="text-lg leading-none mt-0.5" aria-hidden="true">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</p>
        <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.66)" }}>{body}</p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="flex-shrink-0 text-[11px] font-bold px-2.5 py-1.5 rounded-lg active:scale-95"
        style={{ color: "#7DD3FC", background: "rgba(51,162,219,0.13)" }}
      >
        Got it
      </button>
    </div>
  );
}
