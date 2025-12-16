import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Home, Calendar, CheckCircle2 } from "lucide-react";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";

export default function Reviews() {
  return (
    <Layout>
      <div className="min-h-screen bg-secondary/30 relative">
        <div 
          className="fixed inset-0 opacity-40 mix-blend-multiply pointer-events-none -z-10"
          style={{ backgroundImage: `url(${paperBg})`, backgroundSize: 'cover' }}
        />
        
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <header className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-serif font-bold text-primary">Real Estate Reviews</h1>
              <p className="text-muted-foreground">Annual Property Reviews Planner</p>
            </div>
            <Button className="gap-2 shadow-md">
              <Home className="h-4 w-4" /> Schedule Review
            </Button>
          </header>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="md:col-span-2 border-none shadow-md bg-card/90">
              <CardHeader>
                <CardTitle className="font-serif">Upcoming Reviews</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search address or client..." className="pl-9" />
                  </div>
                </div>

                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer">
                    <div className="flex gap-4">
                       <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                         <Home className="h-6 w-6" />
                       </div>
                       <div>
                         <h3 className="font-bold">123 Maple Ave</h3>
                         <p className="text-sm text-muted-foreground">Alice Johnson • Last Review: 1 year ago</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <Badge variant="outline" className="mb-1">Scheduled</Badge>
                       <p className="text-sm flex items-center gap-1"><Calendar className="h-3 w-3" /> Dec 20</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-none shadow-md bg-primary text-primary-foreground">
                <CardHeader>
                  <CardTitle className="text-primary-foreground font-serif">Goal Progress</CardTitle>
                </CardHeader>
                <CardContent className="text-center py-6">
                  <div className="text-5xl font-bold mb-2">42</div>
                  <p className="text-primary-foreground/80">Reviews Completed YTD</p>
                  <div className="mt-4 w-full bg-black/20 rounded-full h-2">
                    <div className="bg-white rounded-full h-2 w-[84%]"></div>
                  </div>
                  <p className="text-xs mt-2 text-primary-foreground/60">Target: 50</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">To Do</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm">Prep CMA for 456 Oak St</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm">Mail card to Bob Smith</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

import { Badge } from "@/components/ui/badge";
