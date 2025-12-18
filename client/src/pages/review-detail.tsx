import { useState, useEffect, useRef } from "react";
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
import { ArrowLeft, Home, FileText, Database, BarChart3, TrendingUp, Save, ExternalLink, Send, CheckCircle2, FileCheck, Map, Plus, Trash2, Building, Upload, File, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";
import type { RealEstateReview, Task } from "@shared/schema";

interface PropertyData {
  id: string;
  name: string;
  address: string;
  publicRecordsFile: { name: string; url: string } | null;
  mlsExportFile: { name: string; url: string } | null;
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
  
  const publicRecordsInputRef = useRef<HTMLInputElement>(null);
  const mlsExportInputRef = useRef<HTMLInputElement>(null);

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
      publicRecordsFile: null,
      mlsExportFile: null,
    };
    
    const updatedProperties = [...properties, newProperty];
    setProperties(updatedProperties);
    setSelectedPropertyId(newProperty.id);
    setAddPropertyOpen(false);
    setNewPropertyName("");
    setNewPropertyAddress("");
    
    // Auto-save to backend
    updateMutation.mutate({
      propertyData: {
        properties: updatedProperties,
        marketStatsRaw,
      },
    });
  };

  const handleDeleteProperty = (propId: string) => {
    const updated = properties.filter(p => p.id !== propId);
    setProperties(updated);
    if (selectedPropertyId === propId) {
      setSelectedPropertyId(updated.length > 0 ? updated[0].id : null);
    }
    
    // Auto-save to backend
    updateMutation.mutate({
      propertyData: {
        properties: updated,
        marketStatsRaw,
      },
    });
  };

  const updateProperty = (propId: string, updates: Partial<PropertyData>) => {
    const updatedProperties = properties.map(p => p.id === propId ? { ...p, ...updates } : p);
    setProperties(updatedProperties);
    
    // Auto-save to backend
    updateMutation.mutate({
      propertyData: {
        properties: updatedProperties,
        marketStatsRaw,
      },
    });
  };

  const handleFileUpload = async (file: File, type: 'publicRecords' | 'mlsExport', propId: string) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) throw new Error('Upload failed');
      
      const data = await res.json();
      
      const fileData = { name: file.name, url: data.url };
      const updatedProperties = properties.map(p => {
        if (p.id === propId) {
          return type === 'publicRecords' 
            ? { ...p, publicRecordsFile: fileData }
            : { ...p, mlsExportFile: fileData };
        }
        return p;
      });
      
      setProperties(updatedProperties);
      
      // Auto-save to backend
      updateMutation.mutate({
        propertyData: {
          properties: updatedProperties,
          marketStatsRaw,
        },
      });
      
      toast({ title: "File Uploaded", description: file.name });
    } catch (error) {
      toast({ title: "Upload Failed", description: "Could not upload file", variant: "destructive" });
    }
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
                            <CardDescription>Upload PDF or Excel file from BrightMLS</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <input
                              ref={publicRecordsInputRef}
                              type="file"
                              accept=".pdf,.xlsx,.xls,.csv"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file, 'publicRecords', selectedProperty.id);
                              }}
                            />
                            
                            {selectedProperty.publicRecordsFile ? (
                              <div className="flex items-center gap-3 p-4 bg-secondary/30 rounded-lg">
                                <File className="h-8 w-8 text-primary" />
                                <div className="flex-1">
                                  <p className="font-medium">{selectedProperty.publicRecordsFile.name}</p>
                                  <a 
                                    href={selectedProperty.publicRecordsFile.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary hover:underline"
                                  >
                                    View file
                                  </a>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateProperty(selectedProperty.id, { publicRecordsFile: null })}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <label 
                                className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer hover:bg-secondary/30 transition-colors"
                                onClick={() => publicRecordsInputRef.current?.click()}
                              >
                                <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                                <p className="font-medium">Click to upload</p>
                                <p className="text-sm text-muted-foreground">PDF, Excel, or CSV</p>
                              </label>
                            )}
                          </CardContent>
                        </Card>

                        <Card className="border-none shadow-md">
                          <CardHeader>
                            <CardTitle className="font-serif flex items-center gap-2 text-lg">
                              <Database className="h-5 w-5" /> MLS Export Data
                            </CardTitle>
                            <CardDescription>Upload spreadsheet with comparable sales data</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <input
                              ref={mlsExportInputRef}
                              type="file"
                              accept=".xlsx,.xls,.csv"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file, 'mlsExport', selectedProperty.id);
                              }}
                            />
                            
                            {selectedProperty.mlsExportFile ? (
                              <div className="flex items-center gap-3 p-4 bg-secondary/30 rounded-lg">
                                <File className="h-8 w-8 text-primary" />
                                <div className="flex-1">
                                  <p className="font-medium">{selectedProperty.mlsExportFile.name}</p>
                                  <a 
                                    href={selectedProperty.mlsExportFile.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary hover:underline"
                                  >
                                    View file
                                  </a>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateProperty(selectedProperty.id, { mlsExportFile: null })}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <label 
                                className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer hover:bg-secondary/30 transition-colors"
                                onClick={() => mlsExportInputRef.current?.click()}
                              >
                                <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                                <p className="font-medium">Click to upload</p>
                                <p className="text-sm text-muted-foreground">Excel or CSV spreadsheet</p>
                              </label>
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
                        {prop.publicRecordsFile && <Badge variant="outline" className="text-xs">Records</Badge>}
                        {prop.mlsExportFile && <Badge variant="outline" className="text-xs">MLS Data</Badge>}
                      </div>
                    </div>
                  ))}
                  {properties.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No properties added yet</p>
                  )}
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
