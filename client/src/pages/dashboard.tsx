import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Calendar, CheckCircle2, Layout, Plus, PieChart, TrendingUp, Users, DollarSign, Workflow } from "lucide-react";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";
import LayoutComponent from "@/components/layout";

export default function Dashboard() {
  return (
    <LayoutComponent>
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Background Texture */}
        <div 
          className="absolute inset-0 opacity-40 mix-blend-multiply pointer-events-none"
          style={{ backgroundImage: `url(${paperBg})`, backgroundSize: 'cover' }}
        />
        
        <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
          <header className="flex justify-between items-end mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
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

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-4 mb-8 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-bottom-5 duration-700">
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

          <div className="grid md:grid-cols-4 gap-6 mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
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

          <div className="grid md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
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
