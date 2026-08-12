import { useState } from "react";

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: (hideFutureReminder: boolean) => void;
};

export function SleepModeConfirmCard({ open, onCancel, onConfirm }: Props) {
  const [hideFutureReminder, setHideFutureReminder] = useState(false);

  if (!open) return null;

  return (
    <div
      role="presentation"
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "20px 16px calc(env(safe-area-inset-bottom, 0px) + 16px)", background: "rgba(2,8,18,0.72)", backdropFilter: "blur(8px)" }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="sleep-mode-title"
        aria-describedby="sleep-mode-description"
        style={{ width: "100%", maxWidth: "430px", borderRadius: "24px", padding: "24px", background: "linear-gradient(145deg, #132A46 0%, #0A1929 100%)", border: "1px solid rgba(167,139,250,0.4)", boxShadow: "0 20px 56px rgba(0,0,0,0.55), 0 0 32px rgba(167,139,250,0.14)", animation: "sheetSlideUp 0.28s cubic-bezier(0.23,1,0.32,1) both" }}
      >
        <div style={{ width: "54px", height: "54px", borderRadius: "18px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "27px", marginBottom: "16px", background: "rgba(167,139,250,0.14)", border: "1px solid rgba(167,139,250,0.34)", boxShadow: "0 0 20px rgba(167,139,250,0.16)" }}>
          🌙
        </div>
        <h2 id="sleep-mode-title" style={{ margin: "0 0 8px", color: "#FFFFFF", fontSize: "20px", lineHeight: 1.2, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>
          Turn on Sleep Mode?
        </h2>
        <p id="sleep-mode-description" style={{ margin: 0, color: "rgba(255,255,255,0.7)", fontSize: "14px", lineHeight: 1.58 }}>
          You will not receive notifications from your partner while Sleep Mode is on. You can still work, post, and use every part of the app normally.
        </p>

        <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", margin: "20px 0" }}>
          <input
            type="checkbox"
            checked={hideFutureReminder}
            onChange={event => setHideFutureReminder(event.target.checked)}
            style={{ width: "18px", height: "18px", accentColor: "#A78BFA", marginTop: "1px", flexShrink: 0 }}
          />
          <span style={{ color: "rgba(255,255,255,0.62)", fontSize: "13px", lineHeight: 1.45 }}>
            Don’t show this reminder again
          </span>
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.35fr", gap: "10px" }}>
          <button type="button" onClick={onCancel} style={{ minHeight: "46px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.8)", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>
            Cancel
          </button>
          <button type="button" onClick={() => onConfirm(hideFutureReminder)} style={{ minHeight: "46px", borderRadius: "14px", border: "1px solid rgba(167,139,250,0.55)", background: "linear-gradient(135deg, #8B5CF6, #6366F1)", color: "#FFFFFF", fontSize: "14px", fontWeight: 800, cursor: "pointer", boxShadow: "0 8px 22px rgba(99,102,241,0.28)" }}>
            Turn On Sleep Mode
          </button>
        </div>
      </section>
    </div>
  );
}
