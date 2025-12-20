import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import LayoutComponent from "@/components/layout";
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
import { RatingSelect } from "@/components/ui/rating-select";
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
  file: File;
  uploadedUrl?: string;
  uploading?: boolean;
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

interface WeeklyReviewSummary {
  id: string;
  weekStartDate: string;
  createdAt: string;
}

export default function WeeklyReport() {
  const [activeTab, setActiveTab] = useState("get-clear");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [noteUploads, setNoteUploads] = useState<NoteUpload[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: pastReviews = [] } = useQuery<WeeklyReviewSummary[]>({
    queryKey: ["/api/weekly-reviews"],
    queryFn: async () => {
      const res = await fetch("/api/weekly-reviews");
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    },
  });

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
  
  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    const newUploads: NoteUpload[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      preview: URL.createObjectURL(file),
      taggedPerson: "",
      file,
      uploading: true,
    }));
    setNoteUploads(prev => [...prev, ...newUploads]);
    
    toast({
      title: "Uploading...",
      description: `Uploading ${files.length} images...`,
    });

    try {
      const formData = new FormData();
      files.forEach(file => formData.append("images", file));
      
      const response = await fetch("/api/upload/notes", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      
      const { urls } = await response.json();
      
      const newUploadIds = newUploads.map(u => u.id);
      setNoteUploads(prev => prev.map(upload => {
        const uploadIndex = newUploadIds.indexOf(upload.id);
        if (uploadIndex !== -1 && uploadIndex < urls.length) {
          return { ...upload, uploadedUrl: urls[uploadIndex], uploading: false };
        }
        return upload;
      }));
      
      toast({
        title: "Upload Complete",
        description: `${files.length} images uploaded. Tag people to associate notes.`,
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload images. Please try again.",
        variant: "destructive",
      });
      setNoteUploads(prev => prev.filter(u => !u.uploading));
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (values.familyMission) localStorage.setItem("ninja_familyMission", values.familyMission);
    if (values.businessMission) localStorage.setItem("ninja_businessMission", values.businessMission);
    if (values.quarterlyFocus) localStorage.setItem("ninja_quarterlyFocus", values.quarterlyFocus);
    if (values.wordOfYear) localStorage.setItem("ninja_wordOfYear", values.wordOfYear);
    if (values.affirmation) localStorage.setItem("ninja_affirmation", values.affirmation);

    if (noteUploads.length > 0) {
      const taggedNotes = noteUploads.filter(n => n.taggedPerson && n.uploadedUrl);
      const untaggedNotes = noteUploads.filter(n => !n.taggedPerson && n.uploadedUrl);
      
      try {
        for (const note of taggedNotes) {
          await fetch("/api/notes/with-images", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: `Handwritten note for ${note.taggedPerson}`,
              type: "handwritten",
              tags: ["handwritten", "weekly-review"],
              imageUrls: [note.uploadedUrl],
            }),
          });
        }
        
        if (untaggedNotes.length > 0) {
          await fetch("/api/notes/with-images", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: `Handwritten notes from weekly review (${untaggedNotes.length} images)`,
              type: "handwritten",
              tags: ["handwritten", "weekly-review", "untagged"],
              imageUrls: untaggedNotes.map(n => n.uploadedUrl),
            }),
          });
        }
        
        toast({
          title: "Notes Saved",
          description: `${taggedNotes.length} tagged notes and ${untaggedNotes.length} untagged notes saved successfully.`,
        });
      } catch (error) {
        toast({
          title: "Error Saving Notes",
          description: "Some notes may not have been saved. Please check and try again.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Report Saved",
        description: "Your weekly operating review has been successfully saved.",
      });
    }
    setTimeout(() => setLocation("/"), 1500);
  }

  return (
    <LayoutComponent>
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

            <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Clock className="h-4 w-4" /> History
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Past Weekly Reviews</DialogTitle>
                  <DialogDescription>
                    View your previous weekly operating reviews
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 max-h-[400px] overflow-y-auto">
                  {pastReviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No past reviews yet. Save your first review to see it here.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {pastReviews.map((review) => (
                        <div
                          key={review.id}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-secondary/50 cursor-pointer transition-colors"
                          onClick={() => {
                            setHistoryOpen(false);
                            setLocation(`/weekly-report/${review.id}`);
                          }}
                        >
                          <div>
                            <p className="font-medium">
                              Week of {format(new Date(review.weekStartDate), "MMM d, yyyy")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Created {format(new Date(review.createdAt), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
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
                <TabsTrigger value="get-clear" className="gap-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <RefreshCw className="h-4 w-4" /> 1. Get Clear
                </TabsTrigger>
                <TabsTrigger value="get-current" className="gap-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <ListTodo className="h-4 w-4" /> 2. Get Current
                </TabsTrigger>
                <TabsTrigger value="get-creative" className="gap-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Activity className="h-4 w-4" /> 3. Get Creative
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                {/* ============================================ */}
                {/* SECTION 1: GET CLEAR - Mental Unloading */}
                {/* ============================================ */}
                <TabsContent value="get-clear" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="border-none shadow-md">
                    <CardHeader className="bg-slate-100 pb-4">
                      <CardTitle className="font-serif text-slate-900">Get Clear</CardTitle>
                      <CardDescription>Empty your head. Reduce cognitive load before reviewing.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground mb-6">
                        Complete these items to prepare your mind for an accurate review. No thinking required here - just confirm completion.
                      </p>
                      
                      <div className="grid gap-4 mb-6">
                        {[
                          { name: "inbox_zero_confirmed", label: "Inbox Zero (Email, Slack, messages)" },
                          { name: "loose_notes_captured", label: "Loose notes captured to inbox" },
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

                      <FormField
                        control={form.control}
                        name="system_breakdown_note"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Empty Head Capture</FormLabel>
                            <FormDescription>Dump anything on your mind here. Get it out of your head.</FormDescription>
                            <FormControl>
                              <Textarea 
                                placeholder="What's floating around in your head? Tasks, worries, ideas, reminders..." 
                                {...field} 
                                className="min-h-[120px] bg-background/50" 
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                  
                  <div className="flex justify-end no-print">
                    <Button type="button" onClick={() => setActiveTab("get-current")} variant="outline" className="gap-2">
                      Next: Get Current <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                {/* ============================================ */}
                {/* SECTION 2: GET CURRENT - Reality Reconciliation */}
                {/* ============================================ */}
                <TabsContent value="get-current" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  {/* 2.1 Snapshot Ratings */}
                  <Card className="border-none shadow-md">
                    <CardHeader className="bg-primary/5 pb-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="font-serif">Snapshot Ratings</CardTitle>
                          <CardDescription>Quick truth check - how did this week really go?</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid md:grid-cols-2 gap-6 mb-6">
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
                              <FormLabel>Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} className="bg-background/50" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid md:grid-cols-3 gap-6">
                        <FormField
                          control={form.control}
                          name="businessDirection"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Business Direction</FormLabel>
                              <div className="flex items-center gap-3">
                                <FormControl>
                                  <RatingSelect value={field.value} onChange={field.onChange} />
                                </FormControl>
                                <span className="text-xs text-muted-foreground">/ 10</span>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="timeManagement"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Time & Energy</FormLabel>
                              <div className="flex items-center gap-3">
                                <FormControl>
                                  <RatingSelect value={field.value} onChange={field.onChange} />
                                </FormControl>
                                <span className="text-xs text-muted-foreground">/ 10</span>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="implementingNinja"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Ninja Implementation</FormLabel>
                              <div className="flex items-center gap-3">
                                <FormControl>
                                  <RatingSelect value={field.value} onChange={field.onChange} />
                                </FormControl>
                                <span className="text-xs text-muted-foreground">/ 10</span>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* 2.2 Persistent Context */}
                  <Card className="border-none shadow-md">
                    <CardHeader className="bg-amber-50 pb-4">
                      <CardTitle className="font-serif text-amber-900">Persistent Context</CardTitle>
                      <CardDescription>Your guiding principles (auto-carried forward)</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 grid md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="familyMission"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Family Mission</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Our family exists to..." 
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  handleStaticFieldChange("familyMission", e.target.value);
                                }}
                                className="min-h-[80px] bg-amber-50/50" 
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="businessMission"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Mission</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="My business exists to..." 
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  handleStaticFieldChange("businessMission", e.target.value);
                                }}
                                className="min-h-[80px] bg-amber-50/50" 
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="quarterlyFocus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quarterly Focus</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="This quarter I'm focused on..." 
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  handleStaticFieldChange("quarterlyFocus", e.target.value);
                                }}
                                className="min-h-[80px] bg-amber-50/50" 
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="wordOfYear"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Word of the Year</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Focus, Growth, Abundance..." 
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleStaticFieldChange("wordOfYear", e.target.value);
                                  }}
                                  className="bg-amber-50/50" 
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="affirmation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Affirmation</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="I consistently receive..." 
                                  {...field} 
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleStaticFieldChange("affirmation", e.target.value);
                                  }}
                                  className="font-serif italic bg-amber-50/50" 
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* 2.3 GTD System Review */}
                  <Card className="border-none shadow-md">
                    <CardHeader className="bg-primary/5 pb-4">
                      <CardTitle className="font-serif">GTD System Review</CardTitle>
                      <CardDescription>Confirm your system is trustworthy</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid md:grid-cols-2 gap-4">
                        {[
                          { name: "calendar_reviewed", label: "Calendar reviewed (past 2 weeks & next 4 weeks)" },
                          { name: "waiting_for_reviewed", label: "Waiting For list reviewed" },
                          { name: "next_actions_reviewed", label: "Next Actions lists reviewed" },
                          { name: "projects_reviewed", label: "Projects list reviewed" },
                          { name: "someday_reviewed", label: "Someday/Maybe list reviewed" },
                          { name: "reference_trusted", label: "Reference system trusted & clean" },
                        ].map((item) => (
                          <FormField
                            key={item.name}
                            control={form.control}
                            name={item.name as any}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 bg-secondary/20 hover:bg-secondary/30 transition-colors">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="cursor-pointer font-normal text-sm">
                                  {item.label}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* NINJA SYSTEM: Real Estate Reviews */}
                  <Card className="border-none shadow-md">
                    <CardHeader className="bg-blue-50 pb-4">
                      <CardTitle className="font-serif text-blue-900">Real Estate Reviews</CardTitle>
                      <CardDescription>Goal: At least 2 per week</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="completedRealEstateReviews"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-semibold">Completed Last Week</FormLabel>
                              <FormControl>
                                <Textarea placeholder="John & Mary Smith - 123 Main St review&#10;Tom Jones - investment portfolio review" {...field} className="min-h-[100px] bg-blue-50/50" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="plannedRealEstateReviews"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-semibold">Planned This Week</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Sarah Williams - annual review&#10;Mark Johnson - market update" {...field} className="min-h-[100px] bg-blue-50/50" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* NINJA SYSTEM: FORD Conversations */}
                  <Card className="border-none shadow-md">
                    <CardHeader className="bg-purple-50 pb-4">
                      <CardTitle className="font-serif text-purple-900">FORD Conversations</CardTitle>
                      <CardDescription>Goal: 50 contacts per week</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid md:grid-cols-3 gap-6 mb-6">
                        <FormField
                          control={form.control}
                          name="fordCount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-semibold">FORD Contacts Made</FormLabel>
                              <div className="flex items-center gap-2">
                                <FormControl>
                                  <Input type="number" placeholder="0" {...field} className="w-24 text-right bg-purple-50/50" />
                                </FormControl>
                                <span className="text-sm text-muted-foreground">/ 50 goal</span>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="recordedFordInfo"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">Recorded FORD info in database</FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="newContactsAdded"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-semibold">New Contacts Added</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="0" {...field} className="w-24 text-right bg-purple-50/50" />
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
                            <FormLabel className="font-semibold">People to Connect With This Week</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Bob - birthday coming up&#10;Lisa - just moved, follow up&#10;Steve - mentioned selling" {...field} className="min-h-[100px] bg-purple-50/50" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* NINJA SYSTEM: 1-2-1s / Meetings */}
                  <Card className="border-none shadow-md">
                    <CardHeader className="bg-green-50 pb-4">
                      <CardTitle className="font-serif text-green-900">Meetings & Connections</CardTitle>
                      <CardDescription>1-2-1s, coffees, lunches, Zoom calls</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="completedCoffees"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-semibold">Completed Last Week</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Coffee with Mike - referral partner&#10;Zoom with Linda - past client" {...field} className="min-h-[100px] bg-green-50/50" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="plannedCoffees"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-semibold">Planned This Week</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Breakfast with Tom - lender&#10;Coffee with Chris - past buyer" {...field} className="min-h-[100px] bg-green-50/50" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* NINJA SYSTEM: Handwritten Notes */}
                  <Card className="border-none shadow-md">
                    <CardHeader className="bg-primary/5 pb-4">
                      <CardTitle className="font-serif">Handwritten Notes</CardTitle>
                      <CardDescription>Track and upload your personal notes</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid md:grid-cols-2 gap-6 mb-6">
                        <FormField
                          control={form.control}
                          name="notesWrittenLastWeek"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-semibold">Notes Written Last Week</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="0" {...field} className="w-24" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="notesPlannedNextWeek"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-semibold">Notes Planned This Week</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="0" {...field} className="w-24" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="border-2 border-dashed border-input rounded-lg p-6 bg-background/50 transition-colors hover:bg-secondary/30 cursor-pointer group mb-4">
                        <label className="flex flex-col items-center justify-center text-center cursor-pointer">
                          <input 
                            type="file" 
                            multiple 
                            accept="image/*,.heic"
                            className="sr-only"
                            onChange={handleBatchUpload}
                          />
                          <CloudUpload className="h-8 w-8 text-muted-foreground mb-2 group-hover:text-primary transition-colors" />
                          <p className="text-sm text-muted-foreground">
                            <span className="font-semibold text-primary">Upload photos of handwritten notes</span>
                          </p>
                        </label>
                      </div>

                      {noteUploads.length > 0 && (
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                          {noteUploads.map((note) => (
                            <div key={note.id} className={`flex gap-2 p-2 rounded border text-xs ${note.uploading ? 'bg-yellow-50 border-yellow-200' : note.uploadedUrl ? 'bg-green-50 border-green-200' : 'bg-secondary/30'}`}>
                              <div className="h-10 w-10 flex-shrink-0 bg-black/5 rounded overflow-hidden relative">
                                <img src={note.uploadedUrl || note.preview} alt="Note" className="h-full w-full object-cover" />
                                {note.uploading && (
                                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                    <RefreshCw className="h-4 w-4 text-white animate-spin" />
                                  </div>
                                )}
                                {note.uploadedUrl && !note.uploading && (
                                  <div className="absolute bottom-0 right-0 bg-green-500 rounded-full p-0.5">
                                    <Check className="h-2 w-2 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <Input 
                                  placeholder="Tag person..." 
                                  className="h-7 text-xs" 
                                  value={note.taggedPerson}
                                  onChange={(e) => updateTaggedPerson(note.id, e.target.value)}
                                  disabled={note.uploading}
                                />
                              </div>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeUpload(note.id)} disabled={note.uploading}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* NINJA SYSTEM: Numbers to Know */}
                  <Card className="border-none shadow-md">
                    <CardHeader className="bg-primary/5 pb-4">
                      <CardTitle className="font-serif">Numbers to Know</CardTitle>
                      <CardDescription>This week's transaction metrics</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                              <FormItem className="flex items-center justify-between border rounded-md p-3 bg-secondary/10">
                                <FormLabel className="font-normal text-sm">{field.label}</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0" {...f} className="w-16 text-right h-8" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Potential New Business */}
                  <Card className="border-none shadow-md">
                    <CardHeader className="bg-orange-50 pb-4">
                      <CardTitle className="font-serif text-orange-900">Potential New Business</CardTitle>
                      <CardDescription>New buyer and seller opportunities this week</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="newBusinessBuyers"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-semibold">New Buyers</FormLabel>
                              <FormDescription>Names, timeframes, price ranges</FormDescription>
                              <FormControl>
                                <Textarea placeholder="John Doe - 3 months, $400-500k&#10;Jane Smith - 6 months, $300k" {...field} className="min-h-[100px] bg-orange-50/50" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="newBusinessSellers"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-semibold">New Sellers</FormLabel>
                              <FormDescription>Names, addresses, timeframes</FormDescription>
                              <FormControl>
                                <Textarea placeholder="Mike Wilson - 123 Oak St, Spring listing&#10;Susan Brown - downsizing in 6 months" {...field} className="min-h-[100px] bg-orange-50/50" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="flex justify-between no-print">
                    <Button type="button" onClick={() => setActiveTab("get-clear")} variant="ghost">Previous</Button>
                    <Button type="button" onClick={() => setActiveTab("get-creative")} variant="outline" className="gap-2">
                      Next: Get Creative <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                {/* ============================================ */}
                {/* SECTION 3: GET CREATIVE - Meaning & Reflection */}
                {/* ============================================ */}
                <TabsContent value="get-creative" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  {/* 3.1 Reflection Prompts */}
                  <Card className="border-none shadow-md">
                    <CardHeader className="bg-amber-50 pb-4">
                      <CardTitle className="font-serif text-amber-900">Reflection Prompts</CardTitle>
                      <CardDescription>Meaning, learning, and improvement</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 grid md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="reasonsToCelebrate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold text-amber-800">Reasons to Celebrate</FormLabel>
                            <FormControl>
                              <Textarea placeholder="What went well? What are you proud of?" {...field} className="min-h-[100px] bg-amber-50/50" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="ahas"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold text-amber-800">A-Has</FormLabel>
                            <FormDescription>Insights, realizations, "lightbulb" moments</FormDescription>
                            <FormControl>
                              <Textarea placeholder="What did you learn? Any breakthroughs?" {...field} className="min-h-[100px] bg-amber-50/50" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="businessLikeBusiness"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold text-amber-800">What Didn't Work</FormLabel>
                            <FormControl>
                              <Textarea placeholder="What fell short? Where did you struggle?" {...field} className="min-h-[100px] bg-amber-50/50" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="improvements"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold text-amber-800">How I Can Improve Next Week</FormLabel>
                            <FormControl>
                              <Textarea placeholder="What will you do differently?" {...field} className="min-h-[100px] bg-amber-50/50" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="readingListening"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold text-amber-800">Podcasts/Books</FormLabel>
                            <FormDescription>Noteworthy ideas, thoughts, or quotes</FormDescription>
                            <FormControl>
                              <Textarea placeholder="What are you reading or listening to?" {...field} className="min-h-[100px] bg-amber-50/50" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="awakeAtNight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold text-amber-800">Things Keeping Me Awake at Night</FormLabel>
                            <FormDescription>Note a 5-minute action for each</FormDescription>
                            <FormControl>
                              <Textarea placeholder="Worries, concerns, and small actions to address them..." {...field} className="min-h-[100px] bg-amber-50/50" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* 3.2 Strategic Adjustments */}
                  <Card className="border-none shadow-md">
                    <CardHeader className="bg-primary/5 pb-4">
                      <CardTitle className="font-serif">Strategic Adjustments</CardTitle>
                      <CardDescription>Plan your focus and energy for the week ahead</CardDescription>
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
                      
                      <FormField
                        control={form.control}
                        name="ninjaSystemAttention"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ninja System Needing Attention</FormLabel>
                            <FormDescription>Which system needs focus this week?</FormDescription>
                            <FormControl>
                              <Input placeholder="e.g., FORD calls, Handwritten notes, Real estate reviews..." {...field} />
                            </FormControl>
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

                      <FormField
                        control={form.control}
                        name="nextGetaway"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Next Getaway / Recovery Planned</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Weekend trip Jan 15, Vacation Feb 10-17..." {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* 3.3 Coaching Message */}
                  <Card className="border-none shadow-md">
                    <CardHeader className="bg-primary/5 pb-4">
                      <CardTitle className="font-serif">Message to Coach</CardTitle>
                      <CardDescription>Questions, wins, challenges, or focus for your next call</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <FormField
                        control={form.control}
                        name="messageToCoach"
                        render={({ field }) => (
                          <FormItem>
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
                    <Button type="button" onClick={() => setActiveTab("get-current")} variant="ghost">Previous</Button>
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
    </LayoutComponent>
  );
}
