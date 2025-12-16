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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Rating } from "@/components/ui/rating";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight, Save, Check, Calendar, User, TrendingUp, Heart, Briefcase, RefreshCw, Upload, Briefcase as BriefcaseIcon, Phone, PieChart, Clock, Printer, Mail, Send, X, CloudUpload, Link as LinkIcon, Users, ListTodo, Activity } from "lucide-react";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface NoteUpload {
  id: string;
  preview: string;
  taggedPerson: string;
}

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

  // Weekly Habits - Ratings (1-10)
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

  // Weekly Habits - Counts (Numeric)
  count_hoursOfPower: z.string().optional(),
  count_handwrittenNotes: z.string().optional(),
  count_realEstateReviews: z.string().optional(),
  count_customerServiceCalls: z.string().optional(),
  count_lunchesCoffees: z.string().optional(),
  count_fordContacts: z.string().optional(),
  count_paperworkCleanup: z.string().optional(),
  count_newContacts: z.string().optional(),

  // GTD Control Check (New)
  inbox_zero_confirmed: z.boolean().default(false),
  loose_notes_captured: z.boolean().default(false),
  calendar_reviewed: z.boolean().default(false),
  waiting_for_reviewed: z.boolean().default(false),
  next_actions_reviewed: z.boolean().default(false),
  projects_reviewed: z.boolean().default(false),
  someday_reviewed: z.boolean().default(false),
  reference_trusted: z.boolean().default(false),
  system_breakdown_note: z.string().optional(),

  // Results (Numeric)
  offersWritten: z.string().optional(),
  contractsMutual: z.string().optional(),
  dealsUnderContract: z.string().optional(),
  dealsClosed: z.string().optional(),
  buyerAppointments: z.string().optional(),
  listingAppointments: z.string().optional(),
  newListingsTaken: z.string().optional(),

  // Project & Priority Alignment (New)
  last_week_top_outcomes: z.string().optional(),
  next_week_top_outcomes: z.string().optional(),
  week_focus_category: z.string().default("growth"),

  // Reflection (Simplified)
  biggest_win: z.string().optional(),
  biggest_insight: z.string().optional(),
  primary_concern: z.string().optional(),
  improvement_next_week: z.string().optional(),

  // Deprecated/Legacy fields (Kept optional to prevent crashes if loaded)
  reasonsToCelebrate: z.string().optional(),
  businessLikeBusiness: z.string().optional(),
  ahas: z.string().optional(),
  improvements: z.string().optional(),
  readingListening: z.string().optional(),
  awakeAtNight: z.string().optional(),
  completedRealEstateReviews: z.string().optional(),
  plannedRealEstateReviews: z.string().optional(),
  completedCoffees: z.string().optional(),
  plannedCoffees: z.string().optional(),
  fordCount: z.string().optional(),
  recordedFordInfo: z.boolean().default(false),
  peopleToConnect: z.string().optional(),
  notesWrittenLastWeek: z.string().optional(),
  notesPlannedNextWeek: z.string().optional(),
  newBusinessBuyers: z.string().optional(),
  newBusinessSellers: z.string().optional(),
  newContactsAdded: z.string().optional(),
  days_readMastery: z.number().optional(),
  days_dailyAffirmations: z.number().optional(),
  days_dailyGratitudes: z.number().optional(),
  days_reviewLists: z.number().optional(),
  checklist_reviewYearlyGoals: z.boolean().optional(),
  checklist_reviewMonthlyGoals: z.boolean().optional(),
  checklist_reviewWeeklyGoals: z.boolean().optional(),
  checklist_reviewMeetingNotes: z.boolean().optional(),
  checklist_reviewBusinessPlan: z.boolean().optional(),
  
  messageToCoach: z.string().optional(),
});

export default function WeeklyReport() {
  const [activeTab, setActiveTab] = useState("overview");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [noteUploads, setNoteUploads] = useState<NoteUpload[]>([]);

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

      inbox_zero_confirmed: false,
      loose_notes_captured: false,
      calendar_reviewed: false,
      waiting_for_reviewed: false,
      next_actions_reviewed: false,
      projects_reviewed: false,
      someday_reviewed: false,
      reference_trusted: false,
      
      week_focus_category: "growth",
      
      pie_productive: "",
      pie_indirect: "",
      pie_educational: "",
      
      offersWritten: "",
      contractsMutual: "",
      dealsUnderContract: "",
      dealsClosed: "",
      buyerAppointments: "",
      listingAppointments: "",
      newListingsTaken: "",
      
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
  
  const handleBatchUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const newUploads = files.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        preview: URL.createObjectURL(file),
        taggedPerson: ""
      }));
      setNoteUploads(prev => [...prev, ...newUploads]);
      toast({
        title: "Notes Added",
        description: `${files.length} images added. Please tag associated people.`,
      });
    }
  };

  const updateTaggedPerson = (id: string, name: string) => {
    setNoteUploads(prev => prev.map(note => 
      note.id === id ? { ...note, taggedPerson: name } : note
    ));
  };

  const removeUpload = (id: string) => {
    setNoteUploads(prev => prev.filter(note => note.id !== id));
  };
  
  const handlePrint = () => {
    window.print();
  };
  
  const handleEmail = () => {
    if (!emailTo) {
      toast({
        title: "Error",
        description: "Please enter an email address.",
        variant: "destructive"
      });
      return;
    }
    toast({
      title: "Email Sent",
      description: `Report PDF has been sent to ${emailTo}`,
    });
    setEmailOpen(false);
    setEmailTo("");
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    
    if (values.familyMission) localStorage.setItem("ninja_familyMission", values.familyMission);
    if (values.businessMission) localStorage.setItem("ninja_businessMission", values.businessMission);
    if (values.quarterlyFocus) localStorage.setItem("ninja_quarterlyFocus", values.quarterlyFocus);
    if (values.wordOfYear) localStorage.setItem("ninja_wordOfYear", values.wordOfYear);
    if (values.affirmation) localStorage.setItem("ninja_affirmation", values.affirmation);

    if (noteUploads.length > 0) {
       const taggedCount = noteUploads.filter(n => n.taggedPerson).length;
       toast({
         title: "Processing Notes",
         description: `Logging ${taggedCount} notes to contact records & syncing to Cloze...`,
       });
    } else {
        toast({
          title: "Report Saved",
          description: "Your weekly operating review has been successfully saved.",
        });
    }
    setTimeout(() => setLocation("/"), 1500);
  }

  return (
    <div className="min-h-screen bg-secondary/30 relative">
      <div 
        className="fixed inset-0 opacity-40 mix-blend-multiply pointer-events-none -z-10 no-print"
        style={{ backgroundImage: `url(${paperBg})`, backgroundSize: 'cover' }}
      />

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-4 mb-8 no-print">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-serif font-bold text-primary">Weekly Operating Review</h1>
            <p className="text-muted-foreground">Ninja Selling + GTD System Integrity</p>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handlePrint} variant="outline" className="gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
            
            <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Mail className="h-4 w-4" /> Email PDF
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Email Report</DialogTitle>
                  <DialogDescription>
                    Send a PDF copy of this weekly report to your coach or accountability partner.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <FormLabel>Recipient Email</FormLabel>
                  <Input 
                    placeholder="coach@example.com" 
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <DialogFooter>
                  <Button onClick={handleEmail} className="gap-2">
                    <Send className="h-4 w-4" /> Send Report
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button onClick={form.handleSubmit(onSubmit)} className="gap-2 shadow-md">
              <Save className="h-4 w-4" /> Save Review
            </Button>
          </div>
        </div>

        {/* Print-only Header */}
        <div className="hidden print:block mb-8">
           <h1 className="text-2xl font-bold text-black">Weekly Operating Review</h1>
           <p className="text-sm text-gray-600">Ninja Selling + GTD System Integrity</p>
           <div className="h-px bg-black mt-4 mb-8"></div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full justify-start h-auto p-1 bg-card/50 backdrop-blur-sm border shadow-sm overflow-x-auto no-print">
                <TabsTrigger value="overview" className="gap-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <User className="h-4 w-4" /> Snapshot
                </TabsTrigger>
                <TabsTrigger value="review" className="gap-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <ListTodo className="h-4 w-4" /> GTD Review
                </TabsTrigger>
                <TabsTrigger value="habits" className="gap-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Check className="h-4 w-4" /> Habits
                </TabsTrigger>
                <TabsTrigger value="results" className="gap-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Activity className="h-4 w-4" /> Results
                </TabsTrigger>
                <TabsTrigger value="focus" className="gap-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Briefcase className="h-4 w-4" /> Focus & Reflection
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                {/* --- SNAPSHOT TAB --- */}
                <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="border-none shadow-md">
                    <CardHeader className="bg-primary/5 pb-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="font-serif">Weekly Snapshot</CardTitle>
                          <CardDescription>High-level clarity and self-honesty</CardDescription>
                        </div>
                        <div className="flex gap-2 text-xs text-muted-foreground items-center bg-background/50 px-2 py-1 rounded-md border no-print">
                          <RefreshCw className="h-3 w-3" /> Auto-saved
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
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Week Ending</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} className="bg-background/50" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <div className="md:col-span-2 grid md:grid-cols-3 gap-6 pt-4">
                        <FormField
                          control={form.control}
                          name="businessDirection"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Business Direction (1-10)</FormLabel>
                              <FormControl>
                                <Rating value={field.value} onChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="timeManagement"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Time & Energy (1-10)</FormLabel>
                              <FormControl>
                                <Rating value={field.value} onChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="implementingNinja"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Ninja Implementation (1-10)</FormLabel>
                              <FormControl>
                                <Rating value={field.value} onChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="affirmation"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2 pt-4">
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
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                  
                  <div className="flex justify-end no-print">
                    <Button type="button" onClick={() => setActiveTab("review")} variant="outline" className="gap-2">
                      Next: GTD Review <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                {/* --- GTD REVIEW TAB --- */}
                <TabsContent value="review" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="border-none shadow-md">
                    <CardHeader className="bg-primary/5 pb-4">
                      <CardTitle className="font-serif">GTD Control Check</CardTitle>
                      <CardDescription>Confirm system trust. "Did I trust my system?"</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid gap-4">
                        {[
                          { name: "inbox_zero_confirmed", label: "Inbox Zero Confirmed (Email & Slack)" },
                          { name: "loose_notes_captured", label: "Loose Notes Captured to Inbox" },
                          { name: "calendar_reviewed", label: "Calendar Reviewed (Past 2 weeks & Next 4 weeks)" },
                          { name: "waiting_for_reviewed", label: "Waiting For List Reviewed" },
                          { name: "next_actions_reviewed", label: "Next Actions Lists Reviewed" },
                          { name: "projects_reviewed", label: "Projects List Reviewed" },
                          { name: "someday_reviewed", label: "Someday/Maybe List Reviewed" },
                          { name: "reference_trusted", label: "Reference System Trusted & Clean" },
                        ].map((item) => (
                          <FormField
                            key={item.name}
                            control={form.control}
                            name={item.name as any}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 bg-secondary/20 hover:bg-secondary/30 transition-colors">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    className="h-5 w-5"
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="cursor-pointer font-medium text-base">
                                    {item.label}
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      
                      <div className="mt-6">
                        <FormField
                          control={form.control}
                          name="system_breakdown_note"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>System Breakdown Note (Optional)</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Where is there friction in the system?" 
                                  {...field} 
                                  className="bg-background/50" 
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="flex justify-between no-print">
                    <Button type="button" onClick={() => setActiveTab("overview")} variant="ghost">Previous</Button>
                    <Button type="button" onClick={() => setActiveTab("habits")} variant="outline" className="gap-2">
                      Next: Ninja Habits <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                {/* --- HABITS TAB --- */}
                <TabsContent value="habits" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="border-none shadow-md">
                    <CardHeader className="bg-primary/5 pb-4">
                      <CardTitle className="font-serif">Ninja Habits</CardTitle>
                      <CardDescription>Rate your commitment (1-10) and log counts where applicable.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid gap-6">
                        {[
                          { name: "weeklyPlanning", label: "Weekly planning meeting", hasCount: false },
                          { name: "dailyMovement", label: "Daily movement or exercise", hasCount: false },
                          { name: "agendaSticking", label: "Sticking to your agenda", hasCount: false },
                          { name: "hoursOfPower", label: "Hours of Power", hasCount: true, countName: "count_hoursOfPower", countLabel: "Hours" },
                          { name: "handwrittenNotes", label: "Handwritten notes", hasCount: true, countName: "count_handwrittenNotes", countLabel: "Count" },
                          { name: "realEstateReviews", label: "Real estate reviews", hasCount: true, countName: "count_realEstateReviews", countLabel: "Count" },
                          { name: "customerServiceCalls", label: "Customer service calls", hasCount: true, countName: "count_customerServiceCalls", countLabel: "Hours" },
                          { name: "lunchesCoffees", label: "Lunches, coffees, breakfasts", hasCount: true, countName: "count_lunchesCoffees", countLabel: "Count" },
                          { name: "fordContacts", label: "FORD contacts 'live interviews'", hasCount: true, countName: "count_fordContacts", countLabel: "Count" },
                          { name: "paperworkCleanup", label: "Paperwork cleanup", hasCount: true, countName: "count_paperworkCleanup", countLabel: "Hours" },
                          { name: "databaseMaintenance", label: "Maintaining database", hasCount: true, countName: "count_newContacts", countLabel: "New Contacts" },
                          { name: "warmListFocus", label: "Daily focus on warm list", hasCount: false },
                          { name: "hotListFocus", label: "Daily focus on hot list", hasCount: false },
                          { name: "dailyGratitudes", label: "Daily gratitudes", hasCount: false },
                          { name: "dailyAffirmations", label: "Daily affirmations", hasCount: false },
                        ].map((habit) => (
                          <div key={habit.name} className="flex flex-col md:flex-row md:items-center gap-4 border-b border-border/50 pb-4 last:border-0 last:pb-0">
                            <FormField
                              control={form.control}
                              name={habit.name as any}
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormLabel className="text-sm font-normal">{habit.label}</FormLabel>
                                  <FormControl>
                                    <Rating value={field.value} onChange={field.onChange} className="justify-start" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            {habit.hasCount && (
                              <FormField
                                control={form.control}
                                name={habit.countName as any}
                                render={({ field }) => (
                                  <FormItem className="w-32">
                                    <FormLabel className="text-xs text-muted-foreground">{habit.countLabel}</FormLabel>
                                    <FormControl>
                                      <Input type="number" placeholder="0" {...field} className="h-9" />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="flex justify-between no-print">
                    <Button type="button" onClick={() => setActiveTab("review")} variant="ghost">Previous</Button>
                    <Button type="button" onClick={() => setActiveTab("results")} variant="outline" className="gap-2">
                      Next: Results <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                {/* --- RESULTS TAB --- */}
                <TabsContent value="results" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="border-none shadow-md">
                      <CardHeader className="bg-primary/5 pb-4">
                        <CardTitle className="font-serif">Results (Numeric)</CardTitle>
                        <CardDescription>Outcome tracking only (no YTD math)</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-4">
                        {[
                          { name: "offersWritten", label: "Offers Written" },
                          { name: "contractsMutual", label: "Contracts Ratified" },
                          { name: "dealsUnderContract", label: "Deals Under Contract" },
                          { name: "dealsClosed", label: "Deals Closed" },
                          { name: "buyerAppointments", label: "Buyer Appointments" },
                          { name: "listingAppointments", label: "Listing Appointments" },
                          { name: "newListingsTaken", label: "New Listings Taken" },
                        ].map((field) => (
                          <FormField
                            key={field.name}
                            control={form.control}
                            name={field.name as any}
                            render={({ field: f }) => (
                              <FormItem className="flex items-center justify-between">
                                <FormLabel className="font-normal">{field.label}</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0" {...f} className="w-24 text-right" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        ))}
                      </CardContent>
                    </Card>

                    <Card className="border-none shadow-md">
                      <CardHeader className="bg-primary/5 pb-4">
                        <CardTitle className="font-serif">Batch Note Upload</CardTitle>
                        <CardDescription>Upload pics of handwritten notes</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="border-2 border-dashed border-input rounded-lg p-6 bg-background/50 transition-colors cursor-pointer group relative mb-4">
                          <Input 
                            type="file" 
                            multiple 
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            onChange={handleBatchUpload}
                          />
                          <div className="flex flex-col items-center justify-center text-center">
                            <CloudUpload className="h-8 w-8 text-muted-foreground mb-2 group-hover:text-primary transition-colors" />
                            <p className="text-sm text-muted-foreground">
                              <span className="font-semibold text-primary">Click to upload</span>
                            </p>
                          </div>
                        </div>

                        {noteUploads.length > 0 && (
                          <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {noteUploads.map((note) => (
                              <div key={note.id} className="flex gap-2 p-2 bg-secondary/30 rounded border text-xs">
                                <div className="h-10 w-10 flex-shrink-0 bg-black/5 rounded overflow-hidden">
                                  <img src={note.preview} alt="Note" className="h-full w-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <Input 
                                    placeholder="Tag person..." 
                                    className="h-7 text-xs" 
                                    value={note.taggedPerson}
                                    onChange={(e) => updateTaggedPerson(note.id, e.target.value)}
                                  />
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeUpload(note.id)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="flex justify-between no-print">
                    <Button type="button" onClick={() => setActiveTab("habits")} variant="ghost">Previous</Button>
                    <Button type="button" onClick={() => setActiveTab("focus")} variant="outline" className="gap-2">
                      Next: Focus & Reflection <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                {/* --- FOCUS & REFLECTION TAB --- */}
                <TabsContent value="focus" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="border-none shadow-md">
                    <CardHeader className="bg-primary/5 pb-4">
                      <CardTitle className="font-serif">Project & Priority Alignment</CardTitle>
                      <CardDescription>Bridge GTD "Projects" with Ninja execution focus</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                      <FormField
                        control={form.control}
                        name="week_focus_category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Week Focus Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select focus..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="growth">Growth (New business, marketing)</SelectItem>
                                <SelectItem value="service">Service (Current deals, active clients)</SelectItem>
                                <SelectItem value="cleanup">Cleanup (Admin, catch-up)</SelectItem>
                                <SelectItem value="recovery">Recovery (Rest, vacation, low energy)</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="last_week_top_outcomes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Week's Top Outcomes</FormLabel>
                              <FormControl>
                                <Textarea placeholder="- Closed Deal A&#10;- Sent 50 mailers" {...field} className="min-h-[100px]" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="next_week_top_outcomes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Next Week's Top Outcomes</FormLabel>
                              <FormControl>
                                <Textarea placeholder="- List Property B&#10;- Finish Taxes" {...field} className="min-h-[100px]" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-md">
                    <CardHeader className="bg-primary/5 pb-4">
                      <CardTitle className="font-serif">Reflection</CardTitle>
                      <CardDescription>Minimal narrative reflection for context</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 grid md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="biggest_win"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Biggest Win</FormLabel>
                            <FormControl>
                              <Textarea {...field} className="h-20" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="biggest_insight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Biggest Insight</FormLabel>
                            <FormControl>
                              <Textarea {...field} className="h-20" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="primary_concern"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary Concern</FormLabel>
                            <FormControl>
                              <Textarea {...field} className="h-20" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="improvement_next_week"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Improvement for Next Week</FormLabel>
                            <FormControl>
                              <Textarea {...field} className="h-20" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
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
                                className="min-h-[150px]" 
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <div className="flex justify-between items-center pt-8 no-print">
                    <Button type="button" onClick={() => setActiveTab("results")} variant="ghost">Previous</Button>
                    <div className="flex gap-4">
                      <Link href="/">
                        <Button variant="outline">Cancel</Button>
                      </Link>
                      <Button type="submit" size="lg" className="shadow-lg hover:shadow-xl transition-all">
                        <Save className="mr-2 h-4 w-4" /> Save Review
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
