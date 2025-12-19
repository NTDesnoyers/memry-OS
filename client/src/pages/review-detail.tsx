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
import { VisualPricingTools, calculateMetrics, type VisualPricingMetrics } from "@/components/visual-pricing-tools";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RealEstateReview, Task, AgentProfile, PricingReview, MLSProperty as SchemaMLSProperty } from "@shared/schema";

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

  const { data: pricingReviews = [] } = useQuery<PricingReview[]>({
    queryKey: ["/api/pricing-reviews"],
  });

  const linkedPricingReview = pricingReviews.find(pr => pr.id === review?.visualPricingId);
  const linkedMetrics = linkedPricingReview?.calculatedMetrics as VisualPricingMetrics | undefined;
  const linkedMlsData = (linkedPricingReview?.mlsData as SchemaMLSProperty[]) || [];

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
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid ${primaryColor};">
            <div style="font-size: 14pt; color: ${primaryColor}; margin-bottom: 5px;">From ${agentName}, ${agentProfile?.brokerage || 'eXp Realty'}</div>
            <div style="font-size: 11pt; color: #666;">${phone ? phone : ''} ${phone && email ? ' | ' : ''} ${email ? email : ''}</div>
          </div>
          
          <div style="text-align: center; padding: 30px 0;">
            ${headshotUrl ? `<img src="${headshotUrl}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid ${primaryColor}; margin-bottom: 15px;">` : ''}
          </div>
          
          <div style="text-align: left; padding: 0 20px; line-height: 1.6; font-size: 11pt; color: #333;">
            <p style="margin-bottom: 15px;">Here's some fun information about your home, its approximate value, local home sales, and a peek into the current market trends.</p>
            <p style="margin-bottom: 15px;">Just as you'd get an annual physical, see the dentist once or twice a year, or meet with your accountant and/or financial advisor, getting a home wellness checkup could save you time and money. Our finances and plans change over time, and with that, our mortgage needs change as well.</p>
            <p style="margin-bottom: 20px;">I have many valuable resources for all things related to your home. I would love to help you reach your financial housing goals!</p>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; padding: 20px; background: #f8f9fa; margin: 20px 0;">
            <div>
              <h4 style="color: ${primaryColor}; font-size: 12pt; margin-bottom: 12px; border-bottom: 2px solid ${primaryColor}; padding-bottom: 5px;">Financial:</h4>
              <ul style="list-style: none; padding: 0; font-size: 10pt; line-height: 1.8;">
                <li>• Contest your home's Tax Value</li>
                <li>• Correct Deed / Ownership</li>
                <li>• Removing Mortgage Insurance payments</li>
                <li>• Refinancing / 2nd Mortgage / Home Equity Line of Credit</li>
                <li>• Save you the cost of an Appraisal</li>
                <li>• Know the Equity in your home</li>
                <li>• Properly adding your home to your revocable trust</li>
              </ul>
            </div>
            <div>
              <h4 style="color: ${primaryColor}; font-size: 12pt; margin-bottom: 12px; border-bottom: 2px solid ${primaryColor}; padding-bottom: 5px;">Improvements/Maintenance:</h4>
              <ul style="list-style: none; padding: 0; font-size: 10pt; line-height: 1.8;">
                <li>• Home Renovations</li>
                <li>• Handyman-type repairs</li>
                <li>• Landscaping, Sprinkler and Lawn Service</li>
                <li>• Licensed Contractors for Plumbing, HVAC, Roof, Sewer...</li>
                <li>• Inspections i.e., Roof, Pest, Chimney</li>
              </ul>
            </div>
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 20px; border-top: 1px solid #ddd; margin-top: auto;">
            <div style="display: flex; gap: 15px; align-items: center;">
              ${personalLogoUrl ? `<img src="${personalLogoUrl}" style="max-height: 50px; max-width: 100px;">` : ''}
              ${brokerageLogoUrl ? `<img src="${brokerageLogoUrl}" style="max-height: 50px; max-width: 100px;">` : ''}
            </div>
            ${qrCodeUrl ? `
            <div style="text-align: center;">
              <p style="font-size: 9pt; color: #666; margin-bottom: 5px;">Scan this QR code to leave me a Google review!</p>
              <img src="${qrCodeUrl}" style="width: 70px; height: 70px;">
            </div>
            ` : ''}
          </div>
        </div>
        
        <!-- Checklist Page -->
        <div class="page">
          <div style="text-align: center; margin-bottom: 25px;">
            <div style="font-size: 20pt; color: ${primaryColor}; font-weight: bold;">Financial Real Estate Review Checklist</div>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
              <tr>
                <th style="background: ${primaryColor}; color: white; padding: 10px; text-align: left; width: 25%;">Item</th>
                <th style="background: ${primaryColor}; color: white; padding: 10px; text-align: center; width: 25%;">Installation Date</th>
                <th style="background: ${primaryColor}; color: white; padding: 10px; text-align: center; width: 25%;">Life span</th>
                <th style="background: ${primaryColor}; color: white; padding: 10px; text-align: center; width: 25%;">Cost</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style="padding: 12px; border: 1px solid #ddd;">Roof</td><td style="padding: 12px; border: 1px solid #ddd;"></td><td style="padding: 12px; border: 1px solid #ddd;"></td><td style="padding: 12px; border: 1px solid #ddd;"></td></tr>
              <tr><td style="padding: 12px; border: 1px solid #ddd;">Furnace/AC</td><td style="padding: 12px; border: 1px solid #ddd;"></td><td style="padding: 12px; border: 1px solid #ddd;"></td><td style="padding: 12px; border: 1px solid #ddd;"></td></tr>
              <tr><td style="padding: 12px; border: 1px solid #ddd;">Water Heater</td><td style="padding: 12px; border: 1px solid #ddd;"></td><td style="padding: 12px; border: 1px solid #ddd;"></td><td style="padding: 12px; border: 1px solid #ddd;"></td></tr>
              <tr><td style="padding: 12px; border: 1px solid #ddd;">Appliances</td><td style="padding: 12px; border: 1px solid #ddd;"></td><td style="padding: 12px; border: 1px solid #ddd;"></td><td style="padding: 12px; border: 1px solid #ddd;"></td></tr>
              <tr><td style="padding: 12px; border: 1px solid #ddd;">Ext paint</td><td style="padding: 12px; border: 1px solid #ddd;"></td><td style="padding: 12px; border: 1px solid #ddd;"></td><td style="padding: 12px; border: 1px solid #ddd;"></td></tr>
              <tr><td style="padding: 12px; border: 1px solid #ddd;">Int paint</td><td style="padding: 12px; border: 1px solid #ddd;"></td><td style="padding: 12px; border: 1px solid #ddd;"></td><td style="padding: 12px; border: 1px solid #ddd;"></td></tr>
              <tr><td style="padding: 12px; border: 1px solid #ddd;">Carpet</td><td style="padding: 12px; border: 1px solid #ddd;"></td><td style="padding: 12px; border: 1px solid #ddd;"></td><td style="padding: 12px; border: 1px solid #ddd;"></td></tr>
              <tr><td style="padding: 12px; border: 1px solid #ddd;">Light fixtures</td><td style="padding: 12px; border: 1px solid #ddd;"></td><td style="padding: 12px; border: 1px solid #ddd;"></td><td style="padding: 12px; border: 1px solid #ddd;"></td></tr>
            </tbody>
          </table>
          
          <div style="text-align: center; margin: 25px 0 15px; font-size: 16pt; color: ${primaryColor}; font-weight: bold;">Home Wealth Data</div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
              <tr>
                <th style="background: ${primaryColor}; color: white; padding: 10px; text-align: center; width: 33%;">Value</th>
                <th style="background: ${primaryColor}; color: white; padding: 10px; text-align: center; width: 33%;">Mortgage Amount</th>
                <th style="background: ${primaryColor}; color: white; padding: 10px; text-align: center; width: 34%;">Interest rate</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 20px; border: 1px solid #ddd; text-align: center;"></td>
                <td style="padding: 20px; border: 1px solid #ddd; text-align: center;"></td>
                <td style="padding: 20px; border: 1px solid #ddd; text-align: center;"></td>
              </tr>
            </tbody>
          </table>
          
          <div style="text-align: center; margin: 25px 0 15px; font-size: 16pt; color: ${primaryColor}; font-weight: bold;">Home Information</div>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="background: ${primaryColor}; color: white; padding: 8px; text-align: center; font-size: 9pt;">Style</th>
                <th style="background: ${primaryColor}; color: white; padding: 8px; text-align: center; font-size: 9pt;">Beds</th>
                <th style="background: ${primaryColor}; color: white; padding: 8px; text-align: center; font-size: 9pt;">Baths</th>
                <th style="background: ${primaryColor}; color: white; padding: 8px; text-align: center; font-size: 9pt;">SF</th>
                <th style="background: ${primaryColor}; color: white; padding: 8px; text-align: center; font-size: 9pt;">Bsmnt</th>
                <th style="background: ${primaryColor}; color: white; padding: 8px; text-align: center; font-size: 9pt;">Garage</th>
                <th style="background: ${primaryColor}; color: white; padding: 8px; text-align: center; font-size: 9pt;">Condition</th>
                <th style="background: ${primaryColor}; color: white; padding: 8px; text-align: center; font-size: 9pt;">Amenities</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 15px; border: 1px solid #ddd; text-align: center;"></td>
                <td style="padding: 15px; border: 1px solid #ddd; text-align: center;"></td>
                <td style="padding: 15px; border: 1px solid #ddd; text-align: center;"></td>
                <td style="padding: 15px; border: 1px solid #ddd; text-align: center;"></td>
                <td style="padding: 15px; border: 1px solid #ddd; text-align: center;"></td>
                <td style="padding: 15px; border: 1px solid #ddd; text-align: center;"></td>
                <td style="padding: 15px; border: 1px solid #ddd; text-align: center;"></td>
                <td style="padding: 15px; border: 1px solid #ddd; text-align: center;"></td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Life Spans Page 1 -->
        <div class="page">
          <div style="text-align: center; font-size: 18pt; color: ${primaryColor}; font-weight: bold; margin-bottom: 20px;">Property Components Life Spans</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px;">
            <div>
              <table style="width: 100%; border-collapse: collapse; font-size: 9pt;">
                <tr style="background: ${primaryColor}; color: white;"><th colspan="2" style="padding: 8px; text-align: left;">Plumbing</th></tr>
                <tr style="background: #f0f0f0; font-weight: bold;"><td colspan="2" style="padding: 5px;">Water Service (Public)</td></tr>
                <tr><td style="padding: 4px 8px;">Galvanized Steel</td><td style="padding: 4px 8px; text-align: right;">40-60 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Copper</td><td style="padding: 4px 8px; text-align: right;">75+ yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Plastic</td><td style="padding: 4px 8px; text-align: right;">N/A</td></tr>
                <tr style="background: #f0f0f0; font-weight: bold;"><td colspan="2" style="padding: 5px;">Interior Water Pipes</td></tr>
                <tr><td style="padding: 4px 8px;">Galvanized Steel</td><td style="padding: 4px 8px; text-align: right;">40-60 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Copper</td><td style="padding: 4px 8px; text-align: right;">75+ yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Plastic</td><td style="padding: 4px 8px; text-align: right;">N/A</td></tr>
                <tr style="background: #f0f0f0; font-weight: bold;"><td colspan="2" style="padding: 5px;">Drainage Line</td></tr>
                <tr><td style="padding: 4px 8px;">Galvanized Steel</td><td style="padding: 4px 8px; text-align: right;">40-60 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Copper</td><td style="padding: 4px 8px; text-align: right;">50-75 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Cast Iron</td><td style="padding: 4px 8px; text-align: right;">60-90 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">ABS/PVC</td><td style="padding: 4px 8px; text-align: right;">30-50+ yrs</td></tr>
                <tr style="background: #f0f0f0; font-weight: bold;"><td colspan="2" style="padding: 5px;">Water Heater</td></tr>
                <tr><td style="padding: 4px 8px;">Tank water Heater</td><td style="padding: 4px 8px; text-align: right;">10-15 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Tankless Water Heater</td><td style="padding: 4px 8px; text-align: right;">15-20 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">In Boiler Domestic coil</td><td style="padding: 4px 8px; text-align: right;">15-20 yrs</td></tr>
              </table>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 15px;">
                <tr style="background: ${primaryColor}; color: white;"><th colspan="2" style="padding: 8px; text-align: left;">Windows</th></tr>
                <tr><td style="padding: 4px 8px;">Wood</td><td style="padding: 4px 8px; text-align: right;">50-80 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Vinyl</td><td style="padding: 4px 8px; text-align: right;">25+ yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Aluminum/Steel</td><td style="padding: 4px 8px; text-align: right;">35-50 yrs</td></tr>
              </table>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 15px;">
                <tr style="background: ${primaryColor}; color: white;"><th colspan="2" style="padding: 8px; text-align: left;">Deck</th></tr>
                <tr><td style="padding: 4px 8px;">Wood</td><td style="padding: 4px 8px; text-align: right;">15-25 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Composite Materials</td><td style="padding: 4px 8px; text-align: right;">25-35 yrs</td></tr>
              </table>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 15px;">
                <tr style="background: ${primaryColor}; color: white;"><th colspan="2" style="padding: 8px; text-align: left;">Appliances</th></tr>
                <tr><td style="padding: 4px 8px;">Refrigerator</td><td style="padding: 4px 8px; text-align: right;">15-20 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Dishwasher</td><td style="padding: 4px 8px; text-align: right;">7-12 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Range/Cooktop</td><td style="padding: 4px 8px; text-align: right;">12-20 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Garbage Disposal</td><td style="padding: 4px 8px; text-align: right;">7-12 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Washer</td><td style="padding: 4px 8px; text-align: right;">7-12 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Microwave oven</td><td style="padding: 4px 8px; text-align: right;">7-12 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Dryer</td><td style="padding: 4px 8px; text-align: right;">10-15 yrs</td></tr>
              </table>
            </div>
            
            <div>
              <table style="width: 100%; border-collapse: collapse; font-size: 9pt;">
                <tr style="background: ${primaryColor}; color: white;"><th colspan="2" style="padding: 8px; text-align: left;">Roof Covering</th></tr>
                <tr><td style="padding: 4px 8px;">Fiberglass Asphalt tab</td><td style="padding: 4px 8px; text-align: right;">16-20 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Fiberglass architectural</td><td style="padding: 4px 8px; text-align: right;">25-35 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Cedar shake/shingle</td><td style="padding: 4px 8px; text-align: right;">10-30 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Slate</td><td style="padding: 4px 8px; text-align: right;">50 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Synthetic slate</td><td style="padding: 4px 8px; text-align: right;">N/A</td></tr>
                <tr><td style="padding: 4px 8px;">Metal Standing Seams</td><td style="padding: 4px 8px; text-align: right;">50-80 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Clay/concrete tiles</td><td style="padding: 4px 8px; text-align: right;">50-80+ yrs</td></tr>
              </table>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 15px;">
                <tr style="background: ${primaryColor}; color: white;"><th colspan="2" style="padding: 8px; text-align: left;">Siding & Veneer</th></tr>
                <tr><td style="padding: 4px 8px;">Cement Composite</td><td style="padding: 4px 8px; text-align: right;">50+ yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Vinyl</td><td style="padding: 4px 8px; text-align: right;">35+ yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Aluminum</td><td style="padding: 4px 8px; text-align: right;">50+ yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Hardboard / composite</td><td style="padding: 4px 8px; text-align: right;">20-30 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Stucco, brick, veneers</td><td style="padding: 4px 8px; text-align: right;">Lifetime</td></tr>
              </table>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 15px;">
                <tr style="background: ${primaryColor}; color: white;"><th colspan="2" style="padding: 8px; text-align: left;">Gutter/Downspout</th></tr>
                <tr><td style="padding: 4px 8px;">Aluminum</td><td style="padding: 4px 8px; text-align: right;">30+ yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Galvanized</td><td style="padding: 4px 8px; text-align: right;">15-25 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Copper</td><td style="padding: 4px 8px; text-align: right;">50-80 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Plastic (PVC)</td><td style="padding: 4px 8px; text-align: right;">15-25 yrs</td></tr>
              </table>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 15px;">
                <tr style="background: ${primaryColor}; color: white;"><th colspan="2" style="padding: 8px; text-align: left;">Well</th></tr>
                <tr><td style="padding: 4px 8px;">Submersible pump</td><td style="padding: 4px 8px; text-align: right;">15-20 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Above Ground Pump</td><td style="padding: 4px 8px; text-align: right;">15-20 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Steel Pressure Tank</td><td style="padding: 4px 8px; text-align: right;">15-25 yrs</td></tr>
              </table>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 15px;">
                <tr style="background: ${primaryColor}; color: white;"><th colspan="2" style="padding: 8px; text-align: left;">Septic</th></tr>
                <tr><td style="padding: 4px 8px;">Steel Tank</td><td style="padding: 4px 8px; text-align: right;">15-20 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Concrete Tank</td><td style="padding: 4px 8px; text-align: right;">30-50 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Leach field</td><td style="padding: 4px 8px; text-align: right;">30-50 yrs</td></tr>
              </table>
            </div>
          </div>
        </div>
        
        <!-- Life Spans Page 2 -->
        <div class="page">
          <div style="text-align: center; font-size: 18pt; color: ${primaryColor}; font-weight: bold; margin-bottom: 20px;">Property Components Life Spans</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px;">
            <div>
              <table style="width: 100%; border-collapse: collapse; font-size: 9pt;">
                <tr style="background: ${primaryColor}; color: white;"><th colspan="2" style="padding: 8px; text-align: left;">Heating System</th></tr>
                <tr><td style="padding: 4px 8px;">Hot air furnace (oil/gas)</td><td style="padding: 4px 8px; text-align: right;">15-25 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Boiler</td><td style="padding: 4px 8px; text-align: right;">35-50 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Heat pump</td><td style="padding: 4px 8px; text-align: right;">10-15 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Electric Baseboard</td><td style="padding: 4px 8px; text-align: right;">15-25 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">In-floor radiant (electric)</td><td style="padding: 4px 8px; text-align: right;">15-25 yrs</td></tr>
              </table>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 15px;">
                <tr style="background: ${primaryColor}; color: white;"><th colspan="2" style="padding: 8px; text-align: left;">Cooling System</th></tr>
                <tr><td style="padding: 4px 8px;">Central Split-system</td><td style="padding: 4px 8px; text-align: right;">10-15 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Heat Pump</td><td style="padding: 4px 8px; text-align: right;">10-15 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Evaporative cooler</td><td style="padding: 4px 8px; text-align: right;">10-15 yrs</td></tr>
              </table>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 15px;">
                <tr style="background: ${primaryColor}; color: white;"><th colspan="2" style="padding: 8px; text-align: left;">Other HVAC Components</th></tr>
                <tr><td style="padding: 4px 8px;">Circulator pump</td><td style="padding: 4px 8px; text-align: right;">20-30 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Circulator Fan</td><td style="padding: 4px 8px; text-align: right;">15-20 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Fuel tank interior</td><td style="padding: 4px 8px; text-align: right;">50-80 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Fuel tank exterior</td><td style="padding: 4px 8px; text-align: right;">30-50 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Expansion tank bladder</td><td style="padding: 4px 8px; text-align: right;">15-25 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Humidifier</td><td style="padding: 4px 8px; text-align: right;">7-10 yrs</td></tr>
              </table>
            </div>
            
            <div>
              <table style="width: 100%; border-collapse: collapse; font-size: 9pt;">
                <tr style="background: ${primaryColor}; color: white;"><th colspan="2" style="padding: 8px; text-align: left;">Interior</th></tr>
                <tr style="background: #f0f0f0; font-weight: bold;"><td colspan="2" style="padding: 5px;">Ceramic tile</td></tr>
                <tr><td style="padding: 4px 8px;">Mud-set cement board</td><td style="padding: 4px 8px; text-align: right;">Lifetime</td></tr>
                <tr><td style="padding: 4px 8px;">Mastics (adhesive)</td><td style="padding: 4px 8px; text-align: right;">15-25 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Plaster or Drywall</td><td style="padding: 4px 8px; text-align: right;">Lifetime</td></tr>
              </table>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 15px;">
                <tr style="background: ${primaryColor}; color: white;"><th colspan="2" style="padding: 8px; text-align: left;">Flooring</th></tr>
                <tr><td style="padding: 4px 8px;">Wood (solid)</td><td style="padding: 4px 8px; text-align: right;">Lifetime</td></tr>
                <tr><td style="padding: 4px 8px;">Wood (engineered)</td><td style="padding: 4px 8px; text-align: right;">50+ yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Laminate</td><td style="padding: 4px 8px; text-align: right;">15-25 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Linoleum</td><td style="padding: 4px 8px; text-align: right;">10-15 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Granite/marble</td><td style="padding: 4px 8px; text-align: right;">100+ yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Carpet</td><td style="padding: 4px 8px; text-align: right;">7-12 yrs</td></tr>
              </table>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 15px;">
                <tr style="background: ${primaryColor}; color: white;"><th colspan="2" style="padding: 8px; text-align: left;">Electrical</th></tr>
                <tr><td style="padding: 4px 8px;">Service Entrance Cable</td><td style="padding: 4px 8px; text-align: right;">25-40 yrs</td></tr>
                <tr><td style="padding: 4px 8px;">Circuit breakers/fuse panel</td><td style="padding: 4px 8px; text-align: right;">Lifetime</td></tr>
                <tr><td style="padding: 4px 8px;">Wiring (modern romex)</td><td style="padding: 4px 8px; text-align: right;">Lifetime</td></tr>
                <tr><td style="padding: 4px 8px;">Wiring (armored/cloth)</td><td style="padding: 4px 8px; text-align: right;">60-80 yrs</td></tr>
              </table>
            </div>
          </div>
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
                  <div className="space-y-6">
                    <Card className="border-none shadow-md">
                      <CardHeader className="pb-3">
                        <CardTitle className="font-serif flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Link Visual Pricing Analysis
                        </CardTitle>
                        <CardDescription>
                          Connect an analysis from Visual Pricing to display all charts here
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4">
                          <Select
                            value={review?.visualPricingId || "none"}
                            onValueChange={(value) => {
                              updateMutation.mutate({ 
                                visualPricingId: value === "none" ? null : value 
                              });
                            }}
                          >
                            <SelectTrigger className="w-[300px]" data-testid="select-pricing-review">
                              <SelectValue placeholder="Select a pricing analysis..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No analysis linked</SelectItem>
                              {pricingReviews.map(pr => (
                                <SelectItem key={pr.id} value={pr.id}>
                                  {pr.title} {pr.neighborhood ? `(${pr.neighborhood})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Link href="/visual-pricing">
                            <Button variant="outline" className="gap-2">
                              <Plus className="h-4 w-4" />
                              Create New Analysis
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>

                    {linkedPricingReview && linkedMetrics ? (
                      <VisualPricingTools
                        metrics={linkedMetrics}
                        title={linkedPricingReview.title}
                        neighborhood={linkedPricingReview.neighborhood || undefined}
                        mlsData={linkedMlsData}
                        defaultTab="scattergram"
                      />
                    ) : (
                      <Card className="border-none shadow-md">
                        <CardContent className="py-12 text-center text-muted-foreground">
                          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="font-medium">No Visual Pricing Analysis Linked</p>
                          <p className="text-sm mt-2">
                            Select an existing analysis above or create a new one in Visual Pricing.
                          </p>
                          <p className="text-sm mt-1">
                            Any updates you make in Visual Pricing will automatically appear here.
                          </p>
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
