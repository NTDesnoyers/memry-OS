import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Loader2, User } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { InsertPerson } from "@shared/schema";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";

export default function PersonNew() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const prefillName = params.get("name") || "";
  const dealId = params.get("dealId") || "";
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<Partial<InsertPerson>>({
    name: prefillName,
    email: "",
    phone: "",
    role: "",
    category: "",
    notes: "",
  });

  useEffect(() => {
    if (prefillName) {
      setFormData(prev => ({ ...prev, name: prefillName }));
    }
  }, [prefillName]);

  const createMutation = useMutation({
    mutationFn: async (data: Partial<InsertPerson>) => {
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create person");
      return res.json();
    },
    onSuccess: async (person) => {
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      
      if (dealId) {
        await fetch(`/api/deals/${dealId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ personId: person.id }),
        });
        queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      }
      
      toast({ title: "Created", description: "Person profile created successfully" });
      navigate(`/people/${person.id}`);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create person", variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!formData.name) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleChange = (field: keyof InsertPerson, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Layout>
      <div className="min-h-screen bg-secondary/30 relative">
        <div 
          className="fixed inset-0 opacity-40 mix-blend-multiply pointer-events-none -z-10"
          style={{ backgroundImage: `url(${paperBg})`, backgroundSize: 'cover' }}
        />
        
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/business-tracker">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-serif font-bold text-primary">New Person</h1>
              <p className="text-muted-foreground text-sm">Create a new contact profile</p>
            </div>
            <Button 
              onClick={handleSave}
              disabled={createMutation.isPending}
              data-testid="button-save"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" /> Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Name *</Label>
                  <Input 
                    value={formData.name || ""} 
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Full name"
                    data-testid="input-name"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input 
                    value={formData.category || ""} 
                    onChange={(e) => handleChange("category", e.target.value)}
                    placeholder="Hot, Warm, Nurture..."
                    data-testid="input-category"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input 
                    value={formData.email || ""} 
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="Email address"
                    data-testid="input-email"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input 
                    value={formData.phone || ""} 
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="Phone number"
                    data-testid="input-phone"
                  />
                </div>
              </div>
              <div>
                <Label>Role</Label>
                <Input 
                  value={formData.role || ""} 
                  onChange={(e) => handleChange("role", e.target.value)}
                  placeholder="Buyer, Seller, Investor..."
                  data-testid="input-role"
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea 
                  value={formData.notes || ""} 
                  onChange={(e) => handleChange("notes", e.target.value)}
                  placeholder="General notes..."
                  className="min-h-[100px]"
                  data-testid="input-notes"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
