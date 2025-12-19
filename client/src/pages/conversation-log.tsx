import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  MessageSquare, 
  Plus, 
  Phone, 
  Video, 
  Mail, 
  MessageCircle,
  Link as LinkIcon,
  Calendar,
  Clock,
  Search,
  FileText,
  ExternalLink,
  Check,
  Loader2,
  ChevronRight,
  Filter
} from "lucide-react";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import type { Person, Interaction } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

const interactionTypes = [
  { value: "call", label: "Phone Call", icon: Phone, color: "bg-green-50 text-green-700 border-green-200" },
  { value: "meeting", label: "Meeting / Video", icon: Video, color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "text", label: "Text Message", icon: MessageCircle, color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "email", label: "Email", icon: Mail, color: "bg-orange-50 text-orange-700 border-orange-200" },
];

function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function ConversationLog() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [personSearch, setPersonSearch] = useState("");
  const [showPersonSearch, setShowPersonSearch] = useState(false);
  const [formData, setFormData] = useState({
    summary: "",
    externalLink: "",
    occurredAt: new Date().toISOString().slice(0, 16),
  });
  const [filterType, setFilterType] = useState<string>("all");

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
      toast({
        title: "Conversation Logged",
        description: "Your interaction has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save interaction",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedType("");
    setSelectedPerson(null);
    setPersonSearch("");
    setFormData({
      summary: "",
      externalLink: "",
      occurredAt: new Date().toISOString().slice(0, 16),
    });
  };

  const handleSubmit = () => {
    if (!selectedType || !selectedPerson) {
      toast({
        title: "Missing Info",
        description: "Please select a conversation type and person.",
        variant: "destructive",
      });
      return;
    }

    createInteraction.mutate({
      personId: selectedPerson.id,
      type: selectedType,
      summary: formData.summary || null,
      externalLink: formData.externalLink || null,
      occurredAt: new Date(formData.occurredAt).toISOString(),
      source: formData.externalLink?.includes("fathom") ? "fathom" : 
              formData.externalLink?.includes("granola") ? "granola" : "manual",
    });
  };

  const filteredPeople = people.filter(p => {
    const name = p.name?.toLowerCase() || "";
    return name.includes(personSearch.toLowerCase()) || 
           p.email?.toLowerCase().includes(personSearch.toLowerCase()) ||
           p.phone?.includes(personSearch);
  });

  const getPersonById = (personId: string | null) => {
    if (!personId) return null;
    return people.find(p => p.id === personId);
  };

  const getTypeConfig = (type: string) => {
    return interactionTypes.find(t => t.value === type) || interactionTypes[0];
  };

  const filteredInteractions = interactions.filter(i => {
    if (filterType === "all") return true;
    return i.type === filterType;
  });

  const groupedInteractions = filteredInteractions.reduce((acc, interaction) => {
    const date = format(new Date(interaction.occurredAt), "yyyy-MM-dd");
    if (!acc[date]) acc[date] = [];
    acc[date].push(interaction);
    return acc;
  }, {} as Record<string, Interaction[]>);

  const sortedDates = Object.keys(groupedInteractions).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <Layout>
      <div className="min-h-screen bg-secondary/30 relative">
        <div 
          className="fixed inset-0 opacity-40 mix-blend-multiply pointer-events-none -z-10"
          style={{ backgroundImage: `url(${paperBg})`, backgroundSize: 'cover' }}
        />
        
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <header className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-3xl font-serif font-bold text-primary flex items-center gap-3" data-testid="page-title">
                <MessageSquare className="h-8 w-8 text-indigo-600" />
                Conversation Log
              </h1>
              <p className="text-muted-foreground mt-2">
                Track every conversation. Link Fathom recordings, Granola notes, or log calls manually.
              </p>
            </div>
            <Button 
              size="lg" 
              className="gap-2 shadow-lg" 
              onClick={() => setShowAddDialog(true)}
              data-testid="button-add-conversation"
            >
              <Plus className="h-4 w-4" /> Log Conversation
            </Button>
          </header>

          <div className="flex gap-4 mb-6">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px] bg-background" data-testid="select-filter-type">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {interactionTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : interactions.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Conversations Yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Start logging your calls, meetings, and messages to build relationship history.
                </p>
                <Button onClick={() => setShowAddDialog(true)} data-testid="button-empty-state-add">
                  <Plus className="h-4 w-4 mr-2" /> Log Your First Conversation
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {sortedDates.map(date => (
                <div key={date}>
                  <div className="flex items-center gap-3 mb-4">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      {format(new Date(date), "EEEE, MMMM d, yyyy")}
                    </span>
                    <Separator className="flex-1" />
                  </div>
                  <div className="space-y-3">
                    {groupedInteractions[date].map(interaction => {
                      const person = getPersonById(interaction.personId);
                      const typeConfig = getTypeConfig(interaction.type);
                      const TypeIcon = typeConfig.icon;
                      
                      return (
                        <Card 
                          key={interaction.id} 
                          className="border-none shadow-sm hover:shadow-md transition-all cursor-pointer"
                          data-testid={`card-interaction-${interaction.id}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {person ? getInitials(person.name) : '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">
                                    {person?.name || 'Unknown Contact'}
                                  </span>
                                  <Badge variant="outline" className={typeConfig.color}>
                                    <TypeIcon className="h-3 w-3 mr-1" />
                                    {typeConfig.label}
                                  </Badge>
                                  {interaction.externalLink && (
                                    <a 
                                      href={interaction.externalLink} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-700"
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(interaction.occurredAt), "h:mm a")}
                                  {" · "}
                                  {formatDistanceToNow(new Date(interaction.occurredAt), { addSuffix: true })}
                                </p>
                                {interaction.summary && (
                                  <p className="text-sm mt-2 line-clamp-2">{interaction.summary}</p>
                                )}
                              </div>
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Log Conversation
            </DialogTitle>
            <DialogDescription>
              Record a call, meeting, or message. Paste Fathom or Granola links to auto-import.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Type</Label>
              <div className="grid grid-cols-4 gap-2">
                {interactionTypes.map(type => {
                  const TypeIcon = type.icon;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setSelectedType(type.value)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                        selectedType === type.value 
                          ? 'border-primary bg-primary/5' 
                          : 'border-muted hover:border-muted-foreground/30'
                      }`}
                      data-testid={`button-type-${type.value}`}
                    >
                      <TypeIcon className="h-5 w-5" />
                      <span className="text-xs">{type.label.split(" ")[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Who was this with?</Label>
              <div className="relative">
                <div className="flex items-center gap-2">
                  {selectedPerson ? (
                    <div 
                      className="flex items-center gap-2 p-2 bg-secondary rounded-lg flex-1 cursor-pointer hover:bg-secondary/80"
                      onClick={() => {
                        setSelectedPerson(null);
                        setShowPersonSearch(true);
                      }}
                      data-testid="selected-person"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {getInitials(selectedPerson.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{selectedPerson.name}</span>
                    </div>
                  ) : (
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search contacts..."
                        value={personSearch}
                        onChange={e => {
                          setPersonSearch(e.target.value);
                          setShowPersonSearch(true);
                        }}
                        onFocus={() => setShowPersonSearch(true)}
                        className="pl-10"
                        data-testid="input-person-search"
                      />
                    </div>
                  )}
                </div>
                {showPersonSearch && !selectedPerson && (
                  <Card className="absolute z-10 w-full mt-1 max-h-48 overflow-auto">
                    <ScrollArea className="h-full">
                      {filteredPeople.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                          No contacts found
                        </div>
                      ) : (
                        filteredPeople.slice(0, 10).map(person => (
                          <button
                            key={person.id}
                            className="w-full flex items-center gap-3 p-3 hover:bg-secondary text-left"
                            onClick={() => {
                              setSelectedPerson(person);
                              setShowPersonSearch(false);
                              setPersonSearch("");
                            }}
                            data-testid={`option-person-${person.id}`}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {getInitials(person.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{person.name}</div>
                              {person.email && (
                                <div className="text-xs text-muted-foreground">{person.email}</div>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </ScrollArea>
                  </Card>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="occurredAt" className="mb-2 block">When</Label>
              <Input
                id="occurredAt"
                type="datetime-local"
                value={formData.occurredAt}
                onChange={e => setFormData(prev => ({ ...prev, occurredAt: e.target.value }))}
                data-testid="input-occurred-at"
              />
            </div>

            <div>
              <Label htmlFor="externalLink" className="mb-2 block flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Recording Link (optional)
              </Label>
              <Input
                id="externalLink"
                placeholder="Paste Fathom, Granola, or any link..."
                value={formData.externalLink}
                onChange={e => setFormData(prev => ({ ...prev, externalLink: e.target.value }))}
                data-testid="input-external-link"
              />
            </div>

            <div>
              <Label htmlFor="summary" className="mb-2 block flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notes / Summary
              </Label>
              <Textarea
                id="summary"
                placeholder="What did you discuss? Key takeaways..."
                value={formData.summary}
                onChange={e => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                onPaste={e => {
                  const pastedText = e.clipboardData.getData('text');
                  const target = e.target as HTMLTextAreaElement;
                  const start = target.selectionStart;
                  const end = target.selectionEnd;
                  const currentValue = formData.summary || '';
                  const newValue = currentValue.substring(0, start) + pastedText + currentValue.substring(end);
                  setFormData(prev => ({ ...prev, summary: newValue }));
                  e.preventDefault();
                }}
                rows={4}
                data-testid="input-summary"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddDialog(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createInteraction.isPending || !selectedType || !selectedPerson}
              data-testid="button-submit-conversation"
            >
              {createInteraction.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save Conversation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
