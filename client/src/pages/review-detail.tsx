import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Home, FileText, DollarSign, Wrench, FileCheck, BarChart3, TrendingUp, Save, ExternalLink, Video, Printer, Send, CheckCircle2, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";
import type { RealEstateReview, Task, PricingReview } from "@shared/schema";

export default function ReviewDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("property");

  const { data: review, isLoading } = useQuery<RealEstateReview>({
    queryKey: [`/api/real-estate-reviews/${id}`],
    enabled: !!id,
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: [`/api/real-estate-reviews/${id}/tasks`],
    enabled: !!id,
  });

  const { data: pricingReviews = [] } = useQuery<PricingReview[]>({
    queryKey: ["/api/pricing-reviews"],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/real-estate-reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/real-estate-reviews/${id}`] });
      toast({ title: "Saved", description: "Review updated successfully." });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/real-estate-reviews/${id}/tasks`] });
    },
  });

  const handleSaveSection = (section: string, data: any) => {
    updateMutation.mutate({ [section]: data });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft": return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Draft</Badge>;
      case "ready": return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Ready</Badge>;
      case "sent": return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Sent</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-secondary/30 flex items-center justify-center">
          <p className="text-muted-foreground">Loading review...</p>
        </div>
      </Layout>
    );
  }

  if (!review) {
    return (
      <Layout>
        <div className="min-h-screen bg-secondary/30 flex items-center justify-center">
          <p className="text-destructive">Review not found</p>
        </div>
      </Layout>
    );
  }

  const propertyData = (review.propertyData as any) || {};
  const financialData = (review.financialData as any) || {};
  const components = (review.components as any[]) || [];
  const publicRecords = (review.publicRecords as any) || {};
  const marketData = (review.marketData as any) || {};

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;

  return (
    <Layout>
      <div className="min-h-screen bg-secondary/30 relative">
        <div 
          className="fixed inset-0 opacity-40 mix-blend-multiply pointer-events-none -z-10"
          style={{ backgroundImage: `url(${paperBg})`, backgroundSize: 'cover' }}
        />
        
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Link href="/reviews">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-serif font-bold text-primary">{review.title}</h1>
                  {getStatusBadge(review.status || "draft")}
                </div>
                <p className="text-muted-foreground">{review.propertyAddress}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={() => updateMutation.mutate({ status: "ready" })}>
                <CheckCircle2 className="h-4 w-4" /> Mark Ready
              </Button>
              <Button className="gap-2">
                <Send className="h-4 w-4" /> Send to Client
              </Button>
            </div>
          </header>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="md:col-span-3">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4 flex-wrap h-auto gap-1">
                  <TabsTrigger value="property" className="gap-2">
                    <Home className="h-4 w-4" /> Property
                  </TabsTrigger>
                  <TabsTrigger value="financial" className="gap-2">
                    <DollarSign className="h-4 w-4" /> Financial
                  </TabsTrigger>
                  <TabsTrigger value="components" className="gap-2">
                    <Wrench className="h-4 w-4" /> Components
                  </TabsTrigger>
                  <TabsTrigger value="records" className="gap-2">
                    <FileCheck className="h-4 w-4" /> Records
                  </TabsTrigger>
                  <TabsTrigger value="pricing" className="gap-2">
                    <BarChart3 className="h-4 w-4" /> Pricing
                  </TabsTrigger>
                  <TabsTrigger value="market" className="gap-2">
                    <TrendingUp className="h-4 w-4" /> Market
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="property">
                  <Card className="border-none shadow-md">
                    <CardHeader>
                      <CardTitle className="font-serif">Property Data</CardTitle>
                      <CardDescription>Basic property information and characteristics</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        handleSaveSection("propertyData", {
                          beds: Number(formData.get("beds")) || undefined,
                          baths: Number(formData.get("baths")) || undefined,
                          sqft: Number(formData.get("sqft")) || undefined,
                          yearBuilt: Number(formData.get("yearBuilt")) || undefined,
                          basement: formData.get("basement"),
                          garage: formData.get("garage"),
                          condition: formData.get("condition"),
                          amenities: formData.get("amenities")?.toString().split(",").map(s => s.trim()).filter(Boolean),
                        });
                      }} className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <Label htmlFor="beds">Beds</Label>
                            <Input id="beds" name="beds" type="number" defaultValue={propertyData.beds} />
                          </div>
                          <div>
                            <Label htmlFor="baths">Baths</Label>
                            <Input id="baths" name="baths" type="number" step="0.5" defaultValue={propertyData.baths} />
                          </div>
                          <div>
                            <Label htmlFor="sqft">Sq Ft</Label>
                            <Input id="sqft" name="sqft" type="number" defaultValue={propertyData.sqft} />
                          </div>
                          <div>
                            <Label htmlFor="yearBuilt">Year Built</Label>
                            <Input id="yearBuilt" name="yearBuilt" type="number" defaultValue={propertyData.yearBuilt} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="basement">Basement</Label>
                            <Input id="basement" name="basement" placeholder="Finished, unfinished, none" defaultValue={propertyData.basement} />
                          </div>
                          <div>
                            <Label htmlFor="garage">Garage</Label>
                            <Input id="garage" name="garage" placeholder="2-car attached" defaultValue={propertyData.garage} />
                          </div>
                          <div>
                            <Label htmlFor="condition">Condition</Label>
                            <Input id="condition" name="condition" placeholder="Excellent, Good, Fair" defaultValue={propertyData.condition} />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="amenities">Amenities (comma-separated)</Label>
                          <Input id="amenities" name="amenities" placeholder="Pool, Updated Kitchen, New Roof" defaultValue={propertyData.amenities?.join(", ")} />
                        </div>
                        <Button type="submit" className="gap-2" disabled={updateMutation.isPending}>
                          <Save className="h-4 w-4" /> Save Property Data
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="financial">
                  <Card className="border-none shadow-md">
                    <CardHeader>
                      <CardTitle className="font-serif">Financial Checklist</CardTitle>
                      <CardDescription>Mortgage and equity information</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        handleSaveSection("financialData", {
                          purchasePrice: Number(formData.get("purchasePrice")) || undefined,
                          mortgageBalance: Number(formData.get("mortgageBalance")) || undefined,
                          interestRate: Number(formData.get("interestRate")) || undefined,
                          estimatedValue: Number(formData.get("estimatedValue")) || undefined,
                        });
                      }} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="purchasePrice">Original Purchase Price</Label>
                            <Input id="purchasePrice" name="purchasePrice" type="number" placeholder="$" defaultValue={financialData.purchasePrice} />
                          </div>
                          <div>
                            <Label htmlFor="estimatedValue">Estimated Current Value</Label>
                            <Input id="estimatedValue" name="estimatedValue" type="number" placeholder="$" defaultValue={financialData.estimatedValue} />
                          </div>
                          <div>
                            <Label htmlFor="mortgageBalance">Mortgage Balance</Label>
                            <Input id="mortgageBalance" name="mortgageBalance" type="number" placeholder="$" defaultValue={financialData.mortgageBalance} />
                          </div>
                          <div>
                            <Label htmlFor="interestRate">Interest Rate (%)</Label>
                            <Input id="interestRate" name="interestRate" type="number" step="0.125" placeholder="%" defaultValue={financialData.interestRate} />
                          </div>
                        </div>
                        <Button type="submit" className="gap-2" disabled={updateMutation.isPending}>
                          <Save className="h-4 w-4" /> Save Financial Data
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="components">
                  <Card className="border-none shadow-md">
                    <CardHeader>
                      <CardTitle className="font-serif">Component Tracker</CardTitle>
                      <CardDescription>Track home systems and replacement schedules</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-sm mb-4">
                        Track major home components like HVAC, roof, water heater, appliances, etc.
                      </p>
                      <div className="space-y-3">
                        {["HVAC System", "Roof", "Water Heater", "Furnace", "Windows", "Appliances"].map((name) => (
                          <div key={name} className="grid grid-cols-4 gap-2 items-center p-3 border rounded-lg bg-secondary/20">
                            <span className="font-medium">{name}</span>
                            <Input placeholder="Install date" className="h-8 text-sm" />
                            <Input placeholder="Lifespan (years)" type="number" className="h-8 text-sm" />
                            <Input placeholder="Replace cost" type="number" className="h-8 text-sm" />
                          </div>
                        ))}
                      </div>
                      <Button className="gap-2 mt-4">
                        <Save className="h-4 w-4" /> Save Components
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="records">
                  <Card className="border-none shadow-md">
                    <CardHeader>
                      <CardTitle className="font-serif">Public Records</CardTitle>
                      <CardDescription>Tax and property records snapshot</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        handleSaveSection("publicRecords", {
                          taxId: formData.get("taxId"),
                          ownerOfRecord: formData.get("ownerOfRecord"),
                          zoning: formData.get("zoning"),
                          lotSize: formData.get("lotSize"),
                        });
                      }} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="taxId">Tax ID / Parcel Number</Label>
                            <Input id="taxId" name="taxId" defaultValue={publicRecords.taxId} />
                          </div>
                          <div>
                            <Label htmlFor="ownerOfRecord">Owner of Record</Label>
                            <Input id="ownerOfRecord" name="ownerOfRecord" defaultValue={publicRecords.ownerOfRecord} />
                          </div>
                          <div>
                            <Label htmlFor="zoning">Zoning</Label>
                            <Input id="zoning" name="zoning" placeholder="Residential, Commercial, etc." defaultValue={publicRecords.zoning} />
                          </div>
                          <div>
                            <Label htmlFor="lotSize">Lot Size</Label>
                            <Input id="lotSize" name="lotSize" placeholder="0.25 acres" defaultValue={publicRecords.lotSize} />
                          </div>
                        </div>
                        <Button type="submit" className="gap-2" disabled={updateMutation.isPending}>
                          <Save className="h-4 w-4" /> Save Records
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="pricing">
                  <Card className="border-none shadow-md">
                    <CardHeader>
                      <CardTitle className="font-serif">Visual Pricing Reference</CardTitle>
                      <CardDescription>Link to existing Visual Pricing analysis</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Label>Link Visual Pricing Analysis</Label>
                          <Select 
                            value={review.visualPricingId || ""} 
                            onValueChange={(val) => updateMutation.mutate({ visualPricingId: val || null })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a pricing analysis..." />
                            </SelectTrigger>
                            <SelectContent>
                              {pricingReviews.map((pr) => (
                                <SelectItem key={pr.id} value={pr.id}>{pr.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {review.visualPricingId && (
                          <Link href="/visual-pricing">
                            <Button variant="outline" className="gap-2">
                              <ExternalLink className="h-4 w-4" /> View Pricing Analysis
                            </Button>
                          </Link>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Visual Pricing analyses are created separately in the Visual Pricing tool.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="market">
                  <Card className="border-none shadow-md">
                    <CardHeader>
                      <CardTitle className="font-serif">Market Data</CardTitle>
                      <CardDescription>Upload or paste market context information</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        handleSaveSection("marketData", {
                          localTwoYearSnapshot: formData.get("localTwoYearSnapshot"),
                          countyStats: formData.get("countyStats"),
                          regionalStats: formData.get("regionalStats"),
                          nationalStats: formData.get("nationalStats"),
                          notes: formData.get("notes"),
                        });
                      }} className="space-y-4">
                        <div>
                          <Label htmlFor="localTwoYearSnapshot">Local 2-Year Market Snapshot</Label>
                          <Textarea id="localTwoYearSnapshot" name="localTwoYearSnapshot" placeholder="Paste local market data..." defaultValue={marketData.localTwoYearSnapshot} />
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="countyStats">County Stats</Label>
                            <Textarea id="countyStats" name="countyStats" className="h-24" defaultValue={marketData.countyStats} />
                          </div>
                          <div>
                            <Label htmlFor="regionalStats">Regional Stats</Label>
                            <Textarea id="regionalStats" name="regionalStats" className="h-24" defaultValue={marketData.regionalStats} />
                          </div>
                          <div>
                            <Label htmlFor="nationalStats">National Stats</Label>
                            <Textarea id="nationalStats" name="nationalStats" className="h-24" defaultValue={marketData.nationalStats} />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="notes">Additional Notes</Label>
                          <Textarea id="notes" name="notes" placeholder="Any additional context..." defaultValue={marketData.notes} />
                        </div>
                        <Button type="submit" className="gap-2" disabled={updateMutation.isPending}>
                          <Save className="h-4 w-4" /> Save Market Data
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-6">
              <Card className="border-none shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-serif">Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold">{completedTasks}/{totalTasks}</span>
                    <span className="text-sm text-muted-foreground">tasks done</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary rounded-full h-2 transition-all" 
                      style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-serif">Tasks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-2">
                      <Checkbox 
                        checked={task.completed}
                        onCheckedChange={(checked) => updateTaskMutation.mutate({ taskId: task.id, completed: !!checked })}
                        className="mt-0.5"
                      />
                      <span className={`text-sm ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                        {task.title}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-none shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-serif">Output Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Gamma Link</Label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Paste Gamma URL..." 
                        value={review.gammaLink || ""} 
                        onChange={(e) => updateMutation.mutate({ gammaLink: e.target.value })}
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Loom Recording</Label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Paste Loom URL..." 
                        value={review.loomLink || ""} 
                        onChange={(e) => updateMutation.mutate({ loomLink: e.target.value })}
                        className="text-sm"
                      />
                    </div>
                  </div>
                  {review.gammaLink && (
                    <a href={review.gammaLink} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        <ExternalLink className="h-4 w-4" /> Open Gamma
                      </Button>
                    </a>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
