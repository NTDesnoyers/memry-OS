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
import { DollarSign, Save, Plus, FileText, BarChart3, Clock, Phone, Calculator } from "lucide-react";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { type Deal, type Person, type BusinessSettings } from "@shared/schema";
import { toast } from "sonner";

type DealWithPerson = Deal & { person?: Person };

export default function BusinessTracker() {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  const { data: businessSettings } = useQuery<BusinessSettings>({
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
      toast.success("Settings saved");
    },
    onError: () => {
      toast.error("Failed to save settings");
    },
  });

  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const updateDealStageMutation = useMutation({
    mutationFn: async ({ dealId, stage }: { dealId: string; stage: string }) => {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      if (!res.ok) throw new Error("Failed to update deal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      toast.success("Deal moved");
    },
    onError: () => {
      toast.error("Failed to move deal");
    },
  });

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    setDraggedDealId(dealId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stage);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    setDragOverStage(null);
    if (draggedDealId) {
      updateDealStageMutation.mutate({ dealId: draggedDealId, stage });
      setDraggedDealId(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedDealId(null);
    setDragOverStage(null);
  };

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

  const warmDeals = dealsWithPeople.filter(d => d.prospectCategory === "warm" || (d.stage === "warm" && !d.prospectCategory));
  const hotActiveDeals = dealsWithPeople.filter(d => d.prospectCategory === "hot_active" || (d.stage === "hot" && d.prospectCategory !== "hot_confused"));
  const hotConfusedDeals = dealsWithPeople.filter(d => d.prospectCategory === "hot_confused");
  const underContractDeals = dealsWithPeople.filter(d => d.prospectCategory === "under_contract" || d.stage === "under_contract" || d.stage === "active");
  const closedDeals = dealsWithPeople.filter(d => d.stage === "closed");

  const formatPrice = (value: number | null | undefined) => {
    if (!value) return "";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const formatCompact = (value: number | null | undefined) => {
    if (!value) return "";
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${Math.round(value / 1000)}k`;
    return `$${value}`;
  };

  const calculateGCI = (value: number | null | undefined, commissionPercent: number | null | undefined) => {
    if (!value) return 0;
    const pct = (commissionPercent || 3) / 100;
    return value * pct;
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

  const ClickableName = ({ personId, name, dealId }: { personId?: string | null; name: string; dealId?: string }) => {
    if (personId) {
      return (
        <Link
          href={`/people/${personId}`}
          className="text-primary hover:underline cursor-pointer text-left font-medium"
          data-testid={`link-person-${personId}`}
        >
          {name}
        </Link>
      );
    }
    return (
      <Link
        href={`/people/new?name=${encodeURIComponent(name)}${dealId ? `&dealId=${dealId}` : ''}`}
        className="text-primary hover:underline cursor-pointer text-left font-medium"
        data-testid={`link-create-person-${dealId || name}`}
      >
        {name}
      </Link>
    );
  };

  const warmGCI = warmDeals.reduce((sum, d) => sum + calculateGCI(d.value, d.commissionPercent), 0);
  const hotGCI = hotActiveDeals.reduce((sum, d) => sum + calculateGCI(d.value, d.commissionPercent), 0);
  const confusedGCI = hotConfusedDeals.reduce((sum, d) => sum + calculateGCI(d.value, d.commissionPercent), 0);
  const underContractGCI = underContractDeals.reduce((sum, d) => sum + calculateGCI(d.value, d.commissionPercent), 0);
  const closedGCI = closedDeals.reduce((sum, d) => sum + (d.actualGCI || calculateGCI(d.value, d.commissionPercent)), 0);
  const closedVolume = closedDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  const goalGCI = settings.annualGciGoal || 200000;

  return (
    <Layout>
      <div className="min-h-screen bg-secondary/30 relative">
        <div 
          className="fixed inset-0 opacity-40 mix-blend-multiply pointer-events-none -z-10"
          style={{ backgroundImage: `url(${paperBg})`, backgroundSize: 'cover' }}
        />
        
        <div className="container mx-auto px-4 py-6 max-w-[1600px]">
          <header className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-serif font-bold text-primary">Business Tracker</h1>
              <p className="text-muted-foreground text-sm">Ninja Selling Pipeline & Transactions</p>
            </div>
          </header>

          <Tabs defaultValue="tracker" className="w-full">
            <TabsList className="bg-card/50 backdrop-blur-sm w-full justify-start overflow-x-auto mb-4">
              <TabsTrigger value="goals" className="gap-1"><DollarSign className="h-3 w-3" /> Goals & Fees</TabsTrigger>
              <TabsTrigger value="tracker" className="gap-1"><FileText className="h-3 w-3" /> Business Tracker</TabsTrigger>
              <TabsTrigger value="closed" className="gap-1"><BarChart3 className="h-3 w-3" /> Closed Transactions</TabsTrigger>
              <TabsTrigger value="ytd" className="gap-1"><BarChart3 className="h-3 w-3" /> YTD Summary</TabsTrigger>
              <TabsTrigger value="pie" className="gap-1"><Clock className="h-3 w-3" /> PIE Tracker</TabsTrigger>
              <TabsTrigger value="postclosing" className="gap-1"><Phone className="h-3 w-3" /> Post Closing Calls</TabsTrigger>
            </TabsList>

            {/* === GOALS & FEES TAB === */}
            <TabsContent value="goals" className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-serif">Yearly Goals and Fees</h2>
                <p className="text-sm text-muted-foreground">This sheet is protected, input details in the blue outlined cells.</p>
              </div>
              
              <div className="max-w-4xl mx-auto space-y-8">
                {/* Annual GCI Goal */}
                <Card className="border-2 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-lg">1. Enter Your Gross Commissions Income Goal</Label>
                        <p className="text-sm text-muted-foreground">Do not leave blank. Calculations depend on this number.</p>
                      </div>
                      <div className="bg-slate-700 text-white px-6 py-3 rounded">
                        <p className="text-xs text-slate-300 text-center">Annual Gross Commission GOAL</p>
                        <div className="relative">
                          <DollarSign className="absolute left-2 top-2 h-4 w-4" />
                          <Input 
                            className="pl-7 text-lg font-bold bg-transparent border-slate-500 text-white w-40 text-center" 
                            value={settings.annualGciGoal ? settings.annualGciGoal.toLocaleString() : ""}
                            onChange={(e) => updateField("annualGciGoal", parseCurrencyInput(e.target.value))}
                            placeholder="200,000"
                            data-testid="input-annual-gci-goal"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Franchise Fee */}
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <Label className="text-lg">2. Do you pay a franchise fee on each transaction?</Label>
                    <p className="text-sm text-muted-foreground">If yes, fill in the flat fee to be deducted from each transaction or % deducted from each transaction. Leave blank if no franchise fee.</p>
                    
                    <div className="flex gap-8 items-start">
                      <div className="flex-1 space-y-4">
                        <p className="text-sm text-muted-foreground italic">Is there a franchise fees cap? If you contribute franchise fees from each transaction until you have reached a specific threshold, the answer is yes. Enter your "franchise fee cap" here. Leave blank if no franchise fee and/or no franchise fee cap.</p>
                      </div>
                      <div className="space-y-3">
                        <div className="bg-slate-600 text-white px-4 py-2 rounded text-center">
                          <p className="text-xs text-slate-300">Franchise Fee</p>
                          <div className="flex gap-2">
                            <Input 
                              className="w-20 bg-transparent border-slate-500 text-white text-center text-sm"
                              value={settings.franchiseFeeFlat || ""} 
                              onChange={(e) => updateField("franchiseFeeFlat", parseCurrencyInput(e.target.value))}
                              placeholder="Flat Fee"
                            />
                            <Input 
                              className="w-20 bg-transparent border-slate-500 text-white text-center text-sm"
                              value={settings.franchiseFeePercent || ""} 
                              onChange={(e) => updateField("franchiseFeePercent", parseFloat(e.target.value) || null)}
                              placeholder="as a %"
                            />
                          </div>
                        </div>
                        <div className="bg-slate-600 text-white px-4 py-2 rounded text-center">
                          <p className="text-xs text-slate-300">Franchise Fee Cap</p>
                          <Input 
                            className="w-full bg-transparent border-slate-500 text-white text-center text-sm"
                            value={settings.franchiseFeeCap || ""} 
                            onChange={(e) => updateField("franchiseFeeCap", parseCurrencyInput(e.target.value))}
                            placeholder="$0"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Marketing Fee */}
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <Label className="text-lg">3. Do you pay a marketing fee on each transaction?</Label>
                    <p className="text-sm text-muted-foreground">If yes, fill in the flat fee to be deducted from each transaction or % deducted from each transaction. Leave blank if no per transaction marketing fee.</p>
                    
                    <div className="flex gap-8 items-start">
                      <div className="flex-1 space-y-4">
                        <p className="text-sm text-muted-foreground italic">Is there a "marketing fee cap"? If you contribute marketing fees from each transaction until you have reached a specific threshold, the answer is yes. Enter your "marketing fee cap" here. Leave blank if no marketing fee and/or no marketing fee cap.</p>
                      </div>
                      <div className="space-y-3">
                        <div className="bg-slate-600 text-white px-4 py-2 rounded text-center">
                          <p className="text-xs text-slate-300">Marketing Fee</p>
                          <div className="flex gap-2">
                            <Input 
                              className="w-20 bg-transparent border-slate-500 text-white text-center text-sm"
                              value={settings.marketingFeeFlat || ""} 
                              onChange={(e) => updateField("marketingFeeFlat", parseCurrencyInput(e.target.value))}
                              placeholder="Flat Fee"
                            />
                            <Input 
                              className="w-20 bg-transparent border-slate-500 text-white text-center text-sm"
                              value={settings.marketingFeePercent || ""} 
                              onChange={(e) => updateField("marketingFeePercent", parseFloat(e.target.value) || null)}
                              placeholder="as a %"
                            />
                          </div>
                        </div>
                        <div className="bg-slate-600 text-white px-4 py-2 rounded text-center">
                          <p className="text-xs text-slate-300">Marketing Fee Cap</p>
                          <Input 
                            className="w-full bg-transparent border-slate-500 text-white text-center text-sm"
                            value={settings.marketingFeeCap || ""} 
                            onChange={(e) => updateField("marketingFeeCap", parseCurrencyInput(e.target.value))}
                            placeholder="$0"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Commission Structure */}
                <Card>
                  <CardContent className="pt-6 space-y-6">
                    <Label className="text-lg">4. Commission Structure</Label>
                    
                    <div className="grid md:grid-cols-2 gap-8">
                      {/* Option 1 */}
                      <div className="space-y-4 p-4 border rounded-lg bg-secondary/30">
                        <h3 className="font-serif text-lg italic text-primary">Option 1</h3>
                        <p className="text-sm text-muted-foreground">Is your split dependent on an Office Cap or Fair Share?</p>
                        
                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">Enter office cap or fair share here.</Label>
                            <p className="text-xs text-muted-foreground mb-1">For example, if you have a fair share or office cap of $40,000. You may start the year with a 50/50 split until you have paid the office $40,000. Once you have met your fair share/office cap, your split would change.</p>
                            <div className="bg-slate-600 text-white px-3 py-2 rounded text-center">
                              <p className="text-xs text-slate-300">Office Cap / Fair Share</p>
                              <Input 
                                className="bg-transparent border-slate-500 text-white text-center"
                                value={settings.officeCap || ""} 
                                onChange={(e) => updateField("officeCap", parseCurrencyInput(e.target.value))}
                                placeholder="$8,000"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <Label className="text-xs text-muted-foreground">What is your starting split at the beginning of each year? Enter this as your percentage.</Label>
                            <div className="bg-slate-600 text-white px-3 py-2 rounded text-center">
                              <p className="text-xs text-slate-300">Starting Split as a %</p>
                              <Input 
                                className="bg-transparent border-slate-500 text-white text-center"
                                value={settings.startingSplit || ""} 
                                onChange={(e) => updateField("startingSplit", parseFloat(e.target.value) || null)}
                                placeholder="68.00%"
                              />
                              <p className="text-xs text-red-300 mt-1">Must enter a value.</p>
                            </div>
                          </div>
                          
                          <div>
                            <Label className="text-xs text-muted-foreground">What is your split after office cap/fair share has been met? Enter this as your percentage.</Label>
                            <div className="bg-slate-600 text-white px-3 py-2 rounded text-center">
                              <p className="text-xs text-slate-300">Secondary Split as a %</p>
                              <Input 
                                className="bg-transparent border-slate-500 text-white text-center"
                                value={settings.afterCapSplit || ""} 
                                onChange={(e) => updateField("afterCapSplit", parseFloat(e.target.value) || null)}
                                placeholder="85.00%"
                              />
                              <p className="text-xs text-slate-400 mt-1">Note: If you go to 100% commission once you meet your cap/fair share, enter 100%.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Option 2 */}
                      <div className="space-y-4 p-4 border rounded-lg bg-secondary/30">
                        <h3 className="font-serif text-lg italic text-primary">Option 2</h3>
                        <p className="text-sm text-muted-foreground">Do you have a progressive split structure? If your split is on a sliding scale, sometimes referred to as a progressive split, based on total earned income year to date, enter the upper end of each of the tiers below along with the corresponding split as a %.</p>
                        
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-20">% of gross</TableHead>
                              <TableHead>Fill-In Earned Income Tiers</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {[1, 2, 3, 4, 5].map((i) => (
                              <TableRow key={i}>
                                <TableCell>
                                  <Input className="h-8 w-16 text-center" placeholder="%" />
                                </TableCell>
                                <TableCell className="flex gap-2 items-center">
                                  <span className="text-xs text-muted-foreground">$0</span>
                                  <span>to</span>
                                  <Input className="h-8 flex-1" placeholder={i === 5 ? "Leave blank if last tier" : ""} />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <p className="text-xs text-primary">*Blue outlined boxes indicate a value is needed.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
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

            {/* === BUSINESS TRACKER TAB === */}
            <TabsContent value="tracker" className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-2xl font-serif font-bold">{currentYear} Business Tracker</h2>
              </div>
              
              {/* 4-Column Layout - Horizontal snap scroll on mobile */}
              <div className="flex md:grid md:grid-cols-4 gap-3 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible scrollbar-hide">
                {/* WARM PROSPECTS */}
                <div 
                  className={`flex-shrink-0 w-[85vw] md:w-auto snap-center bg-blue-100/80 rounded-lg overflow-hidden transition-all ${dragOverStage === "warm" ? "ring-2 ring-blue-500 ring-offset-2" : ""}`}
                  onDragOver={(e) => handleDragOver(e, "warm")}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, "warm")}
                >
                  <div className="bg-slate-600 text-white p-2 text-center font-serif">
                    "Warm" Prospects
                  </div>
                  <div className="p-2">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead className="py-1 px-1 w-8">P/P</TableHead>
                          <TableHead className="py-1 px-1">Client Name</TableHead>
                          <TableHead className="py-1 px-1 text-right w-20">Est. Price</TableHead>
                          <TableHead className="py-1 px-1 w-8">%</TableHead>
                          <TableHead className="py-1 px-1 text-right w-20">GCI</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {warmDeals.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-4 text-xs">
                              No warm prospects
                            </TableCell>
                          </TableRow>
                        ) : warmDeals.slice(0, 30).map((deal) => (
                          <TableRow 
                            key={deal.id} 
                            className={`text-xs hover:bg-blue-200/50 cursor-grab ${draggedDealId === deal.id ? "opacity-50" : ""}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, deal.id)}
                            onDragEnd={handleDragEnd}
                            data-testid={`row-warm-${deal.id}`}
                          >
                            <TableCell className="py-1 px-1 font-bold text-primary">{deal.painPleasureRating || ""}</TableCell>
                            <TableCell className="py-1 px-1">
                              <ClickableName personId={deal.personId} name={deal.person?.name || deal.title} dealId={deal.id} />
                            </TableCell>
                            <TableCell className="py-1 px-1 text-right">{formatCompact(deal.value)}</TableCell>
                            <TableCell className="py-1 px-1">{deal.commissionPercent || 3}%</TableCell>
                            <TableCell className="py-1 px-1 text-right text-green-700 font-medium">{formatCompact(calculateGCI(deal.value, deal.commissionPercent))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="bg-slate-200 p-2 text-xs">
                    <div className="flex justify-between">
                      <span>Total Potential Sides in Warm List: <strong>{warmDeals.length}</strong></span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span>Total Potential GCI in Warm List:</span>
                      <strong className="text-green-700">{formatCurrency(warmGCI)}</strong>
                    </div>
                  </div>
                </div>

                {/* HOT AND ACTIVE + HOT AND CONFUSED */}
                <div className="flex-shrink-0 w-[85vw] md:w-auto snap-center space-y-3">
                  {/* Hot and Active */}
                  <div 
                    className={`bg-blue-100/80 rounded-lg overflow-hidden transition-all ${dragOverStage === "hot" ? "ring-2 ring-red-500 ring-offset-2" : ""}`}
                    onDragOver={(e) => handleDragOver(e, "hot")}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, "hot")}
                  >
                    <div className="bg-slate-600 text-white p-2 text-center font-serif">
                      "Hot" and Active Prospects
                    </div>
                    <div className="p-2">
                      <Table>
                        <TableHeader>
                          <TableRow className="text-xs">
                            <TableHead className="py-1 px-1 w-8">P/P</TableHead>
                            <TableHead className="py-1 px-1">Client Name</TableHead>
                            <TableHead className="py-1 px-1 text-right w-20">Est. Price</TableHead>
                            <TableHead className="py-1 px-1 w-8">%</TableHead>
                            <TableHead className="py-1 px-1 text-right w-20">GCI</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {hotActiveDeals.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-4 text-xs">
                                No hot prospects
                              </TableCell>
                            </TableRow>
                          ) : hotActiveDeals.slice(0, 15).map((deal) => (
                            <TableRow 
                              key={deal.id} 
                              className={`text-xs hover:bg-blue-200/50 cursor-grab ${draggedDealId === deal.id ? "opacity-50" : ""}`}
                              draggable
                              onDragStart={(e) => handleDragStart(e, deal.id)}
                              onDragEnd={handleDragEnd}
                              data-testid={`row-hot-${deal.id}`}
                            >
                              <TableCell className="py-1 px-1 font-bold text-primary">{deal.painPleasureRating || ""}</TableCell>
                              <TableCell className="py-1 px-1">
                                <ClickableName personId={deal.personId} name={deal.person?.name || deal.title} dealId={deal.id} />
                              </TableCell>
                              <TableCell className="py-1 px-1 text-right">{formatCompact(deal.value)}</TableCell>
                              <TableCell className="py-1 px-1">{deal.commissionPercent || 3}%</TableCell>
                              <TableCell className="py-1 px-1 text-right text-green-700 font-medium">{formatCompact(calculateGCI(deal.value, deal.commissionPercent))}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="bg-slate-200 p-2 text-xs">
                      <div className="flex justify-between">
                        <span>Potential Sides: <strong>{hotActiveDeals.length}</strong></span>
                        <span className="text-green-700 font-bold">{formatCurrency(hotGCI)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Potential GCI in Hot List:</span>
                        <strong className="text-green-700">{formatCurrency(hotGCI)}</strong>
                      </div>
                    </div>
                  </div>
                  
                  {/* Hot and Confused */}
                  <div 
                    className={`bg-amber-100/80 rounded-lg overflow-hidden transition-all ${dragOverStage === "hot_confused" ? "ring-2 ring-amber-500 ring-offset-2" : ""}`}
                    onDragOver={(e) => handleDragOver(e, "hot_confused")}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, "hot_confused")}
                  >
                    <div className="bg-amber-700 text-white p-2 text-center font-serif text-sm">
                      "Hot" and Confused Prospects
                    </div>
                    <div className="p-2">
                      <Table>
                        <TableHeader>
                          <TableRow className="text-xs">
                            <TableHead className="py-1 px-1">Date</TableHead>
                            <TableHead className="py-1 px-1">Client Name</TableHead>
                            <TableHead className="py-1 px-1 w-8">P/P</TableHead>
                            <TableHead className="py-1 px-1 text-right">GCI</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {hotConfusedDeals.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground py-3 text-xs">
                                None
                              </TableCell>
                            </TableRow>
                          ) : hotConfusedDeals.slice(0, 5).map((deal) => (
                            <TableRow 
                              key={deal.id} 
                              className={`text-xs hover:bg-amber-200/50 cursor-grab ${draggedDealId === deal.id ? "opacity-50" : ""}`}
                              draggable
                              onDragStart={(e) => handleDragStart(e, deal.id)}
                              onDragEnd={handleDragEnd}
                            >
                              <TableCell className="py-1 px-1">{deal.createdAt ? new Date(deal.createdAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }) : ""}</TableCell>
                              <TableCell className="py-1 px-1">
                                <ClickableName personId={deal.personId} name={deal.person?.name || deal.title} dealId={deal.id} />
                              </TableCell>
                              <TableCell className="py-1 px-1 font-bold">{deal.painPleasureRating || ""}</TableCell>
                              <TableCell className="py-1 px-1 text-right text-green-700">{formatCompact(calculateGCI(deal.value, deal.commissionPercent))}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>

                {/* UNDER CONTRACT */}
                <div 
                  className={`flex-shrink-0 w-[85vw] md:w-auto snap-center bg-slate-100/80 rounded-lg overflow-hidden transition-all ${dragOverStage === "in_contract" ? "ring-2 ring-slate-500 ring-offset-2" : ""}`}
                  onDragOver={(e) => handleDragOver(e, "in_contract")}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, "in_contract")}
                >
                  <div className="bg-slate-600 text-white p-2 text-center font-serif">
                    Under Contract
                  </div>
                  <div className="p-2">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead className="py-1 px-1">Client Name</TableHead>
                          <TableHead className="py-1 px-1">Notes</TableHead>
                          <TableHead className="py-1 px-1 w-20">Close Date</TableHead>
                          <TableHead className="py-1 px-1 text-right w-20">Price</TableHead>
                          <TableHead className="py-1 px-1 text-right w-20">GCI</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {underContractDeals.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-4 text-xs">
                              None under contract
                            </TableCell>
                          </TableRow>
                        ) : underContractDeals.map((deal) => (
                          <TableRow 
                            key={deal.id} 
                            className={`text-xs hover:bg-slate-200/50 cursor-grab ${draggedDealId === deal.id ? "opacity-50" : ""}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, deal.id)}
                            onDragEnd={handleDragEnd}
                            data-testid={`row-uc-${deal.id}`}
                          >
                            <TableCell className="py-1 px-1">
                              <ClickableName personId={deal.personId} name={deal.person?.name || deal.title} dealId={deal.id} />
                            </TableCell>
                            <TableCell className="py-1 px-1 text-muted-foreground truncate max-w-[80px]">
                              {deal.side === "buyer" ? "Buy" : deal.side === "seller" ? "Sell" : ""}{deal.notes ? `, ${deal.notes}` : ""}
                            </TableCell>
                            <TableCell className="py-1 px-1">{deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' }) : ""}</TableCell>
                            <TableCell className="py-1 px-1 text-right">{formatCompact(deal.value)}</TableCell>
                            <TableCell className="py-1 px-1 text-right text-green-700 font-medium">{formatCompact(calculateGCI(deal.value, deal.commissionPercent))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="bg-slate-300 p-2 text-xs">
                    <div className="flex justify-between">
                      <span>Total Under Contract:</span>
                      <strong className="text-green-700">{formatCurrency(underContractGCI)}</strong>
                    </div>
                  </div>

                  {/* Signed Listing Agreements */}
                  <div className="mt-2 p-2 bg-slate-200/50 rounded">
                    <p className="text-xs font-medium text-center mb-2">Signed Listing Agreements</p>
                    <p className="text-xs text-muted-foreground text-center italic">Enter any full signed listing agreements here.</p>
                    <div className="mt-2 text-xs text-center">
                      <span>Total Signed Listing Agreements: </span>
                      <strong>0</strong>
                    </div>
                  </div>
                </div>

                {/* CLOSED TRANSACTIONS */}
                <div 
                  className={`flex-shrink-0 w-[85vw] md:w-auto snap-center bg-slate-100/80 rounded-lg overflow-hidden transition-all ${dragOverStage === "closed" ? "ring-2 ring-green-500 ring-offset-2" : ""}`}
                  onDragOver={(e) => handleDragOver(e, "closed")}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, "closed")}
                >
                  <div className="bg-slate-700 text-white p-2 text-center font-serif">
                    Closed Transactions
                  </div>
                  <div className="p-2">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead className="py-1 px-1 w-16">Date</TableHead>
                          <TableHead className="py-1 px-1">Client Name</TableHead>
                          <TableHead className="py-1 px-1 w-8">B/S</TableHead>
                          <TableHead className="py-1 px-1 text-right w-20">Price</TableHead>
                          <TableHead className="py-1 px-1 w-8">%</TableHead>
                          <TableHead className="py-1 px-1 text-right w-20">GCI</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {closedDeals.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-4 text-xs">
                              No closed deals
                            </TableCell>
                          </TableRow>
                        ) : closedDeals.slice(0, 20).map((deal) => (
                          <TableRow key={deal.id} className="text-xs hover:bg-slate-200/50" data-testid={`row-closed-${deal.id}`}>
                            <TableCell className="py-1 px-1">{(deal.actualCloseDate || deal.expectedCloseDate) ? new Date(deal.actualCloseDate || deal.expectedCloseDate!).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' }) : ""}</TableCell>
                            <TableCell className="py-1 px-1">
                              <ClickableName personId={deal.personId} name={deal.person?.name || deal.title} dealId={deal.id} />
                            </TableCell>
                            <TableCell className="py-1 px-1">{deal.side === "buyer" ? "Buy" : deal.side === "seller" ? "Sell" : ""}</TableCell>
                            <TableCell className="py-1 px-1 text-right">{formatCompact(deal.value)}</TableCell>
                            <TableCell className="py-1 px-1">{deal.commissionPercent || 3}%</TableCell>
                            <TableCell className="py-1 px-1 text-right text-green-700 font-bold">{formatCompact(deal.actualGCI || calculateGCI(deal.value, deal.commissionPercent))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="bg-slate-300 p-2 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span>Total Sides Closed:</span>
                      <strong>{closedDeals.length}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Total GCI:</span>
                      <strong className="text-green-700">{formatCurrency(closedGCI)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Swipe hint for mobile */}
              <div className="md:hidden flex justify-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <span className="text-xs text-muted-foreground ml-2">Swipe to see more</span>
              </div>

              {/* Summary Row */}
              <div className="bg-slate-200/80 rounded-lg p-4 mt-4">
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Warm Sides</p>
                    <p className="font-bold text-lg">{warmDeals.length}</p>
                    <p className="text-xs text-green-700">{formatCurrency(warmGCI)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Hot Sides</p>
                    <p className="font-bold text-lg">{hotActiveDeals.length}</p>
                    <p className="text-xs text-green-700">{formatCurrency(hotGCI)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Potential GCI (Hot List)</p>
                    <p className="font-bold text-lg text-green-700">{formatCurrency(hotGCI + underContractGCI)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Under Contract</p>
                    <p className="font-bold text-lg">{underContractDeals.length}</p>
                    <p className="text-xs text-green-700">{formatCurrency(underContractGCI)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Closed Sides</p>
                    <p className="font-bold text-lg">{closedDeals.length}</p>
                    <p className="text-xs text-green-700">{formatCurrency(closedGCI)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Volume</p>
                    <p className="font-bold text-lg">{formatCurrency(closedVolume)}</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* === CLOSED TRANSACTIONS TAB === */}
            <TabsContent value="closed" className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground">A transaction has closed! Enter closing details in tan cells.</p>
              </div>
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-200 text-xs">
                      <TableHead className="py-2">COE</TableHead>
                      <TableHead>Buy/Sell</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Referral Past Client</TableHead>
                      <TableHead>Client Name</TableHead>
                      <TableHead>Prop Address</TableHead>
                      <TableHead>LP</TableHead>
                      <TableHead>SP</TableHead>
                      <TableHead>Comm %</TableHead>
                      <TableHead>Gross Commission</TableHead>
                      <TableHead>Referral Fee</TableHead>
                      <TableHead>Agent Net Income</TableHead>
                      <TableHead>Brokerage Income</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {closedDeals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center text-muted-foreground py-8">
                          No closed transactions yet
                        </TableCell>
                      </TableRow>
                    ) : closedDeals.map((deal) => (
                      <TableRow key={deal.id} className="text-xs hover:bg-muted/50">
                        <TableCell>{(deal.actualCloseDate || deal.expectedCloseDate) ? new Date(deal.actualCloseDate || deal.expectedCloseDate!).toLocaleDateString() : ""}</TableCell>
                        <TableCell>{deal.side === "buyer" ? "BNI" : deal.side === "seller" ? "SEL" : ""}</TableCell>
                        <TableCell>{deal.isReferral ? "Referral" : ""}</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="font-medium">
                          <ClickableName personId={deal.personId} name={deal.person?.name || deal.title} dealId={deal.id} />
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[150px] truncate">{deal.address || ""}</TableCell>
                        <TableCell></TableCell>
                        <TableCell>{formatPrice(deal.value)}</TableCell>
                        <TableCell>{deal.commissionPercent || 3}%</TableCell>
                        <TableCell className="font-medium text-green-700">{formatPrice(calculateGCI(deal.value, deal.commissionPercent))}</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="font-bold">{formatPrice(deal.actualGCI || calculateGCI(deal.value, deal.commissionPercent))}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="bg-slate-200 p-4 rounded-lg mt-4">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-muted-foreground">B/S Ratio</p>
                    <p className="font-bold text-lg">
                      {closedDeals.filter(d => d.side === "buyer").length}:{closedDeals.filter(d => d.side === "seller").length}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Total Volume</p>
                    <p className="font-bold text-lg">{formatCurrency(closedVolume)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Total Gross Commission</p>
                    <p className="font-bold text-lg text-green-700">{formatCurrency(closedGCI)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Referral Count</p>
                    <p className="font-bold text-lg">{closedDeals.filter(d => d.isReferral).length}</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* === YTD SUMMARY TAB === */}
            <TabsContent value="ytd" className="space-y-6">
              <p className="text-sm text-muted-foreground text-center">This sheet is a visual of your year to date.</p>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="bg-slate-200 p-4 rounded-lg space-y-3">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="font-medium">Gross Commission Goal</span>
                      <span className="font-bold">{formatCurrency(goalGCI)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="font-medium">GCI YTD</span>
                      <span className="font-bold text-green-700">{formatCurrency(closedGCI)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span>Agent Net Income To Date</span>
                      <span className="font-bold">{formatCurrency(closedGCI * (settings.startingSplit || 70) / 100)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span>Total Number of Sides Year To Date</span>
                      <span className="font-bold">{closedDeals.length}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span>Total Sales Volume To Date</span>
                      <span className="font-bold">{formatCurrency(closedVolume)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b bg-primary/5">
                      <span>Estimated Potential Gross Commission Income<br /><span className="text-xs text-muted-foreground">Business Tracker: (U/C + Hot List)</span></span>
                      <span className="font-bold text-green-700">{formatCurrency(underContractGCI + hotGCI)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span>Closed Transactions from Agent Referrals</span>
                      <span className="font-bold">{closedDeals.filter(d => d.isReferral).length}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span>Number of Buying Sides to Listing Sides</span>
                      <span className="font-bold">{closedDeals.filter(d => d.side === "buyer").length}:{closedDeals.filter(d => d.side === "seller").length}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-xl font-serif mb-4">Percent of Gross Commission Achieved</h3>
                    <div className="relative w-48 h-48 mx-auto">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                        <circle 
                          cx="50" cy="50" r="40" 
                          fill="none" 
                          stroke="#4ade80" 
                          strokeWidth="12" 
                          strokeDasharray={`${Math.min(100, (closedGCI / goalGCI) * 100) * 2.51} 251`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold">{Math.round((closedGCI / goalGCI) * 100)}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">% of Marketing Fees Paid</p>
                      <div className="w-16 h-16 mx-auto relative">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                        </svg>
                      </div>
                      <p className="text-xs mt-1">Marketing paid to date: <strong>$0</strong></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">% of Franchise Fees Paid</p>
                      <div className="w-16 h-16 mx-auto relative">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                        </svg>
                      </div>
                      <p className="text-xs mt-1">Franchise fee paid to date: <strong>$0</strong></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">% of Office Fees Paid</p>
                      <div className="w-16 h-16 mx-auto relative">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                        </svg>
                      </div>
                      <p className="text-xs mt-1">Office fee paid to date: <strong>{formatCurrency(closedGCI * (100 - (settings.startingSplit || 70)) / 100)}</strong></p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* === PIE TRACKER TAB === */}
            <TabsContent value="pie" className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">Enter T, I, P time spent for each day that you work. E is auto-calculated.</p>
              
              <div className="grid md:grid-cols-4 gap-6">
                <div className="md:col-span-3 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    {["January", "February", "March"].map((month) => (
                      <Card key={month} className="border">
                        <CardHeader className="py-2 bg-slate-600 text-white">
                          <CardTitle className="text-sm font-medium text-center">{month}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          <Table>
                            <TableHeader>
                              <TableRow className="text-xs bg-blue-100">
                                <TableHead className="py-1 w-12">Date</TableHead>
                                <TableHead className="py-1 w-8">Day</TableHead>
                                <TableHead className="py-1 w-8 text-center">T</TableHead>
                                <TableHead className="py-1 w-8 text-center">I</TableHead>
                                <TableHead className="py-1 w-8 text-center">P</TableHead>
                                <TableHead className="py-1 w-8 text-center bg-slate-200">E</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-xs">
                                  PIE time logging coming soon
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <Card className="bg-slate-100">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Monthly Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="bg-blue-100 p-2 rounded">
                        <p className="text-xs text-muted-foreground">Month:</p>
                        <Select defaultValue="january">
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                              <SelectItem key={m} value={m.toLowerCase()}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-xs text-muted-foreground">"I" Hrs %</p>
                          <p className="font-bold">--</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">"P" Hrs %</p>
                          <p className="font-bold">--</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">"E" Hrs %</p>
                          <p className="font-bold">--</p>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-xs text-muted-foreground">Avg. "I" Hrs/Day</p>
                          <p className="font-bold">--</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Avg. "P" Hrs/Day</p>
                          <p className="font-bold">--</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Avg. "E" Hrs/Day</p>
                          <p className="font-bold">--</p>
                        </div>
                      </div>
                      
                      <div className="bg-slate-200 p-2 rounded text-center">
                        <p className="text-xs text-muted-foreground">Hourly Yield Ratio</p>
                        <p className="font-bold">-- to 1</p>
                      </div>
                      
                      <div className="bg-blue-50 p-2 rounded">
                        <p className="text-xs text-muted-foreground text-center">Under Contract for Next Month</p>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div className="text-center">
                            <p className="text-xs">Gross Income:</p>
                            <p className="font-bold">{formatCurrency(underContractGCI)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs">"P" time/hour:</p>
                            <p className="font-bold">--</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* === POST CLOSING CALLS TAB === */}
            <TabsContent value="postclosing" className="space-y-4">
              <div className="text-center">
                <h2 className="text-2xl font-serif font-bold">POST CLOSING CALLS</h2>
                <p className="text-sm text-muted-foreground">Current Year clients and COE will autofill from your Closed Transactions, once you overwrite a cell, manual entry is required.<br />Just insert date (tan cells) of the last contact with your client.</p>
              </div>
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-200">
                      <TableHead className="py-2">Current Year Clients</TableHead>
                      <TableHead>COE</TableHead>
                      {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(m => (
                        <TableHead key={m} className="text-center w-12">{m}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {closedDeals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={14} className="text-center text-muted-foreground py-8">
                          No closed deals to track
                        </TableCell>
                      </TableRow>
                    ) : closedDeals.map((deal) => (
                      <TableRow key={deal.id} className="text-sm">
                        <TableCell className="font-medium">
                          <ClickableName personId={deal.personId} name={deal.person?.name || deal.title} dealId={deal.id} />
                        </TableCell>
                        <TableCell>{(deal.actualCloseDate || deal.expectedCloseDate) ? new Date(deal.actualCloseDate || deal.expectedCloseDate!).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' }) : ""}</TableCell>
                        {[...Array(12)].map((_, i) => (
                          <TableCell key={i} className="p-1">
                            <Input className="h-6 w-full text-xs text-center" placeholder="" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
