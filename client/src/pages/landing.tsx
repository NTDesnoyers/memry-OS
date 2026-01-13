import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Sparkles, ArrowRight, Brain, Users, CheckCircle2, Lock } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <header className="p-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold text-white">Memry</span>
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
            You didn't lose that deal.<br />
            You just forgot to follow up.
          </h1>
          
          <p className="text-lg md:text-xl text-slate-300 mb-6 max-w-2xl mx-auto">
            Memry is a relationship-first CRM that remembers every conversation, tells you exactly who to contact next, and drafts the follow-up <span className="text-white font-medium">in your voice</span>—so deals don't go cold.
          </p>
          
          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm mb-6" data-testid="trust-block">
            <Lock className="h-4 w-4" />
            <span><span className="text-slate-300 font-medium">Private by default.</span> Memry never pulls contacts, messages, or data without explicit action from you.</span>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              onClick={() => window.location.href = "/api/login"}
              className="text-lg px-8 py-6"
              data-testid="button-get-started"
            >
              Join the Free Founding Agent Beta
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
          
          <p className="text-sm text-slate-400 mt-4">
            Limited spots · Built with real agent workflows
          </p>
        </div>

        {/* WHO IT'S FOR */}
        <div className="max-w-2xl mx-auto w-full mb-20 text-center">
          <p className="text-slate-300 text-lg mb-4">Memry is for relationship-based agents who:</p>
          <ul className="text-slate-400 space-y-2">
            <li>• Talk to people all day—and forget half of it by tomorrow</li>
            <li>• Live on referrals, not cold leads</li>
            <li>• Hate "updating the CRM" after a long day</li>
            <li>• Know follow-up makes money—but still let it slide</li>
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
                      Dump conversations in seconds—voice or text—and never wonder "what did we talk about?" again.
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
                      Get follow-ups drafted from real conversations—so reaching out never feels awkward or late.
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
                      Always know who matters most, who's going cold, and who you should contact today.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div className="max-w-3xl mx-auto w-full mb-20">
          <h2 className="text-2xl font-semibold text-white text-center mb-10">How Memry works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center mx-auto mb-4">1</div>
              <h3 className="font-semibold text-white mb-2">Log a conversation</h3>
              <p className="text-slate-400 text-sm">Talk or type naturally—no forms, no cleanup.</p>
            </div>
            
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center mx-auto mb-4">2</div>
              <h3 className="font-semibold text-white mb-2">Memry extracts what matters</h3>
              <p className="text-slate-400 text-sm">People, topics, follow-ups, and FORD insights—automatically.</p>
            </div>
            
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center mx-auto mb-4">3</div>
              <h3 className="font-semibold text-white mb-2">Get the right follow-up instantly</h3>
              <p className="text-slate-400 text-sm">Know who to contact next and exactly what to say.</p>
            </div>
          </div>
        </div>

        {/* WHY AGENTS SWITCH */}
        <div className="max-w-2xl mx-auto w-full mb-20">
          <h2 className="text-2xl font-semibold text-white text-center mb-10">Why agents switch to Memry</h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-slate-300">Built for relationships—not data entry</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-slate-300">Designed around memory, not pipelines</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-slate-300">Matches how agents actually work day-to-day</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-slate-300">Feels like a second brain, not another system to maintain</p>
            </div>
          </div>
        </div>

        {/* FOUNDER CREDIBILITY */}
        <div className="max-w-2xl mx-auto w-full mb-16 text-center">
          <p className="text-slate-400 italic text-lg">
            "I built Memry because I was tired of knowing I <span className="text-white">should</span> follow up—and still not doing it."
          </p>
          <p className="text-slate-500 text-sm mt-3">
            — Built by a relationship-based real estate agent
          </p>
        </div>

        {/* FOUNDING AGENT BETA */}
        <div className="max-w-2xl mx-auto w-full mb-16">
          <Card className="bg-slate-800/70 border-slate-600">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-semibold text-white mb-2">Founding Agent Beta</h2>
              <p className="text-primary text-lg font-medium mb-6">Free for early users</p>
              
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
                  <p className="text-slate-300">Early-user perks when paid plans launch</p>
                </div>
              </div>
              
              <Button 
                size="lg" 
                onClick={() => window.location.href = "/api/login"}
                className="text-lg px-8 py-6"
                data-testid="button-apply-beta"
              >
                Join the Free Founding Agent Beta
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="p-6 text-center text-slate-500 text-sm border-t border-slate-800">
        Memry Beta · Built for relationship-based real estate agents
      </footer>
    </div>
  );
}
