import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
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

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path={"/"} component={Landing} />
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
