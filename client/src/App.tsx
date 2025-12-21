import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import WeeklyReport from "@/pages/weekly-report";
import People from "@/pages/people";
import PersonProfile from "@/pages/person-profile";
import PersonNew from "@/pages/person-new";
import Relationships from "@/pages/relationships";
import Reviews from "@/pages/reviews";
import ReviewDetail from "@/pages/review-detail";
import BusinessTracker from "@/pages/business-tracker";
import Integrations from "@/pages/integrations";
import AutomationHub from "@/pages/automation";
import PhoneDialer from "@/pages/phone";
import Meetings from "@/pages/meetings";
import HavesWants from "@/pages/haves-wants";
import VisualPricing from "@/pages/visual-pricing";
import BrandCenter from "@/pages/brand-center";
import ConversationLog from "@/pages/conversation-log";
import Drafts from "@/pages/drafts";
import ReferralMatches from "@/pages/referral-matches";
import Calendar from "@/pages/calendar";
import Settings from "@/pages/settings";
import VoiceProfile from "@/pages/voice-profile";
import Flow from "@/pages/flow";
import ContentIntelligence from "@/pages/content-intelligence";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/business-tracker" component={BusinessTracker} />
      <Route path="/phone" component={PhoneDialer} />
      <Route path="/meetings" component={Meetings} />
      <Route path="/weekly-report" component={WeeklyReport} />
      <Route path="/people" component={People} />
      <Route path="/people/new" component={PersonNew} />
      <Route path="/people/:id" component={PersonProfile} />
      <Route path="/relationships" component={Relationships} />
      <Route path="/flow" component={Flow} />
      <Route path="/reviews" component={Reviews} />
      <Route path="/reviews/:id" component={ReviewDetail} />
      <Route path="/visual-pricing" component={VisualPricing} />
      <Route path="/haves-wants" component={HavesWants} />
      <Route path="/brand-center" component={BrandCenter} />
      <Route path="/conversations" component={ConversationLog} />
      <Route path="/drafts" component={Drafts} />
      <Route path="/referrals" component={ReferralMatches} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/automation" component={AutomationHub} />
      <Route path="/integrations" component={Integrations} />
      <Route path="/settings" component={Settings} />
      <Route path="/voice-profile" component={VoiceProfile} />
      <Route path="/content" component={ContentIntelligence} />
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
