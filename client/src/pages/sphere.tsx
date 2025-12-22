import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, Phone, Mail, MapPin, Loader2, MessageSquare, Calendar, 
  Video, FileText, Plus, Clock, ChevronDown, ChevronUp, Pencil,
  Users, Home, Linkedin, Twitter, Facebook, Instagram,
  Sparkles, PenTool, ListTodo, Activity, Send, PhoneCall, CalendarPlus,
  StickyNote, Heart, Briefcase, Gamepad2, Star, Filter, X
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Person, Interaction, GeneratedDraft } from "@shared/schema";
import { format, formatDistanceToNow } from "date-fns";

interface TimelineItem {
  id: string;
  type: 'interaction' | 'draft' | 'note';
  title: string;
  preview: string;
  date: Date;
  source?: string | null;
  data: any;
}

export default function Sphere() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("timeline");

  const { data: people = [], isLoading } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  const { data: selectedPerson } = useQuery<Person>({
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

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top Action Bar */}
      <div className="h-14 border-b bg-card flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">My Sphere</h1>
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
                data-testid="sphere-search"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={segmentFilter}
                onChange={(e) => setSegmentFilter(e.target.value)}
                className="flex-1 h-8 text-xs rounded border bg-background px-2"
                data-testid="sphere-filter"
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
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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

          {/* People Count */}
          <div className="p-2 border-t text-center">
            <span className="text-xs text-muted-foreground">
              {filteredPeople.length} people
            </span>
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
                    <h2 className="text-xl font-bold">{selectedPerson.name}</h2>
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
    </div>
  );
}
