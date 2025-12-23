import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { 
  UserPlus, 
  Phone, 
  Mail, 
  Clock, 
  DollarSign, 
  MapPin, 
  Flame, 
  Thermometer, 
  Snowflake,
  Check,
  X,
  ArrowRight,
  Plus,
  Filter,
  Inbox
} from "lucide-react";

type Lead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  sourceDetails: string | null;
  status: string;
  qualificationScore: number | null;
  notes: string | null;
  interestedIn: string | null;
  budget: string | null;
  timeline: string | null;
  areas: string[] | null;
  personId: string | null;
  assignedTo: string | null;
  firstContactAt: string | null;
  lastContactAt: string | null;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const LEAD_SOURCES = [
  { value: 'referral', label: 'Referral' },
  { value: 'open_house', label: 'Open House' },
  { value: 'website', label: 'Website' },
  { value: 'zillow', label: 'Zillow' },
  { value: 'realtor_com', label: 'Realtor.com' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'sign_call', label: 'Sign Call' },
  { value: 'sphere', label: 'Sphere of Influence' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'manual', label: 'Manual Entry' },
  { value: 'other', label: 'Other' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-800' },
  contacted: { label: 'Contacted', color: 'bg-yellow-100 text-yellow-800' },
  qualified: { label: 'Qualified', color: 'bg-green-100 text-green-800' },
  nurturing: { label: 'Nurturing', color: 'bg-purple-100 text-purple-800' },
  converted: { label: 'Converted', color: 'bg-emerald-100 text-emerald-800' },
  lost: { label: 'Lost', color: 'bg-gray-100 text-gray-800' },
  duplicate: { label: 'Duplicate', color: 'bg-orange-100 text-orange-800' },
};

function getScoreIcon(score: number | null) {
  if (!score) return <Snowflake className="h-4 w-4 text-blue-500" />;
  if (score >= 80) return <Flame className="h-4 w-4 text-red-500" />;
  if (score >= 50) return <Thermometer className="h-4 w-4 text-orange-500" />;
  return <Snowflake className="h-4 w-4 text-blue-500" />;
}

function getScoreLabel(score: number | null) {
  if (!score) return 'Cold';
  if (score >= 80) return 'Hot';
  if (score >= 50) return 'Warm';
  return 'Cold';
}

function LeadCard({ lead, onConvert, onUpdate }: { 
  lead: Lead; 
  onConvert: (id: string) => void;
  onUpdate: (id: string, data: Partial<Lead>) => void;
}) {
  const status = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;

  return (
    <Card className="hover:shadow-md transition-shadow" data-testid={`lead-card-${lead.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{lead.name}</h3>
              <Badge className={status.color}>{status.label}</Badge>
              {lead.qualificationScore !== null && (
                <div className="flex items-center gap-1 text-xs">
                  {getScoreIcon(lead.qualificationScore)}
                  <span>{lead.qualificationScore}/100</span>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
              {lead.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {lead.email}
                </span>
              )}
              {lead.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {lead.phone}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {LEAD_SOURCES.find(s => s.value === lead.source)?.label || lead.source}
              </Badge>
              {lead.timeline && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {lead.timeline}
                </Badge>
              )}
              {lead.budget && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {lead.budget}
                </Badge>
              )}
              {lead.areas && lead.areas.length > 0 && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {lead.areas.join(', ')}
                </Badge>
              )}
            </div>

            {lead.interestedIn && (
              <p className="text-sm text-muted-foreground mt-2 italic">
                Interest: {lead.interestedIn}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {lead.status === 'new' && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onUpdate(lead.id, { status: 'contacted' })}
                data-testid={`mark-contacted-${lead.id}`}
              >
                <Check className="h-3 w-3 mr-1" />
                Contacted
              </Button>
            )}
            {(lead.status === 'new' || lead.status === 'contacted' || lead.status === 'qualified') && (
              <Button 
                size="sm"
                onClick={() => onConvert(lead.id)}
                data-testid={`convert-lead-${lead.id}`}
              >
                <ArrowRight className="h-3 w-3 mr-1" />
                Convert
              </Button>
            )}
            {lead.status !== 'lost' && lead.status !== 'converted' && (
              <Button 
                size="sm" 
                variant="ghost"
                className="text-red-600"
                onClick={() => onUpdate(lead.id, { status: 'lost' })}
                data-testid={`mark-lost-${lead.id}`}
              >
                <X className="h-3 w-3 mr-1" />
                Lost
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NewLeadDialog({ onSubmit }: { onSubmit: (data: Partial<Lead>) => void }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'manual',
    interestedIn: '',
    budget: '',
    timeline: '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      name: '',
      email: '',
      phone: '',
      source: 'manual',
      interestedIn: '',
      budget: '',
      timeline: '',
      notes: '',
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="add-lead-button">
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
          <DialogDescription>
            Enter lead information. The system will automatically score and qualify the lead.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              data-testid="lead-name-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                data-testid="lead-email-input"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                data-testid="lead-phone-input"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="source">Source</Label>
            <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
              <SelectTrigger data-testid="lead-source-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_SOURCES.map(source => (
                  <SelectItem key={source.value} value={source.value}>
                    {source.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="interestedIn">Interested In</Label>
            <Input
              id="interestedIn"
              placeholder="e.g., Buying a home, Selling, Investment property"
              value={formData.interestedIn}
              onChange={(e) => setFormData({ ...formData, interestedIn: e.target.value })}
              data-testid="lead-interest-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="budget">Budget</Label>
              <Input
                id="budget"
                placeholder="e.g., $500k-700k"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                data-testid="lead-budget-input"
              />
            </div>
            <div>
              <Label htmlFor="timeline">Timeline</Label>
              <Input
                id="timeline"
                placeholder="e.g., 3-6 months"
                value={formData.timeline}
                onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                data-testid="lead-timeline-input"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              data-testid="lead-notes-input"
            />
          </div>
          <Button type="submit" className="w-full" data-testid="submit-lead-button">
            Add Lead
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function LeadInbox() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Lead>) => {
      return apiRequest("POST", "/api/leads", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead added", description: "The lead has been added and scored." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Lead> }) => {
      return apiRequest("PATCH", `/api/leads/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const convertMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/leads/${id}/convert`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      toast({ title: "Lead converted", description: "The lead has been converted to a contact." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleUpdate = (id: string, data: Partial<Lead>) => {
    updateMutation.mutate({ id, data });
  };

  const handleConvert = (id: string) => {
    convertMutation.mutate(id);
  };

  const filteredLeads = statusFilter === "all" 
    ? leads 
    : leads.filter(l => l.status === statusFilter);

  const newCount = leads.filter(l => l.status === 'new').length;
  const hotCount = leads.filter(l => (l.qualificationScore || 0) >= 80).length;

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6" data-testid="lead-inbox-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Inbox className="h-8 w-8 text-primary" />
              Lead Inbox
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage incoming leads and track qualification
            </p>
          </div>
          <NewLeadDialog onSubmit={(data) => createMutation.mutate(data)} />
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">{leads.length}</p>
              <p className="text-sm text-muted-foreground">Total Leads</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{newCount}</p>
              <p className="text-sm text-muted-foreground">New</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-red-600">{hotCount}</p>
              <p className="text-sm text-muted-foreground">Hot Leads</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">
                {leads.filter(l => l.status === 'converted').length}
              </p>
              <p className="text-sm text-muted-foreground">Converted</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Leads</CardTitle>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]" data-testid="status-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                      <SelectItem key={value} value={value}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading leads...
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserPlus className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No leads yet. Add your first lead to get started.</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {filteredLeads.map(lead => (
                    <LeadCard 
                      key={lead.id} 
                      lead={lead} 
                      onConvert={handleConvert}
                      onUpdate={handleUpdate}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
