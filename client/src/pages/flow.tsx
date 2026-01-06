import Layout from "@/components/layout";
import { FordTrackerCompact } from "@/components/ford-tracker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Mail, Sparkles, Video, MessageCircle, Send, Users } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MentionTextarea, getDisplayText } from "@/components/mention-textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Calendar,
  Clock,
  Search,
  FileText,
  ExternalLink,
  Check,
  Loader2,
  Filter,
  Edit2,
  X,
  Trash2,
  Copy,
  CheckSquare,
  GraduationCap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import type { Person, Interaction } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { getInitials } from "@/lib/utils";
import { Link } from "wouter";

const liveFlowTypes = [
  { value: "call", label: "Phone Call", icon: Phone, color: "bg-green-50 text-green-700 border-green-200" },
  { value: "meeting", label: "Meeting / Video", icon: Video, color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "in_person", label: "In Person", icon: Users, color: "bg-teal-50 text-teal-700 border-teal-200" },
  { value: "text", label: "Text Message", icon: MessageCircle, color: "bg-purple-50 text-purple-700 border-purple-200" },
];

const autoFlowTypes = [
  { value: "email", label: "Email", icon: Mail, color: "bg-orange-50 text-orange-700 border-orange-200" },
  { value: "postcard", label: "Postcard", icon: Send, color: "bg-pink-50 text-pink-700 border-pink-200" },
  { value: "handwritten_note", label: "Handwritten Note", icon: FileText, color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "social", label: "Social Media", icon: MessageCircle, color: "bg-blue-50 text-blue-700 border-blue-200" },
];

const allInteractionTypes = [...liveFlowTypes, ...autoFlowTypes];

type AIExtractedDataType = {
  keyTopics?: string[];
  actionItems?: string[];
  fordUpdates?: {
    family?: string;
    occupation?: string;
    recreation?: string;
    dreams?: string;
  };
};

function AIInsightsSection({ data }: { data: unknown }) {
  const aiData = data as AIExtractedDataType;
  
  return (
    <div>
      <h4 className="text-sm font-medium text-muted-foreground mb-1">AI Extracted Insights</h4>
      <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-2">
        {aiData.keyTopics?.length ? (
          <div>
            <span className="font-medium">Key Topics: </span>
            {aiData.keyTopics.join(", ")}
          </div>
        ) : null}
        {aiData.actionItems?.length ? (
          <div>
            <span className="font-medium">Action Items: </span>
            <ul className="list-disc list-inside">
              {aiData.actionItems.map((item: string, i: number) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {aiData.fordUpdates && (
          <div>
            <span className="font-medium">FORD Updates: </span>
            <ul className="list-disc list-inside">
              {aiData.fordUpdates.family && (
                <li><span className="font-medium">Family:</span> {aiData.fordUpdates.family}</li>
              )}
              {aiData.fordUpdates.occupation && (
                <li><span className="font-medium">Occupation:</span> {aiData.fordUpdates.occupation}</li>
              )}
              {aiData.fordUpdates.recreation && (
                <li><span className="font-medium">Recreation:</span> {aiData.fordUpdates.recreation}</li>
              )}
              {aiData.fordUpdates.dreams && (
                <li><span className="font-medium">Dreams:</span> {aiData.fordUpdates.dreams}</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

type GeneratedDraft = {
  id: string;
  personId: string | null;
  interactionId: string | null;
  type: "email" | "handwritten_note" | "task";
  content: string;
  subject?: string | null;
  status: string;
  metadata: any;
  createdAt: string;
  updatedAt: string;
};

type CoachingAnalysis = {
  overallScore: number;
  listeningScore: number;
  questioningScore: number;
  fordCoverage: number;
  strengths: string[];
  improvements: string[];
};

function InlineCoachingWidget({ interaction }: { interaction: Interaction }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<CoachingAnalysis | null>(
    interaction.coachingAnalysis as CoachingAnalysis | null
  );

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const response = await apiRequest("POST", `/api/interactions/${interaction.id}/coaching-analysis`);
      if (!response.ok) throw new Error("Failed to analyze");
      const data = await response.json();
      setAnalysis(data.analysis);
      queryClient.invalidateQueries({ queryKey: ["/api/interactions"] });
      toast({ title: "Analysis complete!" });
    } catch (error: any) {
      toast({ title: "Analysis failed", description: error.message, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!interaction.transcript || interaction.transcript.length < 100) {
    return null;
  }

  if (isAnalyzing) {
    return (
      <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
          <div>
            <p className="font-medium text-purple-800">Analyzing conversation...</p>
            <p className="text-xs text-purple-600">Reviewing questioning, listening, and FORD coverage</p>
          </div>
        </div>
      </div>
    );
  }

  if (analysis) {
    const getScoreColor = (score: number) => {
      if (score >= 80) return "text-green-600 bg-green-100";
      if (score >= 60) return "text-yellow-600 bg-yellow-100";
      return "text-red-600 bg-red-100";
    };

    return (
      <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200">
        <div className="flex items-center gap-2 mb-3">
          <GraduationCap className="h-5 w-5 text-purple-600" />
          <h4 className="font-medium text-purple-800">Coaching Score</h4>
        </div>
        
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className={`p-2 rounded-lg text-center ${getScoreColor(analysis.overallScore)}`}>
            <p className="text-2xl font-bold">{analysis.overallScore}</p>
            <p className="text-xs">Overall</p>
          </div>
          <div className={`p-2 rounded-lg text-center ${getScoreColor(analysis.listeningScore)}`}>
            <p className="text-2xl font-bold">{analysis.listeningScore}</p>
            <p className="text-xs">Listening</p>
          </div>
          <div className={`p-2 rounded-lg text-center ${getScoreColor(analysis.questioningScore)}`}>
            <p className="text-2xl font-bold">{analysis.questioningScore}</p>
            <p className="text-xs">Questions</p>
          </div>
          <div className={`p-2 rounded-lg text-center ${getScoreColor(analysis.fordCoverage)}`}>
            <p className="text-2xl font-bold">{analysis.fordCoverage}</p>
            <p className="text-xs">FORD</p>
          </div>
        </div>

        {analysis.strengths?.length > 0 && (
          <div className="mb-2">
            <p className="text-xs font-medium text-green-700 mb-1">Strengths:</p>
            <p className="text-xs text-green-600">{analysis.strengths[0]}</p>
          </div>
        )}

        {analysis.improvements?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-amber-700 mb-1">To improve:</p>
            <p className="text-xs text-amber-600">{analysis.improvements[0]}</p>
          </div>
        )}

        <Link href={`/coaching?id=${interaction.id}`}>
          <Button variant="ghost" size="sm" className="w-full mt-3 text-purple-600">
            View Full Analysis
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <Button 
      variant="outline" 
      className="w-full gap-2 border-purple-200 text-purple-700 hover:bg-purple-50" 
      onClick={runAnalysis}
      data-testid="button-run-coaching-analysis"
    >
      <GraduationCap className="h-4 w-4" />
      Get Coaching Score
    </Button>
  );
}

function InteractionDetailSheet({ 
  interaction, 
  person, 
  drafts,
  onClose 
}: { 
  interaction: Interaction;
  person?: Person;
  drafts: GeneratedDraft[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const config = allInteractionTypes.find(t => t.value === interaction.type) || liveFlowTypes[0];
  const Icon = config.icon;
  const aiData = interaction.aiExtractedData as AIExtractedDataType | null;
  
  const relatedDrafts = drafts.filter(d => d.interactionId === interaction.id);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const getTypeConfig = (type: string) => {
    const configs: Record<string, { icon: any; label: string; color: string }> = {
      email: { icon: Mail, label: "Email", color: "bg-blue-50 text-blue-700 border-blue-200" },
      handwritten_note: { icon: FileText, label: "Note", color: "bg-amber-50 text-amber-700 border-amber-200" },
      task: { icon: CheckSquare, label: "Task", color: "bg-green-50 text-green-700 border-green-200" },
    };
    return configs[type] || configs.email;
  };
  
  return (
    <div className="space-y-6" data-testid="interaction-detail-sheet">
      <div className="flex items-center gap-4 pb-4 border-b">
        <div className={`p-3 rounded-xl ${config.color.split(' ')[0]}`}>
          <Icon className={`h-6 w-6 ${config.color.split(' ')[1]}`} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold tracking-tight">{config.label}</h3>
          <p className="text-sm text-muted-foreground font-medium">
            {format(new Date(interaction.occurredAt || interaction.createdAt), "EEEE, MMMM d, yyyy")}
          </p>
          <p className="text-xs text-muted-foreground/70">
            {format(new Date(interaction.occurredAt || interaction.createdAt), "h:mm a")}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-muted" onClick={onClose} data-testid="button-close-detail">
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      {interaction.summary ? (
        <div className="bg-white border shadow-sm p-6 rounded-2xl">
          <h4 className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-widest">Conversation Summary</h4>
          <p className="text-lg leading-relaxed whitespace-pre-wrap text-foreground font-medium">
            {getDisplayText(interaction.summary)}
          </p>
        </div>
      ) : (
        <div className="bg-muted/30 p-6 rounded-2xl text-muted-foreground text-sm border-2 border-dashed">
          No summary available for this conversation
        </div>
      )}
      
      {person && (
        <Link href={`/people/${person.id}`}>
          <div className="flex items-center gap-4 p-4 bg-primary/5 hover:bg-primary/10 border border-primary/10 rounded-2xl transition-all cursor-pointer group" data-testid="link-person-profile">
            <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {getInitials(person.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-bold text-foreground group-hover:text-primary transition-colors">{person.name}</p>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Relationship Profile</p>
            </div>
            <ExternalLink className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </Link>
      )}
      
      <div className="pt-2">
        <InlineCoachingWidget interaction={interaction} />
      </div>
      
      {aiData?.keyTopics && aiData.keyTopics.length > 0 && (
        <div className="pt-2">
          <h4 className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-widest">Key Topics</h4>
          <div className="flex flex-wrap gap-2">
            {aiData.keyTopics.map((topic, i) => (
              <Badge key={i} variant="secondary" className="px-3 py-1 rounded-full text-xs font-bold bg-muted/80">{topic}</Badge>
            ))}
          </div>
        </div>
      )}
      
      {aiData?.actionItems && aiData.actionItems.length > 0 && (
        <div className="pt-2">
          <h4 className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-widest flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Action Items
          </h4>
          <div className="space-y-3">
            {aiData.actionItems.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-green-50/50 border border-green-100 rounded-2xl text-sm shadow-sm">
                <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="h-3 w-3 text-green-600 font-bold" />
                </div>
                <span className="font-medium text-green-900">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {relatedDrafts.length > 0 && (
        <div className="pt-2">
          <h4 className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            AI Follow-up Drafts
          </h4>
          <div className="space-y-3">
            {relatedDrafts.map((draft) => {
              const draftConfig = getTypeConfig(draft.type);
              const DraftIcon = draftConfig.icon;
              return (
                <div key={draft.id} className="p-5 bg-white border border-purple-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow" data-testid={`draft-${draft.id}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-xl ${draftConfig.color.split(' ')[0]}`}>
                      <DraftIcon className={`h-4 w-4 ${draftConfig.color.split(' ')[1]}`} />
                    </div>
                    <Badge variant="outline" className={`${draftConfig.color} rounded-full px-3`}>{draftConfig.label}</Badge>
                    <Badge variant={draft.status === "pending" ? "default" : "secondary"} className="rounded-full px-3">
                      {draft.status}
                    </Badge>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground font-medium mb-4">{draft.content}</p>
                  <Button size="sm" variant="outline" className="w-full rounded-xl gap-2 font-bold" onClick={() => copyToClipboard(draft.content)}>
                    <Copy className="h-3.5 w-3.5" /> Copy to Clipboard
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {aiData?.fordUpdates && Object.values(aiData.fordUpdates).some(v => v) && (
        <div className="pt-2">
          <h4 className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-widest">Relationship Intelligence (FORD)</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {aiData.fordUpdates.family && (
              <div className="p-4 bg-pink-50/50 border border-pink-100 rounded-2xl shadow-sm">
                <p className="text-[10px] font-bold text-pink-700 uppercase tracking-widest mb-1">Family</p>
                <p className="text-sm font-bold text-pink-900">{aiData.fordUpdates.family}</p>
              </div>
            )}
            {aiData.fordUpdates.occupation && (
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl shadow-sm">
                <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-1">Occupation</p>
                <p className="text-sm font-bold text-blue-900">{aiData.fordUpdates.occupation}</p>
              </div>
            )}
            {aiData.fordUpdates.recreation && (
              <div className="p-4 bg-green-50/50 border border-green-100 rounded-2xl shadow-sm">
                <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest mb-1">Recreation</p>
                <p className="text-sm font-bold text-green-900">{aiData.fordUpdates.recreation}</p>
              </div>
            )}
            {aiData.fordUpdates.dreams && (
              <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl shadow-sm">
                <p className="text-[10px] font-bold text-purple-700 uppercase tracking-widest mb-1">Dreams</p>
                <p className="text-sm font-bold text-purple-900">{aiData.fordUpdates.dreams}</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {interaction.externalLink && (
        <div className="pt-2">
          <a 
            href={interaction.externalLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 p-4 bg-slate-900 rounded-2xl text-sm font-bold text-white hover:bg-slate-800 transition-colors shadow-lg"
          >
            <ExternalLink className="h-5 w-5" />
            Open Meeting Source (Fathom / Granola)
          </a>
        </div>
      )}
    </div>
  );
}

function InteractionList({ 
  interactions, 
  people, 
  filterTypes,
  onEdit,
  onDelete 
}: { 
  interactions: Interaction[];
  people: Person[];
  filterTypes: string[];
  onEdit: (interaction: Interaction) => void;
  onDelete: (id: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [selectedInteractionForDetail, setSelectedInteractionForDetail] = useState<Interaction | null>(null);

  const [showLogDialog, setShowLogDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedInteractionToEdit, setSelectedInteractionToEdit] = useState<Interaction | null>(null);

  const [logFormData, setLogFormData] = useState({
    personId: "",
    type: "call",
    occurredAt: new Date().toISOString().slice(0, 16),
    summary: "",
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createInteraction = useMutation({
    mutationFn: async (data: any) => {
      // Safely parse datetime-local to ISO string
      let occurredAt: string;
      try {
        const date = new Date(data.occurredAt);
        occurredAt = isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
      } catch {
        occurredAt = new Date().toISOString();
      }
      const res = await apiRequest("POST", "/api/interactions", {
        ...data,
        occurredAt,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interactions"] });
      toast({ title: "Interaction logged" });
      setShowLogDialog(false);
      setLogFormData({
        personId: "",
        type: "call",
        occurredAt: new Date().toISOString().slice(0, 16),
        summary: "",
      });
    },
  });

  const updateInteraction = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      // Safely parse datetime-local to ISO string
      let occurredAt: string;
      try {
        const date = new Date(data.occurredAt);
        occurredAt = isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
      } catch {
        occurredAt = new Date().toISOString();
      }
      const res = await apiRequest("PATCH", `/api/interactions/${id}`, {
        ...data,
        occurredAt,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interactions"] });
      toast({ title: "Interaction updated" });
      setShowEditDialog(false);
      setSelectedInteractionToEdit(null);
    },
  });

  const handleLogSubmit = () => {
    if (!logFormData.personId || !logFormData.summary) {
      toast({ title: "Missing fields", variant: "destructive" });
      return;
    }
    if (showEditDialog && selectedInteractionToEdit) {
      updateInteraction.mutate({ id: selectedInteractionToEdit.id, ...logFormData });
    } else {
      createInteraction.mutate(logFormData);
    }
  };

  const openEditDialog = (interaction: Interaction) => {
    setSelectedInteractionToEdit(interaction);
    
    // Format date for datetime-local input using LOCAL time (not UTC)
    // datetime-local expects format: YYYY-MM-DDTHH:mm
    const formatDateTimeLocal = (d: Date): string => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    
    let formattedDate: string;
    try {
      const date = new Date(interaction.occurredAt || interaction.createdAt);
      formattedDate = isNaN(date.getTime()) 
        ? formatDateTimeLocal(new Date())
        : formatDateTimeLocal(date);
    } catch {
      formattedDate = formatDateTimeLocal(new Date());
    }
    
    setLogFormData({
      personId: interaction.personId || "",
      type: interaction.type,
      occurredAt: formattedDate,
      summary: interaction.summary || "",
    });
    setShowEditDialog(true);
  };
  
  const { data: drafts = [] } = useQuery<GeneratedDraft[]>({
    queryKey: ["/api/generated-drafts"],
  });
  
  const getPersonById = (id: string | null) => people.find(p => p.id === id);
  
  const getDateFilterCutoff = () => {
    const now = new Date();
    switch (dateFilter) {
      case "today":
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case "week":
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return weekAgo;
      case "month":
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return monthAgo;
      case "quarter":
        const quarterAgo = new Date(now);
        quarterAgo.setMonth(quarterAgo.getMonth() - 3);
        return quarterAgo;
      case "year":
        const yearAgo = new Date(now);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        return yearAgo;
      default:
        return null;
    }
  };
  
  const filteredInteractions = interactions
    .filter(i => filterTypes.length === 0 || filterTypes.includes(i.type))
    .filter(i => {
      const cutoff = getDateFilterCutoff();
      if (cutoff) {
        const interactionDate = new Date(i.occurredAt || i.createdAt);
        if (interactionDate < cutoff) return false;
      }
      return true;
    })
    .filter(i => {
      if (!searchQuery) return true;
      const person = getPersonById(i.personId);
      const personName = person?.name?.toLowerCase() || "";
      const summary = i.summary?.toLowerCase() || "";
      return personName.includes(searchQuery.toLowerCase()) || summary.includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => new Date(b.occurredAt || b.createdAt).getTime() - new Date(a.occurredAt || a.createdAt).getTime());

  const getTypeConfig = (type: string) => {
    return allInteractionTypes.find(t => t.value === type) || liveFlowTypes[0];
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search interactions..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-interactions"
          />
        </div>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-date-filter">
            <SelectValue placeholder="Filter by date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="month">Last 30 Days</SelectItem>
            <SelectItem value="quarter">Last 3 Months</SelectItem>
            <SelectItem value="year">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {filteredInteractions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No interactions found</p>
        </div>
      ) : filteredInteractions.map((interaction) => {
        const person = getPersonById(interaction.personId);
        const config = getTypeConfig(interaction.type);
        const Icon = config.icon;
        
        return (
          <Card 
            key={interaction.id} 
            className="hover:shadow-md transition-shadow cursor-pointer" 
            data-testid={`interaction-card-${interaction.id}`}
            onClick={() => setSelectedInteractionForDetail(interaction)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3 flex-1">
                  <div className={`p-2 rounded-lg ${config.color.split(' ')[0]} shrink-0`}>
                    <Icon className={`h-5 w-5 ${config.color.split(' ')[1]}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className={config.color}>
                        {config.label}
                      </Badge>
                      <span 
                        className="text-xs text-muted-foreground flex items-center gap-1"
                        title={format(new Date(interaction.occurredAt || interaction.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      >
                        <Clock className="h-3 w-3" />
                        {format(new Date(interaction.occurredAt || interaction.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                    
                    {person && (
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-slate-100">
                            {getInitials(person.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{person.name}</span>
                      </div>
                    )}
                    
                    {interaction.summary && (
                      <p className="text-sm text-gray-600 line-clamp-2">{getDisplayText(interaction.summary)}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(interaction)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => onDelete(interaction.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      
      {/* Conversation Detail - Mobile-friendly Drawer */}
      <Drawer open={!!selectedInteractionForDetail} onOpenChange={(open) => !open && setSelectedInteractionForDetail(null)}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Conversation Details</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="p-4 overflow-y-auto max-h-[85vh]">
            {selectedInteractionForDetail && (
              <InteractionDetailSheet
                interaction={selectedInteractionForDetail}
                person={getPersonById(selectedInteractionForDetail.personId)}
                drafts={drafts}
                onClose={() => setSelectedInteractionForDetail(null)}
              />
            )}
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function DraftsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: drafts = [], isLoading } = useQuery<GeneratedDraft[]>({
    queryKey: ["/api/generated-drafts"],
  });
  
  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  const updateDraft = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/generated-drafts/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generated-drafts"] });
      toast({ title: "Draft updated" });
    },
  });

  const deleteDraft = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/generated-drafts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generated-drafts"] });
      toast({ title: "Draft deleted" });
    },
  });

  const getPersonById = (id: string | null) => people.find(p => p.id === id);

  const pendingDrafts = drafts.filter(d => d.status === "pending");
  const sentDrafts = drafts.filter(d => d.status === "sent" || d.status === "used");

  const getTypeConfig = (type: string) => {
    const configs: Record<string, { icon: any; label: string; color: string }> = {
      email: { icon: Mail, label: "Email", color: "bg-blue-50 text-blue-700 border-blue-200" },
      handwritten_note: { icon: FileText, label: "Handwritten Note", color: "bg-amber-50 text-amber-700 border-amber-200" },
      task: { icon: CheckSquare, label: "Task", color: "bg-green-50 text-green-700 border-green-200" },
    };
    return configs[type] || configs.email;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Pending Drafts ({pendingDrafts.length})
        </h3>
        
        {pendingDrafts.length === 0 ? (
          <p className="text-muted-foreground text-sm">No pending drafts. Process conversations to generate drafts.</p>
        ) : (
          <div className="space-y-3">
            {pendingDrafts.map((draft) => {
              const person = getPersonById(draft.personId);
              const config = getTypeConfig(draft.type);
              const Icon = config.icon;
              
              return (
                <Card key={draft.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${config.color.split(' ')[0]}`}>
                        <Icon className={`h-5 w-5 ${config.color.split(' ')[1]}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={config.color}>{config.label}</Badge>
                          {person && (
                            <span className="text-sm font-medium">{person.name}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-4">{draft.content}</p>
                        
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline" onClick={() => copyToClipboard(draft.content)}>
                            <Copy className="h-3 w-3 mr-1" /> Copy
                          </Button>
                          <Button size="sm" onClick={() => updateDraft.mutate({ id: draft.id, status: "sent" })}>
                            <Check className="h-3 w-3 mr-1" /> Mark Sent
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteDraft.mutate(draft.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {sentDrafts.length > 0 && (
        <div>
          <h3 className="font-medium mb-3 flex items-center gap-2 text-muted-foreground">
            <Check className="h-4 w-4" />
            Sent / Used ({sentDrafts.length})
          </h3>
          <div className="space-y-2 opacity-60">
            {sentDrafts.slice(0, 5).map((draft) => {
              const person = getPersonById(draft.personId);
              const config = getTypeConfig(draft.type);
              
              return (
                <Card key={draft.id} className="bg-muted/30">
                  <CardContent className="p-3 flex items-center gap-3">
                    <Badge variant="outline" className={config.color}>{config.label}</Badge>
                    {person && <span className="text-sm">{person.name}</span>}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatDistanceToNow(new Date(draft.updatedAt), { addSuffix: true })}
                    </span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Flow() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("live");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addFlowType, setAddFlowType] = useState<"live" | "auto">("live");
  
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [personSearch, setPersonSearch] = useState("");
  const [showPersonSearch, setShowPersonSearch] = useState(false);
  const [formData, setFormData] = useState({
    summary: "",
    externalLink: "",
    occurredAt: new Date().toISOString().slice(0, 16),
  });

  const [showLogDialog, setShowLogDialog] = useState(false);
  const [logFormData, setLogFormData] = useState({
    personId: "",
    type: "call",
    occurredAt: new Date().toISOString().slice(0, 16),
    summary: "",
    fordFamily: "",
    fordOccupation: "",
    fordRecreation: "",
    fordDreams: "",
  });

  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  const { data: interactions = [], isLoading } = useQuery<Interaction[]>({
    queryKey: ["/api/interactions"],
  });

  const createInteraction = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/interactions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      setShowAddDialog(false);
      resetForm();
      toast({ title: "Flow logged", description: "Your interaction has been saved." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save", variant: "destructive" });
    },
  });

  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const updateInteraction = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      return apiRequest("PATCH", `/api/interactions/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/interactions-with-participants"] });
      setShowEditDialog(false);
      setSelectedInteraction(null);
      toast({ title: "Updated" });
    },
  });

  const deleteInteraction = useMutation({
    mutationFn: async (id: string) => {
      // Use the delete endpoint which moves to Recently Deleted
      return apiRequest("POST", `/api/interactions/${id}/delete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/interactions-with-participants"] });
      toast({ 
        title: "Deleted",
        description: "Conversation moved to Recently Deleted."
      });
    },
  });

  const handleEdit = (interaction: Interaction) => {
    // Determine if it's live or auto based on the type
    const isLive = liveFlowTypes.some(t => t.value === interaction.type);
    setAddFlowType(isLive ? "live" : "auto");
    
    // Format date for datetime-local input using LOCAL time (not UTC)
    const formatDateTimeLocal = (d: Date): string => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    
    let formattedDate: string;
    try {
      const date = new Date(interaction.occurredAt || interaction.createdAt);
      formattedDate = isNaN(date.getTime()) 
        ? formatDateTimeLocal(new Date())
        : formatDateTimeLocal(date);
    } catch {
      formattedDate = formatDateTimeLocal(new Date());
    }
    
    setSelectedInteraction(interaction);
    setSelectedType(interaction.type);
    setSelectedPerson(people.find(p => p.id === interaction.personId) || null);
    setFormData({
      summary: interaction.summary || "",
      externalLink: interaction.externalLink || "",
      occurredAt: formattedDate,
    });
    
    // In Flow page, detail sheet isn't used for edit triggering anymore
    // but we still want to open the edit dialog
    setShowEditDialog(true);
  };

  const handleUpdate = () => {
    if (!selectedInteraction || !selectedType || !selectedPerson) return;
    
    // Convert datetime-local string to ISO format for the server
    let occurredAtISO: string;
    try {
      const dateValue = formData.occurredAt ? new Date(formData.occurredAt) : new Date();
      occurredAtISO = isNaN(dateValue.getTime()) ? new Date().toISOString() : dateValue.toISOString();
    } catch {
      occurredAtISO = new Date().toISOString();
    }
    
    updateInteraction.mutate({
      id: selectedInteraction.id,
      updates: {
        type: selectedType,
        personId: selectedPerson.id,
        summary: formData.summary,
        externalLink: formData.externalLink || undefined,
        occurredAt: occurredAtISO,
      },
    });
  };

  const resetForm = () => {
    setSelectedType("");
    setSelectedPerson(null);
    setPersonSearch("");
    setFormData({ summary: "", externalLink: "", occurredAt: new Date().toISOString().slice(0, 16) });
  };

  const openAddDialog = (flowType: "live" | "auto") => {
    setAddFlowType(flowType);
    resetForm();
    setShowAddDialog(true);
  };

  const handleSubmit = () => {
    if (!selectedType || !selectedPerson) {
      toast({ title: "Missing info", description: "Please select a type and person", variant: "destructive" });
      return;
    }
    
    // Convert datetime-local string to ISO format for the server
    let occurredAtISO: string;
    try {
      const dateValue = formData.occurredAt ? new Date(formData.occurredAt) : new Date();
      occurredAtISO = isNaN(dateValue.getTime()) ? new Date().toISOString() : dateValue.toISOString();
    } catch {
      occurredAtISO = new Date().toISOString();
    }
    
    createInteraction.mutate({
      type: selectedType,
      personId: selectedPerson.id,
      summary: formData.summary,
      externalLink: formData.externalLink || undefined,
      occurredAt: occurredAtISO,
    });
  };

  const handleLogSubmitWithFord = () => {
    if (!logFormData.personId) {
      toast({ title: "Please select a contact", variant: "destructive" });
      return;
    }
    
    const hasFordData = logFormData.fordFamily || logFormData.fordOccupation || 
                         logFormData.fordRecreation || logFormData.fordDreams;
    const hasSummary = logFormData.summary.trim().length > 0;
    
    if (!hasFordData && !hasSummary) {
      toast({ title: "Add notes or FORD details", description: "Tell us what you learned from this conversation", variant: "destructive" });
      return;
    }
    
    const fordSections: string[] = [];
    if (logFormData.fordFamily) fordSections.push(`Family: ${logFormData.fordFamily}`);
    if (logFormData.fordOccupation) fordSections.push(`Occupation: ${logFormData.fordOccupation}`);
    if (logFormData.fordRecreation) fordSections.push(`Recreation: ${logFormData.fordRecreation}`);
    if (logFormData.fordDreams) fordSections.push(`Dreams: ${logFormData.fordDreams}`);
    
    const fullSummary = [logFormData.summary, ...fordSections].filter(Boolean).join('\n\n');
    
    createInteraction.mutate({
      type: logFormData.type,
      personId: logFormData.personId,
      summary: fullSummary,
      occurredAt: logFormData.occurredAt,
    });
    setShowLogDialog(false);
    setLogFormData({
      personId: "",
      type: "call",
      occurredAt: new Date().toISOString().slice(0, 16),
      summary: "",
      fordFamily: "",
      fordOccupation: "",
      fordRecreation: "",
      fordDreams: "",
    });
  };

  const filteredPeople = people.filter(p => 
    p.name.toLowerCase().includes(personSearch.toLowerCase())
  );

  const currentTypes = addFlowType === "live" ? liveFlowTypes : autoFlowTypes;
  const liveFlowTypeValues = liveFlowTypes.map(t => t.value);
  const autoFlowTypeValues = autoFlowTypes.map(t => t.value);

  return (
    <Layout>
      <FordTrackerCompact />
      <div className="min-h-screen bg-secondary/30">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background rounded-3xl p-8 mb-8 border border-primary/10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl font-serif font-bold text-primary mb-2">Flow</h1>
                <p className="text-muted-foreground text-lg">Just finished a conversation? Capture it now.</p>
                <p className="text-muted-foreground text-sm mt-1">Log what you learned and let AI draft your follow-up.</p>
              </div>
              <Button 
                size="lg"
                className="gap-3 rounded-2xl h-14 px-8 shadow-xl shadow-primary/30 font-bold text-lg bg-primary hover:bg-primary/90" 
                onClick={() => setShowLogDialog(true)}
                data-testid="button-log-interaction"
              >
                <Plus className="h-6 w-6" />
                Log a Conversation
              </Button>
            </div>
          </div>
          
          <header className="flex justify-between items-center mb-6">
            <p className="text-sm text-muted-foreground">Your conversation history</p>
          </header>

          <Dialog open={showLogDialog} onOpenChange={(open) => {
            if (!open) {
              setShowLogDialog(false);
            }
          }}>
            <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
              <div className="bg-primary p-8 text-primary-foreground">
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <DialogTitle className="text-2xl font-bold tracking-tight">
                        Log Interaction
                      </DialogTitle>
                      <DialogDescription className="text-primary-foreground/80 font-medium">
                        Record the details of your conversation
                      </DialogDescription>
                    </div>
                    {logFormData.personId && (
                      <Avatar className="h-12 w-12 border-2 border-primary-foreground/20 shadow-sm">
                        <AvatarFallback className="bg-white/10 text-white font-bold">
                          {getInitials(people.find(p => p.id === logFormData.personId)?.name || "?")}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                </DialogHeader>
              </div>

              <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Select Contact</Label>
                    <Select 
                      value={logFormData.personId} 
                      onValueChange={(v) => setLogFormData(prev => ({ ...prev, personId: v }))}
                    >
                      <SelectTrigger className="h-12 rounded-xl border-muted-foreground/20 font-medium focus:ring-primary/20" data-testid="select-contact">
                        <SelectValue placeholder="Search people..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl">
                        {people.map(p => (
                          <SelectItem key={p.id} value={p.id} className="rounded-lg">{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Date & Time</Label>
                    <div className="relative">
                      <Input 
                        type="datetime-local" 
                        value={logFormData.occurredAt}
                        onChange={(e) => setLogFormData(prev => ({ ...prev, occurredAt: e.target.value }))}
                        className="h-12 rounded-xl border-muted-foreground/20 font-medium pl-10 focus:ring-primary/20"
                        data-testid="input-date"
                      />
                      <Calendar className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground/50" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Interaction Type</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {allInteractionTypes.map(type => {
                      const Icon = type.icon;
                      const isSelected = logFormData.type === type.value;
                      return (
                        <button
                          key={type.value}
                          onClick={() => setLogFormData(prev => ({ ...prev, type: type.value }))}
                          className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 group ${
                            isSelected 
                            ? "border-primary bg-primary/5 shadow-inner" 
                            : "border-muted-foreground/10 hover:border-primary/50 hover:bg-muted/50"
                          }`}
                          data-testid={`type-${type.value}`}
                        >
                          <div className={`p-2 rounded-xl transition-colors ${
                            isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                          }`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${
                            isSelected ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                          }`}>
                            {type.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quick Notes (optional)</Label>
                  <div className="relative">
                    <MentionTextarea
                      value={logFormData.summary}
                      onChange={(v) => setLogFormData(prev => ({ ...prev, summary: v }))}
                      placeholder="Any quick notes about the conversation..."
                      className="min-h-[80px] rounded-2xl border-muted-foreground/20 p-4 font-medium leading-relaxed focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">FORD Notes</Label>
                    <span className="text-xs text-muted-foreground">(What did you learn about them?)</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-pink-700 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                        Family
                      </Label>
                      <Input
                        value={logFormData.fordFamily}
                        onChange={(e) => setLogFormData(prev => ({ ...prev, fordFamily: e.target.value }))}
                        placeholder="Spouse, kids, parents, pets..."
                        className="rounded-xl border-pink-200 focus:border-pink-400"
                        data-testid="input-ford-family"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-blue-700 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        Occupation
                      </Label>
                      <Input
                        value={logFormData.fordOccupation}
                        onChange={(e) => setLogFormData(prev => ({ ...prev, fordOccupation: e.target.value }))}
                        placeholder="Job, company, work updates..."
                        className="rounded-xl border-blue-200 focus:border-blue-400"
                        data-testid="input-ford-occupation"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-green-700 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Recreation
                      </Label>
                      <Input
                        value={logFormData.fordRecreation}
                        onChange={(e) => setLogFormData(prev => ({ ...prev, fordRecreation: e.target.value }))}
                        placeholder="Hobbies, sports, travel..."
                        className="rounded-xl border-green-200 focus:border-green-400"
                        data-testid="input-ford-recreation"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-purple-700 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        Dreams
                      </Label>
                      <Input
                        value={logFormData.fordDreams}
                        onChange={(e) => setLogFormData(prev => ({ ...prev, fordDreams: e.target.value }))}
                        placeholder="Goals, aspirations, bucket list..."
                        className="rounded-xl border-purple-200 focus:border-purple-400"
                        data-testid="input-ford-dreams"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="p-8 bg-muted/30 border-t flex flex-col sm:flex-row gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowLogDialog(false)}
                  className="rounded-xl h-12 px-8 font-bold order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <div className="flex gap-3 order-1 sm:order-2 flex-1 sm:flex-none">
                  <Button 
                    onClick={handleLogSubmitWithFord}
                    disabled={createInteraction.isPending}
                    className="rounded-xl h-12 px-8 font-bold flex-1 sm:flex-none shadow-lg shadow-primary/20"
                    data-testid="button-save-interaction"
                  >
                    {createInteraction.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save & Generate Follow-up
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="live" className="gap-2" data-testid="tab-live-flow">
                <Phone className="h-4 w-4" />
                Flow
              </TabsTrigger>
              <TabsTrigger value="drafts" className="gap-2" data-testid="tab-drafts">
                <Sparkles className="h-4 w-4" />
                AI Drafts
              </TabsTrigger>
            </TabsList>

            <TabsContent value="live">
              <div className="mb-4">
                <Button onClick={() => openAddDialog("live")} data-testid="button-add-live-flow">
                  <Plus className="h-4 w-4 mr-2" /> Log Flow
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Calls, meetings, face-to-face conversations
                </p>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : (
                <InteractionList 
                  interactions={interactions} 
                  people={people}
                  filterTypes={liveFlowTypeValues}
                  onEdit={handleEdit}
                  onDelete={(id) => deleteInteraction.mutate(id)}
                />
              )}
            </TabsContent>

            <TabsContent value="drafts">
              <DraftsTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={showAddDialog || showEditDialog} onOpenChange={(open) => {
        if (!open) {
          setShowAddDialog(false);
          setShowEditDialog(false);
          resetForm();
          setSelectedInteraction(null);
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5" />
              {showEditDialog ? "Edit Conversation" : "Log Flow"}
            </DialogTitle>
            <DialogDescription>
              {showEditDialog ? "Update conversation details or assign a contact." : "Record a call, meeting, or conversation"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div>
              <Label className="mb-3 block text-sm font-semibold text-foreground">Type</Label>
              <div className="grid grid-cols-4 gap-2">
                {(addFlowType === "live" ? liveFlowTypes : autoFlowTypes).map((type) => {
                  const TypeIcon = type.icon;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setSelectedType(type.value)}
                      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${
                        selectedType === type.value 
                          ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary' 
                          : 'border-muted bg-muted/20 hover:border-muted-foreground/30 hover:bg-muted/40'
                      }`}
                      data-testid={`button-type-${type.value}`}
                    >
                      <TypeIcon className={`h-6 w-6 ${selectedType === type.value ? 'text-primary' : 'text-foreground'}`} />
                      <span className={`text-[11px] font-bold ${selectedType === type.value ? 'text-primary' : 'text-muted-foreground'}`}>{type.label.split(" ")[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="mb-3 block text-sm font-semibold text-foreground">Who was this with?</Label>
              <div className="relative">
                {selectedPerson ? (
                  <div 
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-muted flex-1 cursor-pointer hover:bg-muted/50 transition-colors group shadow-sm"
                    onClick={() => {
                      setSelectedPerson(null);
                      setShowPersonSearch(true);
                    }}
                  >
                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {getInitials(selectedPerson.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-foreground">{selectedPerson.name}</p>
                      {selectedPerson.email && (
                        <p className="text-xs text-muted-foreground font-medium">{selectedPerson.email}</p>
                      )}
                    </div>
                    <X className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                ) : (
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search contacts..."
                        value={personSearch}
                        onChange={(e) => {
                          setPersonSearch(e.target.value);
                          setShowPersonSearch(true);
                        }}
                        onFocus={() => setShowPersonSearch(true)}
                        className="pl-9 h-12 rounded-xl bg-muted/20 border-muted focus-visible:ring-primary font-medium"
                        data-testid="input-person-search"
                      />
                    </div>
                    {showPersonSearch && personSearch && (
                      <Card className="absolute z-10 w-full mt-2 max-h-48 overflow-auto shadow-2xl rounded-2xl border-muted">
                        <CardContent className="p-1.5">
                          {filteredPeople.slice(0, 5).map((person) => (
                            <button
                              key={person.id}
                              className="w-full flex items-center gap-3 p-3 hover:bg-primary/5 rounded-xl transition-colors group text-left"
                              onClick={() => {
                                setSelectedPerson(person);
                                setPersonSearch("");
                                setShowPersonSearch(false);
                              }}
                              data-testid={`button-select-person-${person.id}`}
                            >
                              <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                  {getInitials(person.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{person.name}</p>
                                {person.email && (
                                  <p className="text-xs text-muted-foreground font-medium">{person.email}</p>
                                )}
                              </div>
                            </button>
                          ))}
                          {filteredPeople.length === 0 && (
                            <p className="text-sm text-muted-foreground p-4 italic font-medium">No contacts found</p>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="date" className="mb-3 block text-sm font-semibold text-foreground">Date & Time</Label>
              <Input
                id="date"
                type="datetime-local"
                value={formData.occurredAt}
                onChange={(e) => setFormData({ ...formData, occurredAt: e.target.value })}
                className="h-12 rounded-xl bg-muted/20 border-muted focus-visible:ring-primary font-medium"
                data-testid="input-occurred-at"
              />
            </div>

            <div>
              <Label htmlFor="summary" className="mb-3 block flex items-center gap-2 text-sm font-semibold text-foreground">
                Summary / Notes
                <span className="text-[10px] text-muted-foreground ml-auto font-bold uppercase tracking-wider">Type @ to mention someone</span>
              </Label>
              <MentionTextarea
                id="summary"
                placeholder="What did you discuss? Type @ to mention someone"
                value={formData.summary}
                onChange={(value) => setFormData({ ...formData, summary: value })}
                rows={5}
                className="rounded-xl bg-muted/20 border-muted focus-visible:ring-primary p-4 text-sm font-medium leading-relaxed resize-none"
                data-testid="input-summary"
              />
            </div>

            <div>
              <Label htmlFor="external-link" className="mb-3 block text-sm font-semibold text-foreground">External Link (optional)</Label>
              <Input
                id="external-link"
                placeholder="Fathom, Granola, or other link..."
                value={formData.externalLink}
                onChange={(e) => setFormData({ ...formData, externalLink: e.target.value })}
                className="h-12 rounded-xl bg-muted/20 border-muted focus-visible:ring-primary font-medium"
                data-testid="input-external-link"
              />
            </div>
          </div>

          <DialogFooter className="flex-col gap-3 pt-6 border-t sm:flex-row sm:justify-between items-center">
            {showEditDialog ? (
              <Button 
                variant="ghost" 
                className="text-red-500 hover:text-red-600 hover:bg-red-50 font-bold text-sm px-4 gap-2 h-11 rounded-xl"
                onClick={() => {
                  if (confirm("Move this conversation to Recently Deleted?")) {
                    deleteInteraction.mutate(selectedInteraction!.id);
                  }
                }}
                disabled={deleteInteraction.isPending}
                data-testid="button-edit-delete"
              >
                {deleteInteraction.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </Button>
            ) : <div className="hidden sm:block" />}
            
            <div className="flex gap-3 w-full sm:w-auto">
              <Button 
                variant="outline" 
                className="h-11 rounded-xl px-6 font-bold text-sm flex-1 sm:flex-none"
                onClick={() => {
                  setShowAddDialog(false);
                  setShowEditDialog(false);
                  resetForm();
                  setSelectedInteraction(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                className="h-11 rounded-xl px-8 font-bold text-sm bg-[#16423C] hover:bg-[#0D2B27] text-white flex-1 sm:flex-none shadow-md"
                onClick={showEditDialog ? handleUpdate : handleSubmit}
                disabled={createInteraction.isPending || updateInteraction.isPending}
              >
                {(createInteraction.isPending || updateInteraction.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {showEditDialog ? "Save Changes" : "Log Flow"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
