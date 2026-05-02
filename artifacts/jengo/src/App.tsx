import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { MainLayout } from "@/components/layout/main-layout";
import { PortalLayout } from "@/components/layout/portal-layout";
import { ResidentAuthProvider, useResidentAuth } from "@/contexts/resident-auth";

import Dashboard from "@/pages/dashboard";
import Buildings from "@/pages/buildings";
import BuildingDetail from "@/pages/buildings/[id]";
import Issues from "@/pages/issues";
import IssueDetail from "@/pages/issues/[id]";
import NewIssue from "@/pages/issues/new";
import Announcements from "@/pages/announcements";
import Visitors from "@/pages/visitors";
import Payments from "@/pages/payments";
import Contractors from "@/pages/contractors";
import JobDetail from "@/pages/contractors/job-detail";
import Residents from "@/pages/residents/index";
import ResidentDetail from "@/pages/residents/[id]";
import Reports from "@/pages/reports";
import UnitLedger from "@/pages/buildings/unit-ledger";
import Settings from "@/pages/settings";

import GatePage from "@/pages/gate/index";
import PortalLogin from "@/pages/portal/login";
import PortalDashboard from "@/pages/portal/dashboard";
import PortalIssues from "@/pages/portal/issues";
import PortalIssueDetail from "@/pages/portal/issue-detail";
import PortalPayments from "@/pages/portal/payments";
import PortalAnnouncements from "@/pages/portal/announcements";
import PortalVisitors from "@/pages/portal/visitors";
import { useLocation } from "wouter";
import { useEffect } from "react";

const queryClient = new QueryClient();

function PortalGuard({ component: Component }: { component: React.ComponentType }) {
  const { resident, isLoading } = useResidentAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !resident) {
      setLocation("/portal");
    }
  }, [resident, isLoading, setLocation]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (!resident) return null;

  return (
    <PortalLayout>
      <Component />
    </PortalLayout>
  );
}

function Router() {
  return (
    <Switch>
      {/* Gate security terminal */}
      <Route path="/gate" component={GatePage} />

      {/* Resident Portal routes */}
      <Route path="/portal" component={PortalLogin} />
      <Route path="/portal/dashboard">
        {() => <PortalGuard component={PortalDashboard} />}
      </Route>
      <Route path="/portal/issues/:id">
        {() => <PortalGuard component={PortalIssueDetail} />}
      </Route>
      <Route path="/portal/issues">
        {() => <PortalGuard component={PortalIssues} />}
      </Route>
      <Route path="/portal/payments">
        {() => <PortalGuard component={PortalPayments} />}
      </Route>
      <Route path="/portal/announcements">
        {() => <PortalGuard component={PortalAnnouncements} />}
      </Route>
      <Route path="/portal/visitors">
        {() => <PortalGuard component={PortalVisitors} />}
      </Route>

      {/* Management dashboard routes */}
      <Route>
        {() => (
          <MainLayout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/buildings" component={Buildings} />
              <Route path="/buildings/:id" component={BuildingDetail} />
              <Route path="/residents/:id" component={ResidentDetail} />
              <Route path="/residents" component={Residents} />
              <Route path="/issues/new" component={NewIssue} />
              <Route path="/issues/:id" component={IssueDetail} />
              <Route path="/issues" component={Issues} />
              <Route path="/announcements" component={Announcements} />
              <Route path="/visitors" component={Visitors} />
              <Route path="/buildings/:buildingId/units/:unitId" component={UnitLedger} />
              <Route path="/payments" component={Payments} />
              <Route path="/reports" component={Reports} />
              <Route path="/settings" component={Settings} />
              <Route path="/contractors/jobs/:id" component={JobDetail} />
              <Route path="/contractors" component={Contractors} />
              <Route component={NotFound} />
            </Switch>
          </MainLayout>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ResidentAuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </ResidentAuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
