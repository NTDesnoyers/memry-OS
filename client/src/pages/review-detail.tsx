import { useState, useEffect } from "react";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Home, FileText, Database, BarChart3, TrendingUp, Save, ExternalLink, Send, CheckCircle2, Sparkles, FileCheck, Map, Plus, Trash2, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";
import type { RealEstateReview, Task } from "@shared/schema";

interface ParsedProperty {
  address?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  totalSqft?: number;
  yearBuilt?: number;
  lotSize?: string;
  zoning?: string;
  taxId?: string;
  owner?: string;
  basement?: string;
  garage?: string;
  style?: string;
  stories?: number;
  exterior?: string;
}

interface ComparableSale {
  mlsNumber: string;
  status: string;
  address: string;
  acres?: number;
  aboveGradeSqft: number;
  totalSqft: number;
  beds: number;
  baths: number;
  yearBuilt: number;
  listPrice: number;
  dom: number;
  closeDate?: string;
  soldPrice?: number;
  priceDiff?: number;
  pricePerSqft?: number;
}

interface PropertyData {
  id: string;
  name: string;
  address: string;
  publicRecordsRaw: string;
  mlsDataRaw: string;
  parsedProperty: ParsedProperty | null;
  comparables: ComparableSale[];
}

function parsePublicRecords(text: string): ParsedProperty {
  const result: ParsedProperty = {};
  
  const addressMatch = text.match(/(\d+\s+[\w\s]+(?:Pl|Dr|Ct|St|Ave|Rd|Ln|Way|Cir|Sq)[,\s]+[\w\s]+,\s*[A-Z]{2})/i);
  if (addressMatch) result.address = addressMatch[1].trim();
  
  const bedsMatch = text.match(/Bed\s*Rooms?:?\s*(\d+)/i);
  if (bedsMatch) result.beds = parseInt(bedsMatch[1]);
  
  const bathsMatch = text.match(/Total\s*Baths?:?\s*([\d.]+)/i);
  if (bathsMatch) result.baths = parseFloat(bathsMatch[1]);
  
  const sqftMatch = text.match(/Abv\s*Grd\s*(?:Fin\s*)?SQFT:?\s*([\d,]+)/i);
  if (sqftMatch) result.sqft = parseInt(sqftMatch[1].replace(/,/g, ''));
  
  const belowMatch = text.match(/Below\s*Grade\s*(?:Fin\s*)?[\s\S]*?SQFT:?\s*([\d,]+)/i);
  if (belowMatch && result.sqft) {
    result.totalSqft = result.sqft + parseInt(belowMatch[1].replace(/,/g, ''));
  }
  
  const yearMatch = text.match(/Year\s*Built:?\s*(\d{4})/i);
  if (yearMatch) result.yearBuilt = parseInt(yearMatch[1]);
  
  const lotMatch = text.match(/Acres:?\s*([\d.]+)/i);
  if (lotMatch) result.lotSize = `${lotMatch[1]} acres`;
  
  const zoningMatch = text.match(/Zoning:?\s*(\w+)/i);
  if (zoningMatch) result.zoning = zoningMatch[1];
  
  const taxIdMatch = text.match(/Tax\s*ID:?\s*([\w-]+)/i);
  if (taxIdMatch) result.taxId = taxIdMatch[1];
  
  const ownerMatch = text.match(/Owner:?\s*([\w\s&]+?)(?:\s+Owner|$)/i);
  if (ownerMatch) result.owner = ownerMatch[1].trim();
  
  const basementMatch = text.match(/Basement\s*Type:?\s*(\w+)/i);
  if (basementMatch) result.basement = basementMatch[1];
  
  const garageMatch = text.match(/Garage\s*Type:?\s*([^\n]+)/i);
  if (garageMatch) result.garage = garageMatch[1].trim();
  
  const styleMatch = text.match(/Residential\s*Style:?\s*(\w+)/i);
  if (styleMatch) result.style = styleMatch[1];
  
  const storiesMatch = text.match(/Stories:?\s*([\d.]+)/i);
  if (storiesMatch) result.stories = parseFloat(storiesMatch[1]);
  
  const exteriorMatch = text.match(/Exterior:?\s*(\w+)/i);
  if (exteriorMatch) result.exterior = exteriorMatch[1];
  
  return result;
}

function parseMLSData(text: string): ComparableSale[] {
  const comparables: ComparableSale[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const match = line.match(/^\s*(\d+)\s+(VALO\d+)\s+(Closed|For Sale|U\/C|With\/Exp)\s+(.+?)\s+([\d.]+)?\s+([\d,]+)\s+([\d,]+)\s+(\d+)\s+(\d+)\s+(\d{4})\s+\$([\d,]+)\s+(\d+)?\s*([\d\/]+)?\s*\$?([\d,]+)?\s*\(?\$?([\d,]+)?\)?/i);
    
    if (match) {
      const soldPrice = match[14] ? parseInt(match[14].replace(/,/g, '')) : undefined;
      const totalSqft = parseInt(match[7].replace(/,/g, ''));
      
      comparables.push({
        mlsNumber: match[2],
        status: match[3],
        address: match[4].trim(),
        acres: match[5] ? parseFloat(match[5]) : undefined,
        aboveGradeSqft: parseInt(match[6].replace(/,/g, '')),
        totalSqft,
        beds: parseInt(match[8]),
        baths: parseInt(match[9]),
        yearBuilt: parseInt(match[10]),
        listPrice: parseInt(match[11].replace(/,/g, '')),
        dom: match[12] ? parseInt(match[12]) : 0,
        closeDate: match[13],
        soldPrice,
        priceDiff: match[15] ? parseInt(match[15].replace(/,/g, '')) * (line.includes('($') ? -1 : 1) : undefined,
        pricePerSqft: soldPrice && totalSqft ? Math.round(soldPrice / totalSqft) : undefined,
      });
    }
  }
  
  return comparables;
}

function calculateMarketStats(comparables: ComparableSale[]) {
  const closed = comparables.filter(c => c.status === "Closed" && c.soldPrice);
  const underContract = comparables.filter(c => c.status === "U/C");
  const forSale = comparables.filter(c => c.status === "For Sale");
  const expired = comparables.filter(c => c.status === "With/Exp");
  
  const avgDom = closed.length > 0 
    ? Math.round(closed.reduce((sum, c) => sum + c.dom, 0) / closed.length)
    : 0;
  
  const avgPrice = closed.length > 0
    ? Math.round(closed.reduce((sum, c) => sum + (c.soldPrice || 0), 0) / closed.length)
    : 0;
  
  const oddsOfSelling = closed.length + underContract.length > 0
    ? Math.round(((closed.length + underContract.length) / comparables.length) * 100)
    : 0;
  
  const monthlySales = closed.length / 12;
  const inventory = forSale.length / (monthlySales || 1);
  
  return {
    closed: closed.length,
    underContract: underContract.length,
    forSale: forSale.length,
    expired: expired.length,
    avgDom,
    avgPrice,
    oddsOfSelling,
    monthlySales: monthlySales.toFixed(1),
    inventory: inventory.toFixed(1),
  };
}

function generatePropertyId() {
  return `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default function ReviewDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("properties");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [addPropertyOpen, setAddPropertyOpen] = useState(false);
  const [newPropertyName, setNewPropertyName] = useState("");
  const [newPropertyAddress, setNewPropertyAddress] = useState("");
  
  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [marketStatsRaw, setMarketStatsRaw] = useState("");

  const { data: review, isLoading } = useQuery<RealEstateReview>({
    queryKey: [`/api/real-estate-reviews/${id}`],
    enabled: !!id,
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: [`/api/real-estate-reviews/${id}/tasks`],
    enabled: !!id,
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

  useEffect(() => {
    if (review) {
      const rawData = review.propertyData as any;
      if (rawData?.properties) {
        setProperties(rawData.properties);
        if (rawData.properties.length > 0 && !selectedPropertyId) {
          setSelectedPropertyId(rawData.properties[0].id);
        }
      } else if (rawData?.publicRecordsRaw || rawData?.mlsDataRaw) {
        const legacyProperty: PropertyData = {
          id: generatePropertyId(),
          name: "Property 1",
          address: review.propertyAddress || "",
          publicRecordsRaw: rawData.publicRecordsRaw || "",
          mlsDataRaw: rawData.mlsDataRaw || "",
          parsedProperty: rawData.parsedProperty || null,
          comparables: rawData.comparables || [],
        };
        setProperties([legacyProperty]);
        setSelectedPropertyId(legacyProperty.id);
      }
      if (rawData?.marketStatsRaw) setMarketStatsRaw(rawData.marketStatsRaw);
    }
  }, [review]);

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  const handleAddProperty = () => {
    if (!newPropertyName.trim()) return;
    
    const newProperty: PropertyData = {
      id: generatePropertyId(),
      name: newPropertyName,
      address: newPropertyAddress,
      publicRecordsRaw: "",
      mlsDataRaw: "",
      parsedProperty: null,
      comparables: [],
    };
    
    setProperties([...properties, newProperty]);
    setSelectedPropertyId(newProperty.id);
    setAddPropertyOpen(false);
    setNewPropertyName("");
    setNewPropertyAddress("");
    toast({ title: "Property Added", description: `Added ${newPropertyName}` });
  };

  const handleDeleteProperty = (propId: string) => {
    const updated = properties.filter(p => p.id !== propId);
    setProperties(updated);
    if (selectedPropertyId === propId) {
      setSelectedPropertyId(updated.length > 0 ? updated[0].id : null);
    }
    toast({ title: "Property Removed" });
  };

  const updateProperty = (propId: string, updates: Partial<PropertyData>) => {
    setProperties(properties.map(p => p.id === propId ? { ...p, ...updates } : p));
  };

  const handleParsePublicRecords = (propId: string) => {
    const prop = properties.find(p => p.id === propId);
    if (!prop) return;
    
    const parsed = parsePublicRecords(prop.publicRecordsRaw);
    updateProperty(propId, { 
      parsedProperty: parsed,
      address: parsed.address || prop.address,
    });
    toast({ title: "Parsed!", description: "Public records data extracted." });
  };

  const handleParseMLSData = (propId: string) => {
    const prop = properties.find(p => p.id === propId);
    if (!prop) return;
    
    const parsed = parseMLSData(prop.mlsDataRaw);
    updateProperty(propId, { comparables: parsed });
    toast({ title: "Parsed!", description: `Found ${parsed.length} comparable properties.` });
  };

  const handleSaveAll = () => {
    updateMutation.mutate({
      propertyData: {
        properties,
        marketStatsRaw,
      },
      marketData: {
        raw: marketStatsRaw,
      },
    });
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

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  
  const allComparables = properties.flatMap(p => p.comparables);
  const allClosedComps = allComparables.filter(c => c.status === "Closed" && c.soldPrice);
  const aggregateStats = allComparables.length > 0 ? calculateMarketStats(allComparables) : null;
  
  const chartData = allClosedComps.map(c => ({
    sqft: c.totalSqft,
    price: c.soldPrice,
    address: c.address,
    dom: c.dom,
  }));
  
  const buyingPattern = allClosedComps.reduce((acc, c) => {
    if (c.closeDate) {
      const month = c.closeDate.split('/')[0];
      const monthNames = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
      const monthName = monthNames[parseInt(month) - 1] || month;
      acc[monthName] = (acc[monthName] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  const buyingPatternData = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map(m => ({
    month: m,
    count: buyingPattern[m] || 0,
  }));

  return (
    <Layout>
      <div className="min-h-screen bg-secondary/30 relative">
        <div 
          className="fixed inset-0 opacity-40 mix-blend-multiply pointer-events-none -z-10"
          style={{ backgroundImage: `url(${paperBg})`, backgroundSize: 'cover' }}
        />
        
        <div className="container mx-auto px-4 py-8 max-w-7xl">
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
                <p className="text-muted-foreground">{properties.length} {properties.length === 1 ? 'property' : 'properties'}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={handleSaveAll} disabled={updateMutation.isPending}>
                <Save className="h-4 w-4" /> Save All
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => updateMutation.mutate({ status: "ready" })}>
                <CheckCircle2 className="h-4 w-4" /> Mark Ready
              </Button>
              <Button className="gap-2">
                <Send className="h-4 w-4" /> Send to Client
              </Button>
            </div>
          </header>

          <div className="grid lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4 flex-wrap h-auto gap-1">
                  <TabsTrigger value="properties" className="gap-2">
                    <Building className="h-4 w-4" /> Properties ({properties.length})
                  </TabsTrigger>
                  <TabsTrigger value="charts" className="gap-2">
                    <BarChart3 className="h-4 w-4" /> Visual Pricing
                  </TabsTrigger>
                  <TabsTrigger value="market" className="gap-2">
                    <TrendingUp className="h-4 w-4" /> Market Stats
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="properties">
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2 items-center">
                      {properties.map((prop) => (
                        <Button
                          key={prop.id}
                          variant={selectedPropertyId === prop.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedPropertyId(prop.id)}
                          className="gap-2"
                        >
                          <Home className="h-4 w-4" />
                          {prop.name}
                        </Button>
                      ))}
                      
                      <Dialog open={addPropertyOpen} onOpenChange={setAddPropertyOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Plus className="h-4 w-4" /> Add Property
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Property</DialogTitle>
                            <DialogDescription>Add another property to this review</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <Label>Property Name</Label>
                              <Input 
                                value={newPropertyName}
                                onChange={(e) => setNewPropertyName(e.target.value)}
                                placeholder="e.g., Main Residence, Rental Property"
                              />
                            </div>
                            <div>
                              <Label>Address</Label>
                              <Input 
                                value={newPropertyAddress}
                                onChange={(e) => setNewPropertyAddress(e.target.value)}
                                placeholder="123 Main St, City, ST 12345"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setAddPropertyOpen(false)}>Cancel</Button>
                            <Button onClick={handleAddProperty}>Add Property</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {selectedProperty ? (
                      <div className="space-y-6">
                        <Card className="border-none shadow-md">
                          <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                              <CardTitle className="font-serif">{selectedProperty.name}</CardTitle>
                              <CardDescription>{selectedProperty.address || "No address set"}</CardDescription>
                            </div>
                            {properties.length > 1 && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDeleteProperty(selectedProperty.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </CardHeader>
                        </Card>

                        <Card className="border-none shadow-md">
                          <CardHeader>
                            <CardTitle className="font-serif flex items-center gap-2 text-lg">
                              <FileCheck className="h-5 w-5" /> Public Records / Appraiser One Page
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Textarea 
                              value={selectedProperty.publicRecordsRaw}
                              onChange={(e) => updateProperty(selectedProperty.id, { publicRecordsRaw: e.target.value })}
                              placeholder="Paste the public records / appraiser one page text here..."
                              className="min-h-[150px] font-mono text-sm"
                            />
                            <div className="flex gap-2 mt-4">
                              <Button className="gap-2" onClick={() => handleParsePublicRecords(selectedProperty.id)}>
                                <Sparkles className="h-4 w-4" /> Parse Property Data
                              </Button>
                            </div>
                            
                            {selectedProperty.parsedProperty && (
                              <div className="mt-6 pt-6 border-t">
                                <h4 className="font-semibold mb-4">Extracted Data</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div><span className="text-muted-foreground">Beds:</span> {selectedProperty.parsedProperty.beds || '-'}</div>
                                  <div><span className="text-muted-foreground">Baths:</span> {selectedProperty.parsedProperty.baths || '-'}</div>
                                  <div><span className="text-muted-foreground">SF:</span> {selectedProperty.parsedProperty.sqft?.toLocaleString() || '-'}</div>
                                  <div><span className="text-muted-foreground">Year:</span> {selectedProperty.parsedProperty.yearBuilt || '-'}</div>
                                  <div><span className="text-muted-foreground">Style:</span> {selectedProperty.parsedProperty.style || '-'}</div>
                                  <div><span className="text-muted-foreground">Basement:</span> {selectedProperty.parsedProperty.basement || '-'}</div>
                                  <div><span className="text-muted-foreground">Lot:</span> {selectedProperty.parsedProperty.lotSize || '-'}</div>
                                  <div><span className="text-muted-foreground">Zoning:</span> {selectedProperty.parsedProperty.zoning || '-'}</div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        <Card className="border-none shadow-md">
                          <CardHeader>
                            <CardTitle className="font-serif flex items-center gap-2 text-lg">
                              <Database className="h-5 w-5" /> MLS Export Data
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Textarea 
                              value={selectedProperty.mlsDataRaw}
                              onChange={(e) => updateProperty(selectedProperty.id, { mlsDataRaw: e.target.value })}
                              placeholder="Paste the MLS export data (comparable sales table) here..."
                              className="min-h-[200px] font-mono text-sm"
                            />
                            <div className="flex gap-2 mt-4">
                              <Button className="gap-2" onClick={() => handleParseMLSData(selectedProperty.id)}>
                                <Sparkles className="h-4 w-4" /> Parse Comparables
                              </Button>
                            </div>
                            {selectedProperty.comparables.length > 0 && (
                              <p className="mt-2 text-sm text-muted-foreground">
                                {selectedProperty.comparables.length} properties ({selectedProperty.comparables.filter(c => c.status === "Closed").length} closed)
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    ) : (
                      <Card className="border-none shadow-md">
                        <CardContent className="py-12 text-center text-muted-foreground">
                          <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No properties yet</p>
                          <p className="text-sm">Click "Add Property" to get started</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="charts">
                  <div className="space-y-6">
                    {aggregateStats && (
                      <div className="grid md:grid-cols-5 gap-4">
                        <Card className="border-none shadow-sm text-center">
                          <CardContent className="pt-6">
                            <div className="text-3xl font-bold text-primary">{aggregateStats.closed}</div>
                            <p className="text-xs text-muted-foreground uppercase">Closed</p>
                          </CardContent>
                        </Card>
                        <Card className="border-none shadow-sm text-center">
                          <CardContent className="pt-6">
                            <div className="text-3xl font-bold text-blue-600">{aggregateStats.underContract}</div>
                            <p className="text-xs text-muted-foreground uppercase">Under Contract</p>
                          </CardContent>
                        </Card>
                        <Card className="border-none shadow-sm text-center">
                          <CardContent className="pt-6">
                            <div className="text-3xl font-bold text-yellow-600">{aggregateStats.forSale}</div>
                            <p className="text-xs text-muted-foreground uppercase">For Sale</p>
                          </CardContent>
                        </Card>
                        <Card className="border-none shadow-sm text-center">
                          <CardContent className="pt-6">
                            <div className="text-3xl font-bold text-red-600">{aggregateStats.expired}</div>
                            <p className="text-xs text-muted-foreground uppercase">Expired</p>
                          </CardContent>
                        </Card>
                        <Card className="border-none shadow-sm text-center bg-primary text-primary-foreground">
                          <CardContent className="pt-6">
                            <div className="text-3xl font-bold">{aggregateStats.oddsOfSelling}%</div>
                            <p className="text-xs uppercase opacity-80">Odds of Selling</p>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    <Card className="border-none shadow-md">
                      <CardHeader>
                        <CardTitle className="font-serif">Price vs. Total Square Feet</CardTitle>
                        <CardDescription>Fair Market Value Analysis - All Properties Combined</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {chartData.length > 0 ? (
                          <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                  type="number" 
                                  dataKey="sqft" 
                                  name="Total SF" 
                                  label={{ value: 'Total Square Feet', position: 'bottom', offset: 40 }}
                                  tickFormatter={(v) => v.toLocaleString()}
                                />
                                <YAxis 
                                  type="number" 
                                  dataKey="price" 
                                  name="Price" 
                                  label={{ value: 'Property Price', angle: -90, position: 'left', offset: 40 }}
                                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                                />
                                <Tooltip 
                                  formatter={(value: number, name: string) => {
                                    if (name === "Price") return [`$${value.toLocaleString()}`, name];
                                    return [value.toLocaleString(), name];
                                  }}
                                  labelFormatter={(label) => `${label} SF`}
                                />
                                <Scatter name="Closed Sales" data={chartData} fill="#2563eb" />
                              </ScatterChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                            <p>Parse MLS data from properties to generate chart</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <div className="grid md:grid-cols-2 gap-6">
                      <Card className="border-none shadow-md">
                        <CardHeader>
                          <CardTitle className="font-serif">Buying Pattern</CardTitle>
                          <CardDescription>When homes sold in the last year</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {buyingPatternData.some(d => d.count > 0) ? (
                            <div className="h-[200px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={buyingPatternData}>
                                  <XAxis dataKey="month" />
                                  <YAxis allowDecimals={false} />
                                  <Tooltip />
                                  <Bar dataKey="count" fill="#2563eb" />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          ) : (
                            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                              <p>No data yet</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="border-none shadow-md">
                        <CardHeader>
                          <CardTitle className="font-serif">Market Summary</CardTitle>
                          <CardDescription>Key metrics for the area</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {aggregateStats ? (
                            <div className="space-y-4">
                              <div className="flex justify-between items-center py-2 border-b">
                                <span>Average Days to Close</span>
                                <span className="text-2xl font-bold text-primary">{aggregateStats.avgDom} Days</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b">
                                <span>Average Sold Price</span>
                                <span className="text-2xl font-bold text-primary">${aggregateStats.avgPrice.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b">
                                <span>Monthly Sales Rate</span>
                                <span className="font-medium">{aggregateStats.monthlySales} per month</span>
                              </div>
                              <div className="flex justify-between items-center py-2">
                                <span>Months of Inventory</span>
                                <span className="font-medium">{aggregateStats.inventory} months</span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              <p>Parse MLS data for metrics</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="market">
                  <Card className="border-none shadow-md">
                    <CardHeader>
                      <CardTitle className="font-serif flex items-center gap-2">
                        <Map className="h-5 w-5" /> County & Regional Market Stats
                      </CardTitle>
                      <CardDescription>Paste county and regional market data (automation coming later)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea 
                        value={marketStatsRaw}
                        onChange={(e) => setMarketStatsRaw(e.target.value)}
                        placeholder="Paste Loudoun County stats, regional appreciation data, etc..."
                        className="min-h-[300px] font-mono text-sm"
                      />
                      {marketStatsRaw && (
                        <div className="mt-6 pt-6 border-t">
                          <h4 className="font-semibold mb-4">Preview</h4>
                          <pre className="whitespace-pre-wrap text-sm bg-secondary/30 p-4 rounded-lg max-h-[400px] overflow-auto">
                            {marketStatsRaw}
                          </pre>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-6">
              <Card className="border-none shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-serif">Properties</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {properties.map((prop) => (
                    <div 
                      key={prop.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPropertyId === prop.id ? 'bg-primary/10 border-primary' : 'hover:bg-secondary/50'
                      }`}
                      onClick={() => {
                        setSelectedPropertyId(prop.id);
                        setActiveTab("properties");
                      }}
                    >
                      <div className="font-medium text-sm">{prop.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{prop.address || "No address"}</div>
                      <div className="flex gap-2 mt-1">
                        {prop.parsedProperty && <Badge variant="outline" className="text-xs">Parsed</Badge>}
                        {prop.comparables.length > 0 && (
                          <Badge variant="outline" className="text-xs">{prop.comparables.length} comps</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

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
                    <Input 
                      placeholder="Paste Gamma URL..." 
                      value={review.gammaLink || ""} 
                      onChange={(e) => updateMutation.mutate({ gammaLink: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Loom Recording</Label>
                    <Input 
                      placeholder="Paste Loom URL..." 
                      value={review.loomLink || ""} 
                      onChange={(e) => updateMutation.mutate({ loomLink: e.target.value })}
                      className="text-sm"
                    />
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
