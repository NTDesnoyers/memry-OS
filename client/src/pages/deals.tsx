import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, DollarSign, Home, ArrowRight, Loader2, Plus, X } from "lucide-react";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Deal, InsertDeal, Person } from "@shared/schema";

export default function Deals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  
  const [formData, setFormData] = useState<Partial<InsertDeal> & {
    closedDate?: string;
    source?: string;
    listPrice?: number;
    soldPrice?: number;
    commissionPercent?: number;
  }>({
    title: "",
    address: "",
    type: "Buy",
    stage: "Lead",
    value: 0,
    notes: "",
    closedDate: "",
    source: "",
    listPrice: 0,
    soldPrice: 0,
    commissionPercent: 3,
  });

  // Fetch all deals
  const { data: deals = [], isLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  // Fetch people for dropdown
  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  // Create deal mutation
  const createDealMutation = useMutation({
    mutationFn: async (data: InsertDeal) => {
      const response = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create deal");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      setFormOpen(false);
      setClientSearch("");
      setFormData({
        title: "",
        address: "",
        type: "Buy",
        stage: "Lead",
        value: 0,
        notes: "",
        closedDate: "",
        source: "",
        listPrice: 0,
        soldPrice: 0,
        commissionPercent: 3,
      });
      toast({
        title: "Success",
        description: "Deal created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-generate title from address or client name
    const selectedPerson = people.find(p => p.id === formData.personId);
    const autoTitle = formData.address || selectedPerson?.name || "New Deal";
    
    createDealMutation.mutate({ 
      ...formData, 
      title: autoTitle 
    } as InsertDeal);
  };

  // Calculate stats
  const activeDeals = deals.filter(d => d.stage !== "Closed Won" && d.stage !== "Closed Lost");
  const underContract = deals.filter(d => d.stage === "Under Contract");
  const totalVolume = deals
    .filter(d => d.stage === "Closed Won")
    .reduce((sum, deal) => sum + (deal.value || 0), 0);

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
              <h1 className="text-3xl font-serif font-bold text-primary">Deals</h1>
              <p className="text-muted-foreground">Pipeline & Transaction Management</p>
            </div>
            
            {!formOpen && (
              <Button 
                className="gap-2 shadow-md" 
                onClick={() => setFormOpen(true)}
                data-testid="button-add-deal"
              >
                <Plus className="h-4 w-4" /> New Deal
              </Button>
            )}
          </header>

          {formOpen && (
            <Card className="mb-6 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Add New Deal</h3>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setFormOpen(false)}
                    data-testid="button-close-form"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={formData.address || ""}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="123 Main St"
                        data-testid="input-address"
                      />
                    </div>
                    <div className="relative">
                      <Label htmlFor="person">Client</Label>
                      <Input
                        id="person"
                        value={clientSearch}
                        onChange={(e) => {
                          setClientSearch(e.target.value);
                          setShowClientSuggestions(true);
                          if (!e.target.value) {
                            setFormData({ ...formData, personId: undefined });
                          }
                        }}
                        onFocus={() => setShowClientSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                        placeholder="Type to search..."
                        autoComplete="off"
                        data-testid="input-client"
                      />
                      {showClientSuggestions && clientSearch && (
                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-auto">
                          {people
                            .filter(p => p.name.toLowerCase().includes(clientSearch.toLowerCase()))
                            .slice(0, 8)
                            .map(person => (
                              <div
                                key={person.id}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                onMouseDown={() => {
                                  setFormData({ ...formData, personId: person.id });
                                  setClientSearch(person.name);
                                  setShowClientSuggestions(false);
                                }}
                                data-testid={`client-option-${person.id}`}
                              >
                                {person.name}
                              </div>
                            ))}
                          {people.filter(p => p.name.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">No matches found</div>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="type">Type</Label>
                      <Select 
                        value={formData.type} 
                        onValueChange={(value) => setFormData({ ...formData, type: value })}
                      >
                        <SelectTrigger data-testid="select-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Buy">Buy</SelectItem>
                          <SelectItem value="Sell">Sell</SelectItem>
                          <SelectItem value="Lease">Lease</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="stage">Stage</Label>
                      <Select 
                        value={formData.stage} 
                        onValueChange={(value) => setFormData({ ...formData, stage: value })}
                      >
                        <SelectTrigger data-testid="select-stage">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Lead">Lead</SelectItem>
                          <SelectItem value="Showing">Showing</SelectItem>
                          <SelectItem value="Under Contract">Under Contract</SelectItem>
                          <SelectItem value="Closed Won">Closed Won</SelectItem>
                          <SelectItem value="Closed Lost">Closed Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.stage !== "Closed Won" && (
                      <div>
                        <Label htmlFor="value">Est. Value ($)</Label>
                        <Input
                          id="value"
                          type="number"
                          value={formData.value || ""}
                          onChange={(e) => setFormData({ ...formData, value: e.target.value ? parseInt(e.target.value) : 0 })}
                          placeholder="450000"
                          data-testid="input-value"
                        />
                      </div>
                    )}
                  </div>
                  
                  {formData.stage === "Closed Won" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-2 border-t">
                      <div>
                        <Label htmlFor="closedDate">Closed Date</Label>
                        <Input
                          id="closedDate"
                          type="date"
                          value={formData.closedDate || ""}
                          onChange={(e) => setFormData({ ...formData, closedDate: e.target.value })}
                          data-testid="input-closed-date"
                        />
                      </div>
                      <div>
                        <Label htmlFor="source">Source</Label>
                        <Select 
                          value={formData.source || ""} 
                          onValueChange={(value) => setFormData({ ...formData, source: value })}
                        >
                          <SelectTrigger data-testid="select-source">
                            <SelectValue placeholder="Source" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sphere">Sphere</SelectItem>
                            <SelectItem value="referral">Referral</SelectItem>
                            <SelectItem value="open_house">Open House</SelectItem>
                            <SelectItem value="sign_call">Sign Call</SelectItem>
                            <SelectItem value="online_lead">Online Lead</SelectItem>
                            <SelectItem value="past_client">Past Client</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="listPrice">List Price ($)</Label>
                        <Input
                          id="listPrice"
                          type="number"
                          value={formData.listPrice || ""}
                          onChange={(e) => setFormData({ ...formData, listPrice: e.target.value ? parseInt(e.target.value) : 0 })}
                          placeholder="500000"
                          data-testid="input-list-price"
                        />
                      </div>
                      <div>
                        <Label htmlFor="soldPrice">Sold Price ($)</Label>
                        <Input
                          id="soldPrice"
                          type="number"
                          value={formData.soldPrice || ""}
                          onChange={(e) => setFormData({ ...formData, soldPrice: e.target.value ? parseInt(e.target.value) : 0, value: e.target.value ? parseInt(e.target.value) : 0 })}
                          placeholder="495000"
                          data-testid="input-sold-price"
                        />
                      </div>
                      <div>
                        <Label htmlFor="commissionPercent">Commission %</Label>
                        <Input
                          id="commissionPercent"
                          type="number"
                          step="0.1"
                          value={formData.commissionPercent || 3}
                          onChange={(e) => setFormData({ ...formData, commissionPercent: e.target.value ? parseFloat(e.target.value) : 3 })}
                          placeholder="3"
                          data-testid="input-commission-percent"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button 
                      type="submit" 
                      disabled={createDealMutation.isPending}
                      data-testid="button-submit"
                    >
                      {createDealMutation.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                      ) : (
                        "Create Deal"
                      )}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setFormOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="border-none shadow-sm bg-card/80">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 text-blue-700 rounded-full">
                    <Home className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Deals</p>
                    <h3 className="text-2xl font-bold font-serif">{activeDeals.length}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-card/80">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 text-green-700 rounded-full">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Under Contract</p>
                    <h3 className="text-2xl font-bold font-serif">{underContract.length}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-card/80">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 text-purple-700 rounded-full">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Volume YTD</p>
                    <h3 className="text-2xl font-bold font-serif">${(totalVolume / 1000000).toFixed(1)}M</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : deals.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">No deals yet. Create your first deal to get started!</p>
                <Button onClick={() => setFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> New Deal
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xl font-serif font-bold">Active Pipeline</h2>
              {deals.map((deal) => (
                <Card key={deal.id} className="border-none shadow-sm hover:shadow-md transition-all bg-card/80 backdrop-blur-sm cursor-pointer group" data-testid={`card-deal-${deal.id}`}>
                  <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={
                        `h-12 w-12 rounded-lg flex items-center justify-center font-bold text-lg
                        ${deal.type === 'Buy' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`
                      }>
                        {deal.type?.[0] || "D"}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg" data-testid={`text-title-${deal.id}`}>{deal.title}</h3>
                        {deal.address && <p className="text-sm text-muted-foreground">{deal.address}</p>}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 md:gap-6">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Value</p>
                        <p className="font-medium">${deal.value?.toLocaleString() || 0}</p>
                      </div>
                      <Badge className={
                        deal.stage === 'Under Contract' ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-none' :
                        deal.stage === 'Closed Won' ? 'bg-green-100 text-green-800 hover:bg-green-200 border-none' :
                        deal.stage === 'Closed Lost' ? 'bg-red-100 text-red-800 hover:bg-red-200 border-none' :
                        'bg-blue-100 text-blue-800 hover:bg-blue-200 border-none'
                      }>{deal.stage}</Badge>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform hidden md:block" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
