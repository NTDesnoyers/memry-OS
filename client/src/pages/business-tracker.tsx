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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { DollarSign, Save, Plus, FileText, BarChart3, Clock, Phone, Calculator, Play, Pause, RotateCcw, ChevronLeft, ChevronRight, CalendarIcon, History, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "wouter";
import { type Deal, type Person, type BusinessSettings, type PieEntry } from "@shared/schema";
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

  // PIE Time Tracker State
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  const [timerType, setTimerType] = useState<"P" | "I" | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Historical Deal Form State
  const [showHistoricalDealDialog, setShowHistoricalDealDialog] = useState(false);
  const [historicalDeal, setHistoricalDeal] = useState({
    title: "",
    address: "",
    side: "buyer" as "buyer" | "seller",
    value: "",
    commissionPercent: "3",
    actualGCI: "",
    actualCloseDate: new Date(),
    isReferral: false,
    personId: "",
  });

  const { data: pieEntries = [] } = useQuery<PieEntry[]>({
    queryKey: ["/api/pie-entries"],
  });

  const createPieEntryMutation = useMutation({
    mutationFn: async (data: { date: Date; pTime?: number; iTime?: number; eTime?: number }) => {
      const res = await fetch("/api/pie-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create PIE entry");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pie-entries"] });
    },
  });

  const updatePieEntryMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; pTime?: number; iTime?: number; eTime?: number }) => {
      const res = await fetch(`/api/pie-entries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update PIE entry");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pie-entries"] });
    },
  });

  const createHistoricalDealMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      address: string;
      side: string;
      value: number;
      commissionPercent: number;
      actualGCI: number;
      actualCloseDate: Date;
      isReferral: boolean;
      personId?: string;
    }) => {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          type: "sale",
          stage: "closed",
        }),
      });
      if (!res.ok) throw new Error("Failed to create deal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      setShowHistoricalDealDialog(false);
      setHistoricalDeal({
        title: "",
        address: "",
        side: "buyer",
        value: "",
        commissionPercent: "3",
        actualGCI: "",
        actualCloseDate: new Date(),
        isReferral: false,
        personId: "",
      });
      toast.success("Historical deal added");
    },
    onError: () => {
      toast.error("Failed to add deal");
    },
  });

  const handleAddHistoricalDeal = () => {
    const value = parseInt(historicalDeal.value) || 0;
    const gci = parseInt(historicalDeal.actualGCI) || Math.round(value * (parseFloat(historicalDeal.commissionPercent) / 100));
    
    createHistoricalDealMutation.mutate({
      title: historicalDeal.title || historicalDeal.address || "Historical Sale",
      address: historicalDeal.address,
      side: historicalDeal.side,
      value: value,
      commissionPercent: parseFloat(historicalDeal.commissionPercent),
      actualGCI: gci,
      actualCloseDate: historicalDeal.actualCloseDate,
      isReferral: historicalDeal.isReferral,
      personId: historicalDeal.personId || undefined,
    });
  };

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(selectedWeekStart);
      day.setDate(selectedWeekStart.getDate() + i);
      days.push(day);
    }
    return days;
  }, [selectedWeekStart]);

  const getEntryForDate = (date: Date): PieEntry | undefined => {
    return pieEntries.find(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.toDateString() === date.toDateString();
    });
  };

  const handlePieTimeChange = (date: Date, field: "pTime" | "iTime", value: number) => {
    const entry = getEntryForDate(date);
    const minutes = Math.max(0, value);
    
    if (entry) {
      updatePieEntryMutation.mutate({ id: entry.id, [field]: minutes });
    } else {
      createPieEntryMutation.mutate({ date, [field]: minutes });
    }
  };

  const navigateWeek = (direction: "prev" | "next") => {
    setSelectedWeekStart(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + (direction === "next" ? 7 : -7));
      return newDate;
    });
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    setSelectedWeekStart(monday);
  };

  // Timer functions
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const startTimer = (type: "P" | "I") => {
    setTimerType(type);
    setTimerSeconds(0);
    setIsTimerRunning(true);
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
    if (timerType && timerSeconds >= 60) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const minutes = Math.round(timerSeconds / 60);
      const entry = getEntryForDate(today);
      const field = timerType === "P" ? "pTime" : "iTime";
      const currentValue = entry?.[field] || 0;
      
      if (entry) {
        updatePieEntryMutation.mutate({ id: entry.id, [field]: currentValue + minutes });
      } else {
        createPieEntryMutation.mutate({ date: today, [field]: minutes });
      }
      toast.success(`Added ${minutes} minutes of ${timerType === "P" ? "Productive" : "Indirectly Productive"} time`);
    }
    setTimerType(null);
    setTimerSeconds(0);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(0);
    setTimerType(null);
  };

  const formatTimerDisplay = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const weeklyTotals = useMemo(() => {
    let pTotal = 0, iTotal = 0;
    weekDays.forEach(day => {
      const entry = getEntryForDate(day);
      if (entry) {
        pTotal += entry.pTime || 0;
        iTotal += entry.iTime || 0;
      }
    });
    return { pTotal, iTotal };
  }, [weekDays, pieEntries]);

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
              <div className="flex items-center justify-between mb-4">
                <div className="text-center flex-1">
                  <p className="text-sm text-muted-foreground">A transaction has closed! Enter closing details in tan cells.</p>
                </div>
                <Button 
                  onClick={() => setShowHistoricalDealDialog(true)} 
                  className="gap-1"
                  data-testid="button-add-historical-deal"
                >
                  <History className="h-4 w-4" />
                  Add Historical Deal
                </Button>
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
            <TabsContent value="pie" className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-serif font-bold">PIE Time Tracker</h2>
                <p className="text-sm text-muted-foreground">Track your Prospecting and In-Person time. Focus on income-producing activities.</p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                {/* Timer Card */}
                <Card className="border-2 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Quick Timer
                    </CardTitle>
                    <CardDescription>Start a timer and it auto-logs when you stop</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className={`text-4xl font-mono font-bold ${isTimerRunning ? "text-green-600" : ""}`}>
                        {formatTimerDisplay(timerSeconds)}
                      </div>
                      {timerType && (
                        <Badge variant="secondary" className="mt-2">
                          {timerType === "P" ? "Productive Time" : "Indirectly Productive"}
                        </Badge>
                      )}
                    </div>
                    
                    {!isTimerRunning && !timerType ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Button onClick={() => startTimer("P")} className="bg-blue-600 hover:bg-blue-700" data-testid="button-start-productive">
                          <Play className="h-4 w-4 mr-1" />
                          Productive
                        </Button>
                        <Button onClick={() => startTimer("I")} className="bg-green-600 hover:bg-green-700" data-testid="button-start-indirect">
                          <Play className="h-4 w-4 mr-1" />
                          Indirect
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => isTimerRunning ? setIsTimerRunning(false) : setIsTimerRunning(true)}
                          variant="outline"
                          className="flex-1"
                        >
                          {isTimerRunning ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                          {isTimerRunning ? "Pause" : "Resume"}
                        </Button>
                        <Button onClick={stopTimer} variant="default" className="flex-1" data-testid="button-stop-timer">
                          Save
                        </Button>
                        <Button onClick={resetTimer} variant="ghost" size="icon">
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Weekly View */}
                <Card className="md:col-span-2">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Weekly Time Log</CardTitle>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => navigateWeek("prev")} data-testid="button-prev-week">
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1" data-testid="button-jump-to-week">
                              <CalendarIcon className="h-3 w-3" />
                              Jump to Date
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="center">
                            <Calendar
                              mode="single"
                              selected={selectedWeekStart}
                              onSelect={(date) => {
                                if (date) {
                                  const dayOfWeek = date.getDay();
                                  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                                  const monday = new Date(date);
                                  monday.setDate(date.getDate() + mondayOffset);
                                  monday.setHours(0, 0, 0, 0);
                                  setSelectedWeekStart(monday);
                                }
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
                          This Week
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => navigateWeek("next")} data-testid="button-next-week">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>
                      {selectedWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(selectedWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24">Day</TableHead>
                          <TableHead className="text-center w-20">
                            <div className="flex flex-col items-center">
                              <span className="text-blue-600 font-bold">P</span>
                              <span className="text-xs text-muted-foreground">Productive</span>
                            </div>
                          </TableHead>
                          <TableHead className="text-center w-20">
                            <div className="flex flex-col items-center">
                              <span className="text-green-600 font-bold">I</span>
                              <span className="text-xs text-muted-foreground">Indirect</span>
                            </div>
                          </TableHead>
                          <TableHead className="text-center w-20">
                            <div className="flex flex-col items-center">
                              <span className="text-slate-600 font-bold">E</span>
                              <span className="text-xs text-muted-foreground">Other</span>
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {weekDays.map((day) => {
                          const entry = getEntryForDate(day);
                          const isToday = day.toDateString() === new Date().toDateString();
                          const pTime = entry?.pTime || 0;
                          const iTime = entry?.iTime || 0;
                          const eTime = entry?.eTime || 0;
                          
                          return (
                            <TableRow key={day.toISOString()} className={isToday ? "bg-primary/5" : ""}>
                              <TableCell className="font-medium">
                                <div className={isToday ? "text-primary font-bold" : ""}>
                                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {day.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Input
                                  type="number"
                                  min="0"
                                  value={pTime || ""}
                                  onChange={(e) => handlePieTimeChange(day, "pTime", parseInt(e.target.value) || 0)}
                                  className="w-16 mx-auto text-center h-8 text-blue-600 font-medium"
                                  placeholder="0"
                                  data-testid={`input-ptime-${day.toISOString().split('T')[0]}`}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Input
                                  type="number"
                                  min="0"
                                  value={iTime || ""}
                                  onChange={(e) => handlePieTimeChange(day, "iTime", parseInt(e.target.value) || 0)}
                                  className="w-16 mx-auto text-center h-8 text-green-600 font-medium"
                                  placeholder="0"
                                  data-testid={`input-itime-${day.toISOString().split('T')[0]}`}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="w-16 mx-auto h-8 flex items-center justify-center bg-slate-100 rounded text-slate-600 font-medium">
                                  {eTime || "--"}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow className="bg-slate-50 font-bold">
                          <TableCell>Weekly Total</TableCell>
                          <TableCell className="text-center text-blue-600">{weeklyTotals.pTotal} min</TableCell>
                          <TableCell className="text-center text-green-600">{weeklyTotals.iTotal} min</TableCell>
                          <TableCell className="text-center text-slate-600">--</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              {/* Summary Cards */}
              <div className="grid md:grid-cols-4 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4 text-center">
                    <p className="text-xs text-blue-600 uppercase font-medium">Productive This Week</p>
                    <p className="text-2xl font-bold text-blue-700">{Math.round(weeklyTotals.pTotal / 60 * 10) / 10} hrs</p>
                    <p className="text-xs text-muted-foreground">{weeklyTotals.pTotal} minutes</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-4 text-center">
                    <p className="text-xs text-green-600 uppercase font-medium">Indirect This Week</p>
                    <p className="text-2xl font-bold text-green-700">{Math.round(weeklyTotals.iTotal / 60 * 10) / 10} hrs</p>
                    <p className="text-xs text-muted-foreground">{weeklyTotals.iTotal} minutes</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-50 border-slate-200">
                  <CardContent className="pt-4 text-center">
                    <p className="text-xs text-slate-600 uppercase font-medium">Income-Producing %</p>
                    <p className="text-2xl font-bold text-slate-700">
                      {weeklyTotals.pTotal + weeklyTotals.iTotal > 0 
                        ? Math.round((weeklyTotals.pTotal + weeklyTotals.iTotal) / (weeklyTotals.pTotal + weeklyTotals.iTotal) * 100)
                        : "--"}%
                    </p>
                    <p className="text-xs text-muted-foreground">P + I time</p>
                  </CardContent>
                </Card>
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="pt-4 text-center">
                    <p className="text-xs text-amber-600 uppercase font-medium">Under Contract GCI</p>
                    <p className="text-2xl font-bold text-amber-700">{formatCurrency(underContractGCI)}</p>
                    <p className="text-xs text-muted-foreground">
                      {weeklyTotals.pTotal > 0 
                        ? `${formatCurrency(underContractGCI / (weeklyTotals.pTotal / 60))}/hr P time`
                        : "Track time to see $/hr"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-slate-100 rounded-lg p-4">
                <h3 className="font-medium mb-2">What is PIE?</h3>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-bold text-blue-600">P = Productive Time</span>
                    <p className="text-muted-foreground">Face-to-face with client in a selling situation. Time leading to a contract: buyer consultations, showings, listing presentations, writing offers.</p>
                  </div>
                  <div>
                    <span className="font-bold text-green-600">I = Indirectly Productive</span>
                    <p className="text-muted-foreground">Supports P time: prospecting calls, handwritten notes, real estate reviews, CMAs, touring homes, open houses, Hour of Power.</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-600">E = Everything Else</span>
                    <p className="text-muted-foreground">Non-productive time: training, office meetings, MLS tours, driving, admin after mutual acceptance.</p>
                  </div>
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

      {/* Historical Deal Dialog */}
      <Dialog open={showHistoricalDealDialog} onOpenChange={setShowHistoricalDealDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Add Historical Deal
            </DialogTitle>
            <DialogDescription>
              Enter a past closed transaction to track your historical performance and trends.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="close-date">Close Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      data-testid="button-historical-close-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(historicalDeal.actualCloseDate, "MMM d, yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={historicalDeal.actualCloseDate}
                      onSelect={(date) => date && setHistoricalDeal(prev => ({ ...prev, actualCloseDate: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="side">Side</Label>
                <Select
                  value={historicalDeal.side}
                  onValueChange={(value: "buyer" | "seller") => setHistoricalDeal(prev => ({ ...prev, side: value }))}
                >
                  <SelectTrigger data-testid="select-historical-side">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buyer">Buyer</SelectItem>
                    <SelectItem value="seller">Seller</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Property Address</Label>
              <Input
                id="address"
                placeholder="123 Main St, City, State"
                value={historicalDeal.address}
                onChange={(e) => setHistoricalDeal(prev => ({ ...prev, address: e.target.value }))}
                data-testid="input-historical-address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value">Sale Price</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="value"
                    placeholder="500,000"
                    className="pl-7"
                    value={historicalDeal.value}
                    onChange={(e) => setHistoricalDeal(prev => ({ ...prev, value: e.target.value.replace(/[^0-9]/g, '') }))}
                    data-testid="input-historical-value"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="commission">Commission %</Label>
                <Input
                  id="commission"
                  placeholder="3"
                  value={historicalDeal.commissionPercent}
                  onChange={(e) => setHistoricalDeal(prev => ({ ...prev, commissionPercent: e.target.value }))}
                  data-testid="input-historical-commission"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gci">Actual GCI (optional)</Label>
              <div className="relative">
                <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="gci"
                  placeholder="Auto-calculated from sale price × commission"
                  className="pl-7"
                  value={historicalDeal.actualGCI}
                  onChange={(e) => setHistoricalDeal(prev => ({ ...prev, actualGCI: e.target.value.replace(/[^0-9]/g, '') }))}
                  data-testid="input-historical-gci"
                />
              </div>
              {historicalDeal.value && !historicalDeal.actualGCI && (
                <p className="text-xs text-muted-foreground">
                  Will be calculated as ${(parseInt(historicalDeal.value) * (parseFloat(historicalDeal.commissionPercent) / 100)).toLocaleString()}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="client">Client (optional)</Label>
              <Select
                value={historicalDeal.personId}
                onValueChange={(value) => setHistoricalDeal(prev => ({ ...prev, personId: value }))}
              >
                <SelectTrigger data-testid="select-historical-client">
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  {people.map(person => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="referral" className="text-sm">Was this a referral?</Label>
              <Switch
                id="referral"
                checked={historicalDeal.isReferral}
                onCheckedChange={(checked) => setHistoricalDeal(prev => ({ ...prev, isReferral: checked }))}
                data-testid="switch-historical-referral"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoricalDealDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddHistoricalDeal}
              disabled={createHistoricalDealMutation.isPending}
              data-testid="button-save-historical-deal"
            >
              {createHistoricalDealMutation.isPending ? "Saving..." : "Add Deal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
