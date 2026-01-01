import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, Calendar, TrendingUp, Sparkles } from "lucide-react";

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
          onClick={() => window.location.href = "/api/login"}
          data-testid="button-login"
        >
          Sign In
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Your AI Chief of Staff for<br />Relationship Selling
          </h1>
          <p className="text-lg text-slate-300 mb-8">
            Never drop the ball on a relationship again. Flow OS captures conversations, 
            generates follow-ups, and surfaces the contacts who need your attention.
          </p>
          <Button 
            size="lg" 
            onClick={() => window.location.href = "/api/login"}
            className="text-lg px-8 py-6"
            data-testid="button-get-started"
          >
            Get Started
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl w-full">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <Users className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-white">Relationship CRM</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-400">
                Track FORD notes, segments, and never forget a detail about your sphere.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <MessageSquare className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-white">Conversation Capture</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-400">
                Auto-import from Fathom, Granola, or log voice memos on the go.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <Calendar className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-white">Weekly Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-400">
                GTD-inspired workflow to stay on top of your relationships.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <TrendingUp className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-white">AI Follow-ups</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-400">
                Automatic draft generation for thank-you notes and next steps.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="p-6 text-center text-slate-500 text-sm">
        Flow OS Beta
      </footer>
    </div>
  );
}
