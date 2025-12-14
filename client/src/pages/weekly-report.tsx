import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useLocation } from "wouter";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Rating } from "@/components/ui/rating";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight, Save, Check, Calendar, User, TrendingUp, Heart, Briefcase, Coffee, Phone } from "lucide-react";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";
import { useToast } from "@/hooks/use-toast";

// Schema Definition
const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  date: z.string(),
  affirmation: z.string().optional(),
  familyMission: z.string().optional(),
  businessMission: z.string().optional(),
  quarterlyFocus: z.string().optional(),
  wordOfYear: z.string().optional(),
  
  // Pulse Check
  businessDirection: z.number().min(1).max(10),
  timeManagement: z.number().min(1).max(10),
  implementingNinja: z.number().min(1).max(10),
  ninjaSystemAttention: z.string().optional(),
  nextGetaway: z.string().optional(),

  // Weekly Habits
  weeklyPlanning: z.number().min(1).max(10),
  dailyMovement: z.number().min(1).max(10),
  agendaSticking: z.number().min(1).max(10),
  hoursOfPower: z.number().min(1).max(10),
  handwrittenNotes: z.number().min(1).max(10),
  realEstateReviews: z.number().min(1).max(10),
  customerServiceCalls: z.number().min(1).max(10),
  lunchesCoffees: z.number().min(1).max(10),
  fordContacts: z.number().min(1).max(10),
  paperworkCleanup: z.number().min(1).max(10),
  databaseMaintenance: z.number().min(1).max(10),
  warmListFocus: z.number().min(1).max(10),
  hotListFocus: z.number().min(1).max(10),
  dailyGratitudes: z.number().min(1).max(10),
  dailyAffirmations: z.number().min(1).max(10),

  // Review
  checklist_readMastery: z.boolean().default(false),
  checklist_dailyAffirmations: z.boolean().default(false),
  checklist_dailyGratitudes: z.boolean().default(false),
  checklist_reviewYearlyGoals: z.boolean().default(false),
  checklist_reviewMonthlyGoals: z.boolean().default(false),
  checklist_reviewWeeklyGoals: z.boolean().default(false),
  checklist_reviewMeetingNotes: z.boolean().default(false),
  checklist_reviewBusinessPlan: z.boolean().default(false),
  checklist_reviewLists: z.boolean().default(false),

  reasonsToCelebrate: z.string().optional(),
  businessLikeBusiness: z.string().optional(),
  ahas: z.string().optional(),
  improvements: z.string().optional(),
  readingListening: z.string().optional(),
  awakeAtNight: z.string().optional(),

  // Relationships
  completedRealEstateReviews: z.string().optional(),
  plannedRealEstateReviews: z.string().optional(),
  completedCoffees: z.string().optional(),
  plannedCoffees: z.string().optional(),
  
  fordCount: z.string().optional(), // Using string for flexibility
  recordedFordInfo: z.boolean().default(false),
  peopleToConnect: z.string().optional(),
});

export default function WeeklyReport() {
  const [activeTab, setActiveTab] = useState("overview");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "Nathan Desnoyers", // Mock default
      date: new Date().toISOString().split('T')[0],
      wordOfYear: "Consistency",
      businessDirection: 8,
      timeManagement: 7,
      implementingNinja: 8,
      weeklyPlanning: 8,
      dailyMovement: 9,
      agendaSticking: 8,
      hoursOfPower: 10,
      handwrittenNotes: 5,
      realEstateReviews: 8,
      customerServiceCalls: 6,
      lunchesCoffees: 10,
      fordContacts: 10,
      paperworkCleanup: 5,
      databaseMaintenance: 9,
      warmListFocus: 8,
      hotListFocus: 8,
      dailyGratitudes: 8,
      dailyAffirmations: 8,
      checklist_readMastery: false,
      checklist_dailyAffirmations: true,
      checklist_dailyGratitudes: true,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    toast({
      title: "Report Saved",
      description: "Your weekly agenda has been successfully saved.",
    });
    setTimeout(() => setLocation("/"), 1000);
  }

  return (
    <div className="min-h-screen bg-secondary/30 relative">
      <div 
        className="fixed inset-0 opacity-40 mix-blend-multiply pointer-events-none -z-10"
        style={{ backgroundImage: `url(${paperBg})`, backgroundSize: 'cover' }}
      />

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-serif font-bold text-primary">Weekly Meeting Agenda</h1>
            <p className="text-muted-foreground">"I am a radiant and established real estate professional"</p>
          </div>
          <Button onClick={form.handleSubmit(onSubmit)} className="gap-2 shadow-md">
            <Save className="h-4 w-4" /> Save Report
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full justify-start h-auto p-1 bg-card/50 backdrop-blur-sm border shadow-sm overflow-x-auto">
                <TabsTrigger value="overview" className="gap-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <User className="h-4 w-4" /> Overview
                </TabsTrigger>
                <TabsTrigger value="pulse" className="gap-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <TrendingUp className="h-4 w-4" /> Pulse Check
                </TabsTrigger>
                <TabsTrigger value="habits" className="gap-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Check className="h-4 w-4" /> Habits
                </TabsTrigger>
                <TabsTrigger value="review" className="gap-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Briefcase className="h-4 w-4" /> Review
                </TabsTrigger>
                <TabsTrigger value="relationships" className="gap-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Heart className="h-4 w-4" /> Relationships
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="border-none shadow-md">
                    <CardHeader className="bg-primary/5 pb-4">
                      <CardTitle className="font-serif">Identity & Focus</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 grid md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Your Name" {...field} className="bg-background/50" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} className="bg-background/50" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="affirmation"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Current Affirmation</FormLabel>
                            <FormControl>
                              <Input placeholder="I consistently receive..." {...field} className="font-serif italic text-lg bg-background/50 border-primary/20 focus:border-primary" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="md:col-span-2 grid md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="familyMission"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Family Mission Statement</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Mission..." {...field} className="min-h-[100px] bg-background/50" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="businessMission"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Mission Statement</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Mission..." {...field} className="min-h-[100px] bg-background/50" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="quarterlyFocus"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Quarterly Focus (Projects, Goals, Habits)</FormLabel>
                            <FormControl>
                              <Textarea placeholder="• Major Project 1..." {...field} className="min-h-[120px] bg-background/50 font-medium" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="wordOfYear"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Word of the Year</FormLabel>
                            <FormControl>
                              <Input {...field} className="text-center text-2xl font-serif font-bold uppercase tracking-widest border-2 py-6" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                  
                  <div className="flex justify-end">
                    <Button type="button" onClick={() => setActiveTab("pulse")} variant="outline" className="gap-2">
                      Next: Pulse Check <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="pulse" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="border-none shadow-md">
                    <CardHeader className="bg-primary/5 pb-4">
                      <CardTitle className="font-serif">Business Pulse</CardTitle>
                      <CardDescription>On a scale of 1-10...</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-8">
                      <FormField
                        control={form.control}
                        name="businessDirection"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base">How do I feel about the direction of my business?</FormLabel>
                            <FormControl>
                              <Rating 
                                value={field.value} 
                                onChange={field.onChange} 
                                labels={{ min: "Not Good", max: "Great" }} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Separator />
                      <FormField
                        control={form.control}
                        name="timeManagement"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base">How well am I managing my time?</FormLabel>
                            <FormControl>
                              <Rating 
                                value={field.value} 
                                onChange={field.onChange} 
                                labels={{ min: "Not Good", max: "Great" }} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Separator />
                      <FormField
                        control={form.control}
                        name="implementingNinja"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base">How well am I implementing Ninja?</FormLabel>
                            <FormControl>
                              <Rating 
                                value={field.value} 
                                onChange={field.onChange} 
                                labels={{ min: "Not Good", max: "Great" }} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid md:grid-cols-2 gap-6 pt-4">
                        <FormField
                          control={form.control}
                          name="ninjaSystemAttention"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Is there a specific Ninja system that needs attention?</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Time blocking..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="nextGetaway"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>When is my next scheduled getaway / vacation?</FormLabel>
                              <FormControl>
                                <Input placeholder="Date or Trip..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="flex justify-between">
                    <Button type="button" onClick={() => setActiveTab("overview")} variant="ghost">Previous</Button>
                    <Button type="button" onClick={() => setActiveTab("habits")} variant="outline" className="gap-2">
                      Next: Ninja Habits <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="habits" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="border-none shadow-md">
                    <CardHeader className="bg-primary/5 pb-4">
                      <CardTitle className="font-serif">Weekly Ninja Habits</CardTitle>
                      <CardDescription>Rate your commitment (1 = Not Very Well, 10 = Extremely Well)</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid gap-6">
                        {[
                          { name: "weeklyPlanning", label: "Weekly planning meeting" },
                          { name: "dailyMovement", label: "Daily movement or exercise" },
                          { name: "agendaSticking", label: "Sticking to your agenda" },
                          { name: "hoursOfPower", label: "Two hours of power" },
                          { name: "handwrittenNotes", label: "10 handwritten notes" },
                          { name: "realEstateReviews", label: "Two real estate reviews" },
                          { name: "customerServiceCalls", label: "Two hours of customer service calls" },
                          { name: "lunchesCoffees", label: "Two lunches, coffees, breakfasts" },
                          { name: "fordContacts", label: "50 FORD contacts 'live interviews'" },
                          { name: "paperworkCleanup", label: "Two 1-hour paperwork cleanup" },
                          { name: "databaseMaintenance", label: "Maintaining or adding to your database" },
                          { name: "warmListFocus", label: "Daily focus on warm list" },
                          { name: "hotListFocus", label: "Daily focus on hot list" },
                          { name: "dailyGratitudes", label: "Daily gratitudes" },
                          { name: "dailyAffirmations", label: "Daily affirmations" },
                        ].map((habit) => (
                          <FormField
                            key={habit.name}
                            control={form.control}
                            name={habit.name as any}
                            render={({ field }) => (
                              <FormItem className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 border-b border-border/50 pb-4 last:border-0 last:pb-0">
                                <FormLabel className="w-full md:w-1/3 text-sm font-normal">{habit.label}</FormLabel>
                                <FormControl className="w-full md:w-2/3">
                                  <Rating value={field.value} onChange={field.onChange} className="justify-start" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="flex justify-between">
                    <Button type="button" onClick={() => setActiveTab("pulse")} variant="ghost">Previous</Button>
                    <Button type="button" onClick={() => setActiveTab("review")} variant="outline" className="gap-2">
                      Next: Week in Review <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="review" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="border-none shadow-md h-full">
                      <CardHeader className="bg-primary/5 pb-4">
                        <CardTitle className="font-serif">Checklist</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6 grid gap-4">
                        {[
                          { name: "checklist_readMastery", label: "Read Mastery" },
                          { name: "checklist_dailyAffirmations", label: "Daily affirmations" },
                          { name: "checklist_dailyGratitudes", label: "Daily gratitudes" },
                          { name: "checklist_reviewYearlyGoals", label: "Review yearly goals" },
                          { name: "checklist_reviewMonthlyGoals", label: "Review monthly goals" },
                          { name: "checklist_reviewWeeklyGoals", label: "Review weekly goals" },
                          { name: "checklist_reviewMeetingNotes", label: "Review last week's meeting notes" },
                          { name: "checklist_reviewBusinessPlan", label: "Review business plan & FLOW calendar" },
                          { name: "checklist_reviewLists", label: "Review Hot & Warm lists" },
                        ].map((item) => (
                          <FormField
                            key={item.name}
                            control={form.control}
                            name={item.name as any}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 bg-secondary/20">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="cursor-pointer">
                                    {item.label}
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        ))}
                      </CardContent>
                    </Card>

                    <div className="space-y-6">
                      <Card className="border-none shadow-md">
                        <CardHeader className="pb-2">
                          <CardTitle className="font-serif text-lg">Reflection</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="reasonsToCelebrate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Reasons to Celebrate</FormLabel>
                                <FormControl>
                                  <Textarea {...field} className="bg-background/50" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="businessLikeBusiness"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>How I ran my business like a business</FormLabel>
                                <FormControl>
                                  <Textarea {...field} className="bg-background/50" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="ahas"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>A-HAs from last week</FormLabel>
                                <FormControl>
                                  <Textarea {...field} className="bg-background/50" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <Card className="border-none shadow-md">
                    <CardHeader className="bg-primary/5 pb-4">
                      <CardTitle className="font-serif">Looking Forward</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 grid md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="improvements"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>How I can improve this week</FormLabel>
                            <FormControl>
                              <Textarea {...field} className="bg-background/50" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="readingListening"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Podcasts/Books I am reading/listening to</FormLabel>
                            <FormControl>
                              <Textarea {...field} className="bg-background/50" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="awakeAtNight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Things keeping me awake at night</FormLabel>
                            <FormControl>
                              <Textarea {...field} className="bg-background/50" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                  
                  <div className="flex justify-between">
                    <Button type="button" onClick={() => setActiveTab("habits")} variant="ghost">Previous</Button>
                    <Button type="button" onClick={() => setActiveTab("relationships")} variant="outline" className="gap-2">
                      Next: Relationships <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="relationships" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="border-none shadow-md">
                      <CardHeader className="bg-primary/5 pb-4">
                        <CardTitle className="font-serif">Real Estate Reviews</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-4">
                        <FormField
                          control={form.control}
                          name="completedRealEstateReviews"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Completed Last Week</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Note name, highlights..." {...field} className="min-h-[100px] bg-background/50" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="plannedRealEstateReviews"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Planned This Week</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Two people to create reviews for..." {...field} className="min-h-[100px] bg-background/50" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>

                    <Card className="border-none shadow-md">
                      <CardHeader className="bg-primary/5 pb-4">
                        <CardTitle className="font-serif">Coffees / Breakfasts / Lunches</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-4">
                        <FormField
                          control={form.control}
                          name="completedCoffees"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Completed Last Week</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Note name, follow up..." {...field} className="min-h-[100px] bg-background/50" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="plannedCoffees"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Planned This Week</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Note name and reason..." {...field} className="min-h-[100px] bg-background/50" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-none shadow-md">
                    <CardHeader className="bg-primary/5 pb-4">
                      <CardTitle className="font-serif">Connecting & Database</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="fordCount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Total FORD Contacts Last Week</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="50" {...field} className="bg-background/50" />
                              </FormControl>
                              <FormDescription>Did I make 50 contacts?</FormDescription>
                            </FormItem>
                          )}
                        />
                         <FormField
                            control={form.control}
                            name="recordedFordInfo"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">
                                    Record Info
                                  </FormLabel>
                                  <FormDescription>
                                    Did I record info learned from FORD conversations?
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                      </div>

                      <FormField
                        control={form.control}
                        name="peopleToConnect"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>People to connect with this week</FormLabel>
                            <FormControl>
                              <Textarea placeholder="List names..." {...field} className="min-h-[100px] bg-background/50" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                  
                  <div className="flex justify-between items-center pt-8">
                    <Button type="button" onClick={() => setActiveTab("review")} variant="ghost">Previous</Button>
                    <div className="flex gap-4">
                      <Link href="/">
                        <Button variant="outline">Cancel</Button>
                      </Link>
                      <Button type="submit" size="lg" className="shadow-lg hover:shadow-xl transition-all">
                        <Save className="mr-2 h-4 w-4" /> Save Weekly Report
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </form>
        </Form>
      </div>
    </div>
  );
}
