import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import PasswordGate from "./components/PasswordGate";
import Landing from "./pages/Landing";
import ClientLogin from "./pages/ClientLogin";
import Home from "./pages/Home";
import Board from "./pages/Board";
import Settings from "./pages/Settings";
import Onboarding from "./pages/Onboarding";
import ManageSchedule from "./pages/ManageSchedule";
import EmployeeSetup from "./pages/EmployeeSetup";
import WeeklyReports from "@/pages/WeeklyReports";
import Goals from "@/pages/Goals";
import AppShell from "@/components/AppShell";
import AcceptInvite from "@/pages/AcceptInvite";
import KpiReporting from "@/pages/KpiReporting";
import WeeklyCheckin from "@/pages/WeeklyCheckin";
import AdminPanel from "@/pages/AdminPanel";
import TeamBoard from "@/pages/TeamBoard";
import TeamCalendar from "@/pages/TeamCalendar";
import BoardArchive from "@/pages/BoardArchive";
import TeamBoardArchive from "@/pages/TeamBoardArchive";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import BusinessSelector from "@/pages/BusinessSelector";
import AppWelcome from "@/pages/AppWelcome";
import { isNativeApp, hasSeenWelcome } from "@/lib/platform";
import { Capacitor } from "@capacitor/core";

// Wrapper that applies PasswordGate + AppShell to any page component
function Protected({ component: Component }: { component: React.ComponentType }) {
  return (
    <PasswordGate>
      <AppShell>
        <Component />
      </AppShell>
    </PasswordGate>
  );
}

/**
 * Detect if running as a native Capacitor app.
 * Uses multiple signals for reliability:
 * 1. Capacitor.isNativePlatform() — primary check
 * 2. URL is capacitor:// or file:// — fallback for when bridge initializes late
 * 3. No window.location.hostname (file-served) — extra fallback
 */
function detectNative(): boolean {
  try {
    if (Capacitor.isNativePlatform()) return true;
    const protocol = window.location.protocol;
    if (protocol === "capacitor:" || protocol === "file:") return true;
    // Capacitor iOS serves from localhost with a specific port pattern
    if (window.location.hostname === "localhost" && window.location.port === "") return false;
    return false;
  } catch {
    return false;
  }
}

/**
 * NativeHome — When running in Capacitor, the "/" route should NOT show
 * the marketing Landing page. Instead:
 * - If user hasn't seen the welcome intro → show AppWelcome
 * - If they have → redirect to /login (or /select-business if logged in)
 */
function NativeHome() {
  if (!hasSeenWelcome()) {
    return <AppWelcome />;
  }
  // Check if user is already logged in
  const authFlag = localStorage.getItem("bcc_auth_v1");
  if (authFlag === "granted") {
    return <Redirect to="/select-business" />;
  }
  return <Redirect to="/login" />;
}

function Router() {
  const native = detectNative();

  return (
    <Switch>
      {/* Root route: marketing site on web, native welcome on mobile */}
      <Route path={"/"}>
        {native ? <NativeHome /> : <Landing />}
      </Route>

      {/* Public routes */}
      <Route path={"/welcome"} component={AppWelcome} />
      <Route path={"/login"} component={ClientLogin} />
      <Route path={"/onboarding"} component={Onboarding} />
      <Route path={"/accept-invite"} component={AcceptInvite} />
      <Route path={"/forgot-password"} component={ForgotPassword} />
      <Route path={"/reset-password"} component={ResetPassword} />
      <Route path={"/select-business"} component={BusinessSelector} />

      {/* Protected app routes — more specific paths MUST come before less specific ones */}
      <Route path={"/app/team/calendar"}>
        <Protected component={TeamCalendar} />
      </Route>
      <Route path={"/app/team/archive"}>
        <Protected component={TeamBoardArchive} />
      </Route>
      <Route path={"/app/team"}>
        <Protected component={TeamBoard} />
      </Route>
      <Route path={"/app/board/archive"}>
        <Protected component={BoardArchive} />
      </Route>
      <Route path={"/app/board"}>
        <Protected component={Board} />
      </Route>
      <Route path={"/app/calendar"}>
        <Protected component={Home} />
      </Route>
      <Route path={"/app/goals"}>
        <Protected component={Goals} />
      </Route>
      <Route path={"/app/reports"}>
        <Protected component={WeeklyReports} />
      </Route>
      <Route path={"/app/schedule"}>
        <Protected component={ManageSchedule} />
      </Route>
      <Route path={"/app/employees"}>
        <Protected component={EmployeeSetup} />
      </Route>
      <Route path={"/app/kpi"}>
        <Protected component={KpiReporting} />
      </Route>
      <Route path={"/app/checkin"}>
        <Protected component={WeeklyCheckin} />
      </Route>
      <Route path={"/app/settings"}>
        <Protected component={Settings} />
      </Route>
      <Route path={"/app/admin"}>
        <Protected component={AdminPanel} />
      </Route>
      {/* /app root redirects to board */}
      <Route path={"/app"}>
        <Protected component={Board} />
      </Route>

      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
