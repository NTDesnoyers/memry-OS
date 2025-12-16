import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User, Building2, Target, Settings, Sparkles, Check, Loader2 } from "lucide-react";
import type { AgentProfile } from "@shared/schema";

interface ProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileDrawer({ open, onOpenChange }: ProfileDrawerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<AgentProfile>>({});
  const [brokerageLookup, setBrokerageLookup] = useState("");

  const { data: profile, isLoading } = useQuery<AgentProfile | null>({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile");
      return res.json();
    },
  });

  useEffect(() => {
    if (profile) {
      setFormData(profile);
      if (profile.brokerage) {
        setBrokerageLookup(profile.brokerage);
      }
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<AgentProfile>) => {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save profile");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({ title: "Profile Saved", description: "Your profile has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save profile.", variant: "destructive" });
    },
  });

  const lookupBrandingMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`/api/brokerage-branding/${encodeURIComponent(name)}`);
      return res.json();
    },
    onSuccess: (data) => {
      if (data) {
        setFormData(prev => ({
          ...prev,
          brokerage: data.fullName,
          brokerageLogoUrl: data.logo,
          brokeragePrimaryColor: data.color,
        }));
        toast({ title: "Branding Found", description: `Loaded branding for ${data.fullName}` });
      } else {
        toast({ title: "Not Found", description: "No branding found for that brokerage. You can add it manually.", variant: "destructive" });
      }
    },
  });

  const handleChange = (field: keyof AgentProfile, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleBrokerageLookup = () => {
    if (brokerageLookup.trim()) {
      lookupBrandingMutation.mutate(brokerageLookup.trim());
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 font-serif">
            <User className="h-5 w-5" /> Profile & Settings
          </SheetTitle>
          <SheetDescription>
            Your personal and business information
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="personal" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personal" className="gap-1.5">
                <User className="h-3.5 w-3.5" /> Personal
              </TabsTrigger>
              <TabsTrigger value="brokerage" className="gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Brokerage
              </TabsTrigger>
              <TabsTrigger value="goals" className="gap-1.5">
                <Target className="h-3.5 w-3.5" /> Goals
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={formData.name || ""}
                        onChange={(e) => handleChange("name", e.target.value)}
                        placeholder="Your name"
                        data-testid="input-profile-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email || ""}
                        onChange={(e) => handleChange("email", e.target.value)}
                        placeholder="you@example.com"
                        data-testid="input-profile-email"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone || ""}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        placeholder="(555) 123-4567"
                        data-testid="input-profile-phone"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={formData.website || ""}
                        onChange={(e) => handleChange("website", e.target.value)}
                        placeholder="https://yoursite.com"
                        data-testid="input-profile-website"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">License Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="agentId">Agent ID</Label>
                      <Input
                        id="agentId"
                        value={formData.agentId || ""}
                        onChange={(e) => handleChange("agentId", e.target.value)}
                        placeholder="Agent ID"
                        data-testid="input-profile-agentId"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="licenseNumber">License #</Label>
                      <Input
                        id="licenseNumber"
                        value={formData.licenseNumber || ""}
                        onChange={(e) => handleChange("licenseNumber", e.target.value)}
                        placeholder="License number"
                        data-testid="input-profile-license"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="licenseState">State</Label>
                      <Input
                        id="licenseState"
                        value={formData.licenseState || ""}
                        onChange={(e) => handleChange("licenseState", e.target.value)}
                        placeholder="CA"
                        data-testid="input-profile-state"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="brokerage" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Brokerage Lookup</CardTitle>
                  <CardDescription>Enter your brokerage name to auto-load branding</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={brokerageLookup}
                      onChange={(e) => setBrokerageLookup(e.target.value)}
                      placeholder="eXp, KW, RE/MAX, Compass..."
                      className="flex-1"
                      data-testid="input-brokerage-lookup"
                    />
                    <Button 
                      onClick={handleBrokerageLookup} 
                      disabled={lookupBrandingMutation.isPending}
                      className="gap-2"
                      data-testid="button-lookup-branding"
                    >
                      {lookupBrandingMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Auto-Load
                    </Button>
                  </div>
                  
                  {formData.brokerageLogoUrl && (
                    <div className="flex items-center gap-4 p-4 bg-secondary/30 rounded-lg">
                      <img 
                        src={formData.brokerageLogoUrl} 
                        alt="Brokerage logo" 
                        className="h-12 max-w-[150px] object-contain"
                      />
                      <div>
                        <p className="font-medium">{formData.brokerage}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div 
                            className="h-4 w-4 rounded-full border" 
                            style={{ backgroundColor: formData.brokeragePrimaryColor || "#000000" }}
                          />
                          {formData.brokeragePrimaryColor}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Brokerage Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="brokerage">Brokerage Name</Label>
                      <Input
                        id="brokerage"
                        value={formData.brokerage || ""}
                        onChange={(e) => handleChange("brokerage", e.target.value)}
                        placeholder="eXp Realty"
                        data-testid="input-brokerage-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="teamName">Team Name</Label>
                      <Input
                        id="teamName"
                        value={formData.teamName || ""}
                        onChange={(e) => handleChange("teamName", e.target.value)}
                        placeholder="Your team name (optional)"
                        data-testid="input-team-name"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="brokerageLogoUrl">Logo URL</Label>
                      <Input
                        id="brokerageLogoUrl"
                        value={formData.brokerageLogoUrl || ""}
                        onChange={(e) => handleChange("brokerageLogoUrl", e.target.value)}
                        placeholder="https://..."
                        data-testid="input-brokerage-logo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="brokeragePrimaryColor">Brand Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="brokeragePrimaryColor"
                          value={formData.brokeragePrimaryColor || ""}
                          onChange={(e) => handleChange("brokeragePrimaryColor", e.target.value)}
                          placeholder="#00A0DC"
                          className="flex-1"
                          data-testid="input-brokerage-color"
                        />
                        <input
                          type="color"
                          value={formData.brokeragePrimaryColor || "#000000"}
                          onChange={(e) => handleChange("brokeragePrimaryColor", e.target.value)}
                          className="h-10 w-10 rounded border cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="goals" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Annual Goals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="annualTransactionGoal">Transaction Goal</Label>
                      <Input
                        id="annualTransactionGoal"
                        type="number"
                        value={formData.annualTransactionGoal || ""}
                        onChange={(e) => handleChange("annualTransactionGoal", parseInt(e.target.value) || 0)}
                        placeholder="24"
                        data-testid="input-transaction-goal"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="annualGCIGoal">GCI Goal ($)</Label>
                      <Input
                        id="annualGCIGoal"
                        type="number"
                        value={formData.annualGCIGoal || ""}
                        onChange={(e) => handleChange("annualGCIGoal", parseInt(e.target.value) || 0)}
                        placeholder="200000"
                        data-testid="input-gci-goal"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Mindset & Focus</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="wordOfYear">Word of the Year</Label>
                      <Input
                        id="wordOfYear"
                        value={formData.wordOfYear || ""}
                        onChange={(e) => handleChange("wordOfYear", e.target.value)}
                        placeholder="FOCUS, GROWTH, etc."
                        data-testid="input-word-of-year"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quarterlyFocus">Quarterly Focus</Label>
                      <Input
                        id="quarterlyFocus"
                        value={formData.quarterlyFocus || ""}
                        onChange={(e) => handleChange("quarterlyFocus", e.target.value)}
                        placeholder="Q1 focus area"
                        data-testid="input-quarterly-focus"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="affirmation">Daily Affirmation</Label>
                    <Textarea
                      id="affirmation"
                      value={formData.affirmation || ""}
                      onChange={(e) => handleChange("affirmation", e.target.value)}
                      placeholder="I consistently receive..."
                      className="min-h-[80px]"
                      data-testid="input-affirmation"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="familyMission">Family Mission</Label>
                    <Textarea
                      id="familyMission"
                      value={formData.familyMission || ""}
                      onChange={(e) => handleChange("familyMission", e.target.value)}
                      placeholder="Our family's mission is..."
                      className="min-h-[60px]"
                      data-testid="input-family-mission"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessMission">Business Mission</Label>
                    <Textarea
                      id="businessMission"
                      value={formData.businessMission || ""}
                      onChange={(e) => handleChange("businessMission", e.target.value)}
                      placeholder="My business mission is..."
                      className="min-h-[60px]"
                      data-testid="input-business-mission"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-profile">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saveMutation.isPending}
            className="gap-2"
            data-testid="button-save-profile"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Save Profile
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
