import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { RefreshCw, CheckCircle2, AlertCircle, Link as LinkIcon, Settings, Clock, Eye, Share2, ListTodo, Bot, Video, FileText, Sparkles, Brain, Mic, Mail, Zap, Calendar, Loader2 } from "lucide-react";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

function TodoistIntegrationCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: status, isLoading: statusLoading } = useQuery<{ connected: boolean; error?: string }>({
    queryKey: ["/api/todoist/status"],
  });
  
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/todoist/sync-tasks");
      return res.json();
    },
    onSuccess: (data: { synced: number; failed: number; total: number }) => {
      toast({ 
        title: "Tasks synced to Todoist", 
        description: `${data.synced} tasks synced, ${data.failed} failed out of ${data.total}` 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: (error: Error) => {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    },
  });
  
  const isConnected = status?.connected === true;
  
  return (
    <Card className="border-none shadow-md" data-testid="todoist-integration-card">
      <CardHeader className="bg-red-50/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">
            <ListTodo className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <CardTitle className="font-serif">Todoist</CardTitle>
            <CardDescription>Sync tasks to your Todoist inbox (GTD system)</CardDescription>
          </div>
          {statusLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          ) : isConnected ? (
            <Badge className="bg-green-100 text-green-700 border-green-200">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="text-gray-500">
              <AlertCircle className="h-3 w-3 mr-1" />
              Not Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {isConnected ? (
          <>
            <p className="text-sm text-gray-600">
              Tasks created in Ninja OS will sync to Todoist with the "ninja-os" label.
              Following GTD principles, Todoist is your single task inbox.
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={() => syncMutation.mutate()} 
                disabled={syncMutation.isPending}
                data-testid="button-sync-todoist"
              >
                {syncMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sync Tasks Now
              </Button>
            </div>
          </>
        ) : (
          <div className="text-sm text-gray-600">
            <p>Todoist integration is managed through Replit's connections panel.</p>
            <p className="mt-2 text-xs text-muted-foreground">
              The connection was set up via Replit integrations. If you see this as disconnected, 
              the OAuth token may have expired.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Integrations() {
  const { toast } = useToast();
  
  // Cloze State
  const [clozeKey, setClozeKey] = useState(localStorage.getItem("cloze_api_key") || "");
  const [showClozeKey, setShowClozeKey] = useState(false);
  
  // Todoist State
  const [todoistKey, setTodoistKey] = useState(localStorage.getItem("todoist_api_key") || "");
  const [showTodoistKey, setShowTodoistKey] = useState(false);
  
  // OpenAI State
  const [openaiKey, setOpenaiKey] = useState(localStorage.getItem("openai_api_key") || "");
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);

  // Anthropic State
  const [anthropicKey, setAnthropicKey] = useState(localStorage.getItem("anthropic_api_key") || "");
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);

  // Google Gemini State
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem("gemini_api_key") || "");
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  // Fathom State
  const [fathomKey, setFathomKey] = useState(localStorage.getItem("fathom_api_key") || "");
  const [showFathomKey, setShowFathomKey] = useState(false);

  // Granola State
  const [granolaKey, setGranolaKey] = useState(localStorage.getItem("granola_api_key") || "");
  const [showGranolaKey, setShowGranolaKey] = useState(false);

  // Plaud State
  const [plaudKey, setPlaudKey] = useState(localStorage.getItem("plaud_api_key") || "");
  const [showPlaudKey, setShowPlaudKey] = useState(false);

  // Gmail State
  const [gmailKey, setGmailKey] = useState(localStorage.getItem("gmail_api_key") || "");
  const [showGmailKey, setShowGmailKey] = useState(false);

  // Superhuman State
  const [superhumanKey, setSuperhumanKey] = useState(localStorage.getItem("superhuman_api_key") || "");
  const [showSuperhumanKey, setShowSuperhumanKey] = useState(false);

  // Generic Email State
  const [genericEmailKey, setGenericEmailKey] = useState(localStorage.getItem("generic_email_api_key") || "");
  const [showGenericEmailKey, setShowGenericEmailKey] = useState(false);

  // iCal State
  const [icalKey, setIcalKey] = useState(localStorage.getItem("ical_api_key") || "");
  const [showIcalKey, setShowIcalKey] = useState(false);

  // Google Calendar State
  const [googleCalendarKey, setGoogleCalendarKey] = useState(localStorage.getItem("google_calendar_api_key") || "");
  const [showGoogleCalendarKey, setShowGoogleCalendarKey] = useState(false);

  // Outlook Calendar State
  const [outlookCalendarKey, setOutlookCalendarKey] = useState(localStorage.getItem("outlook_calendar_api_key") || "");
  const [showOutlookCalendarKey, setShowOutlookCalendarKey] = useState(false);

  const saveKey = (service: string, key: string, storageKey: string) => {
    if (!key.trim()) return;
    localStorage.setItem(storageKey, key);
    toast({
      title: "Saved",
      description: `${service} API key saved securely.`,
    });
  };

  return (
    <Layout>
      <div className="min-h-screen bg-secondary/30 relative">
        <div 
          className="fixed inset-0 opacity-40 mix-blend-multiply pointer-events-none -z-10"
          style={{ backgroundImage: `url(${paperBg})`, backgroundSize: 'cover' }}
        />
        
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <header className="mb-8">
            <h1 className="text-3xl font-serif font-bold text-primary">Integrations</h1>
            <p className="text-muted-foreground">Manage your connections to external tools</p>
          </header>

          <div className="grid gap-8">
            {/* Cloze Integration */}
            <Card className="border-none shadow-md">
              <CardHeader className="bg-blue-50/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">C</div>
                  <div>
                    <CardTitle className="font-serif">Cloze CRM</CardTitle>
                    <CardDescription>Sync Contacts, Interactions, and Follow-ups</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input 
                      type={showClozeKey ? "text" : "password"} 
                      value={clozeKey}
                      onChange={(e) => setClozeKey(e.target.value)}
                      placeholder="sk_live_..."
                      className="bg-background/50"
                    />
                    <Button variant="outline" size="icon" onClick={() => setShowClozeKey(!showClozeKey)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => saveKey("Cloze", clozeKey, "cloze_api_key")}>Save</Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded border border-green-100">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Ready for One-Way Sync (Ninja OS → Cloze)</span>
                </div>
              </CardContent>
            </Card>

            {/* Todoist Integration */}
            <TodoistIntegrationCard />

            {/* OpenAI Integration */}
            <Card className="border-none shadow-md">
              <CardHeader className="bg-purple-50/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                    <Bot className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="font-serif">OpenAI (GPT-4)</CardTitle>
                    <CardDescription>Powers voice summarization and complex reasoning</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input 
                      type={showOpenaiKey ? "text" : "password"} 
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      placeholder="sk-..."
                      className="bg-background/50"
                    />
                    <Button variant="outline" size="icon" onClick={() => setShowOpenaiKey(!showOpenaiKey)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => saveKey("OpenAI", openaiKey, "openai_api_key")}>Save</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Anthropic Integration */}
            <Card className="border-none shadow-md">
              <CardHeader className="bg-orange-50/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold">
                    <Brain className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="font-serif">Anthropic (Claude)</CardTitle>
                    <CardDescription>Excellent for long context analysis and drafting</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input 
                      type={showAnthropicKey ? "text" : "password"} 
                      value={anthropicKey}
                      onChange={(e) => setAnthropicKey(e.target.value)}
                      placeholder="sk-ant-..."
                      className="bg-background/50"
                    />
                    <Button variant="outline" size="icon" onClick={() => setShowAnthropicKey(!showAnthropicKey)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => saveKey("Anthropic", anthropicKey, "anthropic_api_key")}>Save</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Google Gemini Integration */}
            <Card className="border-none shadow-md">
              <CardHeader className="bg-blue-50/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="font-serif">Google Gemini</CardTitle>
                    <CardDescription>Multimodal capabilities and fast processing</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input 
                      type={showGeminiKey ? "text" : "password"} 
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder="AIza..."
                      className="bg-background/50"
                    />
                    <Button variant="outline" size="icon" onClick={() => setShowGeminiKey(!showGeminiKey)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => saveKey("Google Gemini", geminiKey, "gemini_api_key")}>Save</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fathom.video Integration */}
            <Card className="border-none shadow-md">
              <CardHeader className="bg-emerald-50/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold">
                    <Video className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="font-serif">Fathom.video</CardTitle>
                    <CardDescription>Import meeting recordings and transcripts</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input 
                      type={showFathomKey ? "text" : "password"} 
                      value={fathomKey}
                      onChange={(e) => setFathomKey(e.target.value)}
                      placeholder="fathom_..."
                      className="bg-background/50"
                    />
                    <Button variant="outline" size="icon" onClick={() => setShowFathomKey(!showFathomKey)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => saveKey("Fathom", fathomKey, "fathom_api_key")}>Save</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Granola Integration */}
            <Card className="border-none shadow-md">
              <CardHeader className="bg-amber-50/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="font-serif">Granola</CardTitle>
                    <CardDescription>Enhanced meeting notes and summarization</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input 
                      type={showGranolaKey ? "text" : "password"} 
                      value={granolaKey}
                      onChange={(e) => setGranolaKey(e.target.value)}
                      placeholder="gn_..."
                      className="bg-background/50"
                    />
                    <Button variant="outline" size="icon" onClick={() => setShowGranolaKey(!showGranolaKey)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => saveKey("Granola", granolaKey, "granola_api_key")}>Save</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Plaud Integration */}
            <Card className="border-none shadow-md">
              <CardHeader className="bg-slate-50/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold">
                    <Mic className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="font-serif">Plaud Note</CardTitle>
                    <CardDescription>Sync voice recordings from Plaud AI hardware</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input 
                      type={showPlaudKey ? "text" : "password"} 
                      value={plaudKey}
                      onChange={(e) => setPlaudKey(e.target.value)}
                      placeholder="plaud_..."
                      className="bg-background/50"
                    />
                    <Button variant="outline" size="icon" onClick={() => setShowPlaudKey(!showPlaudKey)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => saveKey("Plaud", plaudKey, "plaud_api_key")}>Save</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gmail Integration */}
            <Card className="border-none shadow-md">
              <CardHeader className="bg-red-50/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="font-serif">Gmail</CardTitle>
                    <CardDescription>Read, draft, and send emails directly</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>OAuth Client ID / API Key</Label>
                  <div className="flex gap-2">
                    <Input 
                      type={showGmailKey ? "text" : "password"} 
                      value={gmailKey}
                      onChange={(e) => setGmailKey(e.target.value)}
                      placeholder="google_client_id..."
                      className="bg-background/50"
                    />
                    <Button variant="outline" size="icon" onClick={() => setShowGmailKey(!showGmailKey)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => saveKey("Gmail", gmailKey, "gmail_api_key")}>Save</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Superhuman Integration */}
            <Card className="border-none shadow-md">
              <CardHeader className="bg-indigo-50/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                    <Zap className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="font-serif">Superhuman</CardTitle>
                    <CardDescription>High-performance email integration</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input 
                      type={showSuperhumanKey ? "text" : "password"} 
                      value={superhumanKey}
                      onChange={(e) => setSuperhumanKey(e.target.value)}
                      placeholder="super_..."
                      className="bg-background/50"
                    />
                    <Button variant="outline" size="icon" onClick={() => setShowSuperhumanKey(!showSuperhumanKey)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => saveKey("Superhuman", superhumanKey, "superhuman_api_key")}>Save</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Generic Email Integration */}
            <Card className="border-none shadow-md">
              <CardHeader className="bg-gray-50/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="font-serif">Other Email Providers</CardTitle>
                    <CardDescription>IMAP/SMTP settings for Outlook, Yahoo, etc.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Connection String / API Key</Label>
                  <div className="flex gap-2">
                    <Input 
                      type={showGenericEmailKey ? "text" : "password"} 
                      value={genericEmailKey}
                      onChange={(e) => setGenericEmailKey(e.target.value)}
                      placeholder="imap://user:pass@host..."
                      className="bg-background/50"
                    />
                    <Button variant="outline" size="icon" onClick={() => setShowGenericEmailKey(!showGenericEmailKey)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => saveKey("Email Provider", genericEmailKey, "generic_email_api_key")}>Save</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* iCal Integration */}
            <Card className="border-none shadow-md">
              <CardHeader className="bg-orange-50/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="font-serif">Apple Calendar (iCal)</CardTitle>
                    <CardDescription>Sync your iCloud calendar events</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>App-Specific Password / CalDAV URL</Label>
                  <div className="flex gap-2">
                    <Input 
                      type={showIcalKey ? "text" : "password"} 
                      value={icalKey}
                      onChange={(e) => setIcalKey(e.target.value)}
                      placeholder="https://caldav.icloud.com/..."
                      className="bg-background/50"
                    />
                    <Button variant="outline" size="icon" onClick={() => setShowIcalKey(!showIcalKey)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => saveKey("iCal", icalKey, "ical_api_key")}>Save</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Google Calendar Integration */}
            <Card className="border-none shadow-md">
              <CardHeader className="bg-blue-50/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="font-serif">Google Calendar</CardTitle>
                    <CardDescription>Sync events, meetings, and time blocks</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>OAuth Client ID / API Key</Label>
                  <div className="flex gap-2">
                    <Input 
                      type={showGoogleCalendarKey ? "text" : "password"} 
                      value={googleCalendarKey}
                      onChange={(e) => setGoogleCalendarKey(e.target.value)}
                      placeholder="google_calendar_client_id..."
                      className="bg-background/50"
                    />
                    <Button variant="outline" size="icon" onClick={() => setShowGoogleCalendarKey(!showGoogleCalendarKey)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => saveKey("Google Calendar", googleCalendarKey, "google_calendar_api_key")}>Save</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Outlook Calendar Integration */}
            <Card className="border-none shadow-md">
              <CardHeader className="bg-cyan-50/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="font-serif">Outlook Calendar</CardTitle>
                    <CardDescription>Sync Office 365 / Outlook events</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Client ID / API Key</Label>
                  <div className="flex gap-2">
                    <Input 
                      type={showOutlookCalendarKey ? "text" : "password"} 
                      value={outlookCalendarKey}
                      onChange={(e) => setOutlookCalendarKey(e.target.value)}
                      placeholder="outlook_client_id..."
                      className="bg-background/50"
                    />
                    <Button variant="outline" size="icon" onClick={() => setShowOutlookCalendarKey(!showOutlookCalendarKey)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => saveKey("Outlook Calendar", outlookCalendarKey, "outlook_calendar_api_key")}>Save</Button>
                  </div>
                </div>
              </CardContent>
            </Card>



          </div>
        </div>
      </div>
    </Layout>
  );
}
