import Layout from "@/components/layout";
import { FordTrackerCompact } from "@/components/ford-tracker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Mail, Sparkles, Video, MessageCircle, Send } from "lucide-react";
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
  CheckSquare
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
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
  
  const getPersonById = (id: string | null) => people.find(p => p.id === id);
  
  const filteredInteractions = interactions
    .filter(i => filterTypes.length === 0 || filterTypes.includes(i.type))
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

  if (filteredInteractions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No interactions found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search interactions..." 
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="input-search-interactions"
        />
      </div>
      
      {filteredInteractions.map((interaction) => {
        const person = getPersonById(interaction.personId);
        const config = getTypeConfig(interaction.type);
        const Icon = config.icon;
        
        return (
          <Card 
            key={interaction.id} 
            className="hover:shadow-md transition-shadow cursor-pointer" 
            data-testid={`interaction-card-${interaction.id}`}
            onClick={() => setSelectedInteraction(interaction)}
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
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(interaction.occurredAt || interaction.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    
                    {person && (
                      <Link href={`/people/${person.id}`} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2 mb-2 hover:underline cursor-pointer">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs bg-slate-100">
                              {getInitials(person.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{person.name}</span>
                        </div>
                      </Link>
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
      
      {/* Conversation Detail Dialog */}
      <Dialog open={!!selectedInteraction} onOpenChange={(open) => !open && setSelectedInteraction(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          {selectedInteraction && (() => {
            const person = getPersonById(selectedInteraction.personId);
            const config = getTypeConfig(selectedInteraction.type);
            const Icon = config.icon;
            
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${config.color.split(' ')[0]}`}>
                      <Icon className={`h-5 w-5 ${config.color.split(' ')[1]}`} />
                    </div>
                    <div>
                      <DialogTitle className="flex items-center gap-2">
                        {config.label}
                        {person && <span className="text-muted-foreground font-normal">with {person.name}</span>}
                      </DialogTitle>
                      <DialogDescription>
                        {format(new Date(selectedInteraction.occurredAt || selectedInteraction.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-4">
                    {selectedInteraction.title && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Title</h4>
                        <p className="text-sm">{selectedInteraction.title}</p>
                      </div>
                    )}
                    
                    {selectedInteraction.summary && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Summary</h4>
                        <div className="prose prose-sm max-w-none">
                          <pre className="whitespace-pre-wrap font-sans text-sm bg-muted/50 p-3 rounded-lg">
                            {getDisplayText(selectedInteraction.summary)}
                          </pre>
                        </div>
                      </div>
                    )}
                    
                    {selectedInteraction.transcript && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Transcript</h4>
                        <div className="prose prose-sm max-w-none">
                          <pre className="whitespace-pre-wrap font-sans text-sm bg-muted/50 p-3 rounded-lg max-h-80 overflow-auto">
                            {selectedInteraction.transcript}
                          </pre>
                        </div>
                      </div>
                    )}
                    
                    {selectedInteraction.externalLink && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">External Link</h4>
                        <a 
                          href={selectedInteraction.externalLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {selectedInteraction.externalLink}
                        </a>
                      </div>
                    )}
                    
                    {selectedInteraction.aiExtractedData && Object.keys(selectedInteraction.aiExtractedData as object).length > 0 && (
                      <AIInsightsSection data={selectedInteraction.aiExtractedData} />
                    )}
                  </div>
                </ScrollArea>
                
                <DialogFooter className="mt-4">
                  {person && (
                    <Link href={`/people/${person.id}`}>
                      <Button variant="outline" onClick={() => setSelectedInteraction(null)}>
                        View {person.name}'s Profile
                      </Button>
                    </Link>
                  )}
                  <Button onClick={() => setSelectedInteraction(null)}>Close</Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
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

  const deleteInteraction = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/interactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interactions"] });
      toast({ title: "Deleted" });
    },
  });

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
                  onEdit={() => {}}
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
                  onEdit={() => {}}
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

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Log {addFlowType === "live" ? "Live" : "Auto"} Flow
            </DialogTitle>
            <DialogDescription>
              Record a {addFlowType === "live" ? "call, meeting, or conversation" : "postcard, note, email, or social touch"}
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
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createInteraction.isPending || !selectedType || !selectedPerson}
              data-testid="button-save-flow"
            >
              {createInteraction.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
