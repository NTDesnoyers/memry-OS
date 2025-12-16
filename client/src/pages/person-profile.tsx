import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Phone, Mail, MapPin, Save, Loader2, User, Briefcase, Heart, Star } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Person } from "@shared/schema";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";

export default function PersonProfile() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<Person>>({});
  const [isEditing, setIsEditing] = useState(false);

  const { data: person, isLoading } = useQuery<Person>({
    queryKey: [`/api/people/${id}`],
    enabled: !!id,
  });

  useEffect(() => {
    if (person) {
      setFormData(person);
    }
  }, [person]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Person>) => {
      const res = await fetch(`/api/people/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update person");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/people/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      setIsEditing(false);
      toast({ title: "Saved", description: "Profile updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save changes", variant: "destructive" });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleChange = (field: keyof Person, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!person) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">Person not found</p>
          <Link href="/people">
            <Button variant="outline">Back to People</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const getCategoryColor = (category: string | null | undefined) => {
    if (!category) return "bg-gray-100 text-gray-700";
    const lower = category.toLowerCase();
    if (lower.includes("hot")) return "bg-red-100 text-red-700";
    if (lower.includes("warm")) return "bg-orange-100 text-orange-700";
    return "bg-blue-100 text-blue-700";
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
              <h1 className="text-3xl font-serif font-bold text-primary">{person.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                {person.category && (
                  <Badge className={getCategoryColor(person.category)}>{person.category}</Badge>
                )}
                {person.role && (
                  <span className="text-muted-foreground text-sm">{person.role}</span>
                )}
              </div>
            </div>
            <Button 
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              disabled={updateMutation.isPending}
              data-testid="button-edit-save"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : isEditing ? (
                <Save className="h-4 w-4 mr-2" />
              ) : null}
              {isEditing ? "Save" : "Edit"}
            </Button>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" /> Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    {isEditing ? (
                      <Input 
                        value={formData.name || ""} 
                        onChange={(e) => handleChange("name", e.target.value)}
                        data-testid="input-name"
                      />
                    ) : (
                      <p className="text-lg">{person.name}</p>
                    )}
                  </div>
                  <div>
                    <Label>Category</Label>
                    {isEditing ? (
                      <Input 
                        value={formData.category || ""} 
                        onChange={(e) => handleChange("category", e.target.value)}
                        placeholder="Hot, Warm, Nurture..."
                        data-testid="input-category"
                      />
                    ) : (
                      <p className="text-lg">{person.category || "—"}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {isEditing ? (
                      <Input 
                        value={formData.email || ""} 
                        onChange={(e) => handleChange("email", e.target.value)}
                        placeholder="Email address"
                        data-testid="input-email"
                      />
                    ) : (
                      <span>{person.email || "No email"}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {isEditing ? (
                      <Input 
                        value={formData.phone || ""} 
                        onChange={(e) => handleChange("phone", e.target.value)}
                        placeholder="Phone number"
                        data-testid="input-phone"
                      />
                    ) : (
                      <span>{person.phone || "No phone"}</span>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Role</Label>
                  {isEditing ? (
                    <Input 
                      value={formData.role || ""} 
                      onChange={(e) => handleChange("role", e.target.value)}
                      placeholder="Buyer, Seller, Investor..."
                      data-testid="input-role"
                    />
                  ) : (
                    <p>{person.role || "—"}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" /> FORD Notes
                </CardTitle>
                <CardDescription>Family, Occupation, Recreation, Dreams</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Family</Label>
                  {isEditing ? (
                    <Textarea 
                      value={formData.fordFamily || ""} 
                      onChange={(e) => handleChange("fordFamily", e.target.value)}
                      placeholder="Family details..."
                      data-testid="input-ford-family"
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{person.fordFamily || "—"}</p>
                  )}
                </div>
                <div>
                  <Label>Occupation</Label>
                  {isEditing ? (
                    <Textarea 
                      value={formData.fordOccupation || ""} 
                      onChange={(e) => handleChange("fordOccupation", e.target.value)}
                      placeholder="Work, career..."
                      data-testid="input-ford-occupation"
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{person.fordOccupation || "—"}</p>
                  )}
                </div>
                <div>
                  <Label>Recreation</Label>
                  {isEditing ? (
                    <Textarea 
                      value={formData.fordRecreation || ""} 
                      onChange={(e) => handleChange("fordRecreation", e.target.value)}
                      placeholder="Hobbies, interests..."
                      data-testid="input-ford-recreation"
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{person.fordRecreation || "—"}</p>
                  )}
                </div>
                <div>
                  <Label>Dreams</Label>
                  {isEditing ? (
                    <Textarea 
                      value={formData.fordDreams || ""} 
                      onChange={(e) => handleChange("fordDreams", e.target.value)}
                      placeholder="Goals, aspirations..."
                      data-testid="input-ford-dreams"
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{person.fordDreams || "—"}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" /> Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea 
                    value={formData.notes || ""} 
                    onChange={(e) => handleChange("notes", e.target.value)}
                    placeholder="General notes..."
                    className="min-h-[100px]"
                    data-testid="input-notes"
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{person.notes || "No notes yet"}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
