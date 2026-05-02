import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { MainLayout } from "@/components/layout/main-layout";
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

const queryClient = new QueryClient();

function Router() {
  return (
    <MainLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/buildings" component={Buildings} />
        <Route path="/buildings/:id" component={BuildingDetail} />
        <Route path="/issues/new" component={NewIssue} />
        <Route path="/issues/:id" component={IssueDetail} />
        <Route path="/issues" component={Issues} />
        <Route path="/announcements" component={Announcements} />
        <Route path="/visitors" component={Visitors} />
        <Route path="/payments" component={Payments} />
        <Route path="/contractors" component={Contractors} />
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
