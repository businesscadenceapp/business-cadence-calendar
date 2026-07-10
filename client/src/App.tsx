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

// Calendar app routes — all protected by the password gate, wrapped in AppShell
function CalendarApp() {
  return (
    <PasswordGate>
      <AppShell>
        <Switch>
          <Route path={"/app"} component={Board} />
          <Route path={"/app/board"} component={Board} />
          <Route path={"/app/calendar"} component={Home} />
          <Route path={"/app/goals"} component={Goals} />
          <Route path={"/app/reports"} component={WeeklyReports} />
          <Route path={"/app/schedule"} component={ManageSchedule} />
          <Route path={"/app/employees"} component={EmployeeSetup} />
          <Route path={"/app/kpi"} component={KpiReporting} />
          <Route path={"/app/checkin"} component={WeeklyCheckin} />
          <Route path={"/app/settings"} component={Settings} />
          <Route path={"/app/admin"} component={AdminPanel} />
          <Route path={"/app/team"} component={TeamBoard} />
          <Route path={"/app/team/calendar"} component={TeamCalendar} />
          <Route component={NotFound} />
        </Switch>
      </AppShell>
    </PasswordGate>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public marketing homepage */}
      <Route path={"/"} component={Landing} />
      {/* Business selection portal — public, leads to password gate */}
      <Route path={"/login"} component={ClientLogin} />
      {/* Onboarding wizard — first-login setup */}
      <Route path={"/onboarding"} component={Onboarding} />
      {/* Employee invite acceptance — public route */}
      <Route path={"/accept-invite"} component={AcceptInvite} />
      {/* Password-gated calendar app (all /app/* routes) */}
      <Route path={"/app"} component={CalendarApp} />
      <Route path={"/app/:rest*"} component={CalendarApp} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
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
