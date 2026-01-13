import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CommandPalette } from "@/components/command-palette";
import { ErrorBoundary } from "@/components/error-boundary";
import { FeedbackWidget } from "@/components/feedback-widget";
import { WelcomeTour } from "@/components/welcome-tour";
import { ProtectedRoute } from "@/components/protected-route";
import { isFounderMode } from "@/lib/feature-mode";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import PendingApproval from "@/pages/pending-approval";
import SubscriptionRequired from "@/pages/subscription-required";
import AdminUsers from "@/pages/admin-users";
import Dashboard from "@/pages/dashboard";
import WeeklyReport from "@/pages/weekly-report";
import People from "@/pages/people";
import PersonProfile from "@/pages/person-profile";
import PersonNew from "@/pages/person-new";
import Relationships from "@/pages/relationships";
import Reviews from "@/pages/reviews";
import ReviewDetail from "@/pages/review-detail";
import WeeklyReviewPage from "@/pages/weekly-review";
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
import Coaching from "@/pages/coaching";
import LifeEvents from "@/pages/life-events";
import EventLog from "@/pages/event-log";
import LeadInbox from "@/pages/lead-inbox";
import BetaOnboarding from "@/pages/beta-onboarding";
import InsightInbox from "@/pages/insight-inbox";
import Intake from "@/pages/intake";
import RevivalOpportunities from "@/pages/revival-opportunities";
import BetaWelcome from "@/pages/beta-welcome";
import Landing from "@/pages/landing";
import IssuesReview from "@/pages/issues-review";
import BetaDashboard from "@/pages/beta-dashboard";

function Router() {
  return (
    <ProtectedRoute>
      <Switch>
        <Route path="/" component={Flow} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/business-tracker" component={BusinessTracker} />
        <Route path="/phone" component={PhoneDialer} />
        <Route path="/meetings" component={Meetings} />
        <Route path="/weekly-report" component={WeeklyReport} />
        <Route path="/people" component={People} />
        <Route path="/people/new" component={PersonNew} />
        <Route path="/people/:id" component={PersonProfile} />
        <Route path="/relationships" component={Relationships} />
        <Route path="/flow" component={Flow} />
        <Route path="/weekly-review" component={WeeklyReviewPage} />
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
        <Route path="/coaching" component={Coaching} />
        <Route path="/life-events" component={LifeEvents} />
        <Route path="/event-log" component={EventLog} />
        <Route path="/leads" component={LeadInbox} />
        <Route path="/beta" component={BetaOnboarding} />
        <Route path="/insights" component={InsightInbox} />
        <Route path="/intake" component={Intake} />
        <Route path="/revival" component={RevivalOpportunities} />
        <Route path="/welcome" component={BetaWelcome} />
        <Route path="/issues" component={IssuesReview} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/beta" component={BetaDashboard} />
        <Route component={NotFound} />
      </Switch>
    </ProtectedRoute>
  );
}

function AuthenticatedApp() {
  const { user, isAuthenticated, isLoading, requiresSubscription } = useAuth();
  const founderMode = isFounderMode(user?.email);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (!founderMode && !isAuthenticated) {
    return <Landing />;
  }
  
  // Check if user is pending approval
  if (user && user.status !== 'approved') {
    return <PendingApproval />;
  }
  
  // BETA MODE: Subscription check disabled - all approved users get free access
  // To re-enable paid subscriptions, uncomment the block below:
  // if (requiresSubscription) {
  //   return <SubscriptionRequired />;
  // }
  
  return (
    <>
      <CommandPalette />
      {founderMode && <FeedbackWidget />}
      {founderMode && <WelcomeTour />}
      <Router />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <AuthenticatedApp />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
