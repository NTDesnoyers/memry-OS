import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, BarChart3, PieChart, TrendingUp, FileText, Printer, Home, ArrowRight, ChevronRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, Cell, ReferenceLine } from "recharts";
import { type PricingReview, type MLSProperty, type Person } from "@shared/schema";

function parseMLSData(rawData: string): MLSProperty[] {
  const lines = rawData.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split('\t').map(h => h.trim().toLowerCase());
  const properties: MLSProperty[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t');
    const prop: any = {};
    
    headers.forEach((header, idx) => {
      const value = values[idx]?.trim() || '';
      
      if (header.includes('mls') && header.includes('number')) prop.mlsNumber = value;
      else if (header.includes('status') && !header.includes('change')) prop.status = value;
      else if (header.includes('address') || header.includes('street')) prop.address = value;
      else if (header === 'city') prop.city = value;
      else if (header.includes('subdivision') || header.includes('neighborhood')) prop.subdivision = value;
      else if (header.includes('acre') || header.includes('lot size')) prop.acres = parseFloat(value) || undefined;
      else if (header.includes('above grade') && header.includes('sqft')) prop.aboveGradeSqft = parseInt(value) || undefined;
      else if (header.includes('total') && header.includes('sqft')) prop.totalSqft = parseInt(value) || undefined;
      else if (header === 'beds' || header.includes('bedroom')) prop.beds = parseInt(value) || undefined;
      else if (header.includes('bath')) prop.baths = parseFloat(value) || undefined;
      else if (header.includes('year') && header.includes('built')) prop.yearBuilt = parseInt(value) || undefined;
      else if (header === 'style') prop.style = value;
      else if (header === 'list price' || header.includes('list price')) prop.listPrice = parseInt(value.replace(/[$,]/g, '')) || undefined;
      else if (header.includes('original') && header.includes('price')) prop.originalListPrice = parseInt(value.replace(/[$,]/g, '')) || undefined;
      else if (header.includes('close price') || header.includes('sold price')) prop.closePrice = parseInt(value.replace(/[$,]/g, '')) || undefined;
      else if (header === 'dom' || header.includes('days on market')) prop.dom = parseInt(value) || undefined;
      else if (header.includes('list') && header.includes('date')) prop.listDate = value;
      else if (header.includes('close date') || header.includes('sold date')) prop.closeDate = value;
      else if (header.includes('status change')) prop.statusChangeDate = value;
    });
    
    if (prop.totalSqft && prop.closePrice) {
      prop.pricePerSqft = Math.round(prop.closePrice / prop.totalSqft);
    } else if (prop.aboveGradeSqft && prop.closePrice) {
      prop.pricePerSqft = Math.round(prop.closePrice / prop.aboveGradeSqft);
    }
    
    if (prop.mlsNumber || prop.address) {
      properties.push(prop as MLSProperty);
    }
  }
  
  return properties;
}

function calculateMetrics(properties: MLSProperty[]) {
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
  
  const closed = properties.filter(p => p.status?.toLowerCase().includes('closed') || p.status?.toLowerCase().includes('sold'));
  const underContract = properties.filter(p => p.status?.toLowerCase().includes('contract') || p.status?.toLowerCase().includes('pending'));
  const forSale = properties.filter(p => p.status?.toLowerCase().includes('active') || p.status?.toLowerCase().includes('for sale'));
  const expired = properties.filter(p => p.status?.toLowerCase().includes('expired') || p.status?.toLowerCase().includes('withdrawn') || p.status?.toLowerCase().includes('cancelled'));
  
  const closedLast12Months = closed.filter(p => {
    if (!p.closeDate) return false;
    const closeDate = new Date(p.closeDate);
    return closeDate >= oneYearAgo;
  });
  
  const avgDOM = closed.length > 0 
    ? Math.round(closed.reduce((sum, p) => sum + (p.dom || 0), 0) / closed.length)
    : 0;
    
  const avgClosePrice = closed.length > 0
    ? Math.round(closed.reduce((sum, p) => sum + (p.closePrice || 0), 0) / closed.length)
    : 0;
  
  const monthlyRate = closedLast12Months.length / 12;
  const inventoryMonths = monthlyRate > 0 ? (forSale.length / monthlyRate) : 0;
  
  const totalActivity = closed.length + forSale.length + expired.length;
  const oddsOfSelling = totalActivity > 0 ? Math.round((closed.length / totalActivity) * 100) : 0;
  
  const stagnant = forSale.filter(p => (p.dom || 0) > avgDOM);
  
  const monthlyClosings: { [key: string]: number } = {};
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  months.forEach(m => monthlyClosings[m] = 0);
  
  closedLast12Months.forEach(p => {
    if (p.closeDate) {
      const month = new Date(p.closeDate).getMonth();
      monthlyClosings[months[month]]++;
    }
  });
  
  return {
    totalProperties: properties.length,
    closed: closed.length,
    underContract: underContract.length,
    forSale: forSale.length,
    expired: expired.length,
    stagnant: stagnant.length,
    closedLast12Months: closedLast12Months.length,
    avgDOM,
    avgClosePrice,
    monthlyRate: Math.round(monthlyRate * 10) / 10,
    inventoryMonths: Math.round(inventoryMonths * 10) / 10,
    oddsOfSelling,
    monthlyClosings,
    closedProperties: closed,
    forSaleProperties: forSale,
    underContractProperties: underContract
  };
}

export default function VisualPricing() {
  const queryClient = useQueryClient();
  const [mlsInput, setMlsInput] = useState("");
  const [reviewTitle, setReviewTitle] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  
  const { data: reviews = [], isLoading } = useQuery<PricingReview[]>({
    queryKey: ["/api/pricing-reviews"],
  });
  
  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });
  
  const createReviewMutation = useMutation({
    mutationFn: async (data: { title: string; neighborhood?: string; mlsData: MLSProperty[] }) => {
      const res = await fetch("/api/pricing-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          neighborhood: data.neighborhood,
          mlsData: data.mlsData,
          calculatedMetrics: calculateMetrics(data.mlsData)
        }),
      });
      if (!res.ok) throw new Error("Failed to create review");
      return res.json();
    },
    onSuccess: (newReview) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pricing-reviews"] });
      setCreateDialogOpen(false);
      setMlsInput("");
      setReviewTitle("");
      setNeighborhood("");
      setActiveReviewId(newReview.id);
    },
  });
  
  const activeReview = reviews.find(r => r.id === activeReviewId);
  const mlsData = (activeReview?.mlsData as MLSProperty[]) || [];
  const metrics = useMemo(() => activeReview?.calculatedMetrics as ReturnType<typeof calculateMetrics> || calculateMetrics([]), [activeReview]);
  
  const handleCreateReview = () => {
    const properties = parseMLSData(mlsInput);
    if (properties.length === 0) {
      alert("Could not parse any properties from the data. Make sure it's tab-separated with headers.");
      return;
    }
    createReviewMutation.mutate({
      title: reviewTitle || `${neighborhood || 'Market'} Analysis`,
      neighborhood,
      mlsData: properties
    });
  };
  
  const scatterData = metrics.closedProperties?.map(p => ({
    dom: p.dom || 0,
    price: p.closePrice || 0,
    address: p.address
  })) || [];
  
  const barChartData = Object.entries(metrics.monthlyClosings || {}).map(([month, count]) => ({
    month,
    count
  }));
  
  const currentMonth = new Date().getMonth();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <Layout>
      <div className="min-h-screen bg-secondary/30">
        <div className="container mx-auto px-4 py-8 max-w-[1400px]">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-serif font-bold text-primary">Visual Pricing</h1>
              <p className="text-muted-foreground">Focus1st-style market analysis from MLS data</p>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" data-testid="button-new-analysis">
                  <Plus className="h-4 w-4" /> New Analysis
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Pricing Analysis</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Analysis Title</Label>
                      <Input 
                        id="title" 
                        placeholder="e.g., Woodgate Village Analysis"
                        value={reviewTitle}
                        onChange={(e) => setReviewTitle(e.target.value)}
                        data-testid="input-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="neighborhood">Neighborhood/Area</Label>
                      <Input 
                        id="neighborhood" 
                        placeholder="e.g., Centreville"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        data-testid="input-neighborhood"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mlsData">Paste MLS Export Data (Tab-Separated)</Label>
                    <Textarea 
                      id="mlsData"
                      placeholder="Paste your MLS export data here... Include headers on the first line."
                      className="min-h-[200px] font-mono text-xs"
                      value={mlsInput}
                      onChange={(e) => setMlsInput(e.target.value)}
                      data-testid="input-mls-data"
                    />
                    <p className="text-xs text-muted-foreground">
                      Export from Bright MLS using "Focus1st Export" format. Must include: MLS Number, Status, Address, Beds, Baths, SqFt, List Price, Close Price, DOM, Close Date
                    </p>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateReview} disabled={!mlsInput.trim()} data-testid="button-create-analysis">
                      <Upload className="h-4 w-4 mr-2" /> Import & Analyze
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </header>
          
          <div className="grid lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <Card className="border-none shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Your Analyses</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="p-4 text-center text-muted-foreground">Loading...</div>
                  ) : reviews.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No analyses yet. Create one to get started.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {reviews.map((review) => (
                        <button
                          key={review.id}
                          onClick={() => setActiveReviewId(review.id)}
                          className={`w-full text-left p-3 hover:bg-muted/50 transition-colors ${activeReviewId === review.id ? 'bg-primary/5 border-l-2 border-primary' : ''}`}
                          data-testid={`button-review-${review.id}`}
                        >
                          <p className="font-medium text-sm truncate">{review.title}</p>
                          <p className="text-xs text-muted-foreground">{review.neighborhood || 'No location'}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-3">
              {!activeReview ? (
                <Card className="border-none shadow-md">
                  <CardContent className="py-16 text-center">
                    <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                    <h3 className="text-lg font-medium mb-2">Select or Create an Analysis</h3>
                    <p className="text-muted-foreground mb-4">Import MLS data to generate visual pricing charts</p>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" /> New Analysis
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="bg-card/50 backdrop-blur-sm">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="odds">Odds of Selling</TabsTrigger>
                    <TabsTrigger value="time">Time to Close</TabsTrigger>
                    <TabsTrigger value="pattern">Buying Pattern</TabsTrigger>
                    <TabsTrigger value="pond">Real Estate Pond</TabsTrigger>
                    <TabsTrigger value="data">Raw Data</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-6 mt-6">
                    <div className="grid md:grid-cols-4 gap-4">
                      <Card className="bg-green-50 border-green-200">
                        <CardContent className="pt-6">
                          <p className="text-3xl font-bold text-green-700">{metrics.closed}</p>
                          <p className="text-sm text-green-600">Closed</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="pt-6">
                          <p className="text-3xl font-bold text-blue-700">{metrics.underContract}</p>
                          <p className="text-sm text-blue-600">Under Contract</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-orange-50 border-orange-200">
                        <CardContent className="pt-6">
                          <p className="text-3xl font-bold text-orange-700">{metrics.forSale}</p>
                          <p className="text-sm text-orange-600">For Sale</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-red-50 border-red-200">
                        <CardContent className="pt-6">
                          <p className="text-3xl font-bold text-red-700">{metrics.expired}</p>
                          <p className="text-sm text-red-600">Did Not Sell</p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-6 text-center">
                          <p className="text-4xl font-bold text-primary">{metrics.oddsOfSelling}%</p>
                          <p className="text-sm text-muted-foreground">Odds of Selling</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6 text-center">
                          <p className="text-4xl font-bold text-primary">{metrics.avgDOM}</p>
                          <p className="text-sm text-muted-foreground">Avg Days on Market</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6 text-center">
                          <p className="text-4xl font-bold text-primary">{metrics.inventoryMonths}</p>
                          <p className="text-sm text-muted-foreground">Months of Inventory</p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="font-serif">Market Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg">
                          Homes are selling at <strong>{metrics.monthlyRate} per month</strong>, with <strong>{metrics.inventoryMonths} months</strong> of inventory available.
                        </p>
                        <p className="text-muted-foreground mt-2">
                          The average sale price is <strong>${metrics.avgClosePrice?.toLocaleString()}</strong> with an average of <strong>{metrics.avgDOM} days</strong> on market.
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="odds" className="mt-6">
                    <Card className="border-none shadow-md">
                      <CardHeader className="text-center pb-2">
                        <CardTitle className="font-serif text-2xl">The Odds of Selling Your Home</CardTitle>
                        <CardDescription>{activeReview.neighborhood || activeReview.title}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6 pt-4">
                        <div className="flex items-center justify-center gap-1">
                          <div className="bg-green-600 text-white px-6 py-4 rounded-l-lg text-center min-w-[100px]">
                            <p className="text-3xl font-bold">{metrics.closed}</p>
                            <p className="text-xs uppercase">Properties Closed</p>
                          </div>
                          <ChevronRight className="text-green-600 h-8 w-8 -mx-2 z-10" />
                          <div className="bg-teal-600 text-white px-6 py-4 text-center min-w-[100px]">
                            <p className="text-3xl font-bold">{metrics.underContract}</p>
                            <p className="text-xs uppercase">Under Contract</p>
                          </div>
                          <ChevronRight className="text-teal-600 h-8 w-8 -mx-2 z-10" />
                          <div className="bg-yellow-500 text-white px-6 py-4 text-center min-w-[100px]">
                            <p className="text-3xl font-bold">{metrics.forSale}</p>
                            <p className="text-xs uppercase">For Sale</p>
                          </div>
                          <ChevronRight className="text-yellow-500 h-8 w-8 -mx-2 z-10" />
                          <div className="bg-red-600 text-white px-6 py-4 text-center min-w-[100px]">
                            <p className="text-3xl font-bold">{metrics.expired}</p>
                            <p className="text-xs uppercase">Did Not Sell</p>
                          </div>
                          <ArrowRight className="text-muted-foreground h-8 w-8 mx-2" />
                          <div className="bg-primary text-white px-6 py-4 rounded-r-lg text-center min-w-[100px]">
                            <p className="text-3xl font-bold">{metrics.oddsOfSelling}%</p>
                            <p className="text-xs uppercase">Odds of Selling</p>
                          </div>
                        </div>
                        
                        <div className="text-center py-6 bg-muted/30 rounded-lg">
                          <p className="text-xl">
                            Homes are selling at <strong className="text-primary">{metrics.monthlyRate} per month</strong>, 
                            with <strong className="text-primary">{metrics.inventoryMonths} months</strong> of inventory available.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="time" className="mt-6">
                    <Card className="border-none shadow-md">
                      <CardHeader className="text-center">
                        <CardTitle className="font-serif text-2xl">Average Time To Close Properties</CardTitle>
                        <CardDescription>{activeReview.neighborhood || activeReview.title}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-center">
                          <p className="text-red-800">
                            The Average Days Before Closed is <strong>{metrics.avgDOM} Days</strong>, 
                            the Average Closed Price was <strong>${metrics.avgClosePrice?.toLocaleString()}</strong>.
                          </p>
                        </div>
                        <div className="h-[400px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 60 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                type="number" 
                                dataKey="dom" 
                                name="Days on Market" 
                                label={{ value: 'Days To Closed', position: 'bottom', offset: 20 }}
                                domain={[0, 'auto']}
                              />
                              <YAxis 
                                type="number" 
                                dataKey="price" 
                                name="Price" 
                                tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                                label={{ value: 'Property Price', angle: -90, position: 'insideLeft', offset: -10 }}
                              />
                              <Tooltip 
                                formatter={(value: number, name: string) => {
                                  if (name === 'Price') return [`$${value.toLocaleString()}`, 'Price'];
                                  return [value, name];
                                }}
                              />
                              <ReferenceLine x={metrics.avgDOM} stroke="#ef4444" strokeWidth={2} />
                              <Scatter data={scatterData} fill="#3b82f6">
                                {scatterData.map((entry, index) => (
                                  <Cell key={index} fill={entry.dom > metrics.avgDOM ? '#ef4444' : '#3b82f6'} />
                                ))}
                              </Scatter>
                            </ScatterChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="pattern" className="mt-6">
                    <Card className="border-none shadow-md">
                      <CardHeader className="text-center">
                        <CardTitle className="font-serif text-2xl">The Buying Pattern For Your Area</CardTitle>
                        <CardDescription>{activeReview.neighborhood || activeReview.title}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[400px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barChartData} margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="month" />
                              <YAxis allowDecimals={false} />
                              <Tooltip />
                              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                {barChartData.map((entry, index) => (
                                  <Cell 
                                    key={index} 
                                    fill={months.indexOf(entry.month) <= currentMonth ? '#1e3a5f' : '#94a3b8'}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="text-center text-sm text-muted-foreground mt-4">
                          Number of Properties Closed per Month
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="pond" className="mt-6">
                    <Card className="border-none shadow-md">
                      <CardHeader className="text-center">
                        <CardTitle className="font-serif text-2xl">The Real Estate Pond</CardTitle>
                        <CardDescription>Supply and Demand in {activeReview.neighborhood || activeReview.title}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex items-center justify-center gap-8">
                          <div className="text-center">
                            <div className="bg-blue-100 rounded-lg p-4 mb-2">
                              <Home className="h-12 w-12 mx-auto text-blue-600 mb-2" />
                              <p className="text-3xl font-bold text-blue-700">{Math.round(metrics.monthlyRate * 3)}</p>
                            </div>
                            <p className="text-xs uppercase text-muted-foreground">Projected New<br/>Homes in 90 Days</p>
                          </div>
                          
                          <div className="text-center">
                            <p className="text-sm uppercase text-muted-foreground mb-2">Supply and Demand</p>
                            <div className="relative w-32 h-16">
                              <div className={`absolute inset-0 flex items-center justify-center text-sm font-medium ${
                                metrics.inventoryMonths < 3 ? 'text-orange-600' : metrics.inventoryMonths > 6 ? 'text-blue-600' : 'text-gray-600'
                              }`}>
                                {metrics.inventoryMonths < 3 ? 'Favors Sellers' : metrics.inventoryMonths > 6 ? 'Favors Buyers' : 'Balanced'}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-center">
                            <div className="bg-green-100 rounded-lg p-4 mb-2">
                              <Home className="h-12 w-12 mx-auto text-green-600 mb-2" />
                              <p className="text-3xl font-bold text-green-700">{Math.round(metrics.monthlyRate * 3)}</p>
                            </div>
                            <p className="text-xs uppercase text-muted-foreground">Projected Sold<br/>Homes in 90 Days</p>
                          </div>
                        </div>
                        
                        <div className="space-y-3 max-w-md mx-auto">
                          <div className="flex items-center gap-4 bg-blue-600 text-white rounded-lg p-4">
                            <p className="text-3xl font-bold w-12 text-center">{metrics.underContract}</p>
                            <div>
                              <p className="font-semibold text-lg">FLOWING</p>
                              <p className="text-sm opacity-80">(Under Contract)</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 bg-teal-600 text-white rounded-lg p-4">
                            <p className="text-3xl font-bold w-12 text-center">{metrics.forSale - metrics.stagnant}</p>
                            <div>
                              <p className="font-semibold text-lg">SHOWING</p>
                              <p className="text-sm opacity-80">(For Sale, Not Under Contract)</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 bg-slate-600 text-white rounded-lg p-4">
                            <p className="text-3xl font-bold w-12 text-center">{metrics.stagnant}</p>
                            <div>
                              <p className="font-semibold text-lg">STAGNANT</p>
                              <p className="text-sm opacity-80">(For Sale, Exceeded Average DOM)</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="data" className="mt-6">
                    <Card className="border-none shadow-md overflow-hidden">
                      <CardHeader>
                        <CardTitle className="font-serif">Imported MLS Data</CardTitle>
                        <CardDescription>{mlsData.length} properties</CardDescription>
                      </CardHeader>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>MLS #</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Address</TableHead>
                              <TableHead>Beds</TableHead>
                              <TableHead>Baths</TableHead>
                              <TableHead>SqFt</TableHead>
                              <TableHead>List Price</TableHead>
                              <TableHead>Close Price</TableHead>
                              <TableHead>DOM</TableHead>
                              <TableHead>$/SqFt</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {mlsData.slice(0, 50).map((prop, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-mono text-xs">{prop.mlsNumber}</TableCell>
                                <TableCell>
                                  <Badge variant={
                                    prop.status?.toLowerCase().includes('closed') ? 'default' :
                                    prop.status?.toLowerCase().includes('active') ? 'secondary' :
                                    'outline'
                                  }>
                                    {prop.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate">{prop.address}</TableCell>
                                <TableCell>{prop.beds || '-'}</TableCell>
                                <TableCell>{prop.baths || '-'}</TableCell>
                                <TableCell>{prop.totalSqft?.toLocaleString() || prop.aboveGradeSqft?.toLocaleString() || '-'}</TableCell>
                                <TableCell>${prop.listPrice?.toLocaleString() || '-'}</TableCell>
                                <TableCell className="font-medium">${prop.closePrice?.toLocaleString() || '-'}</TableCell>
                                <TableCell>{prop.dom || '-'}</TableCell>
                                <TableCell>${prop.pricePerSqft || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
