import { Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #0A1929 0%, #0F2440 100%)" }}>
      <div className="w-full max-w-lg mx-4 text-center rounded-2xl p-10"
        style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>

        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
            style={{ backgroundColor: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}>
            🔍
          </div>
        </div>

        <h1 className="text-6xl font-bold text-white mb-2"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}>404</h1>

        <h2 className="text-xl font-semibold text-white mb-4"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Page Not Found
        </h2>

        <p className="mb-8 leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
          Sorry, the page you are looking for doesn't exist.
          <br />
          It may have been moved or deleted.
        </p>

        <button
          onClick={() => setLocation("/")}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #3B9EE8, #2980c9)", color: "#0F2440" }}
        >
          <Home className="w-4 h-4" />
          Go Home
        </button>
      </div>
    </div>
  );
}
