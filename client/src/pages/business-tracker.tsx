import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Save, Plus, Trash2, PieChart, TrendingUp, Flame, ThermometerSun, HelpCircle, FileCheck } from "lucide-react";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { PersonProfileDrawer } from "@/components/person-profile-drawer";
import { type Deal, type Person, type BusinessSettings } from "@shared/schema";
import { toast } from "sonner";

type DealWithPerson = Deal & { person?: Person };

export default function BusinessTracker() {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const { data: businessSettings, isLoading: settingsLoading } = useQuery<BusinessSettings>({
    queryKey: [`/api/business-settings/${currentYear}`],
  });

  const [settings, setSettings] = useState<Partial<BusinessSettings>>({});

  useEffect(() => {
    if (businessSettings) {
      setSettings(businessSettings);
    }
  }, [businessSettings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<BusinessSettings>) => {
      const res = await fetch("/api/business-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, year: currentYear }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/business-settings/${currentYear}`] });
      toast.success("Settings saved successfully");
    },
    onError: () => {
      toast.error("Failed to save settings");
    },
  });

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(settings);
  };

  const updateField = (field: keyof BusinessSettings, value: string | number | null) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const { data: deals = [] } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  const dealsWithPeople: DealWithPerson[] = deals.map(deal => ({
    ...deal,
    person: people.find(p => p.id === deal.personId)
  }));

  const warmDeals = dealsWithPeople.filter(d => d.prospectCategory === "warm" || d.stage === "warm");
  const hotActiveDeals = dealsWithPeople.filter(d => d.prospectCategory === "hot_active" || (d.stage === "hot" && d.prospectCategory !== "hot_confused"));
  const hotConfusedDeals = dealsWithPeople.filter(d => d.prospectCategory === "hot_confused");
  const underContractDeals = dealsWithPeople.filter(d => d.prospectCategory === "under_contract" || d.stage === "under_contract");
  const closedDeals = dealsWithPeople.filter(d => d.stage === "closed");

  const openPersonProfile = (personId: string | null | undefined) => {
    if (personId) {
      setSelectedPersonId(personId);
      setProfileOpen(true);
    }
  };

  const formatPrice = (value: number | null | undefined) => {
    if (!value) return "-";
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `${Math.round(value / 1000)}k`;
    return `$${value}`;
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "-";
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const calculateGCI = (value: number | null | undefined, commissionPercent: number | null | undefined) => {
    if (!value) return "$0";
    const pct = (commissionPercent || 3) / 100;
    const gci = value * pct;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(gci);
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return "$0";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const parseCurrencyInput = (value: string): number | null => {
    const cleaned = value.replace(/[$,]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  const PainPleasureBadge = ({ rating }: { rating: number | null | undefined }) => {
    if (!rating) return <span className="text-muted-foreground text-xs">-</span>;
    const colors: Record<number, string> = {
      1: "bg-gray-100 text-gray-700",
      2: "bg-yellow-100 text-yellow-700",
      3: "bg-orange-100 text-orange-700",
      4: "bg-red-100 text-red-700",
      5: "bg-red-200 text-red-800 font-bold",
    };
    return <Badge className={`${colors[rating] || colors[1]} text-xs`}>{rating}</Badge>;
  };

  const ClickableName = ({ personId, name }: { personId?: string | null; name: string }) => {
    if (!personId) return <span>{name}</span>;
    return (
      <button
        onClick={() => openPersonProfile(personId)}
        className="text-primary hover:underline cursor-pointer text-left font-medium"
        data-testid={`link-person-${personId}`}
      >
        {name}
      </button>
    );
  };

  const SideBadge = ({ side }: { side: string | null | undefined }) => {
    if (!side) return null;
    const isListing = side === "seller" || side === "listing";
    return (
      <Badge variant="outline" className={`text-xs ${isListing ? "border-purple-300 text-purple-700" : "border-blue-300 text-blue-700"}`}>
        {isListing ? "L" : "B"}
      </Badge>
    );
  };

  const totalPotentialGCI = [...warmDeals, ...hotActiveDeals, ...hotConfusedDeals, ...underContractDeals]
    .reduce((sum, d) => sum + (d.value || 0) * ((d.commissionPercent || 3) / 100), 0);
  
  const closedGCI = closedDeals.reduce((sum, d) => sum + (d.actualGCI || (d.value || 0) * ((d.commissionPercent || 3) / 100)), 0);
  const goalGCI = settings.annualGciGoal || 200000;
  const progressPercent = Math.min(100, (closedGCI / goalGCI) * 100);

  return (
    <Layout>
      <PersonProfileDrawer 
        personId={selectedPersonId} 
        open={profileOpen} 
        onClose={() => setProfileOpen(false)} 
      />
      <div className="min-h-screen bg-secondary/30 relative">
        <div 
          className="fixed inset-0 opacity-40 mix-blend-multiply pointer-events-none -z-10"
          style={{ backgroundImage: `url(${paperBg})`, backgroundSize: 'cover' }}
        />
        
        <div className="container mx-auto px-4 py-8 max-w-[1400px]">
          <header className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-serif font-bold text-primary">{currentYear} Business Tracker</h1>
              <p className="text-muted-foreground">Goals, Pipeline, Transactions & PIE Tracking</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase">YTD Progress</p>
                <p className="text-lg font-bold text-green-700">{formatCurrency(closedGCI)} / {formatCurrency(goalGCI)}</p>
                <div className="w-32 bg-secondary h-2 rounded-full overflow-hidden mt-1">
                  <div className="bg-green-600 h-full transition-all" style={{ width: `${progressPercent}%` }}></div>
                </div>
              </div>
            </div>
          </header>

          <Tabs defaultValue="prospects" className="w-full">
            <TabsList className="bg-card/50 backdrop-blur-sm w-full justify-start overflow-x-auto">
              <TabsTrigger value="goals">Goals & Fees</TabsTrigger>
              <TabsTrigger value="prospects">Prospects</TabsTrigger>
              <TabsTrigger value="undercontract">Under Contract</TabsTrigger>
              <TabsTrigger value="closed">Closed Transactions</TabsTrigger>
              <TabsTrigger value="pie">PIE Tracker</TabsTrigger>
            </TabsList>

            {/* --- GOALS & FEES TAB --- */}
            <TabsContent value="goals" className="space-y-6 mt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-none shadow-md">
                  <CardHeader className="bg-primary/5 pb-4">
                    <CardTitle className="font-serif">Yearly Goals</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-lg font-bold text-primary">Annual Gross Commission GOAL</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          className="pl-9 text-lg font-bold bg-background/50" 
                          value={settings.annualGciGoal ? settings.annualGciGoal.toLocaleString() : ""}
                          onChange={(e) => updateField("annualGciGoal", parseCurrencyInput(e.target.value))}
                          placeholder="200,000"
                          data-testid="input-annual-gci-goal"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Do not leave blank. Calculations depend on this number.</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md">
                  <CardHeader className="bg-primary/5 pb-4">
                    <CardTitle className="font-serif">Fees Structure</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <Label>Franchise Fee (Flat)</Label>
                         <Input 
                           value={settings.franchiseFeeFlat ? settings.franchiseFeeFlat.toLocaleString() : ""} 
                           onChange={(e) => updateField("franchiseFeeFlat", parseCurrencyInput(e.target.value))}
                           placeholder="$0"
                           data-testid="input-franchise-fee-flat"
                         />
                       </div>
                       <div className="space-y-2">
                         <Label>Franchise Fee (%)</Label>
                         <Input 
                           value={settings.franchiseFeePercent || ""} 
                           onChange={(e) => updateField("franchiseFeePercent", parseFloat(e.target.value) || null)}
                           placeholder="0%"
                           data-testid="input-franchise-fee-percent"
                         />
                       </div>
                       <div className="col-span-2 space-y-2">
                         <Label>Franchise Fee Cap</Label>
                         <Input 
                           value={settings.franchiseFeeCap ? settings.franchiseFeeCap.toLocaleString() : ""} 
                           onChange={(e) => updateField("franchiseFeeCap", parseCurrencyInput(e.target.value))}
                           placeholder="$0"
                           data-testid="input-franchise-fee-cap"
                         />
                       </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <Label>Marketing Fee (Flat)</Label>
                         <Input 
                           value={settings.marketingFeeFlat ? settings.marketingFeeFlat.toLocaleString() : ""} 
                           onChange={(e) => updateField("marketingFeeFlat", parseCurrencyInput(e.target.value))}
                           placeholder="$0"
                           data-testid="input-marketing-fee-flat"
                         />
                       </div>
                       <div className="space-y-2">
                         <Label>Marketing Fee (%)</Label>
                         <Input 
                           value={settings.marketingFeePercent || ""} 
                           onChange={(e) => updateField("marketingFeePercent", parseFloat(e.target.value) || null)}
                           placeholder="0%"
                           data-testid="input-marketing-fee-percent"
                         />
                       </div>
                       <div className="col-span-2 space-y-2">
                         <Label>Marketing Fee Cap</Label>
                         <Input 
                           value={settings.marketingFeeCap ? settings.marketingFeeCap.toLocaleString() : ""} 
                           onChange={(e) => updateField("marketingFeeCap", parseCurrencyInput(e.target.value))}
                           placeholder="$0"
                           data-testid="input-marketing-fee-cap"
                         />
                       </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md md:col-span-2">
                  <CardHeader className="bg-primary/5 pb-4">
                    <CardTitle className="font-serif">Commission Structure</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="p-4 bg-secondary/30 rounded-lg space-y-4">
                        <Label className="font-semibold">Office Cap / Fair Share Split</Label>
                        <div className="space-y-2">
                          <Label>Office Cap Amount</Label>
                          <Input 
                            value={settings.officeCap ? settings.officeCap.toLocaleString() : ""} 
                            onChange={(e) => updateField("officeCap", parseCurrencyInput(e.target.value))}
                            placeholder="$18,000"
                            className="bg-white"
                            data-testid="input-office-cap"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Starting Split (%)</Label>
                          <Input 
                            value={settings.startingSplit || ""} 
                            onChange={(e) => updateField("startingSplit", parseFloat(e.target.value) || null)}
                            placeholder="68"
                            className="bg-white"
                            data-testid="input-starting-split"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>After-Cap Split (%)</Label>
                          <Input 
                            value={settings.afterCapSplit || ""} 
                            onChange={(e) => updateField("afterCapSplit", parseFloat(e.target.value) || null)}
                            placeholder="85"
                            className="bg-white"
                            data-testid="input-after-cap-split"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label className="font-semibold">Progressive Split Tiers (Optional)</Label>
                      <p className="text-xs text-muted-foreground">Configure if your brokerage uses a tiered commission structure based on income levels.</p>
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-secondary/50">
                              <TableHead>Tier</TableHead>
                              <TableHead>Split %</TableHead>
                              <TableHead>From ($)</TableHead>
                              <TableHead>To ($)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {[1, 2, 3].map((i) => (
                              <TableRow key={i}>
                                <TableCell className="font-medium text-muted-foreground">{i}</TableCell>
                                <TableCell><Input className="h-8 w-16" placeholder="%" data-testid={`input-tier-${i}-split`} /></TableCell>
                                <TableCell><Input className="h-8" placeholder="$0" data-testid={`input-tier-${i}-from`} /></TableCell>
                                <TableCell><Input className="h-8" placeholder="$" data-testid={`input-tier-${i}-to`} /></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="md:col-span-2 flex justify-end">
                  <Button 
                    onClick={handleSaveSettings} 
                    disabled={updateSettingsMutation.isPending}
                    className="gap-2"
                    data-testid="button-save-settings"
                  >
                    <Save className="h-4 w-4" /> 
                    {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* --- PROSPECTS TAB --- */}
            <TabsContent value="prospects" className="space-y-6 mt-6">
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Warm Prospects */}
                <Card className="border-none shadow-md">
                  <CardHeader className="bg-orange-50 pb-3 border-b border-orange-100">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <ThermometerSun className="h-5 w-5 text-orange-600" />
                        <CardTitle className="font-serif text-orange-800 text-lg">Warm</CardTitle>
                      </div>
                      <Badge className="bg-orange-100 text-orange-700">{warmDeals.length}</Badge>
                    </div>
                    <CardDescription className="text-orange-700 text-xs mt-1">Building relationship, not yet active</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-[350px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent text-xs">
                            <TableHead className="w-[40px]">P/P</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="w-[40px]">Side</TableHead>
                            <TableHead className="text-right">GCI</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {warmDeals.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground py-6 text-sm">
                                No warm prospects
                              </TableCell>
                            </TableRow>
                          ) : warmDeals.map((deal) => (
                            <TableRow key={deal.id} className="hover:bg-orange-50/50" data-testid={`row-warm-${deal.id}`}>
                              <TableCell><PainPleasureBadge rating={deal.painPleasureRating} /></TableCell>
                              <TableCell>
                                <ClickableName personId={deal.personId} name={deal.person?.name || deal.title} />
                              </TableCell>
                              <TableCell><SideBadge side={deal.side} /></TableCell>
                              <TableCell className="text-right text-xs font-medium text-green-700">{calculateGCI(deal.value, deal.commissionPercent)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="p-3 bg-orange-50/50 border-t border-orange-100 flex justify-between items-center">
                       <span className="text-xs font-medium text-orange-800">Potential GCI</span>
                       <span className="font-bold text-green-700">
                         {formatCurrency(warmDeals.reduce((sum, d) => sum + (d.value || 0) * ((d.commissionPercent || 3) / 100), 0))}
                       </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Hot/Active Prospects */}
                <Card className="border-none shadow-md">
                  <CardHeader className="bg-red-50 pb-3 border-b border-red-100">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Flame className="h-5 w-5 text-red-600" />
                        <CardTitle className="font-serif text-red-800 text-lg">Hot / Active</CardTitle>
                      </div>
                      <Badge className="bg-red-100 text-red-700">{hotActiveDeals.length}</Badge>
                    </div>
                    <CardDescription className="text-red-700 text-xs mt-1">Actively looking, engaged in process</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-[350px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent text-xs">
                            <TableHead className="w-[40px]">P/P</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="w-[40px]">Side</TableHead>
                            <TableHead className="text-right">GCI</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {hotActiveDeals.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground py-6 text-sm">
                                No hot prospects
                              </TableCell>
                            </TableRow>
                          ) : hotActiveDeals.map((deal) => (
                            <TableRow key={deal.id} className="hover:bg-red-50/50" data-testid={`row-hot-${deal.id}`}>
                              <TableCell><PainPleasureBadge rating={deal.painPleasureRating} /></TableCell>
                              <TableCell>
                                <ClickableName personId={deal.personId} name={deal.person?.name || deal.title} />
                              </TableCell>
                              <TableCell><SideBadge side={deal.side} /></TableCell>
                              <TableCell className="text-right text-xs font-medium text-green-700">{calculateGCI(deal.value, deal.commissionPercent)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="p-3 bg-red-50/50 border-t border-red-100 flex justify-between items-center">
                       <span className="text-xs font-medium text-red-800">Potential GCI</span>
                       <span className="font-bold text-green-700">
                         {formatCurrency(hotActiveDeals.reduce((sum, d) => sum + (d.value || 0) * ((d.commissionPercent || 3) / 100), 0))}
                       </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Hot/Confused Prospects */}
                <Card className="border-none shadow-md">
                  <CardHeader className="bg-amber-50 pb-3 border-b border-amber-100">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="h-5 w-5 text-amber-600" />
                        <CardTitle className="font-serif text-amber-800 text-lg">Hot / Confused</CardTitle>
                      </div>
                      <Badge className="bg-amber-100 text-amber-700">{hotConfusedDeals.length}</Badge>
                    </div>
                    <CardDescription className="text-amber-700 text-xs mt-1">Motivated but unsure, needs guidance</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-[350px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent text-xs">
                            <TableHead className="w-[40px]">P/P</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="w-[40px]">Side</TableHead>
                            <TableHead className="text-right">GCI</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {hotConfusedDeals.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground py-6 text-sm">
                                No confused prospects
                              </TableCell>
                            </TableRow>
                          ) : hotConfusedDeals.map((deal) => (
                            <TableRow key={deal.id} className="hover:bg-amber-50/50" data-testid={`row-confused-${deal.id}`}>
                              <TableCell><PainPleasureBadge rating={deal.painPleasureRating} /></TableCell>
                              <TableCell>
                                <ClickableName personId={deal.personId} name={deal.person?.name || deal.title} />
                              </TableCell>
                              <TableCell><SideBadge side={deal.side} /></TableCell>
                              <TableCell className="text-right text-xs font-medium text-green-700">{calculateGCI(deal.value, deal.commissionPercent)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="p-3 bg-amber-50/50 border-t border-amber-100 flex justify-between items-center">
                       <span className="text-xs font-medium text-amber-800">Potential GCI</span>
                       <span className="font-bold text-green-700">
                         {formatCurrency(hotConfusedDeals.reduce((sum, d) => sum + (d.value || 0) * ((d.commissionPercent || 3) / 100), 0))}
                       </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Summary Row */}
              <Card className="border-none shadow-md bg-gradient-to-r from-primary/5 to-green-50">
                <CardContent className="py-4">
                  <div className="flex justify-between items-center">
                    <div className="flex gap-8">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Total Prospects</p>
                        <p className="text-2xl font-bold">{warmDeals.length + hotActiveDeals.length + hotConfusedDeals.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Buyer Sides</p>
                        <p className="text-2xl font-bold text-blue-700">
                          {[...warmDeals, ...hotActiveDeals, ...hotConfusedDeals].filter(d => d.side === "buyer").length}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Listing Sides</p>
                        <p className="text-2xl font-bold text-purple-700">
                          {[...warmDeals, ...hotActiveDeals, ...hotConfusedDeals].filter(d => d.side === "seller" || d.side === "listing").length}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground uppercase">Total Pipeline GCI</p>
                      <p className="text-3xl font-bold text-green-700">{formatCurrency(totalPotentialGCI)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* --- UNDER CONTRACT TAB --- */}
            <TabsContent value="undercontract" className="space-y-6 mt-6">
              <Card className="border-none shadow-md">
                <CardHeader className="bg-indigo-50 pb-4 border-b border-indigo-100">
                   <div className="flex justify-between items-center">
                     <div className="flex items-center gap-2">
                       <FileCheck className="h-5 w-5 text-indigo-600" />
                       <CardTitle className="font-serif text-indigo-800">Under Contract</CardTitle>
                     </div>
                     <Badge className="bg-indigo-100 text-indigo-700">{underContractDeals.length} deals</Badge>
                   </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[50px]">P/P</TableHead>
                        <TableHead>Client Name</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead className="w-[60px]">Side</TableHead>
                        <TableHead>Closing Date</TableHead>
                        <TableHead>Sales Price</TableHead>
                        <TableHead>Comm %</TableHead>
                        <TableHead className="text-right">Est. GCI</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {underContractDeals.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            No deals under contract yet
                          </TableCell>
                        </TableRow>
                      ) : underContractDeals.map((deal) => (
                        <TableRow key={deal.id} className="hover:bg-indigo-50/50" data-testid={`row-undercontract-${deal.id}`}>
                          <TableCell><PainPleasureBadge rating={deal.painPleasureRating} /></TableCell>
                          <TableCell>
                            <ClickableName personId={deal.personId} name={deal.person?.name || deal.title} />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">{deal.address || "-"}</TableCell>
                          <TableCell><SideBadge side={deal.side} /></TableCell>
                          <TableCell>{deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString() : "-"}</TableCell>
                          <TableCell>{formatPrice(deal.value)}</TableCell>
                          <TableCell>{deal.commissionPercent || 3}%</TableCell>
                          <TableCell className="text-right font-bold text-green-700">{calculateGCI(deal.value, deal.commissionPercent)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="p-4 bg-indigo-50/50 border-t border-indigo-100 flex justify-between items-center">
                    <span className="text-sm font-medium text-indigo-800">Total Under Contract: {underContractDeals.length}</span>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground uppercase">Expected GCI</span>
                      <p className="text-lg font-bold text-green-700">
                        {formatCurrency(underContractDeals.reduce((sum, d) => sum + (d.value || 0) * ((d.commissionPercent || 3) / 100), 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* --- CLOSED TAB --- */}
            <TabsContent value="closed" className="space-y-6 mt-6">
              <Card className="border-none shadow-md overflow-hidden">
                <CardHeader className="bg-green-50 pb-4 border-b border-green-100">
                  <div className="flex justify-between items-center">
                    <CardTitle className="font-serif text-green-800">Closed Transactions</CardTitle>
                    <div className="flex gap-4 items-center">
                      <div className="text-sm font-medium">Sides: <span className="font-bold text-green-700">{closedDeals.length}</span></div>
                      <div className="text-sm font-medium">Volume: <span className="font-bold text-green-700">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, notation: 'compact' }).format(
                          closedDeals.reduce((sum, d) => sum + (d.value || 0), 0)
                        )}
                      </span></div>
                      <div className="text-sm font-medium">GCI: <span className="font-bold text-green-700">
                        {formatCurrency(closedGCI)}
                      </span></div>
                    </div>
                  </div>
                </CardHeader>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[100px]">Closed Date</TableHead>
                        <TableHead>Client Name</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead className="w-[60px]">Side</TableHead>
                        <TableHead className="w-[60px]">Ref?</TableHead>
                        <TableHead>Sale Price</TableHead>
                        <TableHead>Comm %</TableHead>
                        <TableHead className="text-right font-bold text-green-700 bg-green-50">Actual GCI</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {closedDeals.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            No closed deals yet
                          </TableCell>
                        </TableRow>
                      ) : closedDeals.map((deal) => (
                        <TableRow key={deal.id} className="hover:bg-muted/50" data-testid={`row-closed-${deal.id}`}>
                          <TableCell className="font-medium text-xs">
                            {deal.actualCloseDate ? new Date(deal.actualCloseDate).toLocaleDateString() : 
                             deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString() : "-"}
                          </TableCell>
                          <TableCell>
                            <ClickableName personId={deal.personId} name={deal.person?.name || deal.title} />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">{deal.address || "-"}</TableCell>
                          <TableCell><SideBadge side={deal.side} /></TableCell>
                          <TableCell>
                            {deal.isReferral && <Badge variant="outline" className="text-xs border-yellow-300 text-yellow-700">REF</Badge>}
                          </TableCell>
                          <TableCell className="text-xs">{formatPrice(deal.value)}</TableCell>
                          <TableCell className="text-xs">{deal.commissionPercent || 3}%</TableCell>
                          <TableCell className="text-right font-bold text-green-700 bg-green-50/50">
                            {deal.actualGCI ? formatCurrency(deal.actualGCI) : calculateGCI(deal.value, deal.commissionPercent)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

            {/* --- PIE TRACKER TAB --- */}
            <TabsContent value="pie" className="space-y-6 mt-6">
              <div className="grid md:grid-cols-4 gap-6">
                 <Card className="border-none shadow-md md:col-span-3">
                   <CardHeader className="bg-primary/5 pb-4">
                     <CardTitle className="font-serif">Daily PIE Log</CardTitle>
                     <CardDescription>Track your Productive, Indirectly Productive, and Everything Else time</CardDescription>
                   </CardHeader>
                   <CardContent className="p-0">
                     <div className="grid grid-cols-3 divide-x border-b">
                        <div className="p-4 bg-green-50/50 text-center">
                          <p className="font-bold text-green-700">P (Productive)</p>
                          <p className="text-xs text-green-600">Prospecting, Presenting, Negotiating</p>
                        </div>
                        <div className="p-4 bg-amber-50/50 text-center">
                          <p className="font-bold text-amber-700">I (Indirect)</p>
                          <p className="text-xs text-amber-600">Admin, Training, Marketing</p>
                        </div>
                        <div className="p-4 bg-blue-50/50 text-center">
                          <p className="font-bold text-blue-700">E (Everything Else)</p>
                          <p className="text-xs text-blue-600">Personal, Breaks, Non-work</p>
                        </div>
                     </div>
                     <div className="max-h-[400px] overflow-y-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-background z-10">
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead className="text-center">P Hrs</TableHead>
                              <TableHead className="text-center">I Hrs</TableHead>
                              <TableHead className="text-center">E Hrs</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                PIE tracking coming soon. Log your daily time allocation here.
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                     </div>
                   </CardContent>
                 </Card>

                 <div className="space-y-6">
                    <Card className="border-none shadow-md bg-card/80">
                       <CardHeader>
                         <CardTitle className="font-serif">YTD Overview</CardTitle>
                       </CardHeader>
                       <CardContent className="space-y-6">
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">Productive (P)</span>
                              <span className="text-sm font-bold text-green-700">--</span>
                            </div>
                            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                              <div className="bg-green-600 h-full w-0"></div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">Indirect (I)</span>
                              <span className="text-sm font-bold text-amber-700">--</span>
                            </div>
                            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                              <div className="bg-amber-500 h-full w-0"></div>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">Everything Else (E)</span>
                              <span className="text-sm font-bold text-blue-700">--</span>
                            </div>
                            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                              <div className="bg-blue-500 h-full w-0"></div>
                            </div>
                          </div>

                          <Separator />
                          
                          <div className="pt-2">
                             <p className="text-sm font-medium text-center mb-2">P Time Hourly Value</p>
                             <div className="bg-green-50 p-3 rounded-lg text-center">
                                <span className="text-2xl font-bold text-green-700">
                                  {closedGCI > 0 ? `$${Math.round(closedGCI / 100)}/hr` : "--"}
                                </span>
                             </div>
                             <p className="text-xs text-center text-muted-foreground mt-2">Based on logged P hours and closed GCI</p>
                          </div>
                       </CardContent>
                    </Card>
                 </div>
              </div>
            </TabsContent>
          </Tabs>

        </div>
      </div>
    </Layout>
  );
}
