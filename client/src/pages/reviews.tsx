import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Home, Calendar, Plus, FileText, Eye, Trash2, CheckCircle2, Clock, Archive, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";
import type { RealEstateReview, Person } from "@shared/schema";

export default function Reviews() {
  const [createOpen, setCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reviews = [], isLoading } = useQuery<RealEstateReview[]>({
    queryKey: ["/api/real-estate-reviews"],
  });

  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/real-estate-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create review");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/real-estate-reviews"] });
      setCreateOpen(false);
      toast({ title: "Review Created", description: "Tasks have been auto-generated for this review." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create review", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/real-estate-reviews/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/real-estate-reviews"] });
      toast({ title: "Deleted", description: "Review has been removed." });
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      title: formData.get("title"),
      propertyAddress: formData.get("propertyAddress"),
      neighborhood: formData.get("neighborhood") || null,
      personId: formData.get("personId") || null,
      clientType: formData.get("clientType"),
      outputType: formData.get("outputType"),
      status: "draft",
    });
  };

  const filteredReviews = reviews.filter((r) => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.propertyAddress.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === "active") return matchesSearch && ["draft", "ready"].includes(r.status || "");
    if (activeTab === "sent") return matchesSearch && r.status === "sent";
    if (activeTab === "archived") return matchesSearch && r.status === "archived";
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft": return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Draft</Badge>;
      case "ready": return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Ready</Badge>;
      case "sent": return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Sent</Badge>;
      case "archived": return <Badge variant="secondary">Archived</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stats = {
    total: reviews.length,
    draft: reviews.filter(r => r.status === "draft").length,
    ready: reviews.filter(r => r.status === "ready").length,
    sent: reviews.filter(r => r.status === "sent").length,
  };

  return (
    <Layout>
      <div className="min-h-screen bg-secondary/30 relative">
        <div 
          className="fixed inset-0 opacity-40 mix-blend-multiply pointer-events-none -z-10"
          style={{ backgroundImage: `url(${paperBg})`, backgroundSize: 'cover' }}
        />
        
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-serif font-bold text-primary">Real Estate Reviews</h1>
              <p className="text-muted-foreground">Annual Property Reviews & Client Stewardship</p>
            </div>
            
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 shadow-md" data-testid="button-create-review">
                  <Plus className="h-4 w-4" /> Create Review
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <form onSubmit={handleCreate}>
                  <DialogHeader>
                    <DialogTitle>Create Real Estate Review</DialogTitle>
                    <DialogDescription>Start a new annual property review for a client.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Review Title</Label>
                      <Input id="title" name="title" placeholder="2025 Annual Review - 123 Main St" required data-testid="input-review-title" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="propertyAddress">Property Address</Label>
                      <Input id="propertyAddress" name="propertyAddress" placeholder="123 Main St, City, ST 12345" required data-testid="input-property-address" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="neighborhood">Neighborhood</Label>
                      <Input id="neighborhood" name="neighborhood" placeholder="Westside Heights" data-testid="input-neighborhood" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="personId">Client</Label>
                      <Select name="personId">
                        <SelectTrigger data-testid="select-client">
                          <SelectValue placeholder="Select client (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {people.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="clientType">Client Type</Label>
                        <Select name="clientType" defaultValue="past_client">
                          <SelectTrigger data-testid="select-client-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="past_client">Past Client</SelectItem>
                            <SelectItem value="prospect">Prospect</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="outputType">Output Type</Label>
                        <Select name="outputType" defaultValue="digital">
                          <SelectTrigger data-testid="select-output-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="digital">Digital Only</SelectItem>
                            <SelectItem value="digital_and_print">Digital + Print</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-review">
                      {createMutation.isPending ? "Creating..." : "Create Review"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </header>

          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <Card className="border-none shadow-sm">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-primary">{stats.total}</div>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-yellow-600">{stats.draft}</div>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-blue-600">{stats.ready}</div>
                <p className="text-sm text-muted-foreground">Ready to Send</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-green-600">{stats.sent}</div>
                <p className="text-sm text-muted-foreground">Sent This Year</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-md bg-card/90">
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle className="font-serif">Reviews</CardTitle>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search reviews..." 
                    className="pl-9" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search-reviews"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="active" className="gap-2">
                    <Clock className="h-4 w-4" /> Active
                  </TabsTrigger>
                  <TabsTrigger value="sent" className="gap-2">
                    <Send className="h-4 w-4" /> Sent
                  </TabsTrigger>
                  <TabsTrigger value="archived" className="gap-2">
                    <Archive className="h-4 w-4" /> Archived
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="space-y-3">
                  {isLoading ? (
                    <p className="text-muted-foreground text-center py-8">Loading reviews...</p>
                  ) : filteredReviews.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No reviews found</p>
                      <p className="text-sm">Create your first review to get started</p>
                    </div>
                  ) : (
                    filteredReviews.map((review) => (
                      <div 
                        key={review.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/50 transition-colors"
                        data-testid={`card-review-${review.id}`}
                      >
                        <div className="flex gap-4 items-center">
                          <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                            <Home className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-bold">{review.title}</h3>
                            <p className="text-sm text-muted-foreground">{review.propertyAddress}</p>
                            {review.neighborhood && (
                              <p className="text-xs text-muted-foreground">{review.neighborhood}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden md:block">
                            {getStatusBadge(review.status || "draft")}
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(review.createdAt), "MMM d, yyyy")}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Link href={`/reviews/${review.id}`}>
                              <Button variant="outline" size="sm" data-testid={`button-view-${review.id}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => deleteMutation.mutate(review.id)}
                              data-testid={`button-delete-${review.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
