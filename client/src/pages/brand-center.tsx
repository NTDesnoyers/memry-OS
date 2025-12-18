import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Upload, User, Building2, Palette, Image, QrCode, Globe, Phone, Mail, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";
import type { AgentProfile } from "@shared/schema";

export default function BrandCenter() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("personal");
  
  const headshotInputRef = useRef<HTMLInputElement>(null);
  const personalLogoInputRef = useRef<HTMLInputElement>(null);
  const brokerageLogoInputRef = useRef<HTMLInputElement>(null);
  const qrCodeInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading } = useQuery<AgentProfile>({
    queryKey: ["/api/agent-profile"],
  });

  const [formData, setFormData] = useState<Partial<AgentProfile>>({});

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<AgentProfile>) => {
      const res = await fetch("/api/agent-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-profile"] });
      toast({ title: "Saved", description: "Brand settings updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    },
  });

  const handleImageUpload = async (file: File, field: string) => {
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);
    
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formDataUpload,
      });
      
      if (!res.ok) throw new Error("Upload failed");
      
      const { url } = await res.json();
      const updatedData = { ...getFormValues(), [field]: url };
      setFormData(prev => ({ ...prev, [field]: url }));
      updateMutation.mutate(updatedData);
    } catch (error) {
      toast({ title: "Upload Failed", description: "Could not upload image", variant: "destructive" });
    }
  };

  const getFormValues = () => ({
    ...profile,
    ...formData,
  });

  const handleSave = () => {
    updateMutation.mutate(getFormValues());
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getValue = (field: keyof AgentProfile) => {
    return (formData[field] ?? profile?.[field] ?? "") as string;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-secondary/30 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-secondary/30 relative">
        <div 
          className="fixed inset-0 opacity-40 mix-blend-multiply pointer-events-none -z-10"
          style={{ backgroundImage: `url(${paperBg})`, backgroundSize: 'cover' }}
        />
        
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-serif font-bold text-primary">Brand Center</h1>
              <p className="text-muted-foreground">Manage your branding, logos, and contact information</p>
            </div>
            
            <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-2" data-testid="button-save">
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </Button>
          </header>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="personal" className="gap-2">
                <User className="h-4 w-4" /> Personal Info
              </TabsTrigger>
              <TabsTrigger value="branding" className="gap-2">
                <Palette className="h-4 w-4" /> Branding
              </TabsTrigger>
              <TabsTrigger value="company" className="gap-2">
                <Building2 className="h-4 w-4" /> Company
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personal">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-none shadow-md">
                  <CardHeader>
                    <CardTitle className="font-serif">Contact Information</CardTitle>
                    <CardDescription>Your name and contact details for client materials</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <Input 
                        id="name"
                        value={getValue("name")}
                        onChange={(e) => updateField("name", e.target.value)}
                        placeholder="Nathan Desnoyers"
                        data-testid="input-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tagline">Tagline</Label>
                      <Input 
                        id="tagline"
                        value={getValue("tagline")}
                        onChange={(e) => updateField("tagline", e.target.value)}
                        placeholder="Your Trusted Real Estate Advisor"
                        data-testid="input-tagline"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="email"
                          className="pl-10"
                          value={getValue("email")}
                          onChange={(e) => updateField("email", e.target.value)}
                          placeholder="nathan@desnoyersproperties.com"
                          data-testid="input-email"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="phone"
                          className="pl-10"
                          value={getValue("phone")}
                          onChange={(e) => updateField("phone", e.target.value)}
                          placeholder="(571) 361-1841"
                          data-testid="input-phone"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="website"
                          className="pl-10"
                          value={getValue("website")}
                          onChange={(e) => updateField("website", e.target.value)}
                          placeholder="www.desnoyersproperties.com"
                          data-testid="input-website"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md">
                  <CardHeader>
                    <CardTitle className="font-serif">Profile Photo</CardTitle>
                    <CardDescription>Your professional headshot for materials</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <input
                      ref={headshotInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, "headshotUrl");
                      }}
                    />
                    
                    <div 
                      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-secondary/30 transition-colors"
                      onClick={() => headshotInputRef.current?.click()}
                    >
                      {getValue("headshotUrl") ? (
                        <div className="space-y-4">
                          <img 
                            src={getValue("headshotUrl")} 
                            alt="Headshot" 
                            className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-white shadow-lg"
                          />
                          <p className="text-sm text-muted-foreground">Click to change</p>
                        </div>
                      ) : (
                        <>
                          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <p className="font-medium">Upload Headshot</p>
                          <p className="text-sm text-muted-foreground">JPG, PNG up to 10MB</p>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md md:col-span-2">
                  <CardHeader>
                    <CardTitle className="font-serif flex items-center gap-2">
                      <QrCode className="h-5 w-5" /> Google Reviews
                    </CardTitle>
                    <CardDescription>Add your Google review link and QR code for client materials</CardDescription>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="googleReviewUrl">Google Review Link</Label>
                        <Input 
                          id="googleReviewUrl"
                          value={getValue("googleReviewUrl")}
                          onChange={(e) => updateField("googleReviewUrl", e.target.value)}
                          placeholder="https://g.page/r/..."
                          data-testid="input-google-review-url"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Get this from your Google Business Profile
                        </p>
                      </div>
                    </div>
                    <div>
                      <Label>QR Code Image</Label>
                      <input
                        ref={qrCodeInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, "googleReviewQrUrl");
                        }}
                      />
                      <div 
                        className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-secondary/30 transition-colors mt-2"
                        onClick={() => qrCodeInputRef.current?.click()}
                      >
                        {getValue("googleReviewQrUrl") ? (
                          <div className="space-y-2">
                            <img 
                              src={getValue("googleReviewQrUrl")} 
                              alt="QR Code" 
                              className="w-24 h-24 mx-auto"
                            />
                            <p className="text-xs text-muted-foreground">Click to change</p>
                          </div>
                        ) : (
                          <>
                            <QrCode className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm font-medium">Upload QR Code</p>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="branding">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-none shadow-md">
                  <CardHeader>
                    <CardTitle className="font-serif">Personal Logo</CardTitle>
                    <CardDescription>Your personal or team branding</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <input
                      ref={personalLogoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, "personalLogoUrl");
                      }}
                    />
                    
                    <div 
                      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-secondary/30 transition-colors"
                      onClick={() => personalLogoInputRef.current?.click()}
                    >
                      {getValue("personalLogoUrl") ? (
                        <div className="space-y-4">
                          <img 
                            src={getValue("personalLogoUrl")} 
                            alt="Personal Logo" 
                            className="max-h-24 mx-auto object-contain"
                          />
                          <p className="text-sm text-muted-foreground">Click to change</p>
                        </div>
                      ) : (
                        <>
                          <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <p className="font-medium">Upload Personal Logo</p>
                          <p className="text-sm text-muted-foreground">PNG with transparency recommended</p>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md">
                  <CardHeader>
                    <CardTitle className="font-serif">Brokerage Logo</CardTitle>
                    <CardDescription>Your brokerage company logo</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <input
                      ref={brokerageLogoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, "brokerageLogoUrl");
                      }}
                    />
                    
                    <div 
                      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-secondary/30 transition-colors"
                      onClick={() => brokerageLogoInputRef.current?.click()}
                    >
                      {getValue("brokerageLogoUrl") ? (
                        <div className="space-y-4">
                          <img 
                            src={getValue("brokerageLogoUrl")} 
                            alt="Brokerage Logo" 
                            className="max-h-24 mx-auto object-contain"
                          />
                          <p className="text-sm text-muted-foreground">Click to change</p>
                        </div>
                      ) : (
                        <>
                          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <p className="font-medium">Upload Brokerage Logo</p>
                          <p className="text-sm text-muted-foreground">PNG with transparency recommended</p>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md md:col-span-2">
                  <CardHeader>
                    <CardTitle className="font-serif">Brand Colors</CardTitle>
                    <CardDescription>Primary color for your materials</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div>
                        <Label htmlFor="primaryColor">Primary Brand Color</Label>
                        <div className="flex items-center gap-3 mt-2">
                          <input
                            type="color"
                            id="primaryColor"
                            value={getValue("brokeragePrimaryColor") || "#1a365d"}
                            onChange={(e) => updateField("brokeragePrimaryColor", e.target.value)}
                            className="w-12 h-12 rounded border cursor-pointer"
                          />
                          <Input 
                            value={getValue("brokeragePrimaryColor") || "#1a365d"}
                            onChange={(e) => updateField("brokeragePrimaryColor", e.target.value)}
                            placeholder="#1a365d"
                            className="w-32"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="company">
              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle className="font-serif">Company Information</CardTitle>
                  <CardDescription>Your brokerage and license details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="brokerage">Brokerage Name</Label>
                      <Input 
                        id="brokerage"
                        value={getValue("brokerage")}
                        onChange={(e) => updateField("brokerage", e.target.value)}
                        placeholder="eXp Realty"
                        data-testid="input-brokerage"
                      />
                    </div>
                    <div>
                      <Label htmlFor="teamName">Team Name (optional)</Label>
                      <Input 
                        id="teamName"
                        value={getValue("teamName")}
                        onChange={(e) => updateField("teamName", e.target.value)}
                        placeholder="Desnoyers Properties"
                        data-testid="input-team-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="licenseNumber">License Number</Label>
                      <Input 
                        id="licenseNumber"
                        value={getValue("licenseNumber")}
                        onChange={(e) => updateField("licenseNumber", e.target.value)}
                        placeholder="0225123456"
                        data-testid="input-license-number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="licenseState">License State</Label>
                      <Input 
                        id="licenseState"
                        value={getValue("licenseState")}
                        onChange={(e) => updateField("licenseState", e.target.value)}
                        placeholder="VA"
                        data-testid="input-license-state"
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
                    <div>
                      <Label htmlFor="linkedin">LinkedIn</Label>
                      <Input 
                        id="linkedin"
                        value={getValue("socialLinkedIn")}
                        onChange={(e) => updateField("socialLinkedIn", e.target.value)}
                        placeholder="linkedin.com/in/username"
                      />
                    </div>
                    <div>
                      <Label htmlFor="facebook">Facebook</Label>
                      <Input 
                        id="facebook"
                        value={getValue("socialFacebook")}
                        onChange={(e) => updateField("socialFacebook", e.target.value)}
                        placeholder="facebook.com/page"
                      />
                    </div>
                    <div>
                      <Label htmlFor="instagram">Instagram</Label>
                      <Input 
                        id="instagram"
                        value={getValue("socialInstagram")}
                        onChange={(e) => updateField("socialInstagram", e.target.value)}
                        placeholder="@username"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
