import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, CheckCircle2, DollarSign, TrendingUp, Users, PieChart, 
  Mic, FileEdit, Sparkles, Loader2, ListTodo, RefreshCw, AlertCircle, 
  ExternalLink, GripVertical, Settings, Plus, X, Home
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FordTrackerWidget } from "@/components/ford-tracker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type DashboardWidget = {
  id: string;
  widgetType: string;
  title: string;
  position: number;
  gridColumn?: number;
  gridRow?: number;
  isVisible?: boolean;
  config?: Record<string, unknown>;
};

type VoicePattern = { id: string; category: string; value: string; frequency: number };
type GeneratedDraft = { id: string; status: string; type: string };
type ProcessingStatus = { isProcessing: boolean; processed: number; totalToProcess: number };
type TaskType = { id: string; todoistId: string | null; completed: boolean };
type Deal = { id: string; stage: string; estimatedValue?: number };

function TodoistWidgetContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: status, isLoading: statusLoading } = useQuery<{ connected: boolean; error?: string }>({
    queryKey: ["/api/todoist/status"],
  });
  
  const { data: tasks = [] } = useQuery<TaskType[]>({
    queryKey: ["/api/tasks"],
  });
  
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/todoist/sync-tasks");
      return res.json();
    },
    onSuccess: (data: { synced: number; failed: number; total: number }) => {
      toast({ 
        title: "Synced to Todoist", 
        description: `${data.synced} tasks exported successfully` 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: (error: Error) => {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    },
  });
  
  const isConnected = status?.connected === true;
  const unsyncedTasks = tasks.filter(t => !t.completed && !t.todoistId).length;
  
  if (statusLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }
  
  if (isConnected) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 text-green-600 rounded-full">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium text-sm">Connected</p>
              <p className="text-xs text-muted-foreground">{unsyncedTasks} tasks to sync</p>
            </div>
          </div>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || unsyncedTasks === 0}
            className="gap-1"
            data-testid="button-quick-sync-todoist"
          >
            {syncMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Sync
          </Button>
        </div>
        <a 
          href="https://todoist.com/app" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Open Todoist <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
      <div className="p-2 bg-amber-100 text-amber-600 rounded-full">
        <AlertCircle className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm">Not Connected</p>
        <p className="text-xs text-muted-foreground">Set up in Integrations</p>
      </div>
      <Link href="/integrations">
        <Button size="sm" variant="outline">Connect</Button>
      </Link>
    </div>
  );
}

function AIStatusWidgetContent() {
  const { data: voicePatterns = [] } = useQuery<VoicePattern[]>({
    queryKey: ["/api/voice-profile"],
  });
  
  const { data: drafts = [] } = useQuery<GeneratedDraft[]>({
    queryKey: ["/api/generated-drafts"],
  });
  
  const { data: processingStatus } = useQuery<ProcessingStatus>({
    queryKey: ["/api/interactions/process-status"],
    refetchInterval: 5000,
  });
  
  const pendingDrafts = drafts.filter(d => d.status === "pending").length;
  const isProcessing = processingStatus?.isProcessing;
  
  return (
    <div className="space-y-3">
      <Link href="/voice-profile">
        <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg hover:bg-white/80 cursor-pointer transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-full">
              <Mic className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium text-sm">Voice Profile</p>
              <p className="text-xs text-muted-foreground">{voicePatterns.length} patterns learned</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </Link>
      
      <Link href="/drafts">
        <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg hover:bg-white/80 cursor-pointer transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-full">
              <FileEdit className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium text-sm">AI Drafts</p>
              <p className="text-xs text-muted-foreground">{pendingDrafts} pending review</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </Link>
      
      {isProcessing && (
        <div className="flex items-center gap-2 text-xs text-indigo-600 bg-white/60 p-2 rounded">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing conversations...
        </div>
      )}
    </div>
  );
}

function GCIYTDWidgetContent() {
  const { data: deals = [] } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });
  
  const closedDeals = deals.filter(d => d.stage === "closed");
  const totalGCI = closedDeals.reduce((sum, d) => sum + (d.estimatedValue || 0), 0);
  
  return (
    <div className="flex items-center gap-4">
      <div className="p-3 bg-green-100 text-green-700 rounded-full">
        <DollarSign className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">GCI YTD</p>
        <h3 className="text-2xl font-bold font-serif">${totalGCI.toLocaleString()}</h3>
      </div>
    </div>
  );
}

function ClosedUnitsWidgetContent() {
  const { data: deals = [] } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });
  
  const closedCount = deals.filter(d => d.stage === "closed").length;
  
  return (
    <div className="flex items-center gap-4">
      <div className="p-3 bg-blue-100 text-blue-700 rounded-full">
        <TrendingUp className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">Closed Units</p>
        <h3 className="text-2xl font-bold font-serif">{closedCount}</h3>
      </div>
    </div>
  );
}

function PipelineValueWidgetContent() {
  const { data: deals = [] } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });
  
  const activeDeals = deals.filter(d => ["warm", "hot", "in_contract"].includes(d.stage));
  const pipelineValue = activeDeals.reduce((sum, d) => sum + (d.estimatedValue || 0), 0);
  
  return (
    <div className="flex items-center gap-4">
      <div className="p-3 bg-purple-100 text-purple-700 rounded-full">
        <Home className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">Pipeline Value</p>
        <h3 className="text-2xl font-bold font-serif">${pipelineValue.toLocaleString()}</h3>
      </div>
    </div>
  );
}

function NewContactsWidgetContent() {
  const { data: people = [] } = useQuery<{ id: string; createdAt: string }[]>({
    queryKey: ["/api/people"],
  });
  
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const newContacts = people.filter(p => new Date(p.createdAt) >= startOfYear).length;
  
  return (
    <div className="flex items-center gap-4">
      <div className="p-3 bg-purple-100 text-purple-700 rounded-full">
        <Users className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">New Contacts</p>
        <h3 className="text-2xl font-bold font-serif">{newContacts}</h3>
      </div>
    </div>
  );
}

function ProductiveHoursWidgetContent() {
  return (
    <div className="flex items-center gap-4">
      <div className="p-3 bg-amber-100 text-amber-700 rounded-full">
        <PieChart className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">Productive Hrs</p>
        <h3 className="text-2xl font-bold font-serif">24.5</h3>
      </div>
    </div>
  );
}

const WIDGET_CONFIGS: Record<string, {
  icon: React.ReactNode;
  gradient: string;
  description?: string;
  isCompact?: boolean;
}> = {
  gci_ytd: { 
    icon: <DollarSign className="h-5 w-5 text-green-600" />,
    gradient: "from-green-50 to-emerald-50",
    isCompact: true
  },
  closed_units: { 
    icon: <TrendingUp className="h-5 w-5 text-blue-600" />,
    gradient: "from-blue-50 to-cyan-50",
    isCompact: true
  },
  pipeline_value: { 
    icon: <Home className="h-5 w-5 text-purple-600" />,
    gradient: "from-purple-50 to-pink-50",
    isCompact: true
  },
  new_contacts: { 
    icon: <Users className="h-5 w-5 text-purple-600" />,
    gradient: "from-purple-50 to-violet-50",
    isCompact: true
  },
  productive_hours: { 
    icon: <PieChart className="h-5 w-5 text-amber-600" />,
    gradient: "from-amber-50 to-orange-50",
    isCompact: true
  },
  ford_tracker: { 
    icon: <Users className="h-5 w-5 text-blue-600" />,
    gradient: "from-blue-50 to-indigo-50",
    description: "50 Households/Week Goal"
  },
  ai_status: { 
    icon: <Sparkles className="h-5 w-5 text-indigo-600" />,
    gradient: "from-indigo-50 to-purple-50",
    description: "Learning your style & generating content"
  },
  todoist_tasks: { 
    icon: <ListTodo className="h-5 w-5 text-red-600" />,
    gradient: "from-red-50 to-orange-50",
    description: "GTD task management"
  },
};

const AVAILABLE_WIDGETS = [
  { type: "gci_ytd", title: "GCI Year-to-Date" },
  { type: "closed_units", title: "Closed Units" },
  { type: "pipeline_value", title: "Pipeline Value" },
  { type: "new_contacts", title: "New Contacts" },
  { type: "productive_hours", title: "Productive Hours" },
  { type: "ford_tracker", title: "FORD Conversations" },
  { type: "ai_status", title: "AI Status" },
  { type: "todoist_tasks", title: "Todoist Tasks" },
];

function WidgetContent({ widgetType }: { widgetType: string }) {
  switch (widgetType) {
    case "gci_ytd":
      return <GCIYTDWidgetContent />;
    case "closed_units":
      return <ClosedUnitsWidgetContent />;
    case "pipeline_value":
      return <PipelineValueWidgetContent />;
    case "new_contacts":
      return <NewContactsWidgetContent />;
    case "productive_hours":
      return <ProductiveHoursWidgetContent />;
    case "ford_tracker":
      return <FordTrackerWidget embedded />;
    case "ai_status":
      return <AIStatusWidgetContent />;
    case "todoist_tasks":
      return <TodoistWidgetContent />;
    default:
      return <p className="text-sm text-muted-foreground">Unknown widget type</p>;
  }
}

function DraggableWidget({
  widget,
  isEditMode,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  widget: DashboardWidget;
  isEditMode: boolean;
  onRemove: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
}) {
  const config = WIDGET_CONFIGS[widget.widgetType] || { 
    icon: <Settings className="h-5 w-5" />,
    gradient: "from-gray-50 to-slate-50"
  };
  
  const isCompact = config.isCompact;
  
  return (
    <Card 
      className={`border-none shadow-md bg-gradient-to-br ${config.gradient} transition-all ${
        isEditMode ? "cursor-grab active:cursor-grabbing ring-2 ring-primary/20" : ""
      }`}
      draggable={isEditMode}
      onDragStart={(e) => onDragStart(e, widget.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, widget.id)}
      data-testid={`widget-${widget.widgetType}`}
    >
      {isCompact ? (
        <CardContent className="pt-6 relative">
          {isEditMode && (
            <>
              <GripVertical className="absolute top-2 left-2 h-4 w-4 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-1 right-1 h-6 w-6 p-0"
                onClick={() => onRemove(widget.id)}
                data-testid={`button-remove-widget-${widget.id}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
          <WidgetContent widgetType={widget.widgetType} />
        </CardContent>
      ) : (
        <>
          <CardHeader className="pb-2 relative">
            {isEditMode && (
              <>
                <GripVertical className="absolute top-2 left-2 h-4 w-4 text-muted-foreground" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-1 right-1 h-6 w-6 p-0"
                  onClick={() => onRemove(widget.id)}
                  data-testid={`button-remove-widget-${widget.id}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
            <CardTitle className="font-serif text-lg flex items-center gap-2">
              {config.icon}
              {widget.title}
            </CardTitle>
            {config.description && (
              <CardDescription>{config.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <WidgetContent widgetType={widget.widgetType} />
          </CardContent>
        </>
      )}
    </Card>
  );
}

export function DashboardWidgetGrid() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: widgets = [], isLoading } = useQuery<DashboardWidget[]>({
    queryKey: ["/api/dashboard-widgets"],
  });
  
  const initializeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/dashboard-widgets/initialize");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-widgets"] });
    },
  });
  
  const updatePositionsMutation = useMutation({
    mutationFn: async (widgetPositions: { id: string; position: number }[]) => {
      const res = await apiRequest("POST", "/api/dashboard-widgets/positions", { widgets: widgetPositions });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-widgets"] });
    },
  });
  
  const addWidgetMutation = useMutation({
    mutationFn: async (widget: { widgetType: string; title: string; position: number }) => {
      const res = await apiRequest("POST", "/api/dashboard-widgets", widget);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-widgets"] });
      toast({ title: "Widget added" });
    },
  });
  
  const removeWidgetMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/dashboard-widgets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-widgets"] });
      toast({ title: "Widget removed" });
    },
  });
  
  useEffect(() => {
    if (!isLoading && widgets.length === 0) {
      initializeMutation.mutate();
    }
  }, [isLoading, widgets.length]);
  
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    
    const sortedWidgets = [...widgets].sort((a, b) => a.position - b.position);
    const draggedIndex = sortedWidgets.findIndex(w => w.id === draggedId);
    const targetIndex = sortedWidgets.findIndex(w => w.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    const [removed] = sortedWidgets.splice(draggedIndex, 1);
    sortedWidgets.splice(targetIndex, 0, removed);
    
    const newPositions = sortedWidgets.map((w, idx) => ({ id: w.id, position: idx }));
    updatePositionsMutation.mutate(newPositions);
    setDraggedId(null);
  }, [draggedId, widgets, updatePositionsMutation]);
  
  const handleAddWidget = useCallback((type: string, title: string) => {
    const maxPosition = Math.max(...widgets.map(w => w.position), -1);
    addWidgetMutation.mutate({ widgetType: type, title, position: maxPosition + 1 });
  }, [widgets, addWidgetMutation]);
  
  const handleRemoveWidget = useCallback((id: string) => {
    removeWidgetMutation.mutate(id);
  }, [removeWidgetMutation]);
  
  const sortedWidgets = [...widgets].sort((a, b) => a.position - b.position);
  const compactWidgets = sortedWidgets.filter(w => WIDGET_CONFIGS[w.widgetType]?.isCompact);
  const fullWidgets = sortedWidgets.filter(w => !WIDGET_CONFIGS[w.widgetType]?.isCompact);
  
  const usedTypes = new Set(widgets.map(w => w.widgetType));
  const availableToAdd = AVAILABLE_WIDGETS.filter(w => !usedTypes.has(w.type));
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant={isEditMode ? "default" : "outline"}
          size="sm"
          onClick={() => setIsEditMode(!isEditMode)}
          className="gap-2"
          data-testid="button-toggle-edit-mode"
        >
          <Settings className="h-4 w-4" />
          {isEditMode ? "Done Editing" : "Customize Dashboard"}
        </Button>
        
        {isEditMode && availableToAdd.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-add-widget">
                <Plus className="h-4 w-4" />
                Add Widget
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {availableToAdd.map(w => (
                <DropdownMenuItem 
                  key={w.type}
                  onClick={() => handleAddWidget(w.type, w.title)}
                  data-testid={`menu-add-${w.type}`}
                >
                  {w.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      {compactWidgets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
          {compactWidgets.map(widget => (
            <DraggableWidget
              key={widget.id}
              widget={widget}
              isEditMode={isEditMode}
              onRemove={handleRemoveWidget}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ))}
        </div>
      )}
      
      {fullWidgets.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {fullWidgets.map(widget => (
            <DraggableWidget
              key={widget.id}
              widget={widget}
              isEditMode={isEditMode}
              onRemove={handleRemoveWidget}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
}
