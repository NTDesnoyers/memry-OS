import Layout from "@/components/layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Activity, Users, Briefcase, MessageSquare, Lightbulb,
  ArrowRightCircle, Bot, Clock, CheckCircle, XCircle, 
  AlertCircle, ChevronRight, RefreshCw, Zap
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type SystemEvent = {
  id: string;
  eventType: string;
  eventCategory: string;
  personId: string | null;
  dealId: string | null;
  sourceEntity: string | null;
  sourceEntityId: string | null;
  payload: Record<string, unknown> | null;
  metadata: {
    triggeredBy?: string;
    agentName?: string;
    sourceAction?: string;
  } | null;
  processedAt: string | null;
  processedBy: string[] | null;
  createdAt: string;
};

type AgentAction = {
  id: string;
  eventId: string | null;
  agentName: string;
  actionType: string;
  riskLevel: string;
  status: string;
  personId: string | null;
  dealId: string | null;
  targetEntity: string | null;
  targetEntityId: string | null;
  proposedContent: Record<string, unknown> | null;
  reasoning: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  executedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
};

type EventStats = {
  totalEvents: number;
  unprocessedEvents: number;
  pendingApprovals: number;
  eventsByCategory: Record<string, number>;
  registeredAgents: string[];
};

const EVENT_CATEGORIES = {
  lead: { label: "Lead", icon: Users, color: "bg-blue-100 text-blue-700 border-blue-200" },
  relationship: { label: "Relationship", icon: Users, color: "bg-pink-100 text-pink-700 border-pink-200" },
  transaction: { label: "Transaction", icon: Briefcase, color: "bg-green-100 text-green-700 border-green-200" },
  communication: { label: "Communication", icon: MessageSquare, color: "bg-purple-100 text-purple-700 border-purple-200" },
  intelligence: { label: "Intelligence", icon: Lightbulb, color: "bg-amber-100 text-amber-700 border-amber-200" },
};

const ACTION_STATUS = {
  proposed: { label: "Proposed", icon: Clock, color: "bg-yellow-100 text-yellow-700" },
  approved: { label: "Approved", icon: CheckCircle, color: "bg-blue-100 text-blue-700" },
  rejected: { label: "Rejected", icon: XCircle, color: "bg-red-100 text-red-700" },
  executed: { label: "Executed", icon: CheckCircle, color: "bg-green-100 text-green-700" },
  failed: { label: "Failed", icon: AlertCircle, color: "bg-red-100 text-red-700" },
};

const RISK_LEVELS = {
  low: { label: "Low Risk", color: "bg-green-100 text-green-700" },
  medium: { label: "Medium Risk", color: "bg-yellow-100 text-yellow-700" },
  high: { label: "High Risk", color: "bg-red-100 text-red-700" },
};

function formatEventType(eventType: string): string {
  return eventType
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).replace(/_/g, ' '))
    .join(' → ');
}

function EventCard({ event }: { event: SystemEvent }) {
  const category = EVENT_CATEGORIES[event.eventCategory as keyof typeof EVENT_CATEGORIES] || EVENT_CATEGORIES.intelligence;
  const CategoryIcon = category.icon;
  
  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors" data-testid={`event-card-${event.id}`}>
      <div className={`p-2 rounded-lg ${category.color}`}>
        <CategoryIcon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{formatEventType(event.eventType)}</span>
          {event.processedAt && (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              Processed
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span>{formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}</span>
          {event.metadata?.triggeredBy && (
            <>
              <span>•</span>
              <span className="capitalize">{event.metadata.triggeredBy}</span>
            </>
          )}
          {event.metadata?.agentName && (
            <>
              <span>•</span>
              <Bot className="h-3 w-3" />
              <span>{event.metadata.agentName}</span>
            </>
          )}
        </div>
        {event.payload && Object.keys(event.payload).length > 0 && (
          <div className="mt-2 text-xs bg-muted/50 rounded p-2 font-mono">
            {Object.entries(event.payload).slice(0, 3).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <span className="text-muted-foreground">{key}:</span>
                <span>{String(value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionCard({ 
  action, 
  onApprove, 
  onReject 
}: { 
  action: AgentAction; 
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}) {
  const status = ACTION_STATUS[action.status as keyof typeof ACTION_STATUS] || ACTION_STATUS.proposed;
  const risk = RISK_LEVELS[action.riskLevel as keyof typeof RISK_LEVELS] || RISK_LEVELS.low;
  const StatusIcon = status.icon;
  
  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors" data-testid={`action-card-${action.id}`}>
      <div className={`p-2 rounded-lg ${status.color}`}>
        <StatusIcon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-medium text-sm capitalize">{action.actionType.replace(/_/g, ' ')}</span>
          <Badge variant="outline" className={`text-xs ${status.color}`}>
            {status.label}
          </Badge>
          <Badge variant="outline" className={`text-xs ${risk.color}`}>
            {risk.label}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Bot className="h-3 w-3" />
          <span>{action.agentName}</span>
          <span>•</span>
          <span>{formatDistanceToNow(new Date(action.createdAt), { addSuffix: true })}</span>
        </div>
        {action.reasoning && (
          <p className="mt-2 text-xs text-muted-foreground italic">
            "{action.reasoning}"
          </p>
        )}
        {action.errorMessage && (
          <p className="mt-2 text-xs text-red-600">
            Error: {action.errorMessage}
          </p>
        )}
      </div>
      {action.status === 'proposed' && (action.riskLevel === 'medium' || action.riskLevel === 'high') && (
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="h-7 text-xs" 
            data-testid={`approve-action-${action.id}`}
            onClick={() => onApprove?.(action.id)}
          >
            Approve
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-7 text-xs text-red-600" 
            data-testid={`reject-action-${action.id}`}
            onClick={() => onReject?.(action.id)}
          >
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}

export default function EventLog() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("events");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: events = [], isLoading: eventsLoading, refetch: refetchEvents } = useQuery<SystemEvent[]>({
    queryKey: ["/api/events"],
  });

  const { data: stats } = useQuery<EventStats>({
    queryKey: ["/api/events/stats"],
  });

  const { data: pendingActions = [] } = useQuery<AgentAction[]>({
    queryKey: ["/api/agent-actions/pending"],
  });

  const { data: allActions = [] } = useQuery<AgentAction[]>({
    queryKey: ["/api/agent-actions"],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/agent-actions/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-actions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-actions/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/stats"] });
      toast({ title: "Action approved", description: "The action has been approved and will be executed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/agent-actions/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-actions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-actions/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/stats"] });
      toast({ title: "Action rejected", description: "The action has been rejected." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleApprove = (id: string) => {
    approveMutation.mutate(id);
  };

  const handleReject = (id: string) => {
    rejectMutation.mutate(id);
  };

  const filteredEvents = categoryFilter === "all" 
    ? events 
    : events.filter(e => e.eventCategory === categoryFilter);

  const categoryStats = Object.entries(stats?.eventsByCategory || {}).map(([cat, count]) => ({
    category: cat,
    count,
    ...EVENT_CATEGORIES[cat as keyof typeof EVENT_CATEGORIES]
  }));

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6" data-testid="event-log-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="h-8 w-8 text-primary" />
              Event Log
            </h1>
            <p className="text-muted-foreground mt-1">
              Central nervous system for the orchestration layer
            </p>
          </div>
          <Button variant="outline" onClick={() => refetchEvents()} data-testid="refresh-events">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Events</p>
                  <p className="text-2xl font-bold" data-testid="stat-total-events">{stats?.totalEvents || 0}</p>
                </div>
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Unprocessed</p>
                  <p className="text-2xl font-bold" data-testid="stat-unprocessed">{stats?.unprocessedEvents || 0}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Approvals</p>
                  <p className="text-2xl font-bold" data-testid="stat-pending">{stats?.pendingApprovals || 0}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Agents</p>
                  <p className="text-2xl font-bold" data-testid="stat-agents">{stats?.registeredAgents?.length || 0}</p>
                </div>
                <Bot className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {categoryStats.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {categoryStats.map(cat => (
              <Badge 
                key={cat.category} 
                variant="outline" 
                className={`cursor-pointer ${cat.color}`}
                onClick={() => setCategoryFilter(cat.category === categoryFilter ? "all" : cat.category)}
                data-testid={`filter-${cat.category}`}
              >
                {cat.label}: {cat.count}
              </Badge>
            ))}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="events" data-testid="tab-events">
              <Activity className="h-4 w-4 mr-2" />
              Events ({filteredEvents.length})
            </TabsTrigger>
            <TabsTrigger value="actions" data-testid="tab-actions">
              <Zap className="h-4 w-4 mr-2" />
              Agent Actions ({allActions.length})
            </TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending">
              <AlertCircle className="h-4 w-4 mr-2" />
              Pending Approvals ({pendingActions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>System Events</CardTitle>
                    <CardDescription>Real-time log of system activity</CardDescription>
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]" data-testid="category-filter">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {Object.entries(EVENT_CATEGORIES).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{val.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading events...</div>
                ) : filteredEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No events yet</p>
                    <p className="text-sm">Events will appear here as they occur in the system</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {filteredEvents.map(event => (
                        <EventCard key={event.id} event={event} />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Agent Actions</CardTitle>
                <CardDescription>Actions proposed and executed by agents</CardDescription>
              </CardHeader>
              <CardContent>
                {allActions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No agent actions yet</p>
                    <p className="text-sm">Actions will appear here when agents respond to events</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {allActions.map(action => (
                        <ActionCard 
                          key={action.id} 
                          action={action} 
                          onApprove={handleApprove}
                          onReject={handleReject}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Approvals</CardTitle>
                <CardDescription>High-risk actions waiting for your approval</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingActions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50 text-green-500" />
                    <p>No pending approvals</p>
                    <p className="text-sm">All caught up! High-risk actions will appear here for review.</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {pendingActions.map(action => (
                        <ActionCard 
                          key={action.id} 
                          action={action} 
                          onApprove={handleApprove}
                          onReject={handleReject}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
