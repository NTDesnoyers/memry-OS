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
  Trash2, GitMerge, AlertTriangle, ChevronLeft
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
  const [sphereFilter, setSphereFilter] = useState<"all" | "sphere" | "extended">("sphere");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("timeline");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [csvPreview, setCsvPreview] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  
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
      const matchesSphere = sphereFilter === "all" || 
        (sphereFilter === "sphere" && (p.inSphere !== false)) ||
        (sphereFilter === "extended" && p.inSphere === false);
      return matchesSearch && matchesSegment && matchesSphere;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const sphereCount = people.filter(p => p.inSphere !== false).length;
  const extendedCount = people.filter(p => p.inSphere === false).length;

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
          const headers = results.meta.fields || [];
          const rows = (results.data as any[]).filter((r: any) => Object.values(r).some(v => v));
          setCsvPreview({ headers, rows: rows.slice(0, 100) });
          
          const autoMappings: Record<string, string> = {};
          const fieldPatterns: Record<string, string[]> = {
            name: ['name', 'full name', 'fullname', 'contact name', 'contact'],
            email: ['email', 'e-mail', 'email address', 'mail'],
            phone: ['phone', 'mobile', 'cell', 'telephone', 'tel', 'phone number'],
            role: ['role', 'title', 'job title', 'position', 'occupation'],
            segment: ['segment', 'category', 'group', 'type'],
            address: ['address', 'street', 'location', 'mailing address'],
          };
          
          headers.forEach(h => {
            const lower = h.toLowerCase().trim();
            for (const [field, patterns] of Object.entries(fieldPatterns)) {
              if (patterns.some(p => lower === p || lower.includes(p))) {
                if (!autoMappings[field]) autoMappings[field] = h;
              }
            }
            if (lower === 'first name' || lower === 'firstname') autoMappings['firstName'] = h;
            if (lower === 'last name' || lower === 'lastname') autoMappings['lastName'] = h;
          });
          
          setFieldMappings(autoMappings);
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

  const executeImport = async () => {
    if (!csvPreview) return;
    
    setIsImporting(true);
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    const nameCol = fieldMappings.name;
    const firstCol = fieldMappings.firstName;
    const lastCol = fieldMappings.lastName;
    const emailCol = fieldMappings.email;
    const phoneCol = fieldMappings.phone;
    const roleCol = fieldMappings.role;
    const segmentCol = fieldMappings.segment;
    const addressCol = fieldMappings.address;
    
    for (const row of csvPreview.rows) {
      let name = '';
      
      if (nameCol && row[nameCol]) {
        name = String(row[nameCol]).trim();
      } else if (firstCol || lastCol) {
        const firstName = firstCol && row[firstCol] ? String(row[firstCol]).trim() : '';
        const lastName = lastCol && row[lastCol] ? String(row[lastCol]).trim() : '';
        name = `${firstName} ${lastName}`.trim();
      }
      
      if (!name) {
        skipped++;
        continue;
      }
      
      try {
        const payload: Record<string, any> = { name };
        if (emailCol && row[emailCol]) payload.email = String(row[emailCol]).trim();
        if (phoneCol && row[phoneCol]) payload.phone = String(row[phoneCol]).trim();
        if (roleCol && row[roleCol]) payload.role = String(row[roleCol]).trim();
        if (segmentCol && row[segmentCol]) payload.segment = String(row[segmentCol]).trim();
        if (addressCol && row[addressCol]) payload.address = String(row[addressCol]).trim();
        
        const res = await fetch("/api/people", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed');
        imported++;
      } catch (e) {
        errors++;
      }
    }
    
    queryClient.invalidateQueries({ queryKey: ["/api/people"] });
    setIsImporting(false);
    setCsvPreview(null);
    setFieldMappings({});
    setUploadDialogOpen(false);
    
    let msg = `Imported ${imported} contacts`;
    if (skipped > 0) msg += ` (${skipped} skipped - no name)`;
    if (errors > 0) msg += ` (${errors} failed)`;
    toast({ title: msg });
  };
  
  const resetImport = () => {
    setCsvPreview(null);
    setFieldMappings({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
        birthday: selectedPerson.birthday || null,
        inSphere: selectedPerson.inSphere !== false,
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
            {/* Mobile back button */}
            {mobileView === "detail" && (
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden -ml-2"
                onClick={() => setMobileView("list")}
                data-testid="mobile-back"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">People</h1>
          {selectedPerson && (
            <span className="text-muted-foreground hidden md:inline">/ {selectedPerson.name}</span>
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
        {/* Left Sidebar - People List (hidden on mobile when viewing detail) */}
        <div className={`w-full md:w-64 border-r bg-card flex flex-col flex-shrink-0 ${mobileView === "detail" ? "hidden md:flex" : "flex"}`}>
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
            <div className="flex rounded-md overflow-hidden border">
              <button
                className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${
                  sphereFilter === "sphere" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-background hover:bg-accent"
                }`}
                onClick={() => setSphereFilter("sphere")}
                data-testid="filter-sphere"
              >
                Sphere ({sphereCount})
              </button>
              <button
                className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${
                  sphereFilter === "extended" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-background hover:bg-accent"
                }`}
                onClick={() => setSphereFilter("extended")}
                data-testid="filter-extended"
              >
                Extended ({extendedCount})
              </button>
              <button
                className={`px-2 py-1.5 text-xs font-medium transition-colors ${
                  sphereFilter === "all" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-background hover:bg-accent"
                }`}
                onClick={() => setSphereFilter("all")}
                data-testid="filter-all"
              >
                All
              </button>
            </div>
            {sphereFilter !== "extended" && (
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
            )}
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
                    onClick={() => {
                      setSelectedPersonId(person.id);
                      setMobileView("detail");
                    }}
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
              
              <Dialog open={uploadDialogOpen} onOpenChange={(open) => { setUploadDialogOpen(open); if (!open) resetImport(); }}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5" data-testid="import-btn">
                    <Upload className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className={csvPreview ? "max-w-2xl" : ""}>
                  <DialogHeader>
                    <DialogTitle>Import Contacts</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {!csvPreview ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Upload a CSV file with columns like: Name, Email, Phone, Role, Segment
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv"
                          onChange={handleFileUpload}
                          className="w-full"
                          data-testid="csv-file-input"
                        />
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Map your CSV columns to contact fields. Found {csvPreview.rows.length} rows.
                        </p>
                        
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { key: 'name', label: 'Name *', required: true },
                            { key: 'firstName', label: 'First Name' },
                            { key: 'lastName', label: 'Last Name' },
                            { key: 'email', label: 'Email' },
                            { key: 'phone', label: 'Phone' },
                            { key: 'role', label: 'Role/Title' },
                            { key: 'segment', label: 'Segment' },
                            { key: 'address', label: 'Address' },
                          ].map(({ key, label }) => (
                            <div key={key} className="flex items-center gap-2">
                              <Label className="w-24 text-sm">{label}</Label>
                              <select
                                value={fieldMappings[key] || ''}
                                onChange={(e) => setFieldMappings({ ...fieldMappings, [key]: e.target.value })}
                                className="flex-1 h-8 text-sm rounded border bg-background px-2"
                                data-testid={`mapping-${key}`}
                              >
                                <option value="">-- Skip --</option>
                                {csvPreview.headers.map(h => (
                                  <option key={h} value={h}>{h}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                        
                        <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                          Tip: Map either "Name" OR "First Name" + "Last Name" to identify contacts.
                        </div>
                        
                        {csvPreview.rows.length > 0 && (
                          <div className="border rounded overflow-hidden">
                            <div className="bg-muted px-3 py-2 text-xs font-medium">Preview (first 3 rows)</div>
                            <div className="divide-y text-xs max-h-32 overflow-y-auto">
                              {csvPreview.rows.slice(0, 3).map((row, i) => {
                                const name = fieldMappings.name ? row[fieldMappings.name] : 
                                  `${fieldMappings.firstName ? row[fieldMappings.firstName] : ''} ${fieldMappings.lastName ? row[fieldMappings.lastName] : ''}`.trim();
                                return (
                                  <div key={i} className="px-3 py-2 flex gap-4">
                                    <span className="font-medium">{name || '(no name)'}</span>
                                    {fieldMappings.email && row[fieldMappings.email] && <span className="text-muted-foreground">{row[fieldMappings.email]}</span>}
                                    {fieldMappings.phone && row[fieldMappings.phone] && <span className="text-muted-foreground">{row[fieldMappings.phone]}</span>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={resetImport} className="flex-1">
                            Choose Different File
                          </Button>
                          <Button 
                            onClick={executeImport} 
                            disabled={isImporting || (!fieldMappings.name && !fieldMappings.firstName)}
                            className="flex-1"
                            data-testid="execute-import"
                          >
                            {isImporting ? "Importing..." : `Import ${csvPreview.rows.length} Contacts`}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {filteredPeople.length} people
            </p>
          </div>
        </div>

        {/* Center - Timeline (hidden on mobile when viewing list) */}
        <div className={`flex-1 flex flex-col min-w-0 bg-secondary/30 ${mobileView === "list" ? "hidden md:flex" : "flex"}`}>
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

              {/* Mobile Contact Info - visible only on smaller screens */}
              <div className="lg:hidden border-b bg-card/50 p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  {selectedPerson.phone && (
                    <a href={`tel:${selectedPerson.phone}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
                      <Phone className="h-4 w-4" />
                      <span>{selectedPerson.phone}</span>
                    </a>
                  )}
                  {selectedPerson.email && (
                    <a href={`mailto:${selectedPerson.email}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary truncate max-w-[200px]">
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{selectedPerson.email}</span>
                    </a>
                  )}
                </div>
                {(selectedPerson.fordFamily || selectedPerson.fordOccupation || selectedPerson.fordRecreation || selectedPerson.fordDreams) && (
                  <div className="space-y-1 text-xs">
                    {selectedPerson.fordFamily && (
                      <div className="flex items-start gap-1 text-pink-600">
                        <Heart className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-1">{selectedPerson.fordFamily}</span>
                      </div>
                    )}
                    {selectedPerson.fordOccupation && (
                      <div className="flex items-start gap-1 text-blue-600">
                        <Briefcase className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-1">{selectedPerson.fordOccupation}</span>
                      </div>
                    )}
                    {selectedPerson.fordRecreation && (
                      <div className="flex items-start gap-1 text-green-600">
                        <Star className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-1">{selectedPerson.fordRecreation}</span>
                      </div>
                    )}
                    {selectedPerson.fordDreams && (
                      <div className="flex items-start gap-1 text-purple-600">
                        <Sparkles className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-1">{selectedPerson.fordDreams}</span>
                      </div>
                    )}
                  </div>
                )}
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

        {/* Right Sidebar - Contact Info & Details (hidden on mobile) */}
        {selectedPerson && (
          <div className="hidden lg:flex w-72 border-l bg-card flex-col flex-shrink-0">
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
            <div className="grid grid-cols-3 gap-4">
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
              <div className="space-y-2">
                <Label>Birthday</Label>
                <Input
                  type="date"
                  value={formData.birthday ? new Date(formData.birthday).toISOString().split('T')[0] : ""}
                  onChange={(e) => setFormData({ ...formData, birthday: e.target.value ? new Date(e.target.value) : null })}
                  data-testid="edit-birthday"
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
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <input
                type="checkbox"
                id="inSphere"
                checked={formData.inSphere !== false}
                onChange={(e) => setFormData({ ...formData, inSphere: e.target.checked })}
                className="h-4 w-4"
                data-testid="edit-in-sphere"
              />
              <Label htmlFor="inSphere" className="cursor-pointer">
                In My Sphere (active A/B/C/D relationship)
              </Label>
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
