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
import { ArrowLeft, Home, FileText, Database, BarChart3, TrendingUp, Save, ExternalLink, Send, CheckCircle2, FileCheck, Map, Plus, Trash2, Building, Upload, File, X, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";
import type { RealEstateReview, Task, AgentProfile } from "@shared/schema";

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

interface MLSProperty {
  mlsNumber: string;
  address: string;
  status: string;
  soldPrice: number | null;
  originalPrice: number | null;
  currentPrice: number | null;
  lastListPrice: number | null;
  dom: number;
  listDate: string;
  settledDate: string;
  statusDate: string;
  sqft: number;
  aboveGradeSqft: number;
  belowGradeSqft: number;
  beds: number;
  baths: number;
  yearBuilt: number;
  acres: number;
  subdivision: string;
  city: string;
  zipCode: string;
  style: string;
  condition: string;
}

interface MLSData {
  properties: MLSProperty[];
  stats: {
    total: number;
    closed: number;
    active: number;
    pending: number;
    avgSoldPrice: number;
    avgDOM: number;
    avgPricePerSqft: number;
  };
}

function VisualPricingSection({ properties }: { properties: PropertyData[] }) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    properties.length > 0 ? properties[0].id : null
  );
  const [mlsData, setMlsData] = useState<MLSData | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  useEffect(() => {
    if (selectedProperty?.mlsExportFile?.url) {
      setLoading(true);
      fetch(`/api/parse-mls-csv?url=${encodeURIComponent(selectedProperty.mlsExportFile.url)}`)
        .then(res => res.json())
        .then(data => {
          setMlsData(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setMlsData(null);
    }
  }, [selectedProperty?.mlsExportFile?.url]);

  const formatPrice = (price: number | null) => {
    if (!price) return '-';
    return '$' + price.toLocaleString();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return `${parts[0]}/${parts[1]}/${parts[2].slice(-2)}`;
    }
    return dateStr;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Closed': return 'bg-green-100 text-green-800';
      case 'Active': return 'bg-blue-100 text-blue-800';
      case 'ComingSoon': return 'bg-purple-100 text-purple-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'ActiveUnderContract': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredProperties = mlsData?.properties.filter(p => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'closed') return p.status === 'Closed';
    if (statusFilter === 'active') return ['Active', 'ComingSoon'].includes(p.status);
    if (statusFilter === 'pending') return ['Pending', 'ActiveUnderContract'].includes(p.status);
    return true;
  }) || [];

  if (properties.length === 0) {
    return (
      <Card className="border-none shadow-md">
        <CardContent className="py-12 text-center text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No properties with MLS data</p>
          <p className="text-sm">Add a property and upload MLS export data to see Visual Pricing</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        {properties.map((prop) => (
          <Button
            key={prop.id}
            variant={selectedPropertyId === prop.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedPropertyId(prop.id)}
            className="gap-2"
            disabled={!prop.mlsExportFile}
          >
            <Home className="h-4 w-4" />
            {prop.name}
            {!prop.mlsExportFile && <span className="text-xs opacity-50">(no data)</span>}
          </Button>
        ))}
      </div>

      {loading && (
        <Card className="border-none shadow-md">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading MLS data...</p>
          </CardContent>
        </Card>
      )}

      {!loading && !mlsData && selectedProperty?.mlsExportFile && (
        <Card className="border-none shadow-md">
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Unable to parse MLS data</p>
          </CardContent>
        </Card>
      )}

      {!loading && mlsData && (
        <>
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="font-serif">Market Summary - {selectedProperty?.name}</CardTitle>
              <CardDescription>{selectedProperty?.address}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-secondary/30 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-primary">{mlsData.stats.closed}</div>
                  <div className="text-sm text-muted-foreground">Closed Sales</div>
                </div>
                <div className="bg-secondary/30 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-blue-600">{mlsData.stats.active}</div>
                  <div className="text-sm text-muted-foreground">Active Listings</div>
                </div>
                <div className="bg-secondary/30 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-orange-600">{mlsData.stats.pending}</div>
                  <div className="text-sm text-muted-foreground">Under Contract</div>
                </div>
                <div className="bg-secondary/30 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold">{mlsData.stats.avgDOM}</div>
                  <div className="text-sm text-muted-foreground">Avg Days on Market</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-green-50 p-4 rounded-lg text-center border border-green-200">
                  <div className="text-2xl font-bold text-green-700">{formatPrice(mlsData.stats.avgSoldPrice)}</div>
                  <div className="text-sm text-green-600">Avg Sold Price</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-200">
                  <div className="text-2xl font-bold text-blue-700">${mlsData.stats.avgPricePerSqft}/sqft</div>
                  <div className="text-sm text-blue-600">Avg Price per SqFt</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <CardTitle className="font-serif">Comparable Properties</CardTitle>
                  <CardDescription>Single Family Homes Near You</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant={statusFilter === 'all' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setStatusFilter('all')}
                  >
                    All ({mlsData.stats.total})
                  </Button>
                  <Button 
                    variant={statusFilter === 'closed' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setStatusFilter('closed')}
                  >
                    Closed ({mlsData.stats.closed})
                  </Button>
                  <Button 
                    variant={statusFilter === 'active' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setStatusFilter('active')}
                  >
                    Active ({mlsData.stats.active})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-secondary/30">
                      <th className="p-2 text-left font-medium">#</th>
                      <th className="p-2 text-left font-medium">MLS #</th>
                      <th className="p-2 text-left font-medium">Status</th>
                      <th className="p-2 text-left font-medium">Address</th>
                      <th className="p-2 text-right font-medium">SqFt</th>
                      <th className="p-2 text-center font-medium">BD/BA</th>
                      <th className="p-2 text-center font-medium">Year</th>
                      <th className="p-2 text-right font-medium">List Price</th>
                      <th className="p-2 text-center font-medium">DOM</th>
                      <th className="p-2 text-center font-medium">Date</th>
                      <th className="p-2 text-right font-medium">Sold Price</th>
                      <th className="p-2 text-right font-medium">$/SqFt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProperties.map((prop, idx) => {
                      const listPrice = prop.originalPrice || prop.currentPrice || prop.lastListPrice;
                      const pricePerSqft = prop.soldPrice && prop.sqft ? Math.round(prop.soldPrice / prop.sqft) : null;
                      return (
                        <tr key={prop.mlsNumber} className="border-b hover:bg-secondary/20">
                          <td className="p-2 text-muted-foreground">{idx + 1}</td>
                          <td className="p-2 font-mono text-xs">{prop.mlsNumber}</td>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(prop.status)}`}>
                              {prop.status}
                            </span>
                          </td>
                          <td className="p-2 max-w-[200px] truncate">{prop.address}</td>
                          <td className="p-2 text-right">{prop.sqft > 0 ? prop.sqft.toLocaleString() : '-'}</td>
                          <td className="p-2 text-center">{prop.beds}/{prop.baths}</td>
                          <td className="p-2 text-center">{prop.yearBuilt || '-'}</td>
                          <td className="p-2 text-right">{formatPrice(listPrice)}</td>
                          <td className="p-2 text-center">{prop.dom}</td>
                          <td className="p-2 text-center text-xs">{formatDate(prop.settledDate || prop.statusDate)}</td>
                          <td className="p-2 text-right font-medium text-green-700">{formatPrice(prop.soldPrice)}</td>
                          <td className="p-2 text-right">{pricePerSqft ? `$${pricePerSqft}` : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
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

  const { data: agentProfile } = useQuery<AgentProfile>({
    queryKey: ["/api/agent-profile"],
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

  const handlePrint = async () => {
    const propertiesWithData = properties.filter(p => p.mlsExportFile);
    
    const allMlsData: { property: PropertyData; mlsData: any }[] = [];
    for (const prop of propertiesWithData) {
      try {
        const res = await fetch(`/api/parse-mls-csv?url=${encodeURIComponent(prop.mlsExportFile!.url)}`);
        const data = await res.json();
        allMlsData.push({ property: prop, mlsData: data });
      } catch (e) {
        console.error('Failed to load MLS data for', prop.name);
      }
    }

    const formatPrice = (price: number | null) => {
      if (!price) return '-';
      return '$' + price.toLocaleString();
    };

    const formatDate = (dateStr: string) => {
      if (!dateStr) return '-';
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return `${parts[0]}/${parts[1]}/${parts[2].slice(-2)}`;
      }
      return dateStr;
    };

    const getStatusStyle = (status: string) => {
      switch (status) {
        case 'Closed': return 'background: #dcfce7; color: #166534;';
        case 'Active': return 'background: #dbeafe; color: #1e40af;';
        case 'Pending': return 'background: #fef9c3; color: #854d0e;';
        default: return 'background: #f3f4f6; color: #374151;';
      }
    };

    const primaryColor = agentProfile?.brokeragePrimaryColor || '#1a365d';
    const agentName = agentProfile?.name || 'Your Agent';
    const tagline = agentProfile?.tagline || 'Your Trusted Real Estate Advisor';
    const phone = agentProfile?.phone || '';
    const email = agentProfile?.email || '';
    const website = agentProfile?.website || '';
    const headshotUrl = agentProfile?.headshotUrl || '';
    const personalLogoUrl = agentProfile?.personalLogoUrl || '';
    const brokerageLogoUrl = agentProfile?.brokerageLogoUrl || '';
    const qrCodeUrl = agentProfile?.googleReviewQrUrl || '';

    const propertyAddress = properties.length > 0 ? properties[0].address : 'Property Address';

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${review?.title || 'Real Estate Review'}</title>
        <style>
          @page { size: letter; margin: 0.5in; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: 'Georgia', serif; 
            color: #1a1a1a;
            font-size: 11pt;
            line-height: 1.4;
          }
          .page { 
            page-break-after: always; 
            min-height: 10in;
            padding: 0.25in;
          }
          .page:last-child { page-break-after: avoid; }
          
          /* Cover Page Styles */
          .cover-page {
            display: flex;
            flex-direction: column;
            height: 10in;
          }
          .cover-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 20px;
            border-bottom: 3px solid ${primaryColor};
          }
          .cover-agent {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          .cover-headshot {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid ${primaryColor};
          }
          .cover-agent-info h2 {
            color: ${primaryColor};
            font-size: 18pt;
            margin-bottom: 2px;
          }
          .cover-agent-info p {
            color: #666;
            font-size: 10pt;
          }
          .cover-logos {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          .cover-logos img {
            max-height: 60px;
            max-width: 120px;
          }
          .cover-title-section {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            text-align: center;
            padding: 40px 0;
          }
          .cover-title {
            font-size: 32pt;
            color: ${primaryColor};
            margin-bottom: 10px;
            font-weight: bold;
          }
          .cover-subtitle {
            font-size: 14pt;
            color: #666;
            margin-bottom: 30px;
          }
          .cover-address {
            font-size: 18pt;
            color: #333;
            margin-top: 20px;
            padding: 15px 30px;
            background: #f8f9fa;
            display: inline-block;
          }
          .cover-benefits {
            background: ${primaryColor};
            color: white;
            padding: 25px 30px;
            margin: 20px 0;
          }
          .cover-benefits h3 {
            font-size: 14pt;
            margin-bottom: 15px;
            text-align: center;
          }
          .benefits-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px 30px;
          }
          .benefit-item {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            font-size: 10pt;
          }
          .benefit-check {
            color: #90EE90;
            font-weight: bold;
          }
          .cover-footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            padding-top: 20px;
            border-top: 2px solid #eee;
          }
          .cover-contact {
            font-size: 10pt;
            color: #666;
          }
          .cover-contact p {
            margin: 3px 0;
          }
          .cover-qr {
            text-align: center;
          }
          .cover-qr img {
            width: 80px;
            height: 80px;
          }
          .cover-qr p {
            font-size: 8pt;
            color: #666;
            margin-top: 5px;
          }
          
          /* Checklist Page Styles */
          .checklist-title {
            font-size: 20pt;
            color: ${primaryColor};
            text-align: center;
            margin-bottom: 5px;
          }
          .checklist-subtitle {
            text-align: center;
            color: #666;
            font-size: 11pt;
            margin-bottom: 25px;
          }
          .checklist-section {
            margin-bottom: 20px;
          }
          .checklist-section h4 {
            background: ${primaryColor};
            color: white;
            padding: 8px 15px;
            font-size: 12pt;
            margin-bottom: 10px;
          }
          .checklist-items {
            padding: 0 15px;
          }
          .checklist-item {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
          }
          .checkbox {
            width: 16px;
            height: 16px;
            border: 2px solid ${primaryColor};
            flex-shrink: 0;
            margin-top: 2px;
          }
          .checklist-item-text {
            flex: 1;
          }
          .checklist-item-title {
            font-weight: bold;
            color: #333;
          }
          .checklist-item-desc {
            font-size: 9pt;
            color: #666;
            margin-top: 2px;
          }
          
          /* Life Spans Page Styles */
          .lifespan-title {
            font-size: 18pt;
            color: ${primaryColor};
            text-align: center;
            margin-bottom: 20px;
          }
          .lifespan-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
          }
          .lifespan-table th {
            background: ${primaryColor};
            color: white;
            padding: 8px 10px;
            text-align: left;
            font-weight: 600;
          }
          .lifespan-table td {
            padding: 6px 10px;
            border-bottom: 1px solid #e0e0e0;
          }
          .lifespan-table tr:nth-child(even) {
            background: #f8f9fa;
          }
          .lifespan-category {
            background: #f0f0f0;
            font-weight: bold;
            color: ${primaryColor};
          }
          
          /* Visual Pricing Styles */
          .vp-header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 3px solid ${primaryColor};
          }
          .vp-header h1 {
            color: ${primaryColor};
            font-size: 22pt;
            margin-bottom: 5px;
          }
          .vp-header p {
            color: #666;
            font-size: 11pt;
          }
          .stats-grid { 
            display: grid; 
            grid-template-columns: repeat(4, 1fr); 
            gap: 10px; 
            margin-bottom: 20px;
          }
          .stat-box { 
            text-align: center; 
            padding: 15px 10px; 
            background: #f8fafc;
            border: 1px solid #e2e8f0;
          }
          .stat-box .value { 
            font-size: 18pt; 
            font-weight: bold; 
            color: ${primaryColor};
          }
          .stat-box .label { 
            font-size: 9pt; 
            color: #666;
            margin-top: 3px;
          }
          .stat-box.green { background: #f0fdf4; border-color: #bbf7d0; }
          .stat-box.green .value { color: #166534; }
          .stat-box.blue { background: #eff6ff; border-color: #bfdbfe; }
          .stat-box.blue .value { color: #1e40af; }
          .comps-table { 
            width: 100%; 
            border-collapse: collapse; 
            font-size: 8pt;
            margin-top: 15px;
          }
          .comps-table th { 
            background: ${primaryColor}; 
            color: white; 
            padding: 6px 4px; 
            text-align: left;
            font-weight: 600;
          }
          .comps-table th.right, .comps-table td.right { text-align: right; }
          .comps-table th.center, .comps-table td.center { text-align: center; }
          .comps-table td { 
            padding: 5px 4px; 
            border-bottom: 1px solid #e2e8f0;
          }
          .comps-table tr:nth-child(even) { background: #f8fafc; }
          .status-badge {
            padding: 2px 5px;
            border-radius: 3px;
            font-size: 7pt;
            font-weight: 600;
          }
          .sold-price { color: #166534; font-weight: 600; }
          
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page { page-break-after: always; }
          }
        </style>
      </head>
      <body>
        <!-- Cover Page -->
        <div class="page cover-page">
          <div class="cover-header">
            <div class="cover-agent">
              ${headshotUrl ? `<img src="${headshotUrl}" class="cover-headshot" alt="Agent Photo">` : ''}
              <div class="cover-agent-info">
                <h2>${agentName}</h2>
                <p>${tagline}</p>
              </div>
            </div>
            <div class="cover-logos">
              ${personalLogoUrl ? `<img src="${personalLogoUrl}" alt="Personal Logo">` : ''}
              ${brokerageLogoUrl ? `<img src="${brokerageLogoUrl}" alt="Brokerage Logo">` : ''}
            </div>
          </div>
          
          <div class="cover-title-section">
            <div class="cover-title">Real Estate Review</div>
            <div class="cover-subtitle">Annual Property Analysis & Market Report</div>
            <div class="cover-address">${propertyAddress}</div>
          </div>
          
          <div class="cover-benefits">
            <h3>What's Included in Your Real Estate Review</h3>
            <div class="benefits-grid">
              <div class="benefit-item"><span class="benefit-check">✓</span> Current market value analysis</div>
              <div class="benefit-item"><span class="benefit-check">✓</span> Comparable sales data</div>
              <div class="benefit-item"><span class="benefit-check">✓</span> Property component life spans</div>
              <div class="benefit-item"><span class="benefit-check">✓</span> Maintenance checklist</div>
              <div class="benefit-item"><span class="benefit-check">✓</span> Public records verification</div>
              <div class="benefit-item"><span class="benefit-check">✓</span> Equity position update</div>
              <div class="benefit-item"><span class="benefit-check">✓</span> Neighborhood trends</div>
              <div class="benefit-item"><span class="benefit-check">✓</span> Tax assessment review</div>
            </div>
          </div>
          
          <div class="cover-footer">
            <div class="cover-contact">
              ${phone ? `<p>📞 ${phone}</p>` : ''}
              ${email ? `<p>✉️ ${email}</p>` : ''}
              ${website ? `<p>🌐 ${website}</p>` : ''}
            </div>
            ${qrCodeUrl ? `
            <div class="cover-qr">
              <img src="${qrCodeUrl}" alt="Review QR Code">
              <p>Leave a Review</p>
            </div>
            ` : ''}
          </div>
        </div>
        
        <!-- Checklist Page -->
        <div class="page">
          <div class="checklist-title">Financial Real Estate Review Checklist</div>
          <div class="checklist-subtitle">Annual Property Assessment</div>
          
          <div class="checklist-section">
            <h4>Property Value & Market Position</h4>
            <div class="checklist-items">
              <div class="checklist-item">
                <div class="checkbox"></div>
                <div class="checklist-item-text">
                  <div class="checklist-item-title">Review Current Market Value</div>
                  <div class="checklist-item-desc">Compare estimated value with recent comparable sales</div>
                </div>
              </div>
              <div class="checklist-item">
                <div class="checkbox"></div>
                <div class="checklist-item-text">
                  <div class="checklist-item-title">Analyze Price Per Square Foot</div>
                  <div class="checklist-item-desc">Compare with neighborhood averages</div>
                </div>
              </div>
              <div class="checklist-item">
                <div class="checkbox"></div>
                <div class="checklist-item-text">
                  <div class="checklist-item-title">Track Equity Growth</div>
                  <div class="checklist-item-desc">Calculate appreciation since purchase</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="checklist-section">
            <h4>Tax & Insurance Review</h4>
            <div class="checklist-items">
              <div class="checklist-item">
                <div class="checkbox"></div>
                <div class="checklist-item-text">
                  <div class="checklist-item-title">Verify Tax Assessment</div>
                  <div class="checklist-item-desc">Compare assessed value to market value</div>
                </div>
              </div>
              <div class="checklist-item">
                <div class="checkbox"></div>
                <div class="checklist-item-text">
                  <div class="checklist-item-title">Review Insurance Coverage</div>
                  <div class="checklist-item-desc">Ensure coverage matches current replacement cost</div>
                </div>
              </div>
              <div class="checklist-item">
                <div class="checkbox"></div>
                <div class="checklist-item-text">
                  <div class="checklist-item-title">Check for Tax Exemptions</div>
                  <div class="checklist-item-desc">Homestead, senior, veteran exemptions</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="checklist-section">
            <h4>Maintenance & Improvements</h4>
            <div class="checklist-items">
              <div class="checklist-item">
                <div class="checkbox"></div>
                <div class="checklist-item-text">
                  <div class="checklist-item-title">Review Component Life Spans</div>
                  <div class="checklist-item-desc">Plan for upcoming replacements</div>
                </div>
              </div>
              <div class="checklist-item">
                <div class="checkbox"></div>
                <div class="checklist-item-text">
                  <div class="checklist-item-title">Document Recent Improvements</div>
                  <div class="checklist-item-desc">Keep records for tax and resale purposes</div>
                </div>
              </div>
              <div class="checklist-item">
                <div class="checkbox"></div>
                <div class="checklist-item-text">
                  <div class="checklist-item-title">Schedule Annual Inspections</div>
                  <div class="checklist-item-desc">HVAC, roof, plumbing, electrical</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="checklist-section">
            <h4>Financial Planning</h4>
            <div class="checklist-items">
              <div class="checklist-item">
                <div class="checkbox"></div>
                <div class="checklist-item-text">
                  <div class="checklist-item-title">Evaluate Refinance Options</div>
                  <div class="checklist-item-desc">Review current rates and equity position</div>
                </div>
              </div>
              <div class="checklist-item">
                <div class="checkbox"></div>
                <div class="checklist-item-text">
                  <div class="checklist-item-title">Update Estate Planning</div>
                  <div class="checklist-item-desc">Review property ownership and beneficiaries</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Life Spans Page 1 -->
        <div class="page">
          <div class="lifespan-title">Property Components Life Spans</div>
          <table class="lifespan-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Expected Life</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr class="lifespan-category"><td colspan="3">Roofing</td></tr>
              <tr><td>Asphalt Shingles</td><td>20-30 years</td><td>Quality varies significantly</td></tr>
              <tr><td>Metal Roofing</td><td>40-70 years</td><td>Low maintenance</td></tr>
              <tr><td>Slate/Tile</td><td>50-100 years</td><td>Heavy, requires reinforced structure</td></tr>
              <tr><td>Flat Roof (TPO/EPDM)</td><td>15-25 years</td><td>Inspect annually</td></tr>
              
              <tr class="lifespan-category"><td colspan="3">HVAC Systems</td></tr>
              <tr><td>Central Air Conditioner</td><td>15-20 years</td><td>Annual service recommended</td></tr>
              <tr><td>Heat Pump</td><td>15-20 years</td><td>Replace filters monthly</td></tr>
              <tr><td>Furnace (Gas)</td><td>15-25 years</td><td>Annual inspection required</td></tr>
              <tr><td>Boiler</td><td>20-30 years</td><td>Cast iron lasts longer</td></tr>
              <tr><td>Water Heater (Tank)</td><td>10-15 years</td><td>Anode rod inspection annual</td></tr>
              <tr><td>Water Heater (Tankless)</td><td>20+ years</td><td>Descale annually in hard water</td></tr>
              
              <tr class="lifespan-category"><td colspan="3">Exterior</td></tr>
              <tr><td>Vinyl Siding</td><td>20-40 years</td><td>Can fade over time</td></tr>
              <tr><td>Wood Siding</td><td>20-40 years</td><td>Requires regular painting</td></tr>
              <tr><td>Brick/Stone</td><td>100+ years</td><td>Mortar may need repointing</td></tr>
              <tr><td>Exterior Paint</td><td>5-10 years</td><td>Climate dependent</td></tr>
              <tr><td>Deck (Pressure Treated)</td><td>15-20 years</td><td>Seal every 2-3 years</td></tr>
              <tr><td>Deck (Composite)</td><td>25-30 years</td><td>Lower maintenance</td></tr>
              <tr><td>Fencing (Wood)</td><td>15-20 years</td><td>Stain/seal extends life</td></tr>
              <tr><td>Driveway (Asphalt)</td><td>15-20 years</td><td>Seal coat every 3-5 years</td></tr>
              <tr><td>Driveway (Concrete)</td><td>25-50 years</td><td>Seal to prevent cracking</td></tr>
            </tbody>
          </table>
        </div>
        
        <!-- Life Spans Page 2 -->
        <div class="page">
          <div class="lifespan-title">Property Components Life Spans (Continued)</div>
          <table class="lifespan-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Expected Life</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr class="lifespan-category"><td colspan="3">Windows & Doors</td></tr>
              <tr><td>Windows (Vinyl)</td><td>20-40 years</td><td>Check seals annually</td></tr>
              <tr><td>Windows (Wood)</td><td>30+ years</td><td>Requires maintenance</td></tr>
              <tr><td>Entry Door (Steel)</td><td>20-30 years</td><td>May dent</td></tr>
              <tr><td>Entry Door (Fiberglass)</td><td>25-30 years</td><td>Low maintenance</td></tr>
              <tr><td>Garage Door</td><td>15-30 years</td><td>Springs need replacement</td></tr>
              
              <tr class="lifespan-category"><td colspan="3">Interior</td></tr>
              <tr><td>Interior Paint</td><td>5-10 years</td><td>High traffic areas sooner</td></tr>
              <tr><td>Carpet</td><td>8-10 years</td><td>Heavily dependent on use</td></tr>
              <tr><td>Hardwood Floors</td><td>100+ years</td><td>Refinish every 10-20 years</td></tr>
              <tr><td>Tile Flooring</td><td>75-100 years</td><td>Grout may need replacing</td></tr>
              <tr><td>Vinyl/Laminate</td><td>10-25 years</td><td>Quality varies</td></tr>
              
              <tr class="lifespan-category"><td colspan="3">Kitchen & Bath</td></tr>
              <tr><td>Kitchen Cabinets</td><td>20-50 years</td><td>Wood lasts longer</td></tr>
              <tr><td>Countertops (Granite/Quartz)</td><td>50+ years</td><td>Seal granite annually</td></tr>
              <tr><td>Countertops (Laminate)</td><td>10-20 years</td><td>Can chip/scratch</td></tr>
              <tr><td>Dishwasher</td><td>9-13 years</td><td>Average appliance</td></tr>
              <tr><td>Refrigerator</td><td>13-17 years</td><td>Clean coils annually</td></tr>
              <tr><td>Range/Oven</td><td>13-15 years</td><td>Gas outlasts electric</td></tr>
              <tr><td>Garbage Disposal</td><td>8-12 years</td><td>Run cold water when using</td></tr>
              
              <tr class="lifespan-category"><td colspan="3">Plumbing & Electrical</td></tr>
              <tr><td>Copper Pipes</td><td>50-70 years</td><td>Check for pinhole leaks</td></tr>
              <tr><td>PEX Pipes</td><td>40-50 years</td><td>Flexible, fewer joints</td></tr>
              <tr><td>Sump Pump</td><td>7-10 years</td><td>Test annually</td></tr>
              <tr><td>Electrical Panel</td><td>25-40 years</td><td>May need upgrading</td></tr>
            </tbody>
          </table>
        </div>
        
        <!-- Visual Pricing Pages -->
        ${allMlsData.map(({ property, mlsData }) => `
          <div class="page">
            <div class="vp-header">
              <h1>Visual Pricing Analysis</h1>
              <p>${property.address || property.name}</p>
            </div>
            
            <div class="stats-grid">
              <div class="stat-box">
                <div class="value">${mlsData.stats.closed}</div>
                <div class="label">Closed Sales</div>
              </div>
              <div class="stat-box">
                <div class="value">${mlsData.stats.active}</div>
                <div class="label">Active Listings</div>
              </div>
              <div class="stat-box">
                <div class="value">${mlsData.stats.pending}</div>
                <div class="label">Under Contract</div>
              </div>
              <div class="stat-box">
                <div class="value">${mlsData.stats.avgDOM}</div>
                <div class="label">Avg Days on Market</div>
              </div>
            </div>
            
            <div class="stats-grid" style="grid-template-columns: repeat(2, 1fr);">
              <div class="stat-box green">
                <div class="value">${formatPrice(mlsData.stats.avgSoldPrice)}</div>
                <div class="label">Average Sold Price</div>
              </div>
              <div class="stat-box blue">
                <div class="value">$${mlsData.stats.avgPricePerSqft}/sqft</div>
                <div class="label">Average Price per SqFt</div>
              </div>
            </div>
            
            <h3 style="margin: 20px 0 10px; font-size: 12pt; color: ${primaryColor};">Comparable Properties</h3>
            <table class="comps-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>MLS #</th>
                  <th>Status</th>
                  <th>Address</th>
                  <th class="right">SqFt</th>
                  <th class="center">BD/BA</th>
                  <th class="center">Year</th>
                  <th class="right">List Price</th>
                  <th class="center">DOM</th>
                  <th class="center">Date</th>
                  <th class="right">Sold Price</th>
                  <th class="right">$/SqFt</th>
                </tr>
              </thead>
              <tbody>
                ${mlsData.properties.map((p: any, i: number) => {
                  const listPrice = p.originalPrice || p.currentPrice || p.lastListPrice;
                  const pricePerSqft = p.soldPrice && p.sqft ? Math.round(p.soldPrice / p.sqft) : null;
                  return `
                    <tr>
                      <td>${i + 1}</td>
                      <td style="font-family: monospace; font-size: 7pt;">${p.mlsNumber}</td>
                      <td><span class="status-badge" style="${getStatusStyle(p.status)}">${p.status}</span></td>
                      <td style="max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.address}</td>
                      <td class="right">${p.sqft > 0 ? p.sqft.toLocaleString() : '-'}</td>
                      <td class="center">${p.beds}/${p.baths}</td>
                      <td class="center">${p.yearBuilt || '-'}</td>
                      <td class="right">${formatPrice(listPrice)}</td>
                      <td class="center">${p.dom}</td>
                      <td class="center">${formatDate(p.settledDate || p.statusDate)}</td>
                      <td class="right sold-price">${formatPrice(p.soldPrice)}</td>
                      <td class="right">${pricePerSqft ? '$' + pricePerSqft : '-'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `).join('')}
        
        ${allMlsData.length === 0 ? `
          <div class="page">
            <div class="vp-header">
              <h1>Visual Pricing Analysis</h1>
              <p>Market Comparables</p>
            </div>
            <p style="text-align: center; color: #666; padding: 50px;">
              No MLS data available. Upload CSV files to properties to generate Visual Pricing analysis.
            </p>
          </div>
        ` : ''}
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
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
              <Button variant="outline" className="gap-2" onClick={handlePrint} data-testid="button-print">
                <Printer className="h-4 w-4" /> Print
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
                  <TabsTrigger value="visual-pricing" className="gap-2">
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

                <TabsContent value="visual-pricing">
                  <VisualPricingSection properties={properties} />
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
