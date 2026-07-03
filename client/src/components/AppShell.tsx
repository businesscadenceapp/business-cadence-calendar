import { useState, createContext, useContext, ReactNode, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";

// ─── Identity Context ─────────────────────────────────────────────────────────

type Author = "Matt" | "Lynn";
const IDENTITY_KEY = "bcc_identity";

interface IdentityCtx {
  currentUser: Author | null;
  setCurrentUser: (u: Author) => void;
}

const IdentityContext = createContext<IdentityCtx>({
  currentUser: null,
  setCurrentUser: () => {},
});

export function useIdentity() {
  return useContext(IdentityContext);
}

// ─── Author colors ────────────────────────────────────────────────────────────

const AUTHOR_COLORS: Record<Author, { bg: string; text: string; border: string; dot: string }> = {
  Matt: { bg: "#DBEAFE", text: "#1D4ED8", border: "#93C5FD", dot: "#2563EB" },
  Lynn: { bg: "#FFE4E6", text: "#BE123C", border: "#FECDD3", dot: "#E11D48" },
};

// ─── Nav items ────────────────────────────────────────────────────────────────

interface NavItem {
  path: string;
  label: string;
  icon: string;
  activeColor: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: "/app/board",    label: "Board",    icon: "📋", activeColor: "#2563EB" },
  { path: "/app/goals",    label: "Goals",    icon: "🎯", activeColor: "#7C3AED" },
  { path: "/app/reports",  label: "Reports",  icon: "📊", activeColor: "#0D9488" },
  { path: "/app/calendar", label: "Calendar", icon: "📅", activeColor: "#0EA5E9" },
  { path: "/app/settings", label: "Settings", icon: "⚙️", activeColor: "#64748B" },
];

// ─── Page Transition ─────────────────────────────────────────────────────────

function PageTransition({ children, locationKey }: { children: ReactNode; locationKey: string }) {
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionState, setTransitionState] = useState<"in" | "out">("in");
  const prevKeyRef = useRef(locationKey);

  useEffect(() => {
    if (locationKey !== prevKeyRef.current) {
      // Start exit
      setTransitionState("out");
      const timer = setTimeout(() => {
        setDisplayChildren(children);
        prevKeyRef.current = locationKey;
        setTransitionState("in");
      }, 120);
      return () => clearTimeout(timer);
    } else {
      setDisplayChildren(children);
    }
  }, [locationKey, children]);

  return (
    <div
      style={{
        opacity: transitionState === "out" ? 0 : 1,
        transform: transitionState === "out" ? "translateX(6px)" : "translateX(0)",
        transition: transitionState === "in"
          ? "opacity 150ms cubic-bezier(0.23,1,0.32,1), transform 150ms cubic-bezier(0.23,1,0.32,1)"
          : "opacity 100ms ease-in, transform 100ms ease-in",
        height: "100%",
      }}
    >
      {displayChildren}
    </div>
  );
}

// ─── AppShell ─────────────────────────────────────────────────────────────────

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [location] = useLocation();
  const [currentUser, setCurrentUserState] = useState<Author | null>(() => {
    const saved = localStorage.getItem(IDENTITY_KEY);
    return saved === "Matt" || saved === "Lynn" ? saved : null;
  });

  const setCurrentUser = (u: Author) => {
    localStorage.setItem(IDENTITY_KEY, u);
    setCurrentUserState(u);
  };

  // Derive active path (normalize /app → /app/board)
  const activePath = location === "/app" ? "/app/board" : location;

  return (
    <IdentityContext.Provider value={{ currentUser, setCurrentUser }}>
      <div
        className="flex h-screen overflow-hidden"
        style={{ backgroundColor: "#F8F7F4", fontFamily: "'Inter', sans-serif" }}
      >
        {/* ── Desktop Sidebar ── */}
        <aside
          className="hidden md:flex flex-col flex-shrink-0 h-full"
          style={{
            width: "220px",
            backgroundColor: "#FFFFFF",
            borderRight: "1px solid #E2E8F0",
          }}
        >
          {/* Brand */}
          <div
            className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
            style={{ borderBottom: "1px solid #F1F0ED" }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #2563EB 0%, #E11D48 100%)",
                boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
              }}
            >
              🎵
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#1E3A5F] leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                BusinessCadence
              </p>
              <p className="text-[10px] text-slate-400">Co-owner OS</p>
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
            {NAV_ITEMS.map(item => {
              const isActive = activePath === item.path || activePath.startsWith(item.path + "/");
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150"
                  style={{
                    backgroundColor: isActive ? `${item.activeColor}15` : "transparent",
                    color: isActive ? item.activeColor : "#64748B",
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>
                  {item.label}
                  {isActive && (
                    <div
                      className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.activeColor }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Identity selector */}
          <div
            className="px-4 py-4 flex-shrink-0"
            style={{ borderTop: "1px solid #F1F0ED" }}
          >
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 px-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              I am
            </p>
            <div className="flex gap-2">
              {(["Matt", "Lynn"] as Author[]).map(a => {
                const c = AUTHOR_COLORS[a];
                const isActive = currentUser === a;
                return (
                  <button
                    key={a}
                    onClick={() => setCurrentUser(a)}
                    className="flex-1 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-[0.97]"
                    style={{
                      backgroundColor: isActive ? c.bg : "#F8FAFC",
                      border: `2px solid ${isActive ? c.border : "#E2E8F0"}`,
                      color: isActive ? c.text : "#94A3B8",
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
            {!currentUser && (
              <p className="text-[10px] text-amber-600 mt-2 text-center" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                👆 Select to post
              </p>
            )}
          </div>
        </aside>

        {/* ── Main content area ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Page content with animated transition */}
          <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
            <PageTransition locationKey={activePath}>
              {children}
            </PageTransition>
          </main>

          {/* ── Mobile Bottom Tab Bar ── */}
          <nav
            className="md:hidden flex-shrink-0 flex items-stretch"
            style={{
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #E2E8F0",
              height: "60px",
              position: "sticky",
              bottom: 0,
              zIndex: 50,
            }}
          >
            {NAV_ITEMS.map(item => {
              const isActive = activePath === item.path || activePath.startsWith(item.path + "/");
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className="relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-150 active:scale-95"
                  style={{
                    color: isActive ? item.activeColor : "#94A3B8",
                  }}
                >
                  <span className="text-[18px] leading-none">{item.icon}</span>
                  <span
                    className="text-[9px] font-semibold leading-none"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <div
                      className="absolute bottom-0 w-8 h-0.5 rounded-full"
                      style={{ backgroundColor: item.activeColor }}
                    />
                  )}
                </Link>
              );
            })}
            {/* Mobile identity pill — compact, at the right edge */}
            <div className="flex flex-col items-center justify-center px-2 gap-0.5">
              <div className="flex gap-1">
                {(["Matt", "Lynn"] as Author[]).map(a => {
                  const c = AUTHOR_COLORS[a];
                  const isMe = currentUser === a;
                  return (
                    <button
                      key={a}
                      onClick={() => setCurrentUser(a)}
                      className="w-7 h-7 rounded-full text-[10px] font-bold transition-all active:scale-90"
                      style={{
                        backgroundColor: isMe ? c.dot : "#F1F5F9",
                        color: isMe ? "white" : "#94A3B8",
                        border: `2px solid ${isMe ? c.dot : "#E2E8F0"}`,
                      }}
                    >
                      {a[0]}
                    </button>
                  );
                })}
              </div>
              <span className="text-[8px] text-slate-400" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Me</span>
            </div>
          </nav>
        </div>
      </div>
    </IdentityContext.Provider>
  );
}
