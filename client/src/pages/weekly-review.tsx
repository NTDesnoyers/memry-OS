import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  MessageCircle, 
  Phone, 
  Video, 
  Coffee, 
  Sparkles,
  TrendingUp,
  Target,
  Heart,
  Briefcase,
  Gamepad2,
  Star,
  Loader2
} from "lucide-react";
import { startOfWeek, endOfWeek, format, isWithinInterval, parseISO } from "date-fns";

type Person = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  role?: string | null;
  segment?: string | null;
  householdId?: string | null;
  fordFamily?: string | null;
  fordOccupation?: string | null;
  fordRecreation?: string | null;
  fordDreams?: string | null;
};

type Interaction = {
  id: string;
  personId: string | null;
  type: string;
  summary?: string | null;
  occurredAt: string;
  createdAt: string;
  deletedAt?: string | null;
  aiData?: any;
};

const WEEKLY_GOAL = 50;

function getWeekBounds() {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  return { weekStart, weekEnd };
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const typeConfig: Record<string, { icon: any; label: string; color: string }> = {
  call: { icon: Phone, label: "Call", color: "bg-blue-100 text-blue-700" },
  meeting: { icon: Video, label: "Meeting", color: "bg-purple-100 text-purple-700" },
  coffee: { icon: Coffee, label: "Coffee", color: "bg-amber-100 text-amber-700" },
  video: { icon: Video, label: "Video", color: "bg-indigo-100 text-indigo-700" },
  in_person: { icon: Users, label: "In Person", color: "bg-green-100 text-green-700" },
  text: { icon: MessageCircle, label: "Text", color: "bg-cyan-100 text-cyan-700" },
};

export default function WeeklyReview() {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  
  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });
  
  const { data: interactions = [], isLoading } = useQuery<Interaction[]>({
    queryKey: ["/api/interactions"],
  });

  const { weekStart, weekEnd } = getWeekBounds();

  const weeklyInteractions = useMemo(() => {
    return interactions.filter((i) => {
      if (i.deletedAt) return false;
      if (!i.personId) return false;
      const date = parseISO(i.occurredAt);
      return isWithinInterval(date, { start: weekStart, end: weekEnd });
    });
  }, [interactions, weekStart, weekEnd]);

  const peopleContactedThisWeek = useMemo(() => {
    const personIds = new Set(weeklyInteractions.map(i => i.personId));
    return people.filter(p => personIds.has(p.id));
  }, [weeklyInteractions, people]);

  const getPersonInteractions = (personId: string) => {
    return weeklyInteractions.filter(i => i.personId === personId);
  };

  const weeklyCount = peopleContactedThisWeek.length;
  const percentage = Math.min((weeklyCount / WEEKLY_GOAL) * 100, 100);
  const dayOfWeek = new Date().getDay() || 7;
  const expectedByNow = Math.round((WEEKLY_GOAL / 7) * dayOfWeek);
  const isOnTrack = weeklyCount >= expectedByNow;

  const fordHighlights = useMemo(() => {
    const highlights: { person: Person; category: string; note: string; icon: any; color: string }[] = [];
    
    for (const interaction of weeklyInteractions) {
      const person = people.find(p => p.id === interaction.personId);
      if (!person) continue;
      
      const summary = interaction.summary || "";
      const aiData = interaction.aiData;
      
      if (aiData?.fordUpdates) {
        const { family, occupation, recreation, dreams } = aiData.fordUpdates;
        if (family) highlights.push({ person, category: "Family", note: family, icon: Heart, color: "text-rose-600 bg-rose-50" });
        if (occupation) highlights.push({ person, category: "Occupation", note: occupation, icon: Briefcase, color: "text-blue-600 bg-blue-50" });
        if (recreation) highlights.push({ person, category: "Recreation", note: recreation, icon: Gamepad2, color: "text-green-600 bg-green-50" });
        if (dreams) highlights.push({ person, category: "Dreams", note: dreams, icon: Star, color: "text-purple-600 bg-purple-50" });
      }
      
      if (summary.toLowerCase().includes("family:")) {
        const match = summary.match(/family:\s*([^\n]+)/i);
        if (match) highlights.push({ person, category: "Family", note: match[1], icon: Heart, color: "text-rose-600 bg-rose-50" });
      }
      if (summary.toLowerCase().includes("occupation:")) {
        const match = summary.match(/occupation:\s*([^\n]+)/i);
        if (match) highlights.push({ person, category: "Occupation", note: match[1], icon: Briefcase, color: "text-blue-600 bg-blue-50" });
      }
      if (summary.toLowerCase().includes("recreation:")) {
        const match = summary.match(/recreation:\s*([^\n]+)/i);
        if (match) highlights.push({ person, category: "Recreation", note: match[1], icon: Gamepad2, color: "text-green-600 bg-green-50" });
      }
      if (summary.toLowerCase().includes("dreams:")) {
        const match = summary.match(/dreams:\s*([^\n]+)/i);
        if (match) highlights.push({ person, category: "Dreams", note: match[1], icon: Star, color: "text-purple-600 bg-purple-50" });
      }
    }
    
    return highlights.slice(0, 6);
  }, [weeklyInteractions, people]);

  return (
    <Layout>
      <div className="min-h-screen bg-secondary/30">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <header className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-serif font-bold text-primary">Weekly Review</h1>
                <p className="text-muted-foreground">
                  {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
                </p>
              </div>
            </div>
          </header>

          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <Card className="md:col-span-2 border-none shadow-lg bg-gradient-to-br from-emerald-50 to-teal-50">
              <CardHeader className="pb-2">
                <CardTitle className="font-serif flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-600" />
                  Weekly Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-emerald-700" data-testid="text-weekly-count">
                      {weeklyCount}
                    </div>
                    <p className="text-sm text-emerald-600 font-medium">of {WEEKLY_GOAL} households</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Progress value={percentage} className="h-4" />
                    <div className="flex justify-between text-sm">
                      {isOnTrack ? (
                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                          <TrendingUp className="h-4 w-4" />
                          On track!
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600 font-medium">
                          <Target className="h-4 w-4" />
                          {WEEKLY_GOAL - weeklyCount} to go
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        {Math.round(percentage)}% complete
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-violet-50 to-purple-50">
              <CardHeader className="pb-2">
                <CardTitle className="font-serif flex items-center gap-2 text-base">
                  <Sparkles className="h-5 w-5 text-violet-600" />
                  FORD Highlights
                </CardTitle>
              </CardHeader>
              <CardContent>
                {fordHighlights.length > 0 ? (
                  <div className="text-2xl font-bold text-violet-700">
                    {fordHighlights.length}
                    <span className="text-sm font-normal text-violet-600 ml-2">insights captured</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No FORD notes yet this week</p>
                )}
              </CardContent>
            </Card>
          </div>

          {fordHighlights.length > 0 && (
            <Card className="border-none shadow-md mb-8">
              <CardHeader>
                <CardTitle className="font-serif flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  FORD Digest
                </CardTitle>
                <CardDescription>
                  Key learnings from your conversations this week
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {fordHighlights.map((highlight, index) => {
                    const Icon = highlight.icon;
                    return (
                      <div 
                        key={index}
                        className={`p-4 rounded-xl border ${highlight.color} cursor-pointer hover:shadow-md transition-shadow`}
                        onClick={() => setSelectedPerson(highlight.person)}
                        data-testid={`card-ford-highlight-${index}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-white/50">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-sm">{highlight.person.name}</span>
                              <Badge variant="secondary" className="text-[10px]">{highlight.category}</Badge>
                            </div>
                            <p className="text-sm line-clamp-2">{highlight.note}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="font-serif flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                People You Connected With
              </CardTitle>
              <CardDescription>
                {weeklyCount} {weeklyCount === 1 ? 'person' : 'people'} this week
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : peopleContactedThisWeek.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No conversations logged yet this week</p>
                  <p className="text-sm">Start logging your FORD conversations!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {peopleContactedThisWeek.map((person) => {
                    const personInteractions = getPersonInteractions(person.id);
                    const latestInteraction = personInteractions[0];
                    const interactionTypes = Array.from(new Set(personInteractions.map(i => i.type)));
                    
                    return (
                      <div
                        key={person.id}
                        className="flex flex-col items-center p-4 rounded-xl border bg-card hover:shadow-lg transition-all cursor-pointer group"
                        onClick={() => setSelectedPerson(person)}
                        data-testid={`card-person-${person.id}`}
                      >
                        <Avatar className="h-16 w-16 mb-3 ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                            {getInitials(person.name)}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="font-bold text-sm text-center mb-1 line-clamp-1">{person.name}</h3>
                        <div className="flex gap-1 flex-wrap justify-center">
                          {interactionTypes.slice(0, 2).map((type) => {
                            const config = typeConfig[type] || { icon: MessageCircle, label: type, color: "bg-gray-100 text-gray-700" };
                            const TypeIcon = config.icon;
                            return (
                              <span 
                                key={type}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${config.color}`}
                              >
                                <TypeIcon className="h-3 w-3" />
                              </span>
                            );
                          })}
                        </div>
                        {personInteractions.length > 1 && (
                          <span className="text-[10px] text-muted-foreground mt-1">
                            {personInteractions.length} conversations
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Sheet open={!!selectedPerson} onOpenChange={(open) => !open && setSelectedPerson(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedPerson && (
            <>
              <SheetHeader className="mb-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                      {getInitials(selectedPerson.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="text-xl">{selectedPerson.name}</SheetTitle>
                    {selectedPerson.company && (
                      <p className="text-sm text-muted-foreground">{selectedPerson.company}</p>
                    )}
                  </div>
                </div>
              </SheetHeader>

              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3">
                    FORD Notes
                  </h3>
                  <div className="grid gap-3">
                    {selectedPerson.fordFamily && (
                      <div className="p-3 rounded-lg bg-rose-50 border border-rose-100">
                        <div className="flex items-center gap-2 mb-1">
                          <Heart className="h-4 w-4 text-rose-600" />
                          <span className="font-bold text-sm text-rose-800">Family</span>
                        </div>
                        <p className="text-sm text-rose-700">{selectedPerson.fordFamily}</p>
                      </div>
                    )}
                    {selectedPerson.fordOccupation && (
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                        <div className="flex items-center gap-2 mb-1">
                          <Briefcase className="h-4 w-4 text-blue-600" />
                          <span className="font-bold text-sm text-blue-800">Occupation</span>
                        </div>
                        <p className="text-sm text-blue-700">{selectedPerson.fordOccupation}</p>
                      </div>
                    )}
                    {selectedPerson.fordRecreation && (
                      <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                        <div className="flex items-center gap-2 mb-1">
                          <Gamepad2 className="h-4 w-4 text-green-600" />
                          <span className="font-bold text-sm text-green-800">Recreation</span>
                        </div>
                        <p className="text-sm text-green-700">{selectedPerson.fordRecreation}</p>
                      </div>
                    )}
                    {selectedPerson.fordDreams && (
                      <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
                        <div className="flex items-center gap-2 mb-1">
                          <Star className="h-4 w-4 text-purple-600" />
                          <span className="font-bold text-sm text-purple-800">Dreams</span>
                        </div>
                        <p className="text-sm text-purple-700">{selectedPerson.fordDreams}</p>
                      </div>
                    )}
                    {!selectedPerson.fordFamily && !selectedPerson.fordOccupation && !selectedPerson.fordRecreation && !selectedPerson.fordDreams && (
                      <p className="text-sm text-muted-foreground italic">No FORD notes on file</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3">
                    This Week's Conversations
                  </h3>
                  <div className="space-y-3">
                    {getPersonInteractions(selectedPerson.id).map((interaction) => {
                      const config = typeConfig[interaction.type] || { icon: MessageCircle, label: interaction.type, color: "bg-gray-100 text-gray-700" };
                      const TypeIcon = config.icon;
                      
                      return (
                        <div key={interaction.id} className="p-4 rounded-lg border bg-card">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                              <TypeIcon className="h-3 w-3" />
                              {config.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(interaction.occurredAt), "EEE, MMM d 'at' h:mm a")}
                            </span>
                          </div>
                          {interaction.summary && (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {interaction.summary}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Layout>
  );
}
