import Layout from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, Phone, Mail, MapPin, Loader2, MessageSquare, 
  Video, FileText, Plus, Clock, Pencil,
  Users, Linkedin, Twitter, Facebook, Instagram,
  Sparkles, PenTool, ListTodo, Activity, CalendarPlus,
  StickyNote, Heart, Briefcase, Gamepad2, Star, Filter, Upload,
  Trash2, GitMerge, AlertTriangle
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Person, InsertPerson, Interaction, GeneratedDraft } from "@shared/schema";
import { format, formatDistanceToNow } from "date-fns";
import Papa from "papaparse";

interface TimelineItem {
  id: string;
  type: 'interaction' | 'draft' | 'note';
  title: string;
  preview: string;
  date: Date;
  source?: string | null;
  data: any;
}

export default function People() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("timeline");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<Partial<InsertPerson>>({
    name: "",
    email: "",
    phone: "",
    role: "",
    segment: "",
    notes: "",
  });

  const { data: people = [], isLoading } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  const { data: selectedPerson, refetch: refetchPerson } = useQuery<Person>({
    queryKey: [`/api/people/${selectedPersonId}`],
    enabled: !!selectedPersonId,
  });

  const { data: interactions = [] } = useQuery<Interaction[]>({
    queryKey: [`/api/people/${selectedPersonId}/interactions`],
    enabled: !!selectedPersonId,
  });

  const { data: drafts = [] } = useQuery<GeneratedDraft[]>({
    queryKey: [`/api/people/${selectedPersonId}/drafts`],
    enabled: !!selectedPersonId,
  });

  const createPersonMutation = useMutation({
    mutationFn: async (data: Partial<InsertPerson>) => {
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create person");
      return res.json();
    },
    onSuccess: (newPerson) => {
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      setDialogOpen(false);
      setFormData({ name: "", email: "", phone: "", role: "", segment: "", notes: "" });
      setSelectedPersonId(newPerson.id);
      toast({ title: "Person added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add person", variant: "destructive" });
    },
  });

  const updatePersonMutation = useMutation({
    mutationFn: async (data: Partial<Person>) => {
      const res = await fetch(`/api/people/${selectedPersonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update person");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      queryClient.invalidateQueries({ queryKey: [`/api/people/${selectedPersonId}`] });
      setEditDialogOpen(false);
      toast({ title: "Person updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update person", variant: "destructive" });
    },
  });

  const deletePersonMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/people/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete person");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      setDeleteDialogOpen(false);
      setEditDialogOpen(false);
      setSelectedPersonId(null);
      toast({ title: "Contact deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete contact", variant: "destructive" });
    },
  });

  const mergePersonsMutation = useMutation({
    mutationFn: async ({ primaryId, secondaryId }: { primaryId: string; secondaryId: string }) => {
      const res = await fetch("/api/people/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryId, secondaryId }),
      });
      if (!res.ok) throw new Error("Failed to merge contacts");
      return res.json();
    },
    onSuccess: (mergedPerson) => {
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      setMergeDialogOpen(false);
      setMergeTargetId(null);
      setSelectedPersonId(mergedPerson.id);
      toast({ title: "Contacts merged successfully" });
    },
    onError: () => {
      toast({ title: "Failed to merge contacts", variant: "destructive" });
    },
  });

  const filteredPeople = people
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.phone?.includes(searchQuery);
      const matchesSegment = segmentFilter === "all" || 
        p.segment?.toLowerCase().startsWith(segmentFilter.toLowerCase());
      return matchesSearch && matchesSegment;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    if (!selectedPersonId && filteredPeople.length > 0) {
      setSelectedPersonId(filteredPeople[0].id);
    }
  }, [filteredPeople, selectedPersonId]);

  const timelineItems: TimelineItem[] = [
    ...interactions.map(i => ({
      id: i.id,
      type: 'interaction' as const,
      title: i.title || i.source || 'Conversation',
      preview: i.summary || i.transcript?.slice(0, 200) || '',
      date: new Date(i.occurredAt || i.createdAt || Date.now()),
      source: i.source,
      data: i,
    })),
    ...drafts.map(d => ({
      id: d.id,
      type: 'draft' as const,
      title: d.title || `${d.type} draft`,
      preview: d.content?.slice(0, 200) || '',
      date: new Date(d.createdAt || Date.now()),
      source: d.type,
      data: d,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const getSegmentColor = (segment: string | null | undefined) => {
    if (!segment) return "bg-gray-100 text-gray-700 hover:bg-gray-200";
    const s = segment.toLowerCase();
    if (s.startsWith("a") || s === "buyer_seller" || s === "advocate") return "bg-purple-100 text-purple-700 hover:bg-purple-200";
    if (s.startsWith("b") || s === "buyer") return "bg-blue-100 text-blue-700 hover:bg-blue-200";
    if (s.startsWith("c") || s === "seller") return "bg-green-100 text-green-700 hover:bg-green-200";
    if (s.startsWith("d")) return "bg-orange-100 text-orange-700 hover:bg-orange-200";
    return "bg-gray-100 text-gray-700 hover:bg-gray-200";
  };

  const getSourceIcon = (source: string | null | undefined) => {
    if (!source) return <MessageSquare className="h-4 w-4" />;
    const s = source.toLowerCase();
    if (s.includes('email') || s.includes('gmail')) return <Mail className="h-4 w-4" />;
    if (s.includes('call') || s.includes('phone')) return <Phone className="h-4 w-4" />;
    if (s.includes('meeting') || s.includes('zoom') || s.includes('video')) return <Video className="h-4 w-4" />;
    if (s.includes('text') || s.includes('sms') || s.includes('imessage') || s.includes('whatsapp')) return <MessageSquare className="h-4 w-4" />;
    if (s.includes('granola') || s.includes('note')) return <FileText className="h-4 w-4" />;
    return <MessageSquare className="h-4 w-4" />;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handlePhoneClick = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleEmailClick = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const handleTextClick = (phone: string) => {
    window.location.href = `sms:${phone}`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          importContacts(results.data as any[]);
        },
        error: () => {
          toast({ title: "Failed to parse CSV file", variant: "destructive" });
        }
      });
    } else {
      toast({ title: "Please upload a CSV file", variant: "destructive" });
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const importContacts = async (data: any[]) => {
    let imported = 0;
    for (const row of data) {
      const name = row.name || row.Name || row['Full Name'] || `${row['First Name'] || ''} ${row['Last Name'] || ''}`.trim();
      if (!name) continue;
      
      try {
        await fetch("/api/people", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email: row.email || row.Email || row['E-mail'] || null,
            phone: row.phone || row.Phone || row['Mobile'] || null,
            role: row.role || row.Role || row.Title || null,
            segment: row.segment || row.Segment || null,
          }),
        });
        imported++;
      } catch (e) {
        console.error('Failed to import:', row);
      }
    }
    
    queryClient.invalidateQueries({ queryKey: ["/api/people"] });
    setUploadDialogOpen(false);
    toast({ title: `Imported ${imported} contacts` });
  };

  const openEditDialog = () => {
    if (selectedPerson) {
      setFormData({
        name: selectedPerson.name || "",
        email: selectedPerson.email || "",
        phone: selectedPerson.phone || "",
        role: selectedPerson.role || "",
        segment: selectedPerson.segment || "",
        notes: selectedPerson.notes || "",
        fordFamily: selectedPerson.fordFamily || "",
        fordOccupation: selectedPerson.fordOccupation || "",
        fordRecreation: selectedPerson.fordRecreation || "",
        fordDreams: selectedPerson.fordDreams || "",
        address: selectedPerson.address || "",
      });
      setEditDialogOpen(true);
    }
  };

  return (
    <Layout>
      <div className="h-full flex flex-col bg-background overflow-hidden">
        {/* Top Action Bar */}
        <div className="h-14 border-b bg-card flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">People</h1>
          {selectedPerson && (
            <span className="text-muted-foreground">/ {selectedPerson.name}</span>
          )}
        </div>
        
        {selectedPerson && (
          <div className="flex items-center gap-1">
            {selectedPerson.phone && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-1.5"
                  onClick={() => handlePhoneClick(selectedPerson.phone!)}
                  data-testid="action-call"
                >
                  <Phone className="h-4 w-4" />
                  <span className="hidden md:inline">Call</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-1.5"
                  onClick={() => handleTextClick(selectedPerson.phone!)}
                  data-testid="action-text"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden md:inline">Text</span>
                </Button>
              </>
            )}
            {selectedPerson.email && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1.5"
                onClick={() => handleEmailClick(selectedPerson.email!)}
                data-testid="action-email"
              >
                <Mail className="h-4 w-4" />
                <span className="hidden md:inline">Email</span>
              </Button>
            )}
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button variant="ghost" size="sm" className="gap-1.5" data-testid="action-compose">
              <PenTool className="h-4 w-4" />
              <span className="hidden md:inline">Compose</span>
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5" data-testid="action-meeting">
              <CalendarPlus className="h-4 w-4" />
              <span className="hidden md:inline">Book Meeting</span>
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5" data-testid="action-note">
              <StickyNote className="h-4 w-4" />
              <span className="hidden md:inline">Note</span>
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5" data-testid="action-todo">
              <ListTodo className="h-4 w-4" />
              <span className="hidden md:inline">To Do</span>
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5" data-testid="action-log">
              <Activity className="h-4 w-4" />
              <span className="hidden md:inline">Log</span>
            </Button>
          </div>
        )}
      </div>

      {/* Main 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - People List */}
        <div className="w-64 border-r bg-card flex flex-col flex-shrink-0">
          {/* Search and Filter */}
          <div className="p-3 space-y-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
                data-testid="people-search"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={segmentFilter}
                onChange={(e) => setSegmentFilter(e.target.value)}
                className="flex-1 h-8 text-xs rounded border bg-background px-2"
                data-testid="people-filter"
              >
                <option value="all">All Segments</option>
                <option value="a">A - Advocates</option>
                <option value="b">B - Fans</option>
                <option value="c">C - Network</option>
                <option value="d">D - Develop</option>
              </select>
            </div>
          </div>

          {/* People List */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="divide-y">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredPeople.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {people.length === 0 ? "No contacts yet" : "No matches found"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {people.length === 0 
                    ? "Add your first contact to start building relationships"
                    : "Try adjusting your search or filter"}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredPeople.map((person) => (
                  <div
                    key={person.id}
                    className={`p-3 cursor-pointer hover:bg-accent/50 transition-colors ${
                      selectedPersonId === person.id ? 'bg-accent border-l-2 border-l-primary' : ''
                    }`}
                    onClick={() => setSelectedPersonId(person.id)}
                    data-testid={`person-row-${person.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                        selectedPersonId === person.id ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                      }`}>
                        {getInitials(person.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{person.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {person.role || person.email || 'No details'}
                        </p>
                      </div>
                      {person.segment && (
                        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 flex-shrink-0 ${getSegmentColor(person.segment)}`}>
                          {person.segment.charAt(0).toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Add Person Button */}
          <div className="p-2 border-t space-y-2">
            <div className="flex gap-2">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="flex-1 gap-1.5" data-testid="add-person-btn">
                    <Plus className="h-4 w-4" />
                    Add Person
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Person</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input
                        value={formData.name || ""}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Full name"
                        data-testid="input-name"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={formData.email || ""}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="email@example.com"
                          data-testid="input-email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input
                          value={formData.phone || ""}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="(555) 123-4567"
                          data-testid="input-phone"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Input
                          value={formData.role || ""}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                          placeholder="Job title"
                          data-testid="input-role"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Segment</Label>
                        <select
                          value={formData.segment || ""}
                          onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                          className="w-full h-9 rounded border bg-background px-3"
                          data-testid="select-segment"
                        >
                          <option value="">Select...</option>
                          <option value="A">A - Advocate</option>
                          <option value="B">B - Fan</option>
                          <option value="C">C - Network</option>
                          <option value="D">D - Develop</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        value={formData.notes || ""}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Any notes about this person..."
                        data-testid="input-notes"
                      />
                    </div>
                    <Button 
                      onClick={() => createPersonMutation.mutate(formData)}
                      disabled={!formData.name || createPersonMutation.isPending}
                      className="w-full"
                      data-testid="submit-person"
                    >
                      {createPersonMutation.isPending ? "Adding..." : "Add Person"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5" data-testid="import-btn">
                    <Upload className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import Contacts</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground">
                      Upload a CSV or Excel file with columns like: Name, Email, Phone, Role, Segment
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="w-full"
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {filteredPeople.length} people
            </p>
          </div>
        </div>

        {/* Center - Timeline */}
        <div className="flex-1 flex flex-col min-w-0 bg-secondary/30">
          {selectedPerson ? (
            <>
              {/* Person Header */}
              <div className="p-4 bg-card border-b">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                    {getInitials(selectedPerson.name)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold">{selectedPerson.name}</h2>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={openEditDialog}
                        data-testid="edit-person-btn"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => setMergeDialogOpen(true)}
                        data-testid="merge-person-btn"
                        title="Merge with another contact"
                      >
                        <GitMerge className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteDialogOpen(true)}
                        data-testid="delete-person-btn"
                        title="Delete contact"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-muted-foreground">{selectedPerson.role || 'No role'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedPerson.segment && (
                        <Badge className={`${getSegmentColor(selectedPerson.segment)} border-none`}>
                          {selectedPerson.segment}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="mx-4 mt-4 w-fit">
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                  <TabsTrigger value="files">Files</TabsTrigger>
                  <TabsTrigger value="todos">To Do</TabsTrigger>
                </TabsList>

                <TabsContent value="timeline" className="flex-1 overflow-auto p-4">
                  {/* AI Summary */}
                  {interactions.length > 0 && interactions[0].summary && (
                    <Card className="mb-4 border-purple-200 bg-purple-50/50">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-purple-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-purple-800 mb-1">Summary</p>
                            <p className="text-sm text-purple-700">{interactions[0].summary}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Timeline Items */}
                  {timelineItems.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No interactions yet</p>
                      <p className="text-sm mt-1">Conversations and activities will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {timelineItems.map((item) => (
                        <Card key={item.id} className="hover:shadow-md transition-shadow" data-testid={`timeline-item-${item.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                {getSourceIcon(item.source)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="font-medium text-sm truncate">{item.title}</h4>
                                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                    {formatDistanceToNow(item.date, { addSuffix: true })}
                                  </span>
                                </div>
                                {item.preview && (
                                  <p className="text-sm text-muted-foreground line-clamp-3">
                                    {item.preview}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  {item.source && (
                                    <Badge variant="outline" className="text-xs">
                                      {item.source}
                                    </Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {format(item.date, 'MMM d, yyyy')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="notes" className="flex-1 overflow-auto p-4">
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Notes feature coming soon</p>
                  </div>
                </TabsContent>

                <TabsContent value="files" className="flex-1 overflow-auto p-4">
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Files feature coming soon</p>
                  </div>
                </TabsContent>

                <TabsContent value="todos" className="flex-1 overflow-auto p-4">
                  <div className="text-center py-12 text-muted-foreground">
                    <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>To Do feature coming soon</p>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select a person to view their timeline</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Contact Info & Details */}
        {selectedPerson && (
          <div className="w-72 border-l bg-card flex flex-col flex-shrink-0">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-6">
                {/* Relationship Segment */}
                <div>
                  <Button 
                    className={`w-full justify-center ${getSegmentColor(selectedPerson.segment)}`}
                    variant="secondary"
                  >
                    {selectedPerson.segment || 'Set Relationship'}
                  </Button>
                </div>

                {/* Contact Info */}
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Contact Info
                  </h3>
                  <div className="space-y-3">
                    {selectedPerson.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm">{selectedPerson.phone}</p>
                          <p className="text-xs text-muted-foreground">Mobile</p>
                        </div>
                      </div>
                    )}
                    {selectedPerson.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm truncate">{selectedPerson.email}</p>
                          <p className="text-xs text-muted-foreground">Email</p>
                        </div>
                      </div>
                    )}
                    {selectedPerson.address && (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm">{selectedPerson.address}</p>
                          <p className="text-xs text-muted-foreground">Address</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Social Links */}
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Social
                  </h3>
                  <div className="flex gap-2">
                    {selectedPerson.linkedinUrl && (
                      <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                        <a href={selectedPerson.linkedinUrl} target="_blank" rel="noopener noreferrer">
                          <Linkedin className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {selectedPerson.facebookUrl && (
                      <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                        <a href={selectedPerson.facebookUrl} target="_blank" rel="noopener noreferrer">
                          <Facebook className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {selectedPerson.twitterUrl && (
                      <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                        <a href={selectedPerson.twitterUrl} target="_blank" rel="noopener noreferrer">
                          <Twitter className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {selectedPerson.instagramUrl && (
                      <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                        <a href={selectedPerson.instagramUrl} target="_blank" rel="noopener noreferrer">
                          <Instagram className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {!selectedPerson.linkedinUrl && !selectedPerson.facebookUrl && 
                     !selectedPerson.twitterUrl && !selectedPerson.instagramUrl && (
                      <p className="text-sm text-muted-foreground">No social links</p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* At a Glance - FORD Notes */}
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    At a Glance
                  </h3>
                  <div className="space-y-3">
                    {selectedPerson.fordFamily && (
                      <div className="flex items-start gap-3">
                        <Heart className="h-4 w-4 text-pink-500 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Family</p>
                          <p className="text-sm">{selectedPerson.fordFamily}</p>
                        </div>
                      </div>
                    )}
                    {selectedPerson.fordOccupation && (
                      <div className="flex items-start gap-3">
                        <Briefcase className="h-4 w-4 text-blue-500 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Occupation</p>
                          <p className="text-sm">{selectedPerson.fordOccupation}</p>
                        </div>
                      </div>
                    )}
                    {selectedPerson.fordRecreation && (
                      <div className="flex items-start gap-3">
                        <Gamepad2 className="h-4 w-4 text-green-500 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Recreation</p>
                          <p className="text-sm">{selectedPerson.fordRecreation}</p>
                        </div>
                      </div>
                    )}
                    {selectedPerson.fordDreams && (
                      <div className="flex items-start gap-3">
                        <Star className="h-4 w-4 text-yellow-500 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Dreams</p>
                          <p className="text-sm">{selectedPerson.fordDreams}</p>
                        </div>
                      </div>
                    )}
                    {!selectedPerson.fordFamily && !selectedPerson.fordOccupation && 
                     !selectedPerson.fordRecreation && !selectedPerson.fordDreams && (
                      <p className="text-sm text-muted-foreground">Tap to edit FORD notes</p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Details */}
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    {selectedPerson.profession && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Profession</span>
                        <span>{selectedPerson.profession}</span>
                      </div>
                    )}
                    {selectedPerson.realtorBrokerage && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Brokerage</span>
                        <span>{selectedPerson.realtorBrokerage}</span>
                      </div>
                    )}
                    {selectedPerson.lastContact && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Contact</span>
                        <span>{format(new Date(selectedPerson.lastContact), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Updated</span>
                      <span>{selectedPerson.updatedAt ? format(new Date(selectedPerson.updatedAt), 'MMM d, yyyy') : 'Unknown'}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedPerson.notes && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                        Notes
                      </h3>
                      <p className="text-sm whitespace-pre-wrap">{selectedPerson.notes}</p>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Edit Person Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Person</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="edit-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Segment</Label>
                <select
                  value={formData.segment || ""}
                  onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                  className="w-full h-9 rounded border bg-background px-3"
                  data-testid="edit-segment"
                >
                  <option value="">Select...</option>
                  <option value="A">A - Advocate</option>
                  <option value="B">B - Fan</option>
                  <option value="C">C - Network</option>
                  <option value="D">D - Develop</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  data-testid="edit-email"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  data-testid="edit-phone"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Input
                  value={formData.role || ""}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  data-testid="edit-role"
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  data-testid="edit-address"
                />
              </div>
            </div>
            
            <Separator />
            <h4 className="font-medium">FORD Notes</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-pink-500" /> Family
                </Label>
                <Textarea
                  value={formData.fordFamily || ""}
                  onChange={(e) => setFormData({ ...formData, fordFamily: e.target.value })}
                  placeholder="Spouse, kids, parents..."
                  data-testid="edit-ford-family"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-blue-500" /> Occupation
                </Label>
                <Textarea
                  value={formData.fordOccupation || ""}
                  onChange={(e) => setFormData({ ...formData, fordOccupation: e.target.value })}
                  placeholder="Job, career, business..."
                  data-testid="edit-ford-occupation"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4 text-green-500" /> Recreation
                </Label>
                <Textarea
                  value={formData.fordRecreation || ""}
                  onChange={(e) => setFormData({ ...formData, fordRecreation: e.target.value })}
                  placeholder="Hobbies, sports, interests..."
                  data-testid="edit-ford-recreation"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" /> Dreams
                </Label>
                <Textarea
                  value={formData.fordDreams || ""}
                  onChange={(e) => setFormData({ ...formData, fordDreams: e.target.value })}
                  placeholder="Goals, aspirations..."
                  data-testid="edit-ford-dreams"
                />
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="General notes..."
                data-testid="edit-notes"
              />
            </div>
            
            <Button 
              onClick={() => updatePersonMutation.mutate(formData)}
              disabled={!formData.name || updatePersonMutation.isPending}
              className="w-full"
              data-testid="save-person"
            >
              {updatePersonMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Contact
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-medium text-foreground">{selectedPerson?.name}</span>? 
              This will also delete all their interactions, deals, and drafts. This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => selectedPersonId && deletePersonMutation.mutate(selectedPersonId)}
                disabled={deletePersonMutation.isPending}
                data-testid="confirm-delete-btn"
              >
                {deletePersonMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Merge Contacts Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitMerge className="h-5 w-5" />
              Merge Contacts
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Merge <span className="font-medium text-foreground">{selectedPerson?.name}</span> with another contact. 
              The selected contact's data will be combined, and all interactions/deals will be transferred.
            </p>
            <div className="space-y-2">
              <Label>Keep and merge into:</Label>
              <select
                value={mergeTargetId || ""}
                onChange={(e) => setMergeTargetId(e.target.value)}
                className="w-full h-10 rounded border bg-background px-3"
                data-testid="merge-target-select"
              >
                <option value="">Select a contact to merge into...</option>
                {people
                  .filter(p => p.id !== selectedPersonId)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))
                }
              </select>
            </div>
            {mergeTargetId && (
              <div className="p-3 bg-muted rounded-md text-sm">
                <p className="font-medium mb-1">What will happen:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li><span className="text-foreground">{people.find(p => p.id === mergeTargetId)?.name}</span> will be kept</li>
                  <li><span className="text-foreground">{selectedPerson?.name}</span> will be deleted</li>
                  <li>Missing contact info will be filled in from {selectedPerson?.name}</li>
                  <li>All interactions and deals will be transferred</li>
                </ul>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setMergeDialogOpen(false); setMergeTargetId(null); }}>
                Cancel
              </Button>
              <Button 
                onClick={() => mergeTargetId && selectedPersonId && mergePersonsMutation.mutate({ 
                  primaryId: mergeTargetId, 
                  secondaryId: selectedPersonId 
                })}
                disabled={!mergeTargetId || mergePersonsMutation.isPending}
                data-testid="confirm-merge-btn"
              >
                {mergePersonsMutation.isPending ? "Merging..." : "Merge Contacts"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </Layout>
  );
}
