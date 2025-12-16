import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Repeat, Plus, Search, Calendar, Phone } from "lucide-react";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";

export default function Relationships() {
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
              <h1 className="text-3xl font-serif font-bold text-primary">Relationships (FORD)</h1>
              <p className="text-muted-foreground">Log interactions in &lt;60 seconds</p>
            </div>
          </header>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Left Col: Quick Log */}
            <div className="md:col-span-1 space-y-6">
              <Card className="border-none shadow-md bg-card/90 backdrop-blur-sm sticky top-6">
                <CardHeader className="bg-primary/5 pb-4">
                  <CardTitle className="font-serif flex items-center gap-2">
                    <Plus className="h-5 w-5" /> Quick Log
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Who?</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search person..." className="pl-9" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <div className="flex gap-2 flex-wrap">
                      {["Call", "Text", "Email", "In-Person", "Note"].map(type => (
                        <Button key={type} variant="outline" size="sm" className="bg-background">{type}</Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>F.O.R.D. Notes</Label>
                    <Textarea placeholder="Family, Occupation, Recreation, Dreams..." className="min-h-[100px]" />
                  </div>

                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="ford-count" className="rounded border-gray-300" defaultChecked />
                    <Label htmlFor="ford-count" className="font-normal cursor-pointer">Counts towards FORD goal</Label>
                  </div>

                  <Button className="w-full shadow-md">Save Interaction</Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Col: Recent Activity */}
            <div className="md:col-span-2 space-y-6">
              <Tabs defaultValue="recent" className="w-full">
                <TabsList className="bg-background/50">
                  <TabsTrigger value="recent">Recent Activity</TabsTrigger>
                  <TabsTrigger value="followups">Follow-ups Due</TabsTrigger>
                </TabsList>
                
                <TabsContent value="recent" className="space-y-4 mt-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="border-none shadow-sm bg-card/60 backdrop-blur-sm">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                              <Phone className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium">Call with <span className="font-bold text-primary">Alice Johnson</span></p>
                              <p className="text-sm text-muted-foreground">Discussed her daughter's soccer tournament (Recreation)</p>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Today, 10:30 AM
                          </span>
                        </div>
                        <div className="mt-3 pl-14">
                           <div className="inline-flex items-center px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-medium border border-green-100">
                             FORD Record
                           </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
                
                <TabsContent value="followups">
                  <div className="text-center py-12 text-muted-foreground">
                    No follow-ups due today.
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
