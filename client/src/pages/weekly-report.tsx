import { useState, useEffect } from "react";
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
import { ArrowLeft, ArrowRight, Save, Check, Calendar, User, TrendingUp, Heart, Briefcase, RefreshCw, Upload, Briefcase as BriefcaseIcon, Phone, PieChart, Clock } from "lucide-react";
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

  // PIE Time Tracker
  pie_productive: z.string().optional(),
  pie_indirect: z.string().optional(),
  pie_educational: z.string().optional(),

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

  // Review - Daily Frequency (0-7)
  days_readMastery: z.coerce.number().min(0).max(7).default(0),
  days_dailyAffirmations: z.coerce.number().min(0).max(7).default(0),
  days_dailyGratitudes: z.coerce.number().min(0).max(7).default(0),
  days_reviewLists: z.coerce.number().min(0).max(7).default(0),

  // Review - Weekly Check (Yes/No)
  checklist_reviewYearlyGoals: z.boolean().default(false),
  checklist_reviewMonthlyGoals: z.boolean().default(false),
  checklist_reviewWeeklyGoals: z.boolean().default(false),
  checklist_reviewMeetingNotes: z.boolean().default(false),
  checklist_reviewBusinessPlan: z.boolean().default(false),

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
  
  fordCount: z.string().optional(),
  recordedFordInfo: z.boolean().default(false),
  peopleToConnect: z.string().optional(),

  // Personal Notes
  notesWrittenLastWeek: z.string().optional(),
  notesPlannedNextWeek: z.string().optional(),
  
  // New Business (Pipeline)
  newBusinessBuyers: z.string().optional(),
  newBusinessSellers: z.string().optional(),
  
  // Numbers to Know - Updated
  offersWritten: z.string().optional(),
  contractsMutual: z.string().optional(),
  dealsUnderContract: z.string().optional(),
  dealsClosed: z.string().optional(),
  buyerAppointments: z.string().optional(),
  listingAppointments: z.string().optional(),
  newListingsTaken: z.string().optional(),
  newContactsAdded: z.string().optional(),
  
  messageToCoach: z.string().optional(),
});

export default function WeeklyReport() {
  const [activeTab, setActiveTab] = useState("overview");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [notesPhotoPreview, setNotesPhotoPreview] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "Nathan Desnoyers",
      date: new Date().toISOString().split('T')[0],
      wordOfYear: "",
      affirmation: "",
      familyMission: "",
      businessMission: "",
      quarterlyFocus: "",
      
      // Defaults for sliders/ratings
      businessDirection: 5,
      timeManagement: 5,
      implementingNinja: 5,
      weeklyPlanning: 5,
      dailyMovement: 5,
      agendaSticking: 5,
      hoursOfPower: 5,
      handwrittenNotes: 5,
      realEstateReviews: 5,
      customerServiceCalls: 5,
      lunchesCoffees: 5,
      fordContacts: 5,
      paperworkCleanup: 5,
      databaseMaintenance: 5,
      warmListFocus: 5,
      hotListFocus: 5,
      dailyGratitudes: 5,
      dailyAffirmations: 5,
      
      days_readMastery: 0,
      days_dailyAffirmations: 0,
      days_dailyGratitudes: 0,
      days_reviewLists: 0,
      
      checklist_reviewYearlyGoals: false,
      checklist_reviewMonthlyGoals: false,
      checklist_reviewWeeklyGoals: false,
      checklist_reviewMeetingNotes: false,
      checklist_reviewBusinessPlan: false,
      
      pie_productive: "",
      pie_indirect: "",
      pie_educational: "",

      newBusinessBuyers: "",
      newBusinessSellers: "",
      
      offersWritten: "",
      contractsMutual: "",
      dealsUnderContract: "",
      dealsClosed: "",
      buyerAppointments: "",
      listingAppointments: "",
      newListingsTaken: "",
      newContactsAdded: "",
      
      messageToCoach: "",
    },
  });

  // Load persistent data on mount
  useEffect(() => {
    const loadPersistentData = () => {
      const savedData = {
        familyMission: localStorage.getItem("ninja_familyMission"),
        businessMission: localStorage.getItem("ninja_businessMission"),
        quarterlyFocus: localStorage.getItem("ninja_quarterlyFocus"),
        wordOfYear: localStorage.getItem("ninja_wordOfYear"),
        affirmation: localStorage.getItem("ninja_affirmation"),
      };

      // Only update fields that have saved values
      if (savedData.familyMission) form.setValue("familyMission", savedData.familyMission);
      if (savedData.businessMission) form.setValue("businessMission", savedData.businessMission);
      if (savedData.quarterlyFocus) form.setValue("quarterlyFocus", savedData.quarterlyFocus);
      if (savedData.wordOfYear) form.setValue("wordOfYear", savedData.wordOfYear);
      if (savedData.affirmation) form.setValue("affirmation", savedData.affirmation);
    };

    loadPersistentData();
  }, [form]);

  // Persist "Static" fields when they change
  const handleStaticFieldChange = (field: string, value: string) => {
    localStorage.setItem(`ninja_${field}`, value);
  };
  
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setNotesPhotoPreview(objectUrl);
      toast({
        title: "Photo Added",
        description: "Your notes photo has been attached to this report.",
      });
    }
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    
    // Explicitly save persistent fields again on submit to be safe
    if (values.familyMission) localStorage.setItem("ninja_familyMission", values.familyMission);
    if (values.businessMission) localStorage.setItem("ninja_businessMission", values.businessMission);
    if (values.quarterlyFocus) localStorage.setItem("ninja_quarterlyFocus", values.quarterlyFocus);
    if (values.wordOfYear) localStorage.setItem("ninja_wordOfYear", values.wordOfYear);
    if (values.affirmation) localStorage.setItem("ninja_affirmation", values.affirmation);

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
                <TabsTrigger value="pipeline" className="gap-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <BriefcaseIcon className="h-4 w-4" /> Pipeline & Growth
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="border-none shadow-md">
                    <CardHeader className="bg-primary/5 pb-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="font-serif">Identity & Focus</CardTitle>
                          <CardDescription>These fields persist week over week</CardDescription>
                        </div>
                        <div className="flex gap-2 text-xs text-muted-foreground items-center bg-background/50 px-2 py-1 rounded-md border">
                          <RefreshCw className="h-3 w-3" /> Auto-saved locally
                        </div>
                      </div>
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
                              <Input 
                                placeholder="I consistently receive..." 
                                {...field} 
                                onChange={(e) => {
                                  field.onChange(e);
                                  handleStaticFieldChange("affirmation", e.target.value);
                                }}
                                className="font-serif italic text-lg bg-background/50 border-primary/20 focus:border-primary" 
                              />
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
                                <Textarea 
                                  placeholder="Mission..." 
                                  {...field} 
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleStaticFieldChange("familyMission", e.target.value);
                                  }}
                                  className="min-h-[100px] bg-background/50" 
                                />
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
                                <Textarea 
                                  placeholder="Mission..." 
                                  {...field} 
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleStaticFieldChange("businessMission", e.target.value);
                                  }}
                                  className="min-h-[100px] bg-background/50" 
                                />
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
                              <Textarea 
                                placeholder="• Major Project 1..." 
                                {...field} 
                                onChange={(e) => {
                                  field.onChange(e);
                                  handleStaticFieldChange("quarterlyFocus", e.target.value);
                                }}
                                className="min-h-[120px] bg-background/50 font-medium" 
                              />
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
                              <Input 
                                {...field} 
                                onChange={(e) => {
                                  field.onChange(e);
                                  handleStaticFieldChange("wordOfYear", e.target.value);
                                }}
                                className="text-center text-2xl font-serif font-bold uppercase tracking-widest border-2 py-6" 
                              />
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
                  <div className="grid md:grid-cols-3 gap-6">
                    <Card className="border-none shadow-md md:col-span-2">
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

                    <Card className="border-none shadow-md bg-secondary/20">
                      <CardHeader className="bg-primary/5 pb-4">
                        <CardTitle className="font-serif flex items-center gap-2">
                          <PieChart className="h-5 w-5 text-primary" />
                          PIE Time Tracker
                        </CardTitle>
                        <CardDescription>Track hours spent this week</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-4">
                        <FormField
                          control={form.control}
                          name="pie_productive"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex justify-between mb-1">
                                <FormLabel className="font-bold text-green-700">P - Productive</FormLabel>
                                <span className="text-xs text-muted-foreground">Income Generating</span>
                              </div>
                              <FormControl>
                                <div className="relative">
                                  <Input type="number" step="0.5" placeholder="0" {...field} className="pl-9 bg-white" />
                                  <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                </div>
                              </FormControl>
                              <FormDescription className="text-xs">Flow, Live Interviews, Appts, Negotations</FormDescription>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="pie_indirect"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex justify-between mb-1">
                                <FormLabel className="font-bold text-amber-600">I - Indirect</FormLabel>
                                <span className="text-xs text-muted-foreground">Income Servicing</span>
                              </div>
                              <FormControl>
                                <div className="relative">
                                  <Input type="number" step="0.5" placeholder="0" {...field} className="pl-9 bg-white" />
                                  <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                </div>
                              </FormControl>
                              <FormDescription className="text-xs">Prep, Research, Marketing, Paperwork</FormDescription>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="pie_educational"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex justify-between mb-1">
                                <FormLabel className="font-bold text-blue-600">E - Everything Else</FormLabel>
                                <span className="text-xs text-muted-foreground">Education/Admin</span>
                              </div>
                              <FormControl>
                                <div className="relative">
                                  <Input type="number" step="0.5" placeholder="0" {...field} className="pl-9 bg-white" />
                                  <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                </div>
                              </FormControl>
                              <FormDescription className="text-xs">Classes, Meetings, Admin, Personal</FormDescription>
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </div>
                  
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
                      <CardContent className="pt-6 grid gap-6">
                        
                        <div className="space-y-4">
                           <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Daily Habits (Days / Week)</h3>
                           {[
                            { name: "days_readMastery", label: "Read Mastery (Days)" },
                            { name: "days_dailyAffirmations", label: "Daily Affirmations (Days)" },
                            { name: "days_dailyGratitudes", label: "Daily Gratitudes (Days)" },
                            { name: "days_reviewLists", label: "Review Hot & Warm Lists (Days)" },
                          ].map((item) => (
                            <FormField
                              key={item.name}
                              control={form.control}
                              name={item.name as any}
                              render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-md border p-3 bg-secondary/20">
                                  <FormLabel className="flex-1 cursor-pointer font-normal">
                                    {item.label}
                                  </FormLabel>
                                  <FormControl>
                                    <div className="flex items-center gap-2">
                                      <Input 
                                        type="number" 
                                        min={0} 
                                        max={7} 
                                        {...field} 
                                        className="w-16 text-center bg-background h-8" 
                                      />
                                      <span className="text-xs text-muted-foreground">/7</span>
                                    </div>
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>

                        <Separator />

                        <div className="space-y-4">
                          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Weekly Review</h3>
                          {[
                            { name: "checklist_reviewYearlyGoals", label: "Review yearly goals" },
                            { name: "checklist_reviewMonthlyGoals", label: "Review monthly goals" },
                            { name: "checklist_reviewWeeklyGoals", label: "Review weekly goals" },
                            { name: "checklist_reviewMeetingNotes", label: "Review last week's meeting notes" },
                            { name: "checklist_reviewBusinessPlan", label: "Review Business Plan & FLOW Calendar" },
                          ].map((item) => (
                            <FormField
                              key={item.name}
                              control={form.control}
                              name={item.name as any}
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 bg-secondary/20">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="cursor-pointer font-normal">
                                      {item.label}
                                    </FormLabel>
                                  </div>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>

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

                  <Card className="border-none shadow-md">
                    <CardHeader className="bg-primary/5 pb-4">
                      <CardTitle className="font-serif">Personal Notes</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="notesWrittenLastWeek"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes Written Last Week</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Describe the notes you wrote..." {...field} className="min-h-[100px] bg-background/50" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <div className="space-y-3">
                          <label className="text-sm font-medium leading-none">Photo Evidence</label>
                          <div className="border-2 border-dashed border-input rounded-lg p-6 flex flex-col items-center justify-center bg-background/50 hover:bg-background/80 transition-colors cursor-pointer group relative overflow-hidden">
                            <Input 
                              type="file" 
                              accept="image/*" 
                              className="absolute inset-0 opacity-0 cursor-pointer z-10"
                              onChange={handlePhotoUpload}
                            />
                            {notesPhotoPreview ? (
                              <div className="relative w-full h-40">
                                <img src={notesPhotoPreview} alt="Notes preview" className="w-full h-full object-contain rounded-md" />
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-medium">
                                  Change Photo
                                </div>
                              </div>
                            ) : (
                              <>
                                <Upload className="h-8 w-8 text-muted-foreground mb-2 group-hover:text-primary transition-colors" />
                                <p className="text-sm text-muted-foreground text-center">
                                  <span className="font-semibold text-primary">Click to upload</span> or drag and drop<br />
                                  photos of your notes
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="notesPlannedNextWeek"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes Planned for Next Week</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Who are you writing to?" {...field} className="min-h-[80px] bg-background/50" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                  
                  <div className="flex justify-between items-center pt-8">
                    <Button type="button" onClick={() => setActiveTab("review")} variant="ghost">Previous</Button>
                    <Button type="button" onClick={() => setActiveTab("pipeline")} variant="outline" className="gap-2">
                       Next: Pipeline & Growth <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="pipeline" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="border-none shadow-md md:col-span-2">
                      <CardHeader className="bg-primary/5 pb-4">
                        <CardTitle className="font-serif">New Business Pipeline</CardTitle>
                        <CardDescription>Potential business identified last week</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6 grid md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="newBusinessBuyers"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Potential Buyers</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Names and details..." {...field} className="min-h-[120px] bg-background/50" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="newBusinessSellers"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Potential Sellers</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Names and details..." {...field} className="min-h-[120px] bg-background/50" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>

                    <Card className="border-none shadow-md">
                      <CardHeader className="bg-primary/5 pb-4">
                        <CardTitle className="font-serif">Numbers to Know</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="offersWritten"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Offers Written</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0" {...field} className="bg-background/50" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="contractsMutual"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Contracts (Mutual)</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0" {...field} className="bg-background/50" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="dealsUnderContract"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Under Contract</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0" {...field} className="bg-background/50" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="dealsClosed"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Deals Closed</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0" {...field} className="bg-background/50" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="buyerAppointments"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Buyer Appts</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0" {...field} className="bg-background/50" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="listingAppointments"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Listing Appts</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0" {...field} className="bg-background/50" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="newListingsTaken"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>New Listings</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0" {...field} className="bg-background/50" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="newContactsAdded"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>New Contacts</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0" {...field} className="bg-background/50" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-none shadow-md">
                      <CardHeader className="bg-primary/5 pb-4">
                        <CardTitle className="font-serif">Message to Coach</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <FormField
                          control={form.control}
                          name="messageToCoach"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Questions, wins, or focus for our next call</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Hey Coach..." 
                                  {...field} 
                                  className="min-h-[200px] bg-background/50" 
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex justify-between items-center pt-8">
                    <Button type="button" onClick={() => setActiveTab("relationships")} variant="ghost">Previous</Button>
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
