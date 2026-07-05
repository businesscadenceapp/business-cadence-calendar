import { useState, createContext, useContext, ReactNode, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { usePerson } from "@/contexts/PersonContext";
import { clearAuth } from "@/components/PasswordGate";

// ─── Identity Context (shim for Board.tsx useIdentity hook) ──────────────────
// currentUser is now always the logged-in person's name from PersonContext.

interface IdentityCtx {
  currentUser: string | null;
}

const IdentityContext = createContext<IdentityCtx>({ currentUser: null });

export function useIdentity() {
  return useContext(IdentityContext);
}

// ─── Author colors ────────────────────────────────────────────────────────────
function nameToColor(name: string): { dot: string } {
  const dots = ["#2563EB", "#E11D48", "#059669", "#D97706", "#7C3AED"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return { dot: dots[Math.abs(hash) % dots.length] };
}

// ─── Nav items ────────────────────────────────────────────────────────────────

interface NavItem {
  path: string;
  label: string;
  icon: string;
  activeColor: string;
}

const OWNER_NAV: NavItem[] = [
  { path: "/app/board",    label: "Board",    icon: "📋", activeColor: "#2563EB" },
  { path: "/app/goals",    label: "Goals",    icon: "🎯", activeColor: "#7C3AED" },
  { path: "/app/kpi",      label: "KPIs",     icon: "📈", activeColor: "#059669" },
  { path: "/app/reports",  label: "Reports",  icon: "📊", activeColor: "#0D9488" },
  { path: "/app/calendar", label: "Calendar", icon: "📅", activeColor: "#0EA5E9" },
  { path: "/app/settings", label: "Settings", icon: "⚙️", activeColor: "#64748B" },
];

const EMPLOYEE_NAV: NavItem[] = [
  { path: "/app/board",    label: "Board",    icon: "📋", activeColor: "#2563EB" },
  { path: "/app/kpi",      label: "KPIs",     icon: "📈", activeColor: "#059669" },
];

// ─── Page Transition ─────────────────────────────────────────────────────────

function PageTransition({ children, locationKey }: { children: ReactNode; locationKey: string }) {
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionState, setTransitionState] = useState<"in" | "out">("in");
  const prevKeyRef = useRef(locationKey);

  useEffect(() => {
    if (locationKey !== prevKeyRef.current) {
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
  const [location, navigate] = useLocation();
  const { person, setPerson } = usePerson();

  const activePath = location === "/app" ? "/app/board" : location;

  // Employees only see Board + KPIs; owners/co-owners see full nav
  const NAV_ITEMS = person?.role === "employee" ? EMPLOYEE_NAV : OWNER_NAV;

  const handleSignOut = () => {
    setPerson(null);
    clearAuth();
    navigate("/login");
  };

  const roleLabel = person
    ? person.role === "coowner" ? "Co-owner"
    : person.role === "employee" ? "Employee"
    : "Owner"
    : "";

  return (
    <IdentityContext.Provider value={{ currentUser: person?.name ?? null }}>
      <div
        className="flex h-screen overflow-hidden"
        style={{ backgroundColor: "#F8F7F4", fontFamily: "'Inter', sans-serif" }}
      >
        {/* ── Desktop Sidebar ── */}
        <aside
          className="hidden md:flex flex-col flex-shrink-0 h-full"
          style={{ width: "220px", backgroundColor: "#FFFFFF", borderRight: "1px solid #E2E8F0" }}
        >
          {/* Brand */}
          <div
            className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
            style={{ borderBottom: "1px solid #F1F0ED" }}
          >
            {/* Logo icon — matches BrandLogo: lavender pill + navy double-note */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "#EEF2FF",
                boxShadow: "0 2px 8px rgba(30,58,95,0.12)",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Beam */}
                <rect x="7.5" y="4" width="10" height="2.5" rx="1" fill="#1E3A5F" transform="rotate(-8, 7.5, 4)" />
                {/* Left stem */}
                <rect x="7.5" y="5.5" width="2" height="12" rx="0.5" fill="#1E3A5F" />
                {/* Right stem */}
                <rect x="15.5" y="3.5" width="2" height="12" rx="0.5" fill="#1E3A5F" />
                {/* Left note head */}
                <ellipse cx="6.5" cy="18.5" rx="3.2" ry="2.4" fill="#1E3A5F" transform="rotate(-15, 6.5, 18.5)" />
                {/* Right note head */}
                <ellipse cx="14.5" cy="16.5" rx="3.2" ry="2.4" fill="#1E3A5F" transform="rotate(-15, 14.5, 16.5)" />
              </svg>
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

          {/* Logged-in person + sign out */}
          <div
            className="px-4 py-4 flex-shrink-0"
            style={{ borderTop: "1px solid #F1F0ED" }}
          >
            {person ? (
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0 text-white"
                  style={{ backgroundColor: nameToColor(person.name).dot }}
                >
                  {person.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold text-[#1E3A5F] truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {person.name}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{roleLabel}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex-shrink-0 text-[10px] text-slate-400 hover:text-red-500 transition-colors px-1.5 py-1 rounded hover:bg-red-50"
                  title="Sign out"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="w-full text-[11px] font-semibold text-[#2563EB] hover:underline text-center"
              >
                Sign in
              </button>
            )}
          </div>
        </aside>

        {/* ── Main content area ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
                  style={{ color: isActive ? item.activeColor : "#94A3B8" }}
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
            {/* Mobile person avatar — tap to sign out */}
            <button
              onClick={person ? handleSignOut : () => navigate("/login")}
              className="flex flex-col items-center justify-center px-2 gap-0.5 active:scale-95 transition-transform"
              title={person ? "Sign out" : "Sign in"}
            >
              {person ? (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                  style={{ backgroundColor: nameToColor(person.name).dot }}
                >
                  {person.name.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] bg-slate-100 text-slate-500 font-bold">
                  👤
                </div>
              )}
              <span className="text-[8px] text-slate-400" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {person ? person.name.split(" ")[0] : "Sign in"}
              </span>
            </button>
          </nav>
        </div>
      </div>
    </IdentityContext.Provider>
  );
}
