import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "wouter";
import { SplashScreen } from "@capacitor/splash-screen";
import { BrandIcon } from "@/components/BrandLogo";

/** Native-only opening page shown immediately after the iOS launch frame. */
export default function TarsaOpening() {
  const [, navigate] = useLocation();

  useLayoutEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const previous = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyWidth: body.style.width,
      bodyHeight: body.style.height,
      bodyTop: body.style.top,
      bodyRight: body.style.right,
      bodyBottom: body.style.bottom,
      bodyLeft: body.style.left,
      bodyBackground: body.style.backgroundColor,
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      htmlBackground: html.style.backgroundColor,
      htmlScrollBehavior: html.style.scrollBehavior,
    };

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.width = "100%";
    body.style.height = "100%";
    body.style.top = "0";
    body.style.right = "0";
    body.style.bottom = "0";
    body.style.left = "0";
    body.style.backgroundColor = "#08182d";
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    html.style.backgroundColor = "#08182d";
    html.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);

    return () => {
      body.style.overflow = previous.bodyOverflow;
      body.style.position = previous.bodyPosition;
      body.style.width = previous.bodyWidth;
      body.style.height = previous.bodyHeight;
      body.style.top = previous.bodyTop;
      body.style.right = previous.bodyRight;
      body.style.bottom = previous.bodyBottom;
      body.style.left = previous.bodyLeft;
      body.style.backgroundColor = previous.bodyBackground;
      html.style.overflow = previous.htmlOverflow;
      html.style.overscrollBehavior = previous.htmlOverscroll;
      html.style.backgroundColor = previous.htmlBackground;
      html.style.scrollBehavior = previous.htmlScrollBehavior;
    };
  }, []);

  useEffect(() => {
    // Keep the native navy splash in place until this stationary web screen
    // has rendered, then remove it instantly. This avoids Capacitor hiding the
    // native layer mid-load and making the TARSA page appear to drop into view.
    const frameId = window.requestAnimationFrame(() => {
      void SplashScreen.hide({ fadeOutDuration: 0 }).catch(() => undefined);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const continueIntoApp = () => {
    const authFlag = localStorage.getItem("bcc_auth_v1");
    navigate(authFlag === "granted" ? "/select-business" : "/subscribe-intro");
  };

  return (
    <main
      className="overflow-hidden"
      style={{
        position: "fixed",
        inset: 0,
        height: "100%",
        background: "radial-gradient(circle at 50% 24%, #18385e 0%, #0f2440 42%, #08182d 100%)",
        color: "#fff",
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        overscrollBehavior: "none",
        touchAction: "pan-x",
        transition: "none",
        transform: "none",
      }}
    >
      <section
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "56px 30px max(36px, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
          <div style={{ filter: "drop-shadow(0 18px 28px rgba(0,0,0,0.34))" }}>
            <BrandIcon size={144} className="mx-auto" />
          </div>
          <p
            style={{
              marginTop: 32,
              marginBottom: 8,
              fontSize: "clamp(32px, 9.4vw, 43px)",
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
