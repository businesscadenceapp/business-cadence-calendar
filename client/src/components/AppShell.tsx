import { useState, createContext, useContext, ReactNode, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { usePerson } from "@/contexts/PersonContext";
import PersonLoginModal from "@/components/PersonLoginModal";

// ─── Identity Context (legacy shim — now backed by PersonContext) ─────────────

type Author = string; // now any person's name

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
// Generate a consistent color from a name string
function nameToColor(name: string): { bg: string; text: string; border: string; dot: string } {
  const colors = [
    { bg: "#DBEAFE", text: "#1D4ED8", border: "#93C5FD", dot: "#2563EB" },
    { bg: "#FFE4E6", text: "#BE123C", border: "#FECDD3", dot: "#E11D48" },
    { bg: "#D1FAE5", text: "#065F46", border: "#6EE7B7", dot: "#059669" },
    { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D", dot: "#D97706" },
    { bg: "#EDE9FE", text: "#5B21B6", border: "#C4B5FD", dot: "#7C3AED" },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

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
  { path: "/app/kpi",      label: "KPIs",     icon: "📈", activeColor: "#059669" },
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
  const { person, setPerson } = usePerson();

  // Derive currentUser from person session
  const currentUser = person?.name ?? null;
  const setCurrentUser = (_u: Author) => {}; // no-op: identity comes from login

  // Get accountId from localStorage (set during business account login)
  const accountId = (() => {
    try { return parseInt(localStorage.getItem("bcc_account_id") ?? "0", 10) || 0; } catch { return 0; }
  })();

  // Show person login modal if no person session exists (but business account is logged in)
  const showPersonModal = !person && accountId > 0;

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

          {/* Logged-in person display */}
          <div
            className="px-4 py-4 flex-shrink-0"
            style={{ borderTop: "1px solid #F1F0ED" }}
          >
            {person ? (
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0"
                  style={{
                    backgroundColor: nameToColor(person.name).dot,
                    color: "white",
                  }}
                >
                  {person.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-[#1E3A5F] truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {person.name}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate capitalize">{person.role === "coowner" ? "Co-owner" : person.role}</p>
                </div>
                <button
                  onClick={() => setPerson(null)}
                  className="ml-auto text-[10px] text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                  title="Sign out of personal account"
                >
                  ✕
                </button>
              </div>
            ) : (
              <p className="text-[10px] text-amber-600 text-center" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                ⚠️ No personal account
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
            {/* Mobile person avatar */}
            <div className="flex flex-col items-center justify-center px-2 gap-0.5">
              {person ? (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                  style={{ backgroundColor: nameToColor(person.name).dot, color: "white" }}
                >
                  {person.name.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] bg-amber-100 text-amber-600 font-bold">?</div>
              )}
              <span className="text-[8px] text-slate-400" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {person ? person.name.split(" ")[0] : "Login"}
              </span>
            </div>
          </nav>
        </div>
      </div>
      {/* Person login modal — shown when no person session exists */}
      {showPersonModal && <PersonLoginModal accountId={accountId} />}
    </IdentityContext.Provider>
  );
}
