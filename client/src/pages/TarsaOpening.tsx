import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { BrandIcon } from "@/components/BrandLogo";

type OpeningStage = "brand" | "definition";

/**
 * Native-only opening sequence. The initial brand frame hands off naturally
 * from the iOS launch image, then presents TARSA's meaning until the user is
 * ready to continue into their Business Card selection.
 */
export default function TarsaOpening() {
  const [, navigate] = useLocation();
  const [stage, setStage] = useState<OpeningStage>("brand");

  useEffect(() => {
    const timer = window.setTimeout(() => setStage("definition"), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  const continueIntoApp = () => {
    const authFlag = localStorage.getItem("bcc_auth_v1");
    navigate(authFlag === "granted" ? "/select-business" : "/subscribe-intro");
  };

  return (
    <main
      className="min-h-[100dvh] overflow-hidden"
      style={{
        background: "radial-gradient(circle at 50% 24%, #18385e 0%, #0f2440 42%, #08182d 100%)",
        color: "#fff",
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <section
        aria-hidden={stage !== "brand"}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          padding: "48px 28px max(48px, env(safe-area-inset-bottom, 0px))",
          opacity: stage === "brand" ? 1 : 0,
          transform: stage === "brand" ? "scale(1)" : "scale(1.03)",
          pointerEvents: "none",
          transition: "opacity 500ms cubic-bezier(0.23,1,0.32,1), transform 500ms cubic-bezier(0.23,1,0.32,1)",
        }}
      >
        <div style={{ filter: "drop-shadow(0 16px 24px rgba(0,0,0,0.34))" }}>
          <BrandIcon size={146} />
        </div>
        <span
          style={{
            fontSize: "clamp(31px, 9vw, 42px)",
            letterSpacing: "0.12em",
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          TARSA
        </span>
      </section>

      <section
        aria-hidden={stage !== "definition"}
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "56px 30px max(36px, env(safe-area-inset-bottom, 0px))",
          opacity: stage === "definition" ? 1 : 0,
          transform: stage === "definition" ? "translateY(0)" : "translateY(18px)",
          pointerEvents: stage === "definition" ? "auto" : "none",
          transition: "opacity 520ms cubic-bezier(0.23,1,0.32,1), transform 520ms cubic-bezier(0.23,1,0.32,1)",
        }}
      >
        <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
          <BrandIcon size={76} className="mx-auto" />
          <p
            style={{
              marginTop: 34,
              marginBottom: 8,
              fontSize: "clamp(30px, 9vw, 40px)",
              fontWeight: 650,
              letterSpacing: "0.08em",
              lineHeight: 1.1,
            }}
          >
            TARSA
          </p>
          <p
            style={{
              margin: 0,
              color: "#7dd3fc",
              fontSize: "18px",
              fontWeight: 500,
              letterSpacing: "0.02em",
            }}
          >
            (n.) /'tar-shah/
          </p>
          <div
            style={{
              width: 46,
              height: 2,
              margin: "34px auto",
              borderRadius: 999,
              background: "linear-gradient(90deg, transparent, #33A2DB, transparent)",
            }}
          />
          <p
            style={{
              margin: 0,
              color: "rgba(255,255,255,0.88)",
              fontSize: "clamp(22px, 6.4vw, 29px)",
              lineHeight: 1.42,
              fontWeight: 400,
            }}
          >
            Derived from the Hungarian word for “their partner” or “companion.”
          </p>
        </div>

        <button
          type="button"
          onClick={continueIntoApp}
          style={{
            width: "min(100%, 360px)",
            marginTop: 58,
            minHeight: 54,
            border: "1px solid rgba(125,211,252,0.55)",
            borderRadius: 16,
            color: "#061525",
            background: "linear-gradient(135deg, #7dd3fc 0%, #33A2DB 100%)",
            fontSize: "16px",
            fontWeight: 750,
            fontFamily: "inherit",
            boxShadow: "0 12px 28px rgba(51,162,219,0.28)",
            cursor: "pointer",
          }}
        >
          Continue
        </button>
      </section>
    </main>
  );
}
