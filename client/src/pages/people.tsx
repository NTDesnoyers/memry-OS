import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Filter, Phone, Mail, MessageSquare, MapPin, Loader2 } from "lucide-react";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Person, InsertPerson } from "@shared/schema";

export default function People() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [formData, setFormData] = useState<Partial<InsertPerson>>({
    name: "",
    email: "",
    phone: "",
    role: "",
    category: "",
    notes: "",
  });

  // Fetch all people
  const { data: people = [], isLoading } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  // Create person mutation
  const createPersonMutation = useMutation({
    mutationFn: async (data: InsertPerson) => {
      const response = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create person");
      }
      return response.json();
    },
    onSuccess: (person: Person) => {
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      
      // If category is Hot or Warm, automatically create a deal so they show in Business Tracker
      const category = formData.category?.toLowerCase() || "";
      if (category.includes("hot") || category.includes("warm")) {
        const stage = category.includes("hot") ? "hot" : "warm";
        fetch("/api/deals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            personId: person.id,
            title: person.name,
            type: "buyer",
            stage: stage,
            side: "buyer",
            painPleasureRating: 3,
            value: 0,
            commissionPercent: 3,
          }),
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
        }).catch(e => {
          console.error("Failed to create deal for hot/warm person:", e);
        });
      }
      
      setDialogOpen(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
        role: "",
        category: "",
        notes: "",
      });
      toast({
        title: "Success",
        description: category.includes("hot") || category.includes("warm") 
          ? `${person.name} added and will appear in Business Tracker`
          : "Person added successfully",
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
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }
    createPersonMutation.mutate(formData as InsertPerson);
  };

  const filteredPeople = people.filter((person) =>
    person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.phone?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <h1 className="text-3xl font-serif font-bold text-primary">People</h1>
              <p className="text-muted-foreground">Client Intelligence Core</p>
            </div>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 shadow-md" data-testid="button-add-person">
                  <Plus className="h-4 w-4" /> Add Person
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Person</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                      data-testid="input-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@example.com"
                      data-testid="input-email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone || ""}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                      data-testid="input-phone"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      value={formData.role || ""}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      placeholder="Buyer, Seller, Past Client..."
                      data-testid="input-role"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={formData.category || ""}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="Hot, Warm, Nurture..."
                      data-testid="input-category"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes || ""}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Any additional notes..."
                      data-testid="input-notes"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={createPersonMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createPersonMutation.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                    ) : (
                      "Add Person"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </header>

          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search people..." 
                className="pl-9 bg-background/80"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search"
              />
            </div>
            <Button variant="outline" className="gap-2 bg-background/80">
              <Filter className="h-4 w-4" /> Filter
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredPeople.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">No people found. Add your first contact to get started!</p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add Person
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredPeople.map((person) => (
                <Card key={person.id} className="border-none shadow-sm hover:shadow-md transition-all bg-card/80 backdrop-blur-sm group cursor-pointer" data-testid={`card-person-${person.id}`}>
                  <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {person.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg" data-testid={`text-name-${person.id}`}>{person.name}</h3>
                        <div className="flex gap-2 items-center text-sm text-muted-foreground">
                          {person.role && <Badge variant="secondary" className="font-normal">{person.role}</Badge>}
                          {person.email && (
                            <><span>•</span>
                            <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {person.email}</span></>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
                      {person.category && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Category</p>
                          <Badge className={
                            person.category.toLowerCase().includes("hot") ? "bg-red-100 text-red-700 hover:bg-red-200 border-none" :
                            person.category.toLowerCase().includes("warm") ? "bg-orange-100 text-orange-700 hover:bg-orange-200 border-none" :
                            "bg-blue-100 text-blue-700 hover:bg-blue-200 border-none"
                          }>{person.category}</Badge>
                        </div>
                      )}
                      
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {person.phone && <Button size="icon" variant="ghost" className="h-8 w-8"><Phone className="h-4 w-4" /></Button>}
                        {person.email && <Button size="icon" variant="ghost" className="h-8 w-8"><Mail className="h-4 w-4" /></Button>}
                        <Button size="icon" variant="ghost" className="h-8 w-8"><MessageSquare className="h-4 w-4" /></Button>
                      </div>
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
