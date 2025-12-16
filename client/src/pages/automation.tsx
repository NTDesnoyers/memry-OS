import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { 
  RefreshCw, 
  CheckCircle2, 
  ArrowRight, 
  Bot, 
  Video, 
  FileText, 
  Mic, 
  ListTodo, 
  Mail, 
  User, 
  Zap, 
  Play, 
  Loader2,
  Filter
} from "lucide-react";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";
import { useToast } from "@/hooks/use-toast";

export default function AutomationHub() {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [activities, setActivities] = useState([
    {
      id: 1,
      source: "Plaud Note",
      type: "Conversation",
      summary: "Coffee with Alice Johnson re: Selling 123 Main St",
      time: "2 hours ago",
      status: "processed",
      actions: [
        { type: "task", text: "Created Todoist task: Send CMA to Alice" },
        { type: "log", text: "Logged meeting to Alice Johnson (Cloze)" },
        { type: "email", text: "Drafted follow-up email" }
      ]
    },
    {
      id: 2,
      source: "Fathom.video",
      type: "Meeting",
      summary: "Buyer Consultation with The Smiths",
      time: "Yesterday",
      status: "processed",
      actions: [
        { type: "task", text: "Created Todoist task: Setup saved search" },
        { type: "log", text: "Logged meeting notes to Smith Family (Cloze)" }
      ]
    }
  ]);

  const handleSync = () => {
    setIsSyncing(true);
    
    // Simulate multi-step processing
    setTimeout(() => {
      toast({
        title: "Checking Integrations",
        description: "Fetching new recordings from Plaud, Fathom & Granola...",
      });
    }, 1000);

    setTimeout(() => {
      toast({
        title: "Processing Conversations",
        description: "AI Agent analyzing transcripts for tasks & contacts...",
      });
    }, 3000);

    setTimeout(() => {
      setIsSyncing(false);
      const newActivity = {
        id: Date.now(),
        source: "Granola",
        type: "Meeting Note",
        summary: "Weekly Team Sync - Market Update",
        time: "Just now",
        status: "processed",
        actions: [
          { type: "task", text: "Created Todoist task: Share market stats on social" },
          { type: "log", text: "Logged notes to Business Plan (Cloze)" }
        ]
      };
      setActivities([newActivity, ...activities]);
      toast({
        title: "Sync Complete",
        description: "1 new conversation processed and actions executed.",
      });
    }, 5000);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-secondary/30 relative">
        <div 
          className="fixed inset-0 opacity-40 mix-blend-multiply pointer-events-none -z-10"
          style={{ backgroundImage: `url(${paperBg})`, backgroundSize: 'cover' }}
        />
        
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <header className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-3xl font-serif font-bold text-primary flex items-center gap-3">
                <Zap className="h-8 w-8 text-yellow-500 fill-yellow-500" />
                Automation Hub
              </h1>
              <p className="text-muted-foreground mt-2">
                Central processing for all your voice & meeting inputs.
              </p>
            </div>
            <Button 
              size="lg" 
              onClick={handleSync} 
              disabled={isSyncing}
              className="gap-2 shadow-lg hover:shadow-xl transition-all"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing AI Workflow...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 fill-current" />
                  Run Auto-Sync Now
                </>
              )}
            </Button>
          </header>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Workflow Visualizer */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-none shadow-md overflow-hidden">
                <CardHeader className="bg-primary/5 pb-4">
                  <CardTitle className="font-serif">Active Workflow</CardTitle>
                  <CardDescription>How your data flows from input to action</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="relative p-8 flex flex-col gap-8">
                    {/* Sources */}
                    <div className="flex justify-between items-center relative z-10">
                      <div className="flex flex-col gap-4 w-1/3">
                        <div className="p-3 bg-white border rounded-lg shadow-sm flex items-center gap-3">
                          <div className="p-2 bg-slate-100 rounded-full"><Mic className="h-4 w-4 text-slate-700" /></div>
                          <span className="font-medium text-sm">Plaud Note</span>
                        </div>
                        <div className="p-3 bg-white border rounded-lg shadow-sm flex items-center gap-3">
                          <div className="p-2 bg-emerald-100 rounded-full"><Video className="h-4 w-4 text-emerald-700" /></div>
                          <span className="font-medium text-sm">Fathom</span>
                        </div>
                        <div className="p-3 bg-white border rounded-lg shadow-sm flex items-center gap-3">
                          <div className="p-2 bg-amber-100 rounded-full"><FileText className="h-4 w-4 text-amber-700" /></div>
                          <span className="font-medium text-sm">Granola</span>
                        </div>
                      </div>

                      {/* AI Processor */}
                      <div className="w-1/3 flex flex-col items-center justify-center">
                        <div className={`
                          h-24 w-24 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 
                          flex items-center justify-center shadow-xl z-20 transition-all duration-500
                          ${isSyncing ? 'scale-110 shadow-purple-500/50' : ''}
                        `}>
                          <Bot className={`h-10 w-10 text-white ${isSyncing ? 'animate-pulse' : ''}`} />
                        </div>
                        <div className="mt-4 text-center">
                          <Badge variant="secondary" className="gap-1">
                            <SparklesIcon className="h-3 w-3" /> AI Processor
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            Identifies Contact • Extracts Tasks • Summarizes
                          </p>
                        </div>
                      </div>

                      {/* Destinations */}
                      <div className="flex flex-col gap-4 w-1/3 items-end">
                        <div className="p-3 bg-white border rounded-lg shadow-sm flex items-center gap-3 w-full justify-end">
                          <span className="font-medium text-sm">Cloze Log</span>
                          <div className="p-2 bg-blue-100 rounded-full"><User className="h-4 w-4 text-blue-700" /></div>
                        </div>
                        <div className="p-3 bg-white border rounded-lg shadow-sm flex items-center gap-3 w-full justify-end">
                          <span className="font-medium text-sm">Todoist Task</span>
                          <div className="p-2 bg-red-100 rounded-full"><ListTodo className="h-4 w-4 text-red-700" /></div>
                        </div>
                        <div className="p-3 bg-white border rounded-lg shadow-sm flex items-center gap-3 w-full justify-end">
                          <span className="font-medium text-sm">Email Draft</span>
                          <div className="p-2 bg-slate-100 rounded-full"><Mail className="h-4 w-4 text-slate-700" /></div>
                        </div>
                      </div>

                      {/* Connecting Lines (Visual Decor) */}
                      <svg className="absolute inset-0 w-full h-full -z-10 pointer-events-none" style={{ opacity: 0.2 }}>
                        <path d="M100 60 C 200 60, 300 150, 400 150" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className={isSyncing ? "animate-dash" : ""} />
                        <path d="M100 150 C 200 150, 300 150, 400 150" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className={isSyncing ? "animate-dash" : ""} />
                        <path d="M100 240 C 200 240, 300 150, 400 150" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className={isSyncing ? "animate-dash" : ""} />
                        
                        <path d="M500 150 C 600 150, 700 60, 800 60" fill="none" stroke="currentColor" strokeWidth="2" />
                        <path d="M500 150 C 600 150, 700 150, 800 150" fill="none" stroke="currentColor" strokeWidth="2" />
                        <path d="M500 150 C 600 150, 700 240, 800 240" fill="none" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Logic Configuration */}
              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">Processing Rules</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-secondary/30 rounded-lg border">
                    <Filter className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h4 className="font-medium">Contact Matching Logic</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        When a name is detected (e.g., "John Smith"), the AI searches your Cloze database.
                        If a match is found, the interaction is logged to their profile.
                        If no match, it creates a "New Contact" draft.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-secondary/30 rounded-lg border">
                    <ListTodo className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h4 className="font-medium">Task Extraction</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Action items like "Send email", "Schedule meeting", or "Prepare CMA" are automatically
                        converted to Todoist tasks with due dates inferred from context.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity Log */}
            <div className="space-y-6">
              <Card className="border-none shadow-md h-full">
                <CardHeader className="bg-primary/5 pb-4">
                  <CardTitle className="font-serif">Recent Synced Activity</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="relative border-l-2 border-primary/20 ml-3 space-y-8 pb-4">
                    {activities.map((activity) => (
                      <div key={activity.id} className="relative pl-6 animate-in slide-in-from-left-2 duration-500">
                        {/* Timeline Dot */}
                        <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-4 border-background bg-green-500" />
                        
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {activity.source}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{activity.time}</span>
                          </div>
                          
                          <h4 className="font-semibold text-sm mt-1">{activity.summary}</h4>
                          
                          <div className="mt-3 space-y-2">
                            {activity.actions.map((action, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-xs bg-secondary/50 p-2 rounded">
                                {action.type === 'task' && <CheckCircle2 className="h-3 w-3 text-red-500 mt-0.5" />}
                                {action.type === 'log' && <User className="h-3 w-3 text-blue-500 mt-0.5" />}
                                {action.type === 'email' && <Mail className="h-3 w-3 text-slate-500 mt-0.5" />}
                                <span className="text-muted-foreground">{action.text}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function SparklesIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  )
}
