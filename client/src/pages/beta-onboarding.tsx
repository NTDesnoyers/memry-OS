import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { Users, UserPlus, Settings, CheckCircle2, Clock, AlertCircle, Loader2, Video, Phone, MessageSquare, Mail, Link as LinkIcon, ChevronRight } from "lucide-react";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type BetaUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  brokerage: string | null;
  isNinjaCertified: boolean;
  status: string;
  onboardedAt: string | null;
  notes: string | null;
  createdAt: string;
  intake?: {
    meetingTools: string[] | null;
    callTools: string[] | null;
    messagingTools: string[] | null;
    emailTools: string[] | null;
    crmTools: string[] | null;
    otherTools: string | null;
    priorities: string[] | null;
    painPoints: string | null;
  };
  connectors?: Array<{
    id: string;
    provider: string;
    category: string;
    status: string;
  }>;
};

const TOOL_OPTIONS = {
  meeting: [
    { id: 'fathom', label: 'Fathom.video', description: 'AI meeting recorder for Zoom' },
    { id: 'otter', label: 'Otter.ai', description: 'AI transcription & notes' },
    { id: 'fireflies', label: 'Fireflies.ai', description: 'AI meeting assistant' },
    { id: 'granola', label: 'Granola', description: 'Meeting notes app' },
    { id: 'zoom', label: 'Zoom (native)', description: 'Zoom cloud recordings' },
    { id: 'meet', label: 'Google Meet', description: 'Google Meet recordings' },
    { id: 'teams', label: 'Microsoft Teams', description: 'Teams recordings' },
    { id: 'read_ai', label: 'Read.ai', description: 'Real-time meeting copilot' },
  ],
  call: [
    { id: 'plaud', label: 'Plaud Note', description: 'AI voice recorder' },
    { id: 'ringcentral', label: 'RingCentral', description: 'Cloud phone system' },
    { id: 'callrail', label: 'CallRail', description: 'Call tracking & analytics' },
    { id: 'dialpad', label: 'Dialpad', description: 'AI-powered calling' },
    { id: 'fub_dialer', label: 'Follow Up Boss Dialer', description: 'FUB built-in calling' },
    { id: 'callaction', label: 'CallAction', description: 'Lead capture & calling' },
  ],
  messaging: [
    { id: 'imessage', label: 'iMessage', description: 'Apple Messages' },
    { id: 'whatsapp', label: 'WhatsApp', description: 'WhatsApp messaging' },
    { id: 'sms', label: 'SMS/Text', description: 'Standard text messages' },
    { id: 'messenger', label: 'Facebook Messenger', description: 'Meta Messenger' },
    { id: 'instagram_dm', label: 'Instagram DMs', description: 'Instagram messages' },
    { id: 'telegram', label: 'Telegram', description: 'Telegram messaging' },
    { id: 'signal', label: 'Signal', description: 'Signal secure messaging' },
  ],
  email: [
    { id: 'gmail', label: 'Gmail', description: 'Google Workspace email' },
    { id: 'outlook', label: 'Outlook', description: 'Microsoft email' },
    { id: 'apple_mail', label: 'Apple Mail', description: 'iCloud email' },
  ],
  crm: [
    { id: 'follow_up_boss', label: 'Follow Up Boss', description: 'Real estate CRM' },
    { id: 'cloze', label: 'Cloze', description: 'Relationship-focused CRM' },
    { id: 'kvcore', label: 'kvCORE', description: 'Real estate platform' },
    { id: 'boomtown', label: 'BoomTown', description: 'Lead gen platform' },
    { id: 'chime', label: 'Chime', description: 'Real estate CRM' },
    { id: 'realvolve', label: 'Realvolve', description: 'Workflow CRM' },
  ],
};

const PRIORITY_OPTIONS = [
  { id: 'meetings', label: 'Meeting recordings & notes' },
  { id: 'calls', label: 'Phone call recordings' },
  { id: 'texts', label: 'Text messages & DMs' },
  { id: 'emails', label: 'Email conversations' },
];

function IntakeForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    brokerage: '',
    relationshipCertified: false,
    meetingTools: [] as string[],
    callTools: [] as string[],
    messagingTools: [] as string[],
    emailTools: [] as string[],
    crmTools: [] as string[],
    otherTools: '',
    priorities: [] as string[],
    painPoints: '',
  });

  const submitIntakeMutation = useMutation({
    mutationFn: async (data: {
      user: { name: string; email: string; phone?: string; brokerage?: string; isNinjaCertified?: boolean };
      meetingTools: string[];
      callTools: string[];
      messagingTools: string[];
      emailTools: string[];
      crmTools: string[];
      otherTools?: string;
      priorities: string[];
      painPoints?: string;
    }) => {
      const res = await fetch('/api/beta/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to submit intake');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/beta/users'] });
      toast.success('Beta onboarding complete!');
      onSuccess();
    },
  });

  const toggleTool = (category: 'meetingTools' | 'callTools' | 'messagingTools' | 'emailTools' | 'crmTools', toolId: string) => {
    setFormData(prev => ({
      ...prev,
      [category]: prev[category].includes(toolId)
        ? prev[category].filter(t => t !== toolId)
        : [...prev[category], toolId],
    }));
  };

  const togglePriority = (priorityId: string) => {
    setFormData(prev => ({
      ...prev,
      priorities: prev.priorities.includes(priorityId)
        ? prev.priorities.filter(p => p !== priorityId)
        : [...prev.priorities, priorityId],
    }));
  };

  const handleSubmit = async () => {
    try {
      await submitIntakeMutation.mutateAsync({
        user: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          brokerage: formData.brokerage || undefined,
          isNinjaCertified: formData.relationshipCertified,
        },
        meetingTools: formData.meetingTools,
        callTools: formData.callTools,
        messagingTools: formData.messagingTools,
        emailTools: formData.emailTools,
        crmTools: formData.crmTools,
        otherTools: formData.otherTools || undefined,
        priorities: formData.priorities,
        painPoints: formData.painPoints || undefined,
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit');
    }
  };

  const ToolCheckboxGrid = ({ category, tools }: { category: 'meetingTools' | 'callTools' | 'messagingTools' | 'emailTools' | 'crmTools'; tools: typeof TOOL_OPTIONS.meeting }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {tools.map((tool) => (
        <label
          key={tool.id}
          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
            formData[category].includes(tool.id) ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
          }`}
          data-testid={`checkbox-${category}-${tool.id}`}
        >
          <Checkbox
            checked={formData[category].includes(tool.id)}
            onCheckedChange={() => toggleTool(category, tool.id)}
          />
          <div>
            <div className="font-medium text-sm">{tool.label}</div>
            <div className="text-xs text-gray-500">{tool.description}</div>
          </div>
        </label>
      ))}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              s === step ? 'bg-amber-500 text-white' : s < step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {s < step ? <CheckCircle2 className="h-5 w-5" /> : s}
            </div>
            {s < 4 && <div className={`w-12 h-1 ${s < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Welcome to Flow OS Beta</CardTitle>
            <CardDescription>Let's get you set up. First, tell us about yourself.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  data-testid="input-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  data-testid="input-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="jane@example.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  data-testid="input-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <Label htmlFor="brokerage">Brokerage</Label>
                <Input
                  id="brokerage"
                  data-testid="input-brokerage"
                  value={formData.brokerage}
                  onChange={(e) => setFormData(prev => ({ ...prev, brokerage: e.target.value }))}
                  placeholder="Keller Williams, RE/MAX, etc."
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="relationship-certified"
                  data-testid="switch-relationship-certified"
                  checked={formData.relationshipCertified}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, relationshipCertified: checked }))}
                />
                <Label htmlFor="relationship-certified">I'm certified in relationship selling</Label>
              </div>
            </div>
            <Button
              onClick={() => setStep(2)}
              disabled={!formData.name || !formData.email}
              className="w-full"
              data-testid="button-next-step-1"
            >
              Continue <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif flex items-center gap-2">
              <Video className="h-5 w-5 text-amber-600" />
              Meeting & Call Tools
            </CardTitle>
            <CardDescription>What tools do you use for meetings and phone calls?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-base font-medium mb-3 block">Meeting Recordings & Notes</Label>
              <ToolCheckboxGrid category="meetingTools" tools={TOOL_OPTIONS.meeting} />
            </div>
            <div>
              <Label className="text-base font-medium mb-3 block">Phone & Call Recording</Label>
              <ToolCheckboxGrid category="callTools" tools={TOOL_OPTIONS.call} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} data-testid="button-back-step-2">Back</Button>
              <Button onClick={() => setStep(3)} className="flex-1" data-testid="button-next-step-2">
                Continue <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-amber-600" />
              Messaging & Email
            </CardTitle>
            <CardDescription>Where do you communicate with clients?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-base font-medium mb-3 block">Messaging Apps</Label>
              <ToolCheckboxGrid category="messagingTools" tools={TOOL_OPTIONS.messaging} />
            </div>
            <div>
              <Label className="text-base font-medium mb-3 block">Email</Label>
              <ToolCheckboxGrid category="emailTools" tools={TOOL_OPTIONS.email} />
            </div>
            <div>
              <Label className="text-base font-medium mb-3 block">Current CRM</Label>
              <ToolCheckboxGrid category="crmTools" tools={TOOL_OPTIONS.crm} />
            </div>
            <div>
              <Label htmlFor="other-tools">Any other tools you use?</Label>
              <Textarea
                id="other-tools"
                data-testid="input-other-tools"
                value={formData.otherTools}
                onChange={(e) => setFormData(prev => ({ ...prev, otherTools: e.target.value }))}
                placeholder="List any other tools you'd like us to integrate with..."
                className="mt-2"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} data-testid="button-back-step-3">Back</Button>
              <Button onClick={() => setStep(4)} className="flex-1" data-testid="button-next-step-3">
                Continue <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Final Questions</CardTitle>
            <CardDescription>Help us understand your priorities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-base font-medium mb-3 block">What's most important to capture? (Select all that apply)</Label>
              <div className="space-y-2">
                {PRIORITY_OPTIONS.map((priority) => (
                  <label
                    key={priority.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      formData.priorities.includes(priority.id) ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    data-testid={`checkbox-priority-${priority.id}`}
                  >
                    <Checkbox
                      checked={formData.priorities.includes(priority.id)}
                      onCheckedChange={() => togglePriority(priority.id)}
                    />
                    <span className="font-medium">{priority.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="pain-points">What's not working well for you today?</Label>
              <Textarea
                id="pain-points"
                data-testid="input-pain-points"
                value={formData.painPoints}
                onChange={(e) => setFormData(prev => ({ ...prev, painPoints: e.target.value }))}
                placeholder="Tell us about your current challenges with tracking conversations and relationships..."
                className="mt-2"
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)} data-testid="button-back-step-4">Back</Button>
              <Button 
                onClick={handleSubmit} 
                className="flex-1 bg-amber-600 hover:bg-amber-700"
                disabled={submitIntakeMutation.isPending}
                data-testid="button-submit-intake"
              >
                {submitIntakeMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
                ) : (
                  'Complete Setup'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BetaDashboard() {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const { data: betaUsers = [], isLoading } = useQuery<BetaUser[]>({
    queryKey: ['/api/beta/users'],
  });

  const updateConnectorMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/beta/connectors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update connector');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/beta/users'] });
      toast.success('Connector status updated');
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/beta/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, onboardedAt: status === 'active' ? new Date().toISOString() : null }),
      });
      if (!res.ok) throw new Error('Failed to update user');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/beta/users'] });
      toast.success('User status updated');
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'needs_config': return <Settings className="h-4 w-4 text-amber-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-700',
      active: 'bg-green-100 text-green-700',
      churned: 'bg-red-100 text-red-700',
    };
    return <Badge className={variants[status] || variants.pending}>{status}</Badge>;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'meeting': return <Video className="h-4 w-4" />;
      case 'call': return <Phone className="h-4 w-4" />;
      case 'messaging': return <MessageSquare className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      default: return <LinkIcon className="h-4 w-4" />;
    }
  };

  const selectedUserData = betaUsers.find(u => u.id === selectedUser);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Beta Users ({betaUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {betaUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No beta users yet</div>
            ) : (
              <div className="divide-y">
                {betaUsers.map((user) => {
                  const connectedCount = user.connectors?.filter(c => c.status === 'connected').length || 0;
                  const totalCount = user.connectors?.length || 0;
                  return (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUser(user.id)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${selectedUser === user.id ? 'bg-amber-50' : ''}`}
                      data-testid={`button-select-user-${user.id}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{user.name}</span>
                        {getStatusBadge(user.status)}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      {totalCount > 0 && (
                        <div className="text-xs text-gray-400 mt-1">
                          {connectedCount}/{totalCount} connectors ready
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        {selectedUserData ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-serif">{selectedUserData.name}</CardTitle>
                  <CardDescription>{selectedUserData.email} • {selectedUserData.brokerage || 'No brokerage'}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {selectedUserData.isNinjaCertified && <Badge className="bg-amber-100 text-amber-700">Relationship Certified</Badge>}
                  {getStatusBadge(selectedUserData.status)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={selectedUserData.status === 'active' ? 'secondary' : 'default'}
                  onClick={() => updateUserMutation.mutate({ id: selectedUserData.id, status: 'active' })}
                  disabled={selectedUserData.status === 'active'}
                  data-testid="button-activate-user"
                >
                  Activate User
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateUserMutation.mutate({ id: selectedUserData.id, status: 'pending' })}
                  disabled={selectedUserData.status === 'pending'}
                  data-testid="button-deactivate-user"
                >
                  Set Pending
                </Button>
              </div>

              {selectedUserData.intake?.painPoints && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Pain Points</Label>
                  <p className="mt-1 text-sm bg-gray-50 p-3 rounded-lg">{selectedUserData.intake.painPoints}</p>
                </div>
              )}

              {selectedUserData.intake?.priorities && selectedUserData.intake.priorities.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Priorities</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedUserData.intake.priorities.map((p) => (
                      <Badge key={p} variant="secondary">{p}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium text-gray-500 mb-3 block">Capture Connectors</Label>
                {selectedUserData.connectors && selectedUserData.connectors.length > 0 ? (
                  <div className="space-y-2">
                    {selectedUserData.connectors.map((connector) => (
                      <div key={connector.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getCategoryIcon(connector.category)}
                          <div>
                            <div className="font-medium text-sm">{connector.provider}</div>
                            <div className="text-xs text-gray-500">{connector.category}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(connector.status)}
                          <select
                            value={connector.status}
                            onChange={(e) => updateConnectorMutation.mutate({ id: connector.id, status: e.target.value })}
                            className="text-xs border rounded px-2 py-1"
                            data-testid={`select-connector-status-${connector.id}`}
                          >
                            <option value="pending">Pending</option>
                            <option value="needs_config">Needs Config</option>
                            <option value="connected">Connected</option>
                            <option value="error">Error</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No connectors configured yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a user to view their details and connector status</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function BetaOnboarding() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <Layout>
      <div 
        className="min-h-screen p-4 md:p-6"
        style={{ 
          backgroundImage: `url(${paperBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-serif text-gray-900">Beta Program</h1>
            <p className="text-gray-600 mt-1">Onboard and manage beta users</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="dashboard" className="flex items-center gap-2" data-testid="tab-dashboard">
                <Users className="h-4 w-4" /> Dashboard
              </TabsTrigger>
              <TabsTrigger value="intake" className="flex items-center gap-2" data-testid="tab-intake">
                <UserPlus className="h-4 w-4" /> New User Intake
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <BetaDashboard />
            </TabsContent>

            <TabsContent value="intake">
              <IntakeForm onSuccess={() => setActiveTab("dashboard")} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
