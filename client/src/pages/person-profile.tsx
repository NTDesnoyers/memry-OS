import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, Phone, Mail, MapPin, Save, Loader2, User, Briefcase, Heart, Star,
  PhoneCall, Video, FileText, Home, Calendar, MessageSquare, Clock, Building, Flame,
  Linkedin, Facebook, Instagram, Twitter, ExternalLink, Globe
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Person, Call, Meeting, Note, Deal, RealEstateReview, Interaction } from "@shared/schema";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";
import { format } from "date-fns";

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

  const { data: calls = [] } = useQuery<Call[]>({
    queryKey: ["/api/calls"],
    enabled: !!id,
  });

  const { data: meetings = [] } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings"],
    enabled: !!id,
  });

  const { data: notes = [] } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
    enabled: !!id,
  });

  const { data: deals = [] } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
    enabled: !!id,
  });

  const { data: reviews = [] } = useQuery<RealEstateReview[]>({
    queryKey: ["/api/real-estate-reviews"],
    enabled: !!id,
  });

  const { data: interactions = [] } = useQuery<Interaction[]>({
    queryKey: [`/api/people/${id}/interactions`],
    enabled: !!id,
  });

  const personCalls = calls.filter(c => c.personId === id);
  const personMeetings = meetings.filter(m => m.personId === id);
  const personNotes = notes.filter(n => n.personId === id);
  const personDeals = deals.filter(d => d.personId === id);
  const personReviews = reviews.filter(r => r.personId === id);

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

  const updateDealStageMutation = useMutation({
    mutationFn: async ({ dealId, stage }: { dealId: string; stage: string }) => {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      if (!res.ok) throw new Error("Failed to update deal stage");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      toast({ title: "Updated", description: "Deal status changed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update deal status", variant: "destructive" });
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

  const getSegmentColor = (segment: string | null | undefined) => {
    if (!segment) return "bg-gray-100 text-gray-700";
    const lower = segment.toLowerCase();
    if (lower.startsWith("a")) return "bg-purple-100 text-purple-700";
    if (lower.startsWith("b")) return "bg-blue-100 text-blue-700";
    if (lower.startsWith("c")) return "bg-green-100 text-green-700";
    if (lower.startsWith("d")) return "bg-orange-100 text-orange-700";
    return "bg-gray-100 text-gray-700";
  };

  const getDealStageColor = (stage: string | null | undefined) => {
    if (!stage) return "bg-gray-100 text-gray-700";
    const lower = stage.toLowerCase();
    if (lower === "warm") return "bg-amber-100 text-amber-700";
    if (lower === "hot" || lower === "hot_active") return "bg-red-100 text-red-700";
    if (lower === "hot_confused") return "bg-orange-100 text-orange-700";
    if (lower === "in_contract") return "bg-blue-100 text-blue-700";
    if (lower === "closed") return "bg-green-100 text-green-700";
    return "bg-gray-100 text-gray-700";
  };

  const getDealStageLabel = (stage: string | null | undefined) => {
    if (!stage) return "";
    const lower = stage.toLowerCase();
    if (lower === "warm") return "Warm";
    if (lower === "hot" || lower === "hot_active") return "Hot";
    if (lower === "hot_confused") return "Hot (Confused)";
    if (lower === "in_contract") return "Under Contract";
    if (lower === "closed") return "Closed";
    return stage;
  };

  const activeDeal = personDeals.find(d => ["warm", "hot", "hot_active", "hot_confused", "in_contract"].includes(d.stage?.toLowerCase() || ""));

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "—";
    try {
      return format(new Date(date), "MMM d, yyyy");
    } catch {
      return "—";
    }
  };

  const formatDateTime = (date: Date | string | null | undefined) => {
    if (!date) return "—";
    try {
      return format(new Date(date), "MMM d, yyyy h:mm a");
    } catch {
      return "—";
    }
  };

  const totalActivityCount = personCalls.length + personMeetings.length + personNotes.length;

  return (
    <Layout>
      <div className="min-h-screen bg-secondary/30 relative">
        <div 
          className="fixed inset-0 opacity-40 mix-blend-multiply pointer-events-none -z-10"
          style={{ backgroundImage: `url(${paperBg})`, backgroundSize: 'cover' }}
        />
        
        <div className="container mx-auto px-4 py-6 max-w-5xl">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/people">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-serif font-bold text-primary">{person.name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {activeDeal && (
                  <div className="flex items-center gap-1">
                    <Select
                      value={activeDeal.stage || "warm"}
                      onValueChange={(value) => updateDealStageMutation.mutate({ dealId: activeDeal.id, stage: value })}
                    >
                      <SelectTrigger className={`h-7 w-auto gap-1 px-2 border-0 ${getDealStageColor(activeDeal.stage)}`} data-testid="select-deal-stage">
                        <Flame className="h-3 w-3" />
                        <SelectValue>{getDealStageLabel(activeDeal.stage)} {activeDeal.side === "seller" ? "Seller" : "Buyer"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="warm">Warm</SelectItem>
                        <SelectItem value="hot">Hot</SelectItem>
                        <SelectItem value="hot_confused">Hot (Confused)</SelectItem>
                        <SelectItem value="in_contract">Under Contract</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {isEditing ? (
                  <Select
                    value={formData.segment || ""}
                    onValueChange={(value) => handleChange("segment", value)}
                  >
                    <SelectTrigger className="h-7 w-auto gap-1 px-2" data-testid="select-segment">
                      <SelectValue placeholder="Segment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A - Raving Fan</SelectItem>
                      <SelectItem value="B">B - Strong</SelectItem>
                      <SelectItem value="C">C - Network</SelectItem>
                      <SelectItem value="D">D - Develop</SelectItem>
                    </SelectContent>
                  </Select>
                ) : person.segment && (
                  <Badge className={getSegmentColor(person.segment)}>{person.segment}</Badge>
                )}
                {isEditing ? (
                  <Select
                    value={formData.role || ""}
                    onValueChange={(value) => handleChange("role", value)}
                  >
                    <SelectTrigger className="h-7 w-auto gap-1 px-2" data-testid="select-role">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buyer">Buyer</SelectItem>
                      <SelectItem value="seller">Seller</SelectItem>
                      <SelectItem value="renter">Renter</SelectItem>
                      <SelectItem value="landlord">Landlord</SelectItem>
                      <SelectItem value="investor">Investor</SelectItem>
                      <SelectItem value="past_client">Past Client</SelectItem>
                      <SelectItem value="sphere">Sphere</SelectItem>
                    </SelectContent>
                  </Select>
                ) : person.role && (
                  <Badge variant="outline">{person.role}</Badge>
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

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
              <TabsTrigger value="profile" className="gap-2">
                <User className="h-4 w-4" /> Profile
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2">
                <Clock className="h-4 w-4" /> Activity
                {totalActivityCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">{totalActivityCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="deals" className="gap-2">
                <Briefcase className="h-4 w-4" /> Deals
                {personDeals.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">{personDeals.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="properties" className="gap-2">
                <Home className="h-4 w-4" /> Properties
                {personReviews.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">{personReviews.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
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
                      <Label>Last Contact</Label>
                      <p className="text-lg">{formatDate(person.lastContact)}</p>
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
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {isEditing ? (
                      <Input 
                        value={formData.address || ""} 
                        onChange={(e) => handleChange("address", e.target.value)}
                        placeholder="Home address"
                        className="flex-1"
                        data-testid="input-address"
                      />
                    ) : (
                      <span>{person.address || "No address"}</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" /> Social Profiles
                  </CardTitle>
                  <CardDescription>Quick links to their social media</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4 text-[#0077B5]" />
                      {isEditing ? (
                        <Input 
                          value={formData.linkedinUrl || ""} 
                          onChange={(e) => handleChange("linkedinUrl", e.target.value)}
                          placeholder="LinkedIn profile URL"
                          data-testid="input-linkedin"
                        />
                      ) : person.linkedinUrl ? (
                        <a 
                          href={person.linkedinUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                          data-testid="link-linkedin"
                        >
                          LinkedIn <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">Not set</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Facebook className="h-4 w-4 text-[#1877F2]" />
                      {isEditing ? (
                        <Input 
                          value={formData.facebookUrl || ""} 
                          onChange={(e) => handleChange("facebookUrl", e.target.value)}
                          placeholder="Facebook profile URL"
                          data-testid="input-facebook"
                        />
                      ) : person.facebookUrl ? (
                        <a 
                          href={person.facebookUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                          data-testid="link-facebook"
                        >
                          Facebook <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">Not set</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Instagram className="h-4 w-4 text-[#E4405F]" />
                      {isEditing ? (
                        <Input 
                          value={formData.instagramUrl || ""} 
                          onChange={(e) => handleChange("instagramUrl", e.target.value)}
                          placeholder="Instagram profile URL"
                          data-testid="input-instagram"
                        />
                      ) : person.instagramUrl ? (
                        <a 
                          href={person.instagramUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                          data-testid="link-instagram"
                        >
                          Instagram <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">Not set</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Twitter className="h-4 w-4 text-[#1DA1F2]" />
                      {isEditing ? (
                        <Input 
                          value={formData.twitterUrl || ""} 
                          onChange={(e) => handleChange("twitterUrl", e.target.value)}
                          placeholder="X/Twitter profile URL"
                          data-testid="input-twitter"
                        />
                      ) : person.twitterUrl ? (
                        <a 
                          href={person.twitterUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                          data-testid="link-twitter"
                        >
                          X/Twitter <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">Not set</span>
                      )}
                    </div>
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

              {(person.isBuyer || isEditing) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Home className="h-5 w-5" /> Buyer Needs
                      {isEditing && (
                        <Badge 
                          variant={formData.isBuyer ? "default" : "outline"}
                          className="ml-auto cursor-pointer"
                          onClick={() => setFormData(prev => ({ ...prev, isBuyer: !prev.isBuyer }))}
                          data-testid="toggle-is-buyer"
                        >
                          {formData.isBuyer ? "Active Buyer" : "Not a Buyer"}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>This data appears in the "Wants" section of your Haves & Wants email</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isEditing ? (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <Label className="text-xs">Min Price</Label>
                            <Input 
                              type="number"
                              value={formData.buyerPriceMin || ""} 
                              onChange={(e) => setFormData(prev => ({ ...prev, buyerPriceMin: e.target.value ? parseInt(e.target.value) : null }))}
                              placeholder="250000"
                              data-testid="input-buyer-price-min"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Max Price</Label>
                            <Input 
                              type="number"
                              value={formData.buyerPriceMax || ""} 
                              onChange={(e) => setFormData(prev => ({ ...prev, buyerPriceMax: e.target.value ? parseInt(e.target.value) : null }))}
                              placeholder="400000"
                              data-testid="input-buyer-price-max"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Beds</Label>
                            <Input 
                              type="number"
                              value={formData.buyerBeds || ""} 
                              onChange={(e) => setFormData(prev => ({ ...prev, buyerBeds: e.target.value ? parseInt(e.target.value) : null }))}
                              placeholder="3"
                              data-testid="input-buyer-beds"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Baths</Label>
                            <Input 
                              type="number"
                              value={formData.buyerBaths || ""} 
                              onChange={(e) => setFormData(prev => ({ ...prev, buyerBaths: e.target.value ? parseInt(e.target.value) : null }))}
                              placeholder="2"
                              data-testid="input-buyer-baths"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Preferred Areas (comma-separated)</Label>
                          <Input 
                            value={(formData.buyerAreas || []).join(", ")} 
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              buyerAreas: e.target.value ? e.target.value.split(",").map(s => s.trim()).filter(Boolean) : []
                            }))}
                            placeholder="Downtown, Midtown, Westside"
                            data-testid="input-buyer-areas"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Property Types (comma-separated)</Label>
                          <Input 
                            value={(formData.buyerPropertyTypes || []).join(", ")} 
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              buyerPropertyTypes: e.target.value ? e.target.value.split(",").map(s => s.trim()).filter(Boolean) : []
                            }))}
                            placeholder="Single Family, Townhouse, Condo"
                            data-testid="input-buyer-property-types"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Must Haves (comma-separated)</Label>
                          <Input 
                            value={(formData.buyerMustHaves || []).join(", ")} 
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              buyerMustHaves: e.target.value ? e.target.value.split(",").map(s => s.trim()).filter(Boolean) : []
                            }))}
                            placeholder="Garage, Updated Kitchen, Fenced Yard"
                            data-testid="input-buyer-must-haves"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Buyer Notes</Label>
                          <Textarea 
                            value={formData.buyerNotes || ""} 
                            onChange={(e) => setFormData(prev => ({ ...prev, buyerNotes: e.target.value }))}
                            placeholder="Additional notes about what they're looking for..."
                            data-testid="input-buyer-notes"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <Label className="text-muted-foreground text-xs">Price Range</Label>
                            <p className="font-medium">
                              {person.buyerPriceMin && person.buyerPriceMax 
                                ? `$${person.buyerPriceMin.toLocaleString()} - $${person.buyerPriceMax.toLocaleString()}`
                                : "—"}
                            </p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground text-xs">Beds</Label>
                            <p className="font-medium">{person.buyerBeds || "—"}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground text-xs">Baths</Label>
                            <p className="font-medium">{person.buyerBaths || "—"}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground text-xs">Status</Label>
                            <p className="font-medium">{person.buyerStatus || "—"}</p>
                          </div>
                        </div>
                        {person.buyerAreas && person.buyerAreas.length > 0 && (
                          <div>
                            <Label className="text-muted-foreground text-xs">Preferred Areas</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {person.buyerAreas.map((area, i) => (
                                <Badge key={i} variant="outline">{area}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {person.buyerPropertyTypes && person.buyerPropertyTypes.length > 0 && (
                          <div>
                            <Label className="text-muted-foreground text-xs">Property Types</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {person.buyerPropertyTypes.map((type, i) => (
                                <Badge key={i} variant="outline">{type}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {person.buyerMustHaves && person.buyerMustHaves.length > 0 && (
                          <div>
                            <Label className="text-muted-foreground text-xs">Must Haves</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {person.buyerMustHaves.map((item, i) => (
                                <Badge key={i} variant="secondary">{item}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {person.buyerNotes && (
                          <div>
                            <Label className="text-muted-foreground text-xs">Notes</Label>
                            <p className="text-sm whitespace-pre-wrap">{person.buyerNotes}</p>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

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
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <div className="grid gap-4">
                {personCalls.length === 0 && personMeetings.length === 0 && personNotes.length === 0 && interactions.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">No activity recorded yet</p>
                      <p className="text-sm text-muted-foreground mt-1">Conversations, calls, and meetings will appear here</p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {interactions.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <MessageSquare className="h-5 w-5" /> Conversations ({interactions.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {interactions.map((interaction) => (
                            <div key={interaction.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                              <div className={`p-2 rounded-full ${
                                interaction.type === 'call' ? 'bg-green-100' :
                                interaction.type === 'meeting' ? 'bg-blue-100' :
                                interaction.type === 'email' ? 'bg-orange-100' : 'bg-purple-100'
                              }`}>
                                {interaction.type === 'call' ? (
                                  <PhoneCall className="h-4 w-4 text-green-600" />
                                ) : interaction.type === 'meeting' ? (
                                  <Video className="h-4 w-4 text-blue-600" />
                                ) : interaction.type === 'email' ? (
                                  <Mail className="h-4 w-4 text-orange-600" />
                                ) : (
                                  <MessageSquare className="h-4 w-4 text-purple-600" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium capitalize">{interaction.type}</span>
                                  {interaction.source && (
                                    <Badge variant="outline" className="text-xs">{interaction.source}</Badge>
                                  )}
                                  {interaction.externalLink && (
                                    <a 
                                      href={interaction.externalLink} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline text-xs"
                                    >
                                      View Recording
                                    </a>
                                  )}
                                </div>
                                {interaction.summary && <p className="text-sm text-muted-foreground mt-1">{interaction.summary}</p>}
                                <p className="text-xs text-muted-foreground mt-1">{formatDateTime(interaction.occurredAt)}</p>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {personCalls.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <PhoneCall className="h-5 w-5" /> Calls ({personCalls.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {personCalls.map((call) => (
                            <div key={call.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                              <div className={`p-2 rounded-full ${call.direction === 'inbound' ? 'bg-green-100' : 'bg-blue-100'}`}>
                                <PhoneCall className={`h-4 w-4 ${call.direction === 'inbound' ? 'text-green-600' : 'text-blue-600'}`} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium capitalize">{call.direction || 'Outbound'} Call</span>
                                  {call.duration && (
                                    <Badge variant="secondary" className="text-xs">{call.duration} min</Badge>
                                  )}
                                </div>
                                {call.summary && <p className="text-sm text-muted-foreground mt-1">{call.summary}</p>}
                                <p className="text-xs text-muted-foreground mt-1">{formatDateTime(call.createdAt)}</p>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {personMeetings.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Video className="h-5 w-5" /> Meetings ({personMeetings.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {personMeetings.map((meeting) => (
                            <div key={meeting.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                              <div className="p-2 rounded-full bg-purple-100">
                                <Video className="h-4 w-4 text-purple-600" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{meeting.title}</span>
                                  {meeting.platform && (
                                    <Badge variant="outline" className="text-xs">{meeting.platform}</Badge>
                                  )}
                                </div>
                                {meeting.summary && <p className="text-sm text-muted-foreground mt-1">{meeting.summary}</p>}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {meeting.startTime ? formatDateTime(meeting.startTime) : formatDateTime(meeting.createdAt)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {personNotes.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <FileText className="h-5 w-5" /> Notes ({personNotes.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {personNotes.map((note) => (
                            <div key={note.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                              <div className="p-2 rounded-full bg-amber-100">
                                <FileText className="h-4 w-4 text-amber-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                                {note.tags && note.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {note.tags.map((tag, i) => (
                                      <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                                    ))}
                                  </div>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">{formatDateTime(note.createdAt)}</p>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="deals" className="space-y-6">
              {personDeals.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No deals associated with this person</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {personDeals.map((deal) => (
                    <Card key={deal.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{deal.title}</h3>
                            {deal.address && (
                              <p className="text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {deal.address}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <Badge className={
                              deal.stage === 'closed' ? 'bg-green-100 text-green-700' :
                              deal.stage === 'hot' ? 'bg-red-100 text-red-700' :
                              deal.stage === 'warm' ? 'bg-orange-100 text-orange-700' :
                              'bg-blue-100 text-blue-700'
                            }>
                              {deal.stage}
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Type</p>
                            <p className="font-medium capitalize">{deal.type}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Side</p>
                            <p className="font-medium capitalize">{deal.side || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Value</p>
                            <p className="font-medium">{deal.value ? `$${deal.value.toLocaleString()}` : '—'}</p>
                          </div>
                        </div>
                        {deal.expectedCloseDate && (
                          <p className="text-sm text-muted-foreground mt-3">
                            Expected Close: {formatDate(deal.expectedCloseDate)}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="properties" className="space-y-6">
              {personReviews.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <Home className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No property reviews for this person</p>
                    <Link href="/reviews">
                      <Button variant="outline" className="mt-4">Create Real Estate Review</Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {personReviews.map((review) => (
                    <Link key={review.id} href={`/reviews/${review.id}`}>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">{review.title}</h3>
                              <p className="text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {review.propertyAddress}
                              </p>
                            </div>
                            <Badge variant={review.status === 'completed' ? 'default' : 'secondary'}>
                              {review.status}
                            </Badge>
                          </div>
                          {review.neighborhood && (
                            <p className="text-sm text-muted-foreground mt-2">{review.neighborhood}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Created: {formatDate(review.createdAt)}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
