import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import WeeklyReport from "@/pages/weekly-report";
import People from "@/pages/people";
import Relationships from "@/pages/relationships";
import Deals from "@/pages/deals";
import Reviews from "@/pages/reviews";
import BusinessTracker from "@/pages/business-tracker";
import Integrations from "@/pages/integrations";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/business-tracker" component={BusinessTracker} />
      <Route path="/weekly-report" component={WeeklyReport} />
      <Route path="/people" component={People} />
      <Route path="/relationships" component={Relationships} />
      <Route path="/deals" component={Deals} />
      <Route path="/reviews" component={Reviews} />
      <Route path="/integrations" component={Integrations} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
