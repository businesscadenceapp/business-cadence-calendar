/**
 * AppShell — main layout shell for the authenticated app.
 * Dark navy: #0A1929 sidebar, #0F2440 main bg.
 *
 * Desktop: fixed 220px sidebar with brand, nav, active-business badge,
 *          optional Switch Business button, person row + DND toggle.
 * Mobile:  top bar (brand + Owner/Team toggle + DND + bell) +
 *          fixed bottom tab bar with "More" sheet.
 */

import { useState, useCallback, useContext, createContext, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { usePerson } from "@/contexts/PersonContext";
import { clearAuth } from "@/components/PasswordGate";
import { BrandIcon } from "@/components/BrandLogo";
import { NotificationBell } from "@/components/NotificationBell";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  useActiveBusiness,
  ActiveBusinessBadge,
  SwitchBusinessButton,
  BusinessSwitcherModal,
} from "@/components/BusinessSwitcher";
import { useTour } from "@/contexts/TourContext";
import { TEAM_ENABLED } from "@/featureFlags";

// ─── Identity Context ─────────────────────────────────────────────────────────

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
  { path: "/app/board",    label: "Board",    icon: "📋", activeColor: "#3B9EE8" },
  // Goals, KPIs, Reports now live in the Performance Hub (swipe left on Board)
  { path: "/app/calendar", label: "Calendar", icon: "📅", activeColor: "#3B9EE8" },
  { path: "/app/admin",    label: "Admin",    icon: "🔑", activeColor: "#F87171" },
];

const EMPLOYEE_NAV: NavItem[] = [
  { path: "/app/team",          label: "My Board",  icon: "👥", activeColor: "#A78BFA" },
  { path: "/app/team/calendar", label: "Schedule",  icon: "📅", activeColor: "#3B9EE8" },
  { path: "/app/kpi",           label: "KPIs",      icon: "📈", activeColor: "#3B9EE8" },
  { path: "/app/messages",      label: "Messages",  icon: "💬", activeColor: "#3B9EE8" },
  { path: "/app/checkin",       label: "Check-in",  icon: "✅", activeColor: "#3B9EE8" },
];

// Mobile bottom bar: show first 4 items + "More" for the rest
const MOBILE_PRIMARY_COUNT = 4;

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

// ─── More Sheet (mobile) ──────────────────────────────────────────────────────

function MoreSheet({
  items,
  activePath,
  person,
  onClose,
  onSignOut,
  onSwitchBusiness,
  showSwitchBusiness,
  onGoToSelector,
}: {
  items: NavItem[];
  activePath: string;
  person: { name: string; role: string; accountId?: number; id?: string } | null;
  onClose: () => void;
  onSignOut: () => void;
  onSwitchBusiness?: () => void;
  showSwitchBusiness?: boolean;
  onGoToSelector?: () => void;
}) {
  const roleLabel = person
    ? person.role === "coowner" ? "Co-owner"
    : person.role === "employee" ? "Employee"
    : "Owner"
    : "";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
      />
      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl overflow-hidden"
        style={{
          backgroundColor: "#162d4a",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
        </div>

        {/* Person row */}
        {person && (
          <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ backgroundColor: nameToColor(person.name).dot }}
            >
              {person.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {person.name}
              </p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{roleLabel}</p>
            </div>
            <NotificationBell accountId={person.accountId} personId={person.id} />
          </div>
        )}

        {/* Extra nav items */}
        <div className="px-4 py-3 flex flex-col gap-1">
          {items.map(item => {
            const isActive = activePath === item.path || activePath.startsWith(item.path + "/");
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={onClose}
                className="flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  backgroundColor: isActive ? "rgba(59,158,232,0.12)" : "transparent",
                  color: isActive ? "#3B9EE8" : "rgba(255,255,255,0.7)",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                <span className="text-xl w-7 text-center">{item.icon}</span>
                {item.label}
                {isActive && (
                  <div className="ml-auto w-2 h-2 rounded-full" style={{ backgroundColor: "#3B9EE8" }} />
                )}
              </Link>
            );
          })}

          {/* All Businesses — back to selector for owners/co-owners */}
          {showSwitchBusiness && onGoToSelector && (
            <button
              onClick={() => { onClose(); onGoToSelector(); }}
              className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
              style={{
                backgroundColor: "rgba(59,158,232,0.08)",
                border: "1px solid rgba(59,158,232,0.2)",
                color: "#3B9EE8",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              <span className="text-xl w-7 text-center">←</span>
              All Businesses
            </button>
          )}
          {/* Switch Business — only for multi-business owners/co-owners */}
          {showSwitchBusiness && onSwitchBusiness && (
            <SwitchBusinessButton onClick={() => { onClose(); onSwitchBusiness(); }} compact />
          )}
        </div>

        {/* Sign out */}
        {person && (
          <div className="px-4 pb-4">
            <button
              onClick={onSignOut}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
              style={{
                backgroundColor: "rgba(248,113,113,0.1)",
                border: "1px solid rgba(248,113,113,0.25)",
                color: "#F87171",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── AppShell ─────────────────────────────────────────────────────────────────

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [location, navigate] = useLocation();
  const { person, setPerson } = usePerson();
  const [moreOpen, setMoreOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const { registerRef } = useTour();

  const activePath = location === "/app" ? "/app/board" : location;

  // Active business state
  const { activeBusiness, setActiveBusiness, available } = useActiveBusiness(person?.businessScope);
  const hasMultipleBusinesses = available.length > 1;
  const isOwnerOrCoOwner = person?.role === "owner" || person?.role === "coowner";
  const showSwitchBusiness = isOwnerOrCoOwner && hasMultipleBusinesses;

  // DND state — only loaded when person has an accountId
  const accountId = person?.accountId;
  const { data: bhStatus, refetch: refetchBh } = trpc.businessHours.checkStatus.useQuery(
    { accountId: accountId! },
    { enabled: accountId !== undefined, staleTime: 30_000 }
  );
  const dndActive = bhStatus?.dndActive ?? false;

  const toggleDndMutation = trpc.businessHours.toggleDnd.useMutation({
    onSuccess: (data) => {
      refetchBh();
      toast(data.active ? "Off the Clock — notifications paused" : "Back on the clock", {
        icon: data.active ? "🌙" : "☀️",
        duration: 3000,
      });
    },
  });

  const handleDndToggle = useCallback(() => {
    if (accountId === undefined) return;
    toggleDndMutation.mutate({ accountId });
  }, [accountId, toggleDndMutation]);

  // Employees only see Board + KPIs; owners/co-owners see full nav
  // Admin panel is only visible to owners (not co-owners)
  const isTeamSide = activePath.startsWith("/app/team");
  const baseNav = (person?.role === "employee" || isTeamSide) ? EMPLOYEE_NAV : OWNER_NAV;
  const NAV_ITEMS = person?.role === "owner"
    ? baseNav
    : baseNav.filter(item => item.path !== "/app/admin");

  // Split nav for mobile bottom bar
  const mobilePrimary = NAV_ITEMS.slice(0, MOBILE_PRIMARY_COUNT);
  const moreItems = NAV_ITEMS.slice(MOBILE_PRIMARY_COUNT);
  const moreIsActive = moreItems.some(
    item => activePath === item.path || activePath.startsWith(item.path + "/")
  );

  const handleSignOut = () => {
    setPerson(null);
    clearAuth();
    setMoreOpen(false);
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
        className="flex h-screen overflow-hidden app-shell-root"
        style={{ backgroundColor: "#0F2440", fontFamily: "'Inter', sans-serif" }}
      >
        {/* ── Desktop Sidebar ── */}
        <aside
          className="hidden md:flex flex-col flex-shrink-0 h-full"
          style={{
            width: "220px",
            backgroundColor: "#0A1929",
            borderRight: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Brand */}
          <div
            className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          >
            <BrandIcon size={36} className="flex-shrink-0" variant="teal" />
            <div>
              <p className="text-[13px] font-bold text-white leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                BusinessCadence
              </p>
              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>Co-owner OS</p>
            </div>
          </div>

          {/* Active business badge + back-to-selector — shown for owners/co-owners */}
          {isOwnerOrCoOwner && (
            <div className="px-3 pt-3 pb-1 flex-shrink-0 flex flex-col gap-1.5">
              <button
                onClick={() => navigate("/select-business")}
                className="flex items-center gap-1.5 text-[10px] font-semibold transition-colors w-fit"
                style={{ color: "rgba(255,255,255,0.35)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#3B9EE8")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
                title="Back to business selector"
              >
                <span style={{ fontSize: "10px" }}>←</span>
                All Businesses
              </button>
              <ActiveBusinessBadge businessKey={activeBusiness} />
            </div>
          )}

          {/* Nav items */}
          <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1">
            {/* Owner/Team pill toggle — hidden until TEAM_ENABLED */}
            {isOwnerOrCoOwner && TEAM_ENABLED && (
              <div
                className="flex mb-3 rounded-xl overflow-hidden flex-shrink-0"
                style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <Link
                  href="/app/board"
                  className="flex-1 py-2 text-center text-[11px] font-bold transition-all"
                  style={{
                    backgroundColor: !activePath.startsWith("/app/team") ? "rgba(59,158,232,0.18)" : "transparent",
                    color: !activePath.startsWith("/app/team") ? "#3B9EE8" : "rgba(255,255,255,0.4)",
                    fontFamily: "'Space Grotesk', sans-serif",
                    borderRadius: "10px 0 0 10px",
                  }}
                >
                  👔 Owner
                </Link>
                <Link
                  href="/app/team"
                  className="flex-1 py-2 text-center text-[11px] font-bold transition-all"
                  style={{
                    backgroundColor: activePath.startsWith("/app/team") ? "rgba(167,139,250,0.18)" : "transparent",
                    color: activePath.startsWith("/app/team") ? "#A78BFA" : "rgba(255,255,255,0.4)",
                    fontFamily: "'Space Grotesk', sans-serif",
                    borderRadius: "0 10px 10px 0",
                  }}
                >
                  👥 Team
                </Link>
              </div>
            )}

            {/* Show owner nav or team-side nav based on active path */}
            {(activePath.startsWith("/app/team") && isOwnerOrCoOwner)
              ? EMPLOYEE_NAV.map(item => {
                  const isActive = activePath === item.path || activePath.startsWith(item.path + "/");
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150"
                      style={{
                        backgroundColor: isActive ? "rgba(167,139,250,0.12)" : "transparent",
                        color: isActive ? "#A78BFA" : "rgba(255,255,255,0.55)",
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>
                      {item.label}
                      {isActive && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#A78BFA" }} />
                      )}
                    </Link>
                  );
                })
              : NAV_ITEMS.map(item => {
                  const isActive = activePath === item.path || activePath.startsWith(item.path + "/");
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      ref={(el: HTMLAnchorElement | null) => {
                        if (item.path === "/app/calendar") registerRef("tour-calendar", el);
                        if (item.path === "/app/goals") registerRef("tour-goals", el);
                      }}
                      data-tour={item.path === "/app/calendar" ? "tour-calendar" : item.path === "/app/goals" ? "tour-goals" : undefined}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150"
                      style={{
                        backgroundColor: isActive ? "rgba(59,158,232,0.12)" : "transparent",
                        color: isActive ? "#3B9EE8" : "rgba(255,255,255,0.55)",
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>
                      {item.label}
                      {isActive && (
                        <div
                          className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: "#3B9EE8" }}
                        />
                      )}
                    </Link>
                  );
                })
            }
          </nav>

          {/* Switch Business button — desktop, only for multi-business owners */}
          {showSwitchBusiness && (
            <div className="px-3 pb-2 flex-shrink-0">
              <SwitchBusinessButton onClick={() => navigate("/select-business")} />
            </div>
          )}

          {/* Logged-in person + sign out */}
          <div
            className="px-4 py-4 flex-shrink-0"
            style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
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
                  <p className="text-[12px] font-bold text-white truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {person.name}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{roleLabel}</p>
                </div>
                <NotificationBell accountId={person?.accountId} personId={person?.id} />
                {/* DND toggle — owners and co-owners only */}
                {isOwnerOrCoOwner && (
                  <button
                    ref={(el) => registerRef("tour-sleep", el)}
                    data-tour="tour-sleep"
                    onClick={handleDndToggle}
                    className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-95"
                    style={{
                      backgroundColor: dndActive ? "rgba(167,139,250,0.2)" : "rgba(255,255,255,0.06)",
                      border: dndActive ? "1px solid rgba(167,139,250,0.4)" : "1px solid rgba(255,255,255,0.1)",
                    }}
                    title={dndActive ? "Off the Clock — click to go back online" : "Click to go Off the Clock"}
                  >
                    <span className="text-[13px]">{dndActive ? "🌙" : "☀️"}</span>
                  </button>
                )}
                <button
                  onClick={handleSignOut}
                  className="flex-shrink-0 text-[10px] transition-colors px-1.5 py-1 rounded"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#F87171")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
                  title="Sign out"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="w-full text-[11px] font-semibold text-center"
                style={{ color: "#3B9EE8" }}
              >
                Sign in
              </button>
            )}
          </div>
        </aside>

        {/* ── Main content area ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile top bar — shows brand + active business + Owner/Team toggle + DND + bell */}
          <header
            className="md:hidden flex items-center justify-between flex-shrink-0"
            style={{
              backgroundColor: "#0A1929",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              minHeight: "52px",
              paddingTop: "env(safe-area-inset-top, 0px)",
              paddingLeft: "12px",
              paddingRight: "12px",
              paddingBottom: "0px",
            }}
          >
            {/* Left: brand icon + active business name (compact) */}
            <div className="flex items-center gap-2 min-w-0 flex-shrink">
              <BrandIcon size={28} variant="teal" className="flex-shrink-0" />
              {isOwnerOrCoOwner && (
                <ActiveBusinessBadge businessKey={activeBusiness} compact />
              )}
            </div>

            {/* Owner/Team pill toggle — hidden until TEAM_ENABLED */}
            {isOwnerOrCoOwner && TEAM_ENABLED && (
              <div
                className="flex rounded-xl overflow-hidden mx-2 flex-1 min-w-0"
                style={{
                  backgroundColor: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  maxWidth: "200px",
                }}
              >
                <Link
                  href="/app/board"
                  className="flex-1 min-w-0 flex items-center justify-center gap-1 px-2 py-2 text-[11px] font-bold transition-all whitespace-nowrap"
                  style={{
                    backgroundColor: !activePath.startsWith("/app/team") ? "rgba(59,158,232,0.2)" : "transparent",
                    color: !activePath.startsWith("/app/team") ? "#3B9EE8" : "rgba(255,255,255,0.4)",
                    fontFamily: "'Space Grotesk', sans-serif",
                    borderRadius: "10px 0 0 10px",
                    minHeight: "36px",
                  }}
                >
                  <span className="flex-shrink-0">👔</span>
                  <span className="hidden min-[390px]:inline">Owner</span>
                </Link>
                <div style={{ width: "1px", backgroundColor: "rgba(255,255,255,0.1)", flexShrink: 0 }} />
                <Link
                  href="/app/team"
                  className="flex-1 min-w-0 flex items-center justify-center gap-1 px-2 py-2 text-[11px] font-bold transition-all whitespace-nowrap"
                  style={{
                    backgroundColor: activePath.startsWith("/app/team") ? "rgba(167,139,250,0.2)" : "transparent",
                    color: activePath.startsWith("/app/team") ? "#A78BFA" : "rgba(255,255,255,0.4)",
                    fontFamily: "'Space Grotesk', sans-serif",
                    borderRadius: "0 10px 10px 0",
                    minHeight: "36px",
                  }}
                >
                  <span className="flex-shrink-0">👥</span>
                  <span className="hidden min-[390px]:inline">Team</span>
                </Link>
              </div>
            )}

            {/* Right: DND toggle + notification bell + settings */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {person && isOwnerOrCoOwner && (
                <button
                  ref={(el) => registerRef("tour-sleep", el)}
                  data-tour="tour-sleep"
                  onClick={handleDndToggle}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95"
                  style={{
                    backgroundColor: dndActive ? "rgba(167,139,250,0.2)" : "rgba(255,255,255,0.06)",
                    border: dndActive ? "1px solid rgba(167,139,250,0.4)" : "1px solid rgba(255,255,255,0.1)",
                  }}
                  title={dndActive ? "Off the Clock" : "Go Off the Clock"}
                >
                  <span className="text-sm">{dndActive ? "🌙" : "☀️"}</span>
                </button>
              )}
              {person && (
                <NotificationBell accountId={person.accountId} personId={person.id} />
              )}
              {/* Hamburger menu — opens full nav sheet */}
              <button
                onClick={() => setMoreOpen(true)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95"
                style={{
                  backgroundColor: moreIsActive ? "rgba(59,158,232,0.18)" : "rgba(255,255,255,0.06)",
                  border: moreIsActive ? "1px solid rgba(59,158,232,0.4)" : "1px solid rgba(255,255,255,0.1)",
                }}
                title="Menu"
              >
                <span className="text-sm">☰</span>
              </button>
            </div>
          </header>

          <main
            className="flex-1 overflow-y-auto"
            style={{
              paddingBottom: "env(safe-area-inset-bottom, 16px)",
            }}
            id="app-main-scroll"
            data-scroll="auto"
          >
            <PageTransition locationKey={activePath}>
              {children}
            </PageTransition>
          </main>

          {/* Bottom nav removed — all navigation via hub circles + top-right settings gear */}
        </div>
      </div>

      {/* More Sheet — hamburger menu shows all nav items */}
      {moreOpen && (
        <MoreSheet
          items={NAV_ITEMS}
          activePath={activePath}
          person={person}
          onClose={() => setMoreOpen(false)}
          onSignOut={handleSignOut}
          showSwitchBusiness={showSwitchBusiness}
          onSwitchBusiness={() => navigate("/select-business")}
          onGoToSelector={() => navigate("/select-business")}
        />
      )}

      {/* Business Switcher Modal */}
      {switcherOpen && (
        <BusinessSwitcherModal
          available={available}
          current={activeBusiness}
          onSelect={setActiveBusiness}
          onClose={() => setSwitcherOpen(false)}
          onSelectAndNavigate={(key) => {
            setActiveBusiness(key);
            setSwitcherOpen(false);
            navigate("/select-business");
          }}
        />
      )}
    </IdentityContext.Provider>
  );
}
