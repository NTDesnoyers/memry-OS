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
    <div className="space-y-4" data-testid="interaction-detail-sheet">
      <div className="flex items-center gap-3 pb-3 border-b">
        <div className={`p-2 rounded-lg ${config.color.split(' ')[0]}`}>
          <Icon className={`h-5 w-5 ${config.color.split(' ')[1]}`} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">{config.label}</h3>
          <p className="text-xs text-muted-foreground">
            {format(new Date(interaction.occurredAt || interaction.createdAt), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-detail">
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      {interaction.summary ? (
        <div className="bg-blue-100 border-2 border-blue-400 p-4 rounded-xl">
          <h4 className="text-sm font-bold text-blue-800 mb-2 uppercase tracking-wide">Conversation Summary</h4>
          <p className="text-base leading-relaxed whitespace-pre-wrap text-blue-900">
            {getDisplayText(interaction.summary)}
          </p>
        </div>
      ) : (
        <div className="bg-gray-100 p-4 rounded-xl text-gray-500 text-sm">
          No summary available for this conversation
        </div>
      )}
      
      {person && (
        <Link href={`/people/${person.id}`}>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg" data-testid="link-person-profile">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(person.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{person.name}</p>
              <p className="text-xs text-muted-foreground">View profile</p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </div>
        </Link>
      )}
      
      <InlineCoachingWidget interaction={interaction} />
      
      {aiData?.keyTopics && aiData.keyTopics.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Key Topics</h4>
          <div className="flex flex-wrap gap-2">
            {aiData.keyTopics.map((topic, i) => (
              <Badge key={i} variant="secondary">{topic}</Badge>
            ))}
          </div>
        </div>
      )}
      
      {aiData?.actionItems && aiData.actionItems.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Action Items
          </h4>
          <div className="space-y-2">
            {aiData.actionItems.map((item, i) => (
              <div key={i} className="flex items-start gap-2 p-2 bg-green-50 rounded-lg text-sm">
                <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {relatedDrafts.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI-Generated Follow-ups ({relatedDrafts.length})
          </h4>
          <div className="space-y-2">
            {relatedDrafts.map((draft) => {
              const draftConfig = getTypeConfig(draft.type);
              const DraftIcon = draftConfig.icon;
              return (
                <div key={draft.id} className="p-3 border rounded-lg" data-testid={`draft-${draft.id}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1 rounded ${draftConfig.color.split(' ')[0]}`}>
                      <DraftIcon className={`h-3 w-3 ${draftConfig.color.split(' ')[1]}`} />
                    </div>
                    <Badge variant="outline" className={draftConfig.color}>{draftConfig.label}</Badge>
                    <Badge variant={draft.status === "pending" ? "default" : "secondary"}>
                      {draft.status}
                    </Badge>
                  </div>
                  <p className="text-sm line-clamp-3 mb-2">{draft.content}</p>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(draft.content)}>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {aiData?.fordUpdates && Object.values(aiData.fordUpdates).some(v => v) && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">FORD Updates</h4>
          <div className="grid grid-cols-2 gap-2">
            {aiData.fordUpdates.family && (
              <div className="p-2 bg-pink-50 rounded-lg">
                <p className="text-xs font-medium text-pink-700">Family</p>
                <p className="text-sm">{aiData.fordUpdates.family}</p>
              </div>
            )}
            {aiData.fordUpdates.occupation && (
              <div className="p-2 bg-blue-50 rounded-lg">
                <p className="text-xs font-medium text-blue-700">Occupation</p>
                <p className="text-sm">{aiData.fordUpdates.occupation}</p>
              </div>
            )}
            {aiData.fordUpdates.recreation && (
              <div className="p-2 bg-green-50 rounded-lg">
                <p className="text-xs font-medium text-green-700">Recreation</p>
                <p className="text-sm">{aiData.fordUpdates.recreation}</p>
              </div>
            )}
            {aiData.fordUpdates.dreams && (
              <div className="p-2 bg-purple-50 rounded-lg">
                <p className="text-xs font-medium text-purple-700">Dreams</p>
                <p className="text-sm">{aiData.fordUpdates.dreams}</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {interaction.externalLink && (
        <a 
          href={interaction.externalLink} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm text-primary hover:underline"
        >
          <ExternalLink className="h-4 w-4" />
          Open in Fathom/External Source
        </a>
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
    
    setSelectedInteraction(interaction);
    setSelectedType(interaction.type);
    setSelectedPerson(people.find(p => p.id === interaction.personId) || null);
    setFormData({
      summary: interaction.summary || "",
      externalLink: interaction.externalLink || "",
      occurredAt: new Date(interaction.occurredAt || interaction.createdAt).toISOString().slice(0, 16),
    });
    
    // In Flow page, detail sheet isn't used for edit triggering anymore
    // but we still want to open the edit dialog
    setShowEditDialog(true);
  };

  const handleUpdate = () => {
    if (!selectedInteraction || !selectedType || !selectedPerson) return;
    updateInteraction.mutate({
      id: selectedInteraction.id,
      updates: {
        type: selectedType,
        personId: selectedPerson.id,
        summary: formData.summary,
        externalLink: formData.externalLink || undefined,
        occurredAt: formData.occurredAt,
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
    createInteraction.mutate({
      type: selectedType,
      personId: selectedPerson.id,
      summary: formData.summary,
      externalLink: formData.externalLink || undefined,
      occurredAt: formData.occurredAt,
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
          <header className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-serif font-bold text-primary">Flow</h1>
              <p className="text-muted-foreground">Frequency of Interactions with your network</p>
            </div>
          </header>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="live" className="gap-2" data-testid="tab-live-flow">
                <Phone className="h-4 w-4" />
                Live Flow
              </TabsTrigger>
              <TabsTrigger value="auto" className="gap-2" data-testid="tab-auto-flow">
                <Mail className="h-4 w-4" />
                Auto-Flow
              </TabsTrigger>
              <TabsTrigger value="drafts" className="gap-2" data-testid="tab-drafts">
                <Sparkles className="h-4 w-4" />
                AI Drafts
              </TabsTrigger>
            </TabsList>

            <TabsContent value="live">
              <div className="mb-4">
                <Button onClick={() => openAddDialog("live")} data-testid="button-add-live-flow">
                  <Plus className="h-4 w-4 mr-2" /> Log Live Flow
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

            <TabsContent value="auto">
              <div className="mb-4">
                <Button onClick={() => openAddDialog("auto")} data-testid="button-add-auto-flow">
                  <Plus className="h-4 w-4 mr-2" /> Log Auto-Flow
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Postcards, handwritten notes, emails, social media touches
                </p>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : (
                <InteractionList 
                  interactions={interactions} 
                  people={people}
                  filterTypes={autoFlowTypeValues}
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
            <DialogTitle>
              {showEditDialog ? "Edit" : "Log"} {addFlowType === "live" ? "Live" : "Auto"} Flow
            </DialogTitle>
            <DialogDescription>
              {showEditDialog ? "Update this conversation's details" : `Record a ${addFlowType === "live" ? "call, meeting, or conversation" : "postcard, note, email, or social touch"}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex gap-2 flex-wrap">
                {currentTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <Button
                      key={type.value}
                      variant={selectedType === type.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedType(type.value)}
                      className="gap-2"
                      data-testid={`button-type-${type.value}`}
                    >
                      <Icon className="h-4 w-4" />
                      {type.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Person</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for a person..."
                  value={selectedPerson ? selectedPerson.name : personSearch}
                  onChange={(e) => {
                    setPersonSearch(e.target.value);
                    setSelectedPerson(null);
                    setShowPersonSearch(true);
                  }}
                  onFocus={() => setShowPersonSearch(true)}
                  className="pl-9"
                  data-testid="input-person-search"
                />
                {showPersonSearch && personSearch && !selectedPerson && (
                  <Card className="absolute z-10 w-full mt-1 max-h-48 overflow-auto">
                    <CardContent className="p-1">
                      {filteredPeople.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-2">No people found</p>
                      ) : (
                        filteredPeople.slice(0, 8).map((person) => (
                          <Button
                            key={person.id}
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={() => {
                              setSelectedPerson(person);
                              setShowPersonSearch(false);
                            }}
                          >
                            <Avatar className="h-6 w-6 mr-2">
                              <AvatarFallback className="text-xs">{getInitials(person.name)}</AvatarFallback>
                            </Avatar>
                            {person.name}
                          </Button>
                        ))
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="What did you discuss? Any FORD updates?"
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                className="min-h-[100px]"
                data-testid="input-summary"
              />
            </div>

            <div className="space-y-2">
              <Label>When</Label>
              <Input
                type="datetime-local"
                value={formData.occurredAt}
                onChange={(e) => setFormData({ ...formData, occurredAt: e.target.value })}
                data-testid="input-occurred-at"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddDialog(false);
              setShowEditDialog(false);
              resetForm();
              setSelectedInteraction(null);
            }}>Cancel</Button>
            <Button 
              onClick={showEditDialog ? handleUpdate : handleSubmit} 
              disabled={createInteraction.isPending || updateInteraction.isPending || !selectedType || !selectedPerson}
              data-testid="button-save-flow"
            >
              {(createInteraction.isPending || updateInteraction.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {showEditDialog ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
