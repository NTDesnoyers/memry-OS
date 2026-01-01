import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, MessageSquare, FileText, Calendar, ArrowRight, Sparkles } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <header className="p-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold text-white">Flow OS</span>
        </div>
        <Button 
          variant="outline"
          onClick={() => window.location.href = "/api/login"}
          data-testid="button-login"
        >
          Sign In
        </Button>
      </header>

      <main className="flex-1 flex flex-col px-6 py-12">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-primary font-medium mb-4">For Relationship-Based Real Estate Agents</p>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            Stop Losing Referrals Because You Dropped the Ball
          </h1>
          
          <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Flow OS captures your key conversations, shows you who needs your attention today, and drafts your follow-ups so you never forget another relationship.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              onClick={() => window.location.href = "/api/login"}
              className="text-lg px-8 py-6"
              data-testid="button-get-started"
            >
              Join the Founding Agent Beta
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
          
          <p className="text-sm text-slate-400 mt-4">
            Limited spots. Early pricing. Built with your feedback.
          </p>
        </div>

        <div className="max-w-4xl mx-auto w-full mb-16">
          <h2 className="text-xl font-semibold text-white text-center mb-8">What you get in the beta</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Relationship CRM</h3>
                    <p className="text-slate-400 text-sm">
                      FORD notes + A/B/C/D segments so you always know who matters most.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <MessageSquare className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Conversation Capture</h3>
                    <p className="text-slate-400 text-sm">
                      Auto-imports from Fathom meetings + quick manual logging on mobile.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">AI Follow-ups</h3>
                    <p className="text-slate-400 text-sm">
                      Drafts thank-you emails and check-ins from your recent conversations.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Today View</h3>
                    <p className="text-slate-400 text-sm">
                      Shows overdue relationships and suggested touches each morning.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="max-w-2xl mx-auto w-full text-center">
          <h3 className="text-lg font-medium text-slate-400 mb-4">What we're building next</h3>
          <p className="text-slate-500 text-sm">
            Coming for founding agents: more conversation sources (calls, texts), 
            deeper automations, and additional CRM integrations.
          </p>
        </div>
      </main>

      <footer className="p-6 text-center text-slate-500 text-sm border-t border-slate-800">
        Flow OS Beta
      </footer>
    </div>
  );
}
