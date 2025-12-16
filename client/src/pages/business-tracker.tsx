import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { DollarSign, Save, Plus, Trash2, PieChart, TrendingUp } from "lucide-react";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PersonProfileDrawer } from "@/components/person-profile-drawer";
import { type Deal, type Person } from "@shared/schema";

type DealWithPerson = Deal & { person?: Person };

export default function BusinessTracker() {
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

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

  const warmDeals = dealsWithPeople.filter(d => d.stage === "warm");
  const hotDeals = dealsWithPeople.filter(d => d.stage === "hot");
  const activeDeals = dealsWithPeople.filter(d => d.stage === "active" || d.stage === "under_contract");
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

  const calculateGCI = (value: number | null | undefined, probability: number | null | undefined) => {
    if (!value) return "$0";
    const pct = (probability || 3) / 100;
    const gci = value * pct;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(gci);
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
              <h1 className="text-3xl font-serif font-bold text-primary">2025 Business Tracker</h1>
              <p className="text-muted-foreground">Goals, Pipeline, Transactions & PIE Tracking</p>
            </div>
            <div className="flex gap-2">
               <Button variant="outline" className="gap-2">
                 <Save className="h-4 w-4" /> Save Changes
               </Button>
            </div>
          </header>

          <Tabs defaultValue="prospects" className="w-full">
            <TabsList className="bg-card/50 backdrop-blur-sm w-full justify-start overflow-x-auto">
              <TabsTrigger value="goals">Goals & Fees</TabsTrigger>
              <TabsTrigger value="prospects">Warm & Hot Prospects</TabsTrigger>
              <TabsTrigger value="active">Active & Under Contract</TabsTrigger>
              <TabsTrigger value="closed">Closed Transactions</TabsTrigger>
              <TabsTrigger value="pie">PIE Tracker</TabsTrigger>
            </TabsList>

            {/* --- GOALS & FEES TAB --- */}
            <TabsContent value="goals" className="space-y-6 mt-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Commission Goals */}
                <Card className="border-none shadow-md">
                  <CardHeader className="bg-primary/5 pb-4">
                    <CardTitle className="font-serif">Yearly Goals</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-lg font-bold text-primary">Annual Gross Commission GOAL</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-9 text-lg font-bold bg-background/50" defaultValue="200,000" />
                      </div>
                      <p className="text-xs text-muted-foreground">Do not leave blank. Calculations depend on this number.</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Fees Structure */}
                <Card className="border-none shadow-md">
                  <CardHeader className="bg-primary/5 pb-4">
                    <CardTitle className="font-serif">Fees Structure</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <Label>Franchise Fee (Flat)</Label>
                         <Input placeholder="$0" />
                       </div>
                       <div className="space-y-2">
                         <Label>Franchise Fee (%)</Label>
                         <Input placeholder="0%" />
                       </div>
                       <div className="col-span-2 space-y-2">
                         <Label>Franchise Fee Cap</Label>
                         <Input placeholder="$0" />
                       </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <Label>Marketing Fee (Flat)</Label>
                         <Input placeholder="$0" />
                       </div>
                       <div className="space-y-2">
                         <Label>Marketing Fee (%)</Label>
                         <Input placeholder="0%" />
                       </div>
                       <div className="col-span-2 space-y-2">
                         <Label>Marketing Fee Cap</Label>
                         <Input placeholder="$0" />
                       </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Commission Splits */}
                <Card className="border-none shadow-md md:col-span-2">
                  <CardHeader className="bg-primary/5 pb-4">
                    <CardTitle className="font-serif">Commission Structure</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="p-4 bg-secondary/30 rounded-lg space-y-4">
                        <Label>Is your split dependent on an Office Cap or Fair Share?</Label>
                        <div className="space-y-2">
                          <Label>Office Cap / Fair Share</Label>
                          <Input defaultValue="$18,000" className="bg-white" />
                        </div>
                        <div className="space-y-2">
                          <Label>Starting Split (%)</Label>
                          <Input defaultValue="68.00%" className="bg-white" />
                        </div>
                        <div className="space-y-2">
                          <Label>Secondary Split as a % (after cap)</Label>
                          <Input defaultValue="85.00%" className="bg-white" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label>Progressive Split Structure (if applicable)</Label>
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-secondary/50">
                              <TableHead>% of Gross</TableHead>
                              <TableHead>From Income ($)</TableHead>
                              <TableHead>To Income ($)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {[1, 2, 3, 4, 5].map((i) => (
                              <TableRow key={i}>
                                <TableCell><Input className="h-8 w-16" placeholder="%" /></TableCell>
                                <TableCell><Input className="h-8" placeholder="$0" /></TableCell>
                                <TableCell><Input className="h-8" placeholder="$" /></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* --- PROSPECTS TAB --- */}
            <TabsContent value="prospects" className="space-y-6 mt-6">
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Warm Prospects */}
                <Card className="border-none shadow-md h-full">
                  <CardHeader className="bg-orange-50 pb-4 border-b border-orange-100">
                    <div className="flex justify-between items-center">
                      <CardTitle className="font-serif text-orange-800">"Warm" Prospects</CardTitle>
                      <Button size="sm" variant="outline" className="h-8 text-orange-700 border-orange-200 hover:bg-orange-100"><Plus className="h-3 w-3 mr-1" /> Add</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-[100px]">Date</TableHead>
                          <TableHead>Client Name</TableHead>
                          <TableHead className="w-[80px]">Price</TableHead>
                          <TableHead className="w-[60px]">%</TableHead>
                          <TableHead className="text-right">GCI</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {warmDeals.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              No warm prospects yet. Add deals with "warm" stage to see them here.
                            </TableCell>
                          </TableRow>
                        ) : warmDeals.map((deal) => (
                          <TableRow key={deal.id} className="hover:bg-orange-50/50" data-testid={`row-warm-${deal.id}`}>
                            <TableCell className="font-medium text-xs">{formatDate(deal.expectedCloseDate || deal.createdAt)}</TableCell>
                            <TableCell>
                              <ClickableName personId={deal.personId} name={deal.person?.name || deal.title} />
                            </TableCell>
                            <TableCell className="text-xs">{formatPrice(deal.value)}</TableCell>
                            <TableCell className="text-xs">{deal.probability || 3}%</TableCell>
                            <TableCell className="text-right font-medium text-green-700">{calculateGCI(deal.value, deal.probability)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="p-4 bg-orange-50/50 border-t border-orange-100 mt-4 flex justify-between items-center">
                       <span className="text-sm font-medium text-orange-800">Total Potential Sides: {warmDeals.length}</span>
                       <div className="text-right">
                         <span className="text-xs text-muted-foreground uppercase">Potential GCI</span>
                         <p className="text-lg font-bold text-green-700">
                           {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
                             warmDeals.reduce((sum, d) => sum + (d.value || 0) * ((d.probability || 3) / 100), 0)
                           )}
                         </p>
                       </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Hot Prospects */}
                <div className="space-y-8">
                  <Card className="border-none shadow-md">
                    <CardHeader className="bg-red-50 pb-4 border-b border-red-100">
                      <div className="flex justify-between items-center">
                        <CardTitle className="font-serif text-red-800">"Hot" Prospects</CardTitle>
                        <Button size="sm" variant="outline" className="h-8 text-red-700 border-red-200 hover:bg-red-100"><Plus className="h-3 w-3 mr-1" /> Add</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[100px]">Date</TableHead>
                            <TableHead>Client Name</TableHead>
                            <TableHead className="w-[80px]">Price</TableHead>
                            <TableHead className="text-right">GCI</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {hotDeals.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                No hot prospects yet. Add deals with "hot" stage to see them here.
                              </TableCell>
                            </TableRow>
                          ) : hotDeals.map((deal) => (
                            <TableRow key={deal.id} className="hover:bg-red-50/50" data-testid={`row-hot-${deal.id}`}>
                              <TableCell className="font-medium text-xs">{formatDate(deal.expectedCloseDate || deal.createdAt)}</TableCell>
                              <TableCell>
                                <ClickableName personId={deal.personId} name={deal.person?.name || deal.title} />
                              </TableCell>
                              <TableCell className="text-xs">{formatPrice(deal.value)}</TableCell>
                              <TableCell className="text-right font-medium text-green-700">{calculateGCI(deal.value, deal.probability)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="p-4 bg-red-50/50 border-t border-red-100 flex justify-between items-center">
                        <span className="text-sm font-medium text-red-800">Total Hot: {hotDeals.length}</span>
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground uppercase">Potential GCI</span>
                          <p className="text-lg font-bold text-green-700">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
                              hotDeals.reduce((sum, d) => sum + (d.value || 0) * ((d.probability || 3) / 100), 0)
                            )}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* --- ACTIVE TAB --- */}
            <TabsContent value="active" className="space-y-6 mt-6">
              <Card className="border-none shadow-md">
                <CardHeader className="bg-indigo-50 pb-4 border-b border-indigo-100">
                   <div className="flex justify-between items-center">
                     <CardTitle className="font-serif text-indigo-800">Under Contract / Active</CardTitle>
                     <Button size="sm" variant="outline" className="h-8 text-indigo-700 border-indigo-200 hover:bg-indigo-100"><Plus className="h-3 w-3 mr-1" /> Add</Button>
                   </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Client Name</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Closing Date</TableHead>
                        <TableHead>Sales Price</TableHead>
                        <TableHead>%</TableHead>
                        <TableHead className="text-right">Est. GCI</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeDeals.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No active deals yet. Add deals with "active" or "under_contract" stage to see them here.
                          </TableCell>
                        </TableRow>
                      ) : activeDeals.map((deal) => (
                        <TableRow key={deal.id} className="hover:bg-indigo-50/50" data-testid={`row-active-${deal.id}`}>
                          <TableCell>
                            <ClickableName personId={deal.personId} name={deal.person?.name || deal.title} />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{deal.notes || "-"}</TableCell>
                          <TableCell>{deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString() : "-"}</TableCell>
                          <TableCell>{formatPrice(deal.value)}</TableCell>
                          <TableCell>{deal.probability || 3}%</TableCell>
                          <TableCell className="text-right font-bold text-green-700">{calculateGCI(deal.value, deal.probability)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="p-4 bg-indigo-50/50 border-t border-indigo-100 flex justify-between items-center">
                    <span className="text-sm font-medium text-indigo-800">Total Active: {activeDeals.length}</span>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground uppercase">Expected GCI</span>
                      <p className="text-lg font-bold text-green-700">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
                          activeDeals.reduce((sum, d) => sum + (d.value || 0) * ((d.probability || 3) / 100), 0)
                        )}
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
                      <div className="text-sm font-medium">Total Closed: <span className="font-bold text-green-700">{closedDeals.length}</span></div>
                      <div className="text-sm font-medium">Volume: <span className="font-bold text-green-700">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, notation: 'compact' }).format(
                          closedDeals.reduce((sum, d) => sum + (d.value || 0), 0)
                        )}
                      </span></div>
                      <div className="text-sm font-medium">GCI: <span className="font-bold text-green-700">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, notation: 'compact' }).format(
                          closedDeals.reduce((sum, d) => sum + (d.value || 0) * ((d.probability || 3) / 100), 0)
                        )}
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
                        <TableHead className="w-[80px]">Type</TableHead>
                        <TableHead>Sale Price</TableHead>
                        <TableHead>Comm %</TableHead>
                        <TableHead className="text-right font-bold text-green-700 bg-green-50">Gross Comm</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {closedDeals.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No closed deals yet. Add deals with "closed" stage to see them here.
                          </TableCell>
                        </TableRow>
                      ) : closedDeals.map((deal) => (
                        <TableRow key={deal.id} className="hover:bg-muted/50" data-testid={`row-closed-${deal.id}`}>
                          <TableCell className="font-medium text-xs">{deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString() : "-"}</TableCell>
                          <TableCell>
                            <ClickableName personId={deal.personId} name={deal.person?.name || deal.title} />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">{deal.address || "-"}</TableCell>
                          <TableCell className="text-xs">{deal.type}</TableCell>
                          <TableCell className="text-xs">{formatPrice(deal.value)}</TableCell>
                          <TableCell className="text-xs">{deal.probability || 3}%</TableCell>
                          <TableCell className="text-right font-bold text-green-700 bg-green-50/50">{calculateGCI(deal.value, deal.probability)}</TableCell>
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
                     <CardTitle className="font-serif">Daily PIE Log (Sample)</CardTitle>
                   </CardHeader>
                   <CardContent className="p-0">
                     <div className="grid grid-cols-3 divide-x border-b">
                        <div className="p-4 bg-green-50/50 text-center font-bold text-green-700">P (Productive)</div>
                        <div className="p-4 bg-amber-50/50 text-center font-bold text-amber-700">I (Indirect)</div>
                        <div className="p-4 bg-blue-50/50 text-center font-bold text-blue-700">E (Everything Else)</div>
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
                            {[...Array(10)].map((_, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-medium">Jan {i + 1}</TableCell>
                                <TableCell className="text-center"><Input className="h-7 w-16 text-center mx-auto" defaultValue={Math.floor(Math.random() * 4)} /></TableCell>
                                <TableCell className="text-center"><Input className="h-7 w-16 text-center mx-auto" defaultValue={Math.floor(Math.random() * 3)} /></TableCell>
                                <TableCell className="text-center"><Input className="h-7 w-16 text-center mx-auto" defaultValue={Math.floor(Math.random() * 5)} /></TableCell>
                                <TableCell className="text-right font-bold text-muted-foreground">8.5</TableCell>
                              </TableRow>
                            ))}
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
                              <span className="text-sm font-bold text-green-700">5.05%</span>
                            </div>
                            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                              <div className="bg-green-600 h-full w-[5%]"></div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">100.5 Hrs Total</p>
                          </div>
                          
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">Indirect (I)</span>
                              <span className="text-sm font-bold text-amber-700">28.96%</span>
                            </div>
                            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                              <div className="bg-amber-500 h-full w-[29%]"></div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">576.7 Hrs Total</p>
                          </div>

                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">Everything Else (E)</span>
                              <span className="text-sm font-bold text-blue-700">65.99%</span>
                            </div>
                            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                              <div className="bg-blue-500 h-full w-[66%]"></div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">1314.0 Hrs Total</p>
                          </div>

                          <Separator />
                          
                          <div className="pt-2">
                             <p className="text-sm font-medium text-center mb-2">Hourly Yield Ratio</p>
                             <div className="bg-primary/10 p-3 rounded-lg text-center">
                                <span className="text-2xl font-bold text-primary">5.74</span>
                                <span className="text-muted-foreground mx-2">to</span>
                                <span className="text-2xl font-bold">1</span>
                             </div>
                             <p className="text-xs text-center text-muted-foreground mt-2">For every 1 hour of P time, you work 5.74 hours total.</p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 pt-2">
                             <div className="bg-green-50 p-2 rounded text-center">
                               <p className="text-xs text-green-800 uppercase">P Time Value</p>
                               <p className="font-bold text-green-700">$938/hr</p>
                             </div>
                             <div className="bg-amber-50 p-2 rounded text-center">
                               <p className="text-xs text-amber-800 uppercase">I Time Value</p>
                               <p className="font-bold text-amber-700">$47/hr</p>
                             </div>
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
