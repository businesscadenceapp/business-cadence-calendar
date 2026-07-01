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

// Calendar app routes — all protected by the password gate
function CalendarApp() {
  return (
    <PasswordGate>
      <Switch>
        <Route path={"/app"} component={Home} />
        <Route path={"/app/board"} component={Board} />
        <Route path={"/app/settings"} component={Settings} />
        <Route component={NotFound} />
      </Switch>
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
      {/* Schedule management — closed days/weeks */}
      <Route path={"/app/schedule"} component={ManageSchedule} />
      {/* Password-gated calendar app */}
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
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
