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

export default function BusinessTracker() {
  return (
    <Layout>
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
                        {[
                          { date: "6/26", name: "Dennis Grezza", price: "650k", pct: "3%", gci: "$19,500" },
                          { date: "6/27", name: "Zia Hassanzadeh", price: "700k", pct: "3%", gci: "$21,000" },
                          { date: "9/29", name: "Kyria", price: "250k", pct: "2.75%", gci: "$6,875" },
                          { date: "10/1", name: "Amelia Stansell", price: "750k", pct: "3%", gci: "$22,500" },
                        ].map((row, i) => (
                          <TableRow key={i} className="hover:bg-orange-50/50">
                            <TableCell className="font-medium text-xs">{row.date}</TableCell>
                            <TableCell>{row.name}</TableCell>
                            <TableCell className="text-xs">{row.price}</TableCell>
                            <TableCell className="text-xs">{row.pct}</TableCell>
                            <TableCell className="text-right font-medium text-green-700">{row.gci}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="p-4 bg-orange-50/50 border-t border-orange-100 mt-4 flex justify-between items-center">
                       <span className="text-sm font-medium text-orange-800">Total Potential Sides: 4</span>
                       <div className="text-right">
                         <span className="text-xs text-muted-foreground uppercase">Potential GCI</span>
                         <p className="text-lg font-bold text-green-700">$69,875</p>
                       </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Hot Prospects */}
                <div className="space-y-8">
                  <Card className="border-none shadow-md">
                    <CardHeader className="bg-red-50 pb-4 border-b border-red-100">
                      <div className="flex justify-between items-center">
                        <CardTitle className="font-serif text-red-800">"Hot" and Active Prospects</CardTitle>
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
                          {[
                            { date: "10/15", name: "Andrew Papantoniou", price: "600k", gci: "$18,000" },
                            { date: "11/14", name: "Leonard Abreu", price: "500k", gci: "$12,500" },
                            { date: "12/1", name: "Sarah & Sam Bellet", price: "1.25M", gci: "$37,500" },
                          ].map((row, i) => (
                            <TableRow key={i} className="hover:bg-red-50/50">
                              <TableCell className="font-medium text-xs">{row.date}</TableCell>
                              <TableCell>{row.name}</TableCell>
                              <TableCell className="text-xs">{row.price}</TableCell>
                              <TableCell className="text-right font-medium text-green-700">{row.gci}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-md">
                    <CardHeader className="bg-blue-50 pb-4 border-b border-blue-100">
                      <div className="flex justify-between items-center">
                        <CardTitle className="font-serif text-blue-800">"Hot" and Confused Prospects</CardTitle>
                        <Button size="sm" variant="outline" className="h-8 text-blue-700 border-blue-200 hover:bg-blue-100"><Plus className="h-3 w-3 mr-1" /> Add</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[100px]">Date</TableHead>
                            <TableHead>Client Name</TableHead>
                            <TableHead className="text-right">Potential GCI</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow className="hover:bg-blue-50/50">
                            <TableCell className="font-medium text-xs">12/30</TableCell>
                            <TableCell>Lucy Pearl</TableCell>
                            <TableCell className="text-right font-medium text-green-700">$21,000</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
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
                     <CardTitle className="font-serif text-indigo-800">Under Contract</CardTitle>
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
                      <TableRow className="hover:bg-indigo-50/50">
                        <TableCell className="font-medium">Karla & Daniel</TableCell>
                        <TableCell className="text-xs text-muted-foreground">Buy/Sell, signed agreements...</TableCell>
                        <TableCell>12/15/25</TableCell>
                        <TableCell>2.35M</TableCell>
                        <TableCell>3.00%</TableCell>
                        <TableCell className="text-right font-bold text-green-700">$70,500</TableCell>
                      </TableRow>
                      {/* Empty rows for visual similarity to excel */}
                      {[1,2,3].map(i => (
                         <TableRow key={i} className="hover:bg-indigo-50/10 h-10">
                           <TableCell className="text-muted-foreground/30">-</TableCell>
                           <TableCell></TableCell>
                           <TableCell></TableCell>
                           <TableCell></TableCell>
                           <TableCell></TableCell>
                           <TableCell className="text-right text-muted-foreground/30">$0</TableCell>
                         </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md">
                <CardHeader className="bg-cyan-50 pb-4 border-b border-cyan-100">
                  <div className="flex justify-between items-center">
                    <CardTitle className="font-serif text-cyan-800">Signed Listing Agreements</CardTitle>
                    <Button size="sm" variant="outline" className="h-8 text-cyan-700 border-cyan-200 hover:bg-cyan-100"><Plus className="h-3 w-3 mr-1" /> Add</Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Client Name</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>List Price</TableHead>
                        <TableHead className="text-right">Est. GCI</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[1,2,3].map(i => (
                         <TableRow key={i} className="hover:bg-cyan-50/10 h-10">
                           <TableCell className="text-muted-foreground/30">-</TableCell>
                           <TableCell></TableCell>
                           <TableCell></TableCell>
                           <TableCell></TableCell>
                           <TableCell className="text-right text-muted-foreground/30">$0</TableCell>
                         </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                      <div className="text-sm font-medium">Total Closed: <span className="font-bold text-green-700">17</span></div>
                      <div className="text-sm font-medium">Volume: <span className="font-bold text-green-700">$5.9M</span></div>
                      <div className="text-sm font-medium">GCI: <span className="font-bold text-green-700">$119k</span></div>
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
                        <TableHead className="text-right">Ref Fee</TableHead>
                        <TableHead className="text-right font-bold">Agent Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { date: "1/10/25", name: "Kevin Zhao", addr: "6316 Medinah Ln", type: "Buy", price: "610,000", pct: "2.5%", gci: "$15,250", ref: "$0", net: "$10,370" },
                        { date: "2/18/25", name: "Cristina Samaha", addr: "3452 Belleplain Ct", type: "Buy", price: "415,900", pct: "2.4%", gci: "$10,000", ref: "$0", net: "$6,880" },
                        { date: "3/1/25", name: "Kim & Damon", addr: "3382 Gunston Rd", type: "Buy", price: "2,650", pct: "25%", gci: "$663", ref: "$0", net: "$563" },
                        { date: "4/10/25", name: "Lindsey Jasper", addr: "1103 Criton St", type: "Buy", price: "750,000", pct: "3.0%", gci: "$22,500", ref: "$0", net: "$19,125" },
                      ].map((row, i) => (
                        <TableRow key={i} className="hover:bg-muted/50">
                          <TableCell className="font-medium text-xs">{row.date}</TableCell>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">{row.addr}</TableCell>
                          <TableCell className="text-xs">{row.type}</TableCell>
                          <TableCell className="text-xs">${row.price}</TableCell>
                          <TableCell className="text-xs">{row.pct}</TableCell>
                          <TableCell className="text-right font-bold text-green-700 bg-green-50/50">{row.gci}</TableCell>
                          <TableCell className="text-right text-xs text-red-400">{row.ref}</TableCell>
                          <TableCell className="text-right font-bold">{row.net}</TableCell>
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
