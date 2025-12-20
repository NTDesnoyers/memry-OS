import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Calendar, CheckCircle2, Layout, Plus, PieChart, TrendingUp, Users, DollarSign, Workflow, Mic, FileEdit, Sparkles, Loader2 } from "lucide-react";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";
import LayoutComponent from "@/components/layout";
import { useQuery } from "@tanstack/react-query";

type VoicePattern = { id: string; category: string; value: string; frequency: number };
type GeneratedDraft = { id: string; status: string; type: string };
type ProcessingStatus = { isProcessing: boolean; processed: number; totalToProcess: number };

function AIStatusWidget() {
  const { data: voicePatterns = [] } = useQuery<VoicePattern[]>({
    queryKey: ["/api/voice-profile"],
  });
  
  const { data: drafts = [] } = useQuery<GeneratedDraft[]>({
    queryKey: ["/api/generated-drafts"],
  });
  
  const { data: processingStatus } = useQuery<ProcessingStatus>({
    queryKey: ["/api/interactions/process-status"],
    refetchInterval: 5000,
  });
  
  const pendingDrafts = drafts.filter(d => d.status === "pending").length;
  const isProcessing = processingStatus?.isProcessing;
  
  return (
    <Card className="border-none shadow-md bg-gradient-to-br from-indigo-50 to-purple-50">
      <CardHeader className="pb-2">
        <CardTitle className="font-serif text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-600" />
          AI Assistant
        </CardTitle>
        <CardDescription>Learning your style & generating content</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Link href="/voice-profile">
          <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg hover:bg-white/80 cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-full">
                <Mic className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-sm">Voice Profile</p>
                <p className="text-xs text-muted-foreground">{voicePatterns.length} patterns learned</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Link>
        
        <Link href="/drafts">
          <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg hover:bg-white/80 cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-full">
                <FileEdit className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-sm">AI Drafts</p>
                <p className="text-xs text-muted-foreground">{pendingDrafts} pending review</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Link>
        
        {isProcessing && (
          <div className="flex items-center gap-2 text-xs text-indigo-600 bg-white/60 p-2 rounded">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing conversations...
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  return (
    <LayoutComponent>
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Background Texture - hidden on mobile for performance */}
        <div 
          className="absolute inset-0 opacity-20 mix-blend-multiply pointer-events-none hidden md:block"
          style={{ backgroundImage: `url(${paperBg})`, backgroundSize: 'cover' }}
        />
        
        <div className="relative z-10 container mx-auto px-4 py-6 md:py-8 max-w-6xl">
          <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6 md:mb-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-primary tracking-tight mb-2">Business Tracker</h1>
              <p className="text-muted-foreground text-lg">Execution Clarity & Performance</p>
            </div>
            <Link href="/weekly-report">
              <Button size="lg" className="gap-2 shadow-lg hover:shadow-xl transition-all">
                <Plus className="h-5 w-5" />
                New Weekly Report
              </Button>
            </Link>
          </header>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-4 mb-6 md:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-full text-primary">
                <Workflow className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-primary">New: Automation Hub</h3>
                <p className="text-sm text-muted-foreground">Sync Plaud, Fathom & Granola conversations automatically</p>
              </div>
            </div>
            <Link href="/automation">
              <Button variant="outline" className="gap-2">
                Configure Workflow <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
            <Card className="border-none shadow-sm bg-card/60 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 text-green-700 rounded-full">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">GCI YTD</p>
                    <h3 className="text-2xl font-bold font-serif">$142,500</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-card/60 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 text-blue-700 rounded-full">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Closed Units</p>
                    <h3 className="text-2xl font-bold font-serif">12</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-card/60 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 text-purple-700 rounded-full">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">New Contacts</p>
                    <h3 className="text-2xl font-bold font-serif">84</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-card/60 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-100 text-amber-700 rounded-full">
                    <PieChart className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Productive Hrs</p>
                    <h3 className="text-2xl font-bold font-serif">24.5</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            <Card className="md:col-span-2 border-none shadow-md bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="font-serif">Current Focus</CardTitle>
                <CardDescription>Quarterly Major Projects & Goals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-medium">40+ RE Reviews October</h3>
                      <p className="text-sm text-muted-foreground">In Progress</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-medium">$50k+ GCI = 5+ buy/sell sides</h3>
                      <p className="text-sm text-muted-foreground">On Track</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-medium">Business Planning before Thanksgiving</h3>
                      <p className="text-sm text-muted-foreground">Completed</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-none shadow-md bg-primary text-primary-foreground">
                <CardHeader>
                  <CardTitle className="font-serif text-primary-foreground">Word of the Year</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold tracking-wider text-center py-4">
                    CONSISTENCY
                  </div>
                </CardContent>
              </Card>

              <AIStatusWidget />
              
              <Card className="border-none shadow-md bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">Recent Reports</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link href="/weekly-report">
                    <div className="flex items-center justify-between p-3 hover:bg-secondary rounded-md cursor-pointer transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">Dec 08, 2025</p>
                          <p className="text-xs text-muted-foreground">Completed</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                  <div className="flex items-center justify-between p-3 hover:bg-secondary rounded-md cursor-pointer transition-colors group opacity-60">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">Dec 01, 2025</p>
                        <p className="text-xs text-muted-foreground">Completed</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </LayoutComponent>
  );
}
