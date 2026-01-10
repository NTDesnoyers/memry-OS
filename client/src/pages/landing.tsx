import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Sparkles, ArrowRight, Brain, Users, CheckCircle2 } from "lucide-react";

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
        {/* HERO SECTION */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            Stop Losing Deals Because You Forgot to Follow Up
          </h1>
          
          <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Flow OS remembers your conversations, shows you who needs your attention today, and drafts your follow-ups so nothing slips through the cracks.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              onClick={() => window.location.href = "/api/login"}
              className="text-lg px-8 py-6"
              data-testid="button-get-started"
            >
              Apply for the Founding Agent Beta
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
          
          <p className="text-sm text-slate-400 mt-4">
            Limited spots · Early pricing · Built with real agent feedback
          </p>
        </div>

        {/* WHO IT'S FOR */}
        <div className="max-w-2xl mx-auto w-full mb-20 text-center">
          <p className="text-slate-300 text-lg mb-4">For relationship-based real estate agents who:</p>
          <ul className="text-slate-400 space-y-2">
            <li>• Talk to a lot of people every week</li>
            <li>• Rely on referrals and repeat business</li>
            <li>• Hate updating CRMs</li>
            <li>• Know follow-up makes money — but struggle to stay consistent</li>
          </ul>
        </div>

        {/* WHAT YOU GET IN THE BETA */}
        <div className="max-w-4xl mx-auto w-full mb-20">
          <h2 className="text-2xl font-semibold text-white text-center mb-10">What you get in the beta</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex flex-col items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <MessageSquare className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-2">Conversation Capture</h3>
                    <p className="text-slate-400 text-sm">
                      Log calls, meetings, and notes in seconds — voice or text. Automatically imports meeting transcripts (Fathom) and keeps everything tied to the right person.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex flex-col items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Brain className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-2">AI Follow-Ups</h3>
                    <p className="text-slate-400 text-sm">
                      Drafts thank-you emails, check-ins, and next steps from your real conversations — in your voice.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex flex-col items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-2">Relationship CRM</h3>
                    <p className="text-slate-400 text-sm">
                      FORD notes + A/B/C/D segments so you always know who matters most and where each relationship stands.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div className="max-w-3xl mx-auto w-full mb-20">
          <h2 className="text-2xl font-semibold text-white text-center mb-10">How Flow OS works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center mx-auto mb-4">1</div>
              <h3 className="font-semibold text-white mb-2">Log a conversation</h3>
              <p className="text-slate-400 text-sm">Talk or type naturally — no formatting required.</p>
            </div>
            
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center mx-auto mb-4">2</div>
              <h3 className="font-semibold text-white mb-2">Flow OS extracts what matters</h3>
              <p className="text-slate-400 text-sm">People, topics, action items, and FORD insights.</p>
            </div>
            
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center mx-auto mb-4">3</div>
              <h3 className="font-semibold text-white mb-2">Get the right follow-up instantly</h3>
              <p className="text-slate-400 text-sm">See who to contact next and exactly what to say.</p>
            </div>
          </div>
        </div>

        {/* WHY AGENTS SWITCH */}
        <div className="max-w-2xl mx-auto w-full mb-20">
          <h2 className="text-2xl font-semibold text-white text-center mb-10">Why agents switch to Flow OS</h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-slate-300">Built for relationships, not transactions</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-slate-300">Designed around conversation memory, not data entry</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-slate-300">Works the way agents actually operate day-to-day</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-slate-300">Feels like a second brain — not another system to maintain</p>
            </div>
          </div>
        </div>

        {/* FOUNDING AGENT BETA */}
        <div className="max-w-2xl mx-auto w-full mb-16">
          <Card className="bg-slate-800/70 border-slate-600">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-semibold text-white mb-6">Founding Agent Beta</h2>
              
              <div className="space-y-3 mb-6 text-left max-w-sm mx-auto">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  <p className="text-slate-300">Limited number of early users</p>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  <p className="text-slate-300">Direct access to the founder</p>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  <p className="text-slate-300">Help shape what gets built next</p>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  <p className="text-slate-300">Preferred pricing locked in</p>
                </div>
              </div>
              
              <p className="text-3xl font-bold text-white mb-6">$29/month <span className="text-lg font-normal text-slate-400">during beta</span></p>
              
              <Button 
                size="lg" 
                onClick={() => window.location.href = "/api/login"}
                className="text-lg px-8 py-6"
                data-testid="button-apply-beta"
              >
                Apply for the Founding Agent Beta
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="p-6 text-center text-slate-500 text-sm border-t border-slate-800">
        Flow OS Beta · Built for relationship-based real estate agents
      </footer>
    </div>
  );
}
