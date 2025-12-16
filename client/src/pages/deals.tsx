import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, DollarSign, Home, ArrowRight, Loader2, Plus } from "lucide-react";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Deal, InsertDeal, Person } from "@shared/schema";

export default function Deals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState<Partial<InsertDeal>>({
    title: "",
    address: "",
    type: "Buy",
    stage: "Lead",
    value: 0,
    probability: 50,
    notes: "",
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
      setDialogOpen(false);
      setFormData({
        title: "",
        address: "",
        type: "Buy",
        stage: "Lead",
        value: 0,
        probability: 50,
        notes: "",
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
    if (!formData.title) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }
    createDealMutation.mutate(formData as InsertDeal);
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
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 shadow-md" data-testid="button-add-deal">
                  <Plus className="h-4 w-4" /> New Deal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Deal</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Deal Title"
                      data-testid="input-title"
                    />
                  </div>
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
                  <div>
                    <Label htmlFor="person">Client</Label>
                    <Select 
                      value={formData.personId || ""} 
                      onValueChange={(value) => setFormData({ ...formData, personId: value })}
                    >
                      <SelectTrigger data-testid="select-person">
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {people.map(person => (
                          <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                  </div>
                  <div>
                    <Label htmlFor="value">Value ($)</Label>
                    <Input
                      id="value"
                      type="number"
                      value={formData.value || 0}
                      onChange={(e) => setFormData({ ...formData, value: parseInt(e.target.value) })}
                      placeholder="450000"
                      data-testid="input-value"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes || ""}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes..."
                      data-testid="input-notes"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={createDealMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createDealMutation.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                    ) : (
                      "Create Deal"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </header>

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
                <Button onClick={() => setDialogOpen(true)}>
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
