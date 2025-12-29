import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { RefreshCw, CheckCircle2, AlertCircle, Link as LinkIcon, Settings, Clock, Eye, Share2, ListTodo, Bot, Video, FileText, Sparkles, Brain, Mic, Mail, Zap, Calendar, Loader2, Database, Phone, Copy, MessageSquare, X, Check } from "lucide-react";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type CrmIntegration = {
  id: number;
  provider: string;
  displayName: string;
  isActive: boolean;
  isPrimary: boolean;
  config: Record<string, unknown> | null;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  syncContactsEnabled: boolean;
  syncNotesEnabled: boolean;
  syncTasksEnabled: boolean;
};

const CRM_PROVIDERS = [
  { id: 'follow_up_boss', name: 'Follow Up Boss', description: 'Popular real estate CRM with excellent API', color: 'bg-green-600' },
  { id: 'cloze', name: 'Cloze', description: 'Relationship-focused CRM for real estate', color: 'bg-blue-600' },
  { id: 'zapier', name: 'Zapier Webhook', description: 'Connect to any CRM via Zapier', color: 'bg-orange-600' },
];

function CrmSyncSection() {
  const queryClient = useQueryClient();
  const [editingCrm, setEditingCrm] = useState<string | null>(null);
  const [crmConfig, setCrmConfig] = useState<Record<string, string>>({});

  const { data: crmIntegrations = [], isLoading } = useQuery<CrmIntegration[]>({
    queryKey: ['/api/crm/integrations/all'],
    retry: false,
  });

  const createCrmMutation = useMutation({
    mutationFn: async (data: { provider: string; displayName: string; config: Record<string, unknown> }) => {
      const res = await fetch('/api/crm/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create integration');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/integrations/all'] });
      toast.success('CRM integration created');
      setEditingCrm(null);
      setCrmConfig({});
    },
    onError: (err: Error) => {
      toast.error(`Failed to create integration: ${err.message}`);
    },
  });

  const updateCrmMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; [key: string]: unknown }) => {
      const res = await fetch(`/api/crm/integrations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update integration');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/integrations/all'] });
      toast.success('Integration updated');
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/crm/integrations/${id}/test`, { method: 'POST' });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Connection successful!');
      } else {
        toast.error(`Connection failed: ${data.error}`);
      }
    },
  });

  const handleAddCrm = (providerId: string) => {
    setEditingCrm(providerId);
    setCrmConfig({});
  };

  const handleSaveCrm = () => {
    if (!editingCrm) return;
    const provider = CRM_PROVIDERS.find(p => p.id === editingCrm);
    if (!provider) return;

    createCrmMutation.mutate({
      provider: editingCrm,
      displayName: provider.name,
      config: crmConfig,
    });
  };

  const getExistingIntegration = (providerId: string) => 
    crmIntegrations.find(i => i.provider === providerId);

  return (
    <div className="space-y-4">
      <Card className="border-none shadow-md">
        <CardHeader className="bg-blue-50/50 pb-4">
          <CardTitle className="font-serif">CRM Sync</CardTitle>
          <CardDescription>
            Sync contacts, notes, and tasks to your existing CRM. All your conversation data flows back automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {CRM_PROVIDERS.map((provider) => {
            const existing = getExistingIntegration(provider.id);
            
            return (
              <div 
                key={provider.id} 
                className="flex items-center justify-between p-4 border rounded-lg bg-white"
                data-testid={`crm-provider-${provider.id}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-full ${provider.color} flex items-center justify-center text-white font-bold`}>
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{provider.name}</h3>
                    <p className="text-sm text-muted-foreground">{provider.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {existing ? (
                    <>
                      <Badge variant={existing.isActive ? "default" : "secondary"}>
                        {existing.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {existing.lastSyncStatus && (
                        <Badge variant={existing.lastSyncStatus === 'success' ? 'outline' : 'destructive'}>
                          {existing.lastSyncStatus === 'success' ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                          {existing.lastSyncStatus}
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testConnectionMutation.mutate(existing.id)}
                        disabled={testConnectionMutation.isPending}
                        data-testid={`button-test-${provider.id}`}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${testConnectionMutation.isPending ? 'animate-spin' : ''}`} />
                        Test
                      </Button>
                      <Switch
                        checked={existing.isActive}
                        onCheckedChange={(checked) => 
                          updateCrmMutation.mutate({ id: existing.id, isActive: checked })
                        }
                        data-testid={`switch-active-${provider.id}`}
                      />
                    </>
                  ) : (
                    <Button 
                      onClick={() => handleAddCrm(provider.id)}
                      data-testid={`button-add-${provider.id}`}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {editingCrm && (
        <Card className="border-none shadow-md">
          <CardHeader className="bg-gray-50/50">
            <CardTitle className="font-serif text-lg">
              Configure {CRM_PROVIDERS.find(p => p.id === editingCrm)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {editingCrm === 'follow_up_boss' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Enter your Follow Up Boss API key"
                    value={crmConfig.apiKey || ''}
                    onChange={(e) => setCrmConfig({ ...crmConfig, apiKey: e.target.value })}
                    data-testid="input-fub-api-key"
                  />
                  <p className="text-xs text-muted-foreground">
                    Find this in Follow Up Boss: Admin → API → Create API Key
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="systemKey">System Key (Optional)</Label>
                  <Input
                    id="systemKey"
                    type="password"
                    placeholder="Optional system key for advanced features"
                    value={crmConfig.systemKey || ''}
                    onChange={(e) => setCrmConfig({ ...crmConfig, systemKey: e.target.value })}
                    data-testid="input-fub-system-key"
                  />
                </div>
              </>
            )}

            {editingCrm === 'cloze' && (
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Enter your Cloze API key"
                  value={crmConfig.apiKey || ''}
                  onChange={(e) => setCrmConfig({ ...crmConfig, apiKey: e.target.value })}
                  data-testid="input-cloze-api-key"
                />
                <p className="text-xs text-muted-foreground">
                  Contact Cloze support to get your API key
                </p>
              </div>
            )}

            {editingCrm === 'zapier' && (
              <div className="space-y-2">
                <Label htmlFor="webhookUrl">Zapier Webhook URL</Label>
                <Input
                  id="webhookUrl"
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  value={crmConfig.webhookUrl || ''}
                  onChange={(e) => setCrmConfig({ ...crmConfig, webhookUrl: e.target.value })}
                  data-testid="input-zapier-webhook"
                />
                <p className="text-xs text-muted-foreground">
                  Create a Zap with "Webhooks by Zapier" as the trigger, then paste the webhook URL here
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSaveCrm} disabled={createCrmMutation.isPending} data-testid="button-save-crm">
                Save Integration
              </Button>
              <Button variant="outline" onClick={() => setEditingCrm(null)} data-testid="button-cancel-crm">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function WebhooksSection() {
  const webhookBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <Card className="border-none shadow-md">
      <CardHeader className="bg-orange-50/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="font-serif">Webhook Endpoints</CardTitle>
            <CardDescription>
              Use these webhook URLs in Zapier or your capture tools to send data to Flow OS
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Granola Webhook (Meeting Notes)
          </Label>
          <div className="flex gap-2">
            <Input 
              readOnly 
              value={`${webhookBaseUrl}/api/webhooks/granola`}
              className="bg-gray-50"
              data-testid="input-webhook-granola"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => copyToClipboard(`${webhookBaseUrl}/api/webhooks/granola`)}
              data-testid="button-copy-granola"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            In Zapier: Granola trigger → Webhooks by Zapier action → POST to this URL
          </p>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Plaud Webhook (Voice Recording)
          </Label>
          <div className="flex gap-2">
            <Input 
              readOnly 
              value={`${webhookBaseUrl}/api/webhooks/plaud`}
              className="bg-gray-50"
              data-testid="input-webhook-plaud"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => copyToClipboard(`${webhookBaseUrl}/api/webhooks/plaud`)}
              data-testid="button-copy-plaud"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            In Zapier: Plaud trigger → Webhooks by Zapier action → POST to this URL
          </p>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Generic Capture Webhook
          </Label>
          <div className="flex gap-2">
            <Input 
              readOnly 
              value={`${webhookBaseUrl}/api/webhooks/capture`}
              className="bg-gray-50"
              data-testid="input-webhook-capture"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => copyToClipboard(`${webhookBaseUrl}/api/webhooks/capture`)}
              data-testid="button-copy-capture"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Use for any capture tool. Include: source, type, title, content, transcript, date, participants
          </p>
        </div>

        <Card className="bg-gray-50/50 border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Webhook Payload Format</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-x-auto p-2 bg-white rounded border">
{`{
  "source": "plaud",         // or granola, fathom, etc.
  "type": "call",            // call, meeting, text, email, note
  "title": "Call with John",
  "content": "Summary text",
  "transcript": "Full transcript...",
  "date": "2025-01-15T10:00:00Z",
  "duration": 15,            // minutes
  "participants": ["John Smith"],
  "external_id": "abc123",   // for deduplication
  "external_url": "https://..." // link back to source
}`}
            </pre>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}

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
              Tasks created in Flow OS will sync to Todoist with the "flow-os" label.
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

  const { data: granolaIntegrations = [] } = useQuery<CrmIntegration[]>({
    queryKey: ['/api/crm/integrations/all'],
    select: (data) => data.filter(i => i.provider === 'granola'),
  });
  const granolaIntegration = granolaIntegrations[0];

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

          <Tabs defaultValue="crm-sync" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="crm-sync" data-testid="tab-crm-sync">
                <Database className="h-4 w-4 mr-2" />
                CRM Sync
              </TabsTrigger>
              <TabsTrigger value="capture" data-testid="tab-capture">
                <Mic className="h-4 w-4 mr-2" />
                Capture Tools
              </TabsTrigger>
              <TabsTrigger value="webhooks" data-testid="tab-webhooks">
                <Zap className="h-4 w-4 mr-2" />
                Webhooks
              </TabsTrigger>
              <TabsTrigger value="ai" data-testid="tab-ai">
                <Bot className="h-4 w-4 mr-2" />
                AI & Other
              </TabsTrigger>
            </TabsList>

            <TabsContent value="crm-sync" className="space-y-4">
              <CrmSyncSection />
              <TodoistIntegrationCard />
            </TabsContent>

            <TabsContent value="capture" className="space-y-4">
              {/* Fathom */}
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

              {/* Granola */}
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
                  <Alert>
                    <AlertDescription>
                      Use the Webhooks tab to configure Granola via Zapier.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Plaud */}
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
                  <Alert>
                    <AlertDescription>
                      Use the Webhooks tab to configure Plaud via Zapier.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="webhooks">
              <WebhooksSection />
            </TabsContent>

            <TabsContent value="ai" className="grid gap-8">
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
                  <Alert>
                    <AlertDescription>
                      Gmail integration is managed via Replit OAuth. The connection is automatic.
                    </AlertDescription>
                  </Alert>
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
                  <Alert>
                    <AlertDescription>
                      Google Calendar integration is managed via Replit OAuth. The connection is automatic.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
