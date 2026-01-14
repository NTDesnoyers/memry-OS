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
  TrendingUp,
  Target,
  Loader2,
  Heart,
  Zap,
  CheckCircle,
  Clock
} from "lucide-react";
import { startOfWeek, endOfWeek, format, isWithinInterval, parseISO, addDays, addWeeks, isSameDay } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

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

// Only these interaction types count toward the weekly conversation goal
// Excludes: text, email, handwritten_note (these are touchpoints, not live conversations)
const CONVERSATION_TYPES = ['call', 'meeting', 'in_person', 'video', 'coffee', 'social'];

function getWeekBounds(weekOffset: number = 0) {
  const now = new Date();
  const targetDate = addWeeks(now, weekOffset);
  const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });
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
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  
  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });
  
  const { data: interactions = [], isLoading } = useQuery<Interaction[]>({
    queryKey: ["/api/interactions"],
  });

  const { weekStart, weekEnd } = getWeekBounds(weekOffset);
  
  type SignalStats = {
    surfaced: number;
    resolved: number;
    expired: number;
    byResolutionType: Record<string, number>;
  };
  
  const { data: signalStats } = useQuery<SignalStats>({
    queryKey: ["/api/signals/stats", weekStart.toISOString(), weekEnd.toISOString()],
    queryFn: async () => {
      const res = await fetch(`/api/signals/stats?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`);
      if (!res.ok) throw new Error("Failed to fetch signal stats");
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  // All interactions this week (for display purposes)
  const weeklyInteractions = useMemo(() => {
    return interactions.filter((i) => {
      if (i.deletedAt) return false;
      if (!i.personId) return false;
      const date = parseISO(i.occurredAt);
      return isWithinInterval(date, { start: weekStart, end: weekEnd });
    });
  }, [interactions, weekStart, weekEnd]);

  // Only live conversations (for goal counting) - excludes texts, emails, handwritten notes
  const weeklyConversations = useMemo(() => {
    return weeklyInteractions.filter(i => CONVERSATION_TYPES.includes(i.type));
  }, [weeklyInteractions]);

  // All people touched this week (for display)
  const peopleContactedThisWeek = useMemo(() => {
    const personIds = new Set(weeklyInteractions.map(i => i.personId));
    return people.filter(p => personIds.has(p.id));
  }, [weeklyInteractions, people]);

  // People with actual conversations (for goal counting)
  const peopleWithConversationsThisWeek = useMemo(() => {
    const personIds = new Set(weeklyConversations.map(i => i.personId));
    return people.filter(p => personIds.has(p.id));
  }, [weeklyConversations, people]);

  // Count unique households WITH CONVERSATIONS (for the 50/week goal)
  const uniqueHouseholdsContactedThisWeek = useMemo(() => {
    const householdKeys = new Set<string>();
    for (const person of peopleWithConversationsThisWeek) {
      // Use householdId if available, otherwise use personId (individual counts as their own household)
      const key = person.householdId || person.id;
      householdKeys.add(key);
    }
    return householdKeys.size;
  }, [peopleWithConversationsThisWeek]);

  const getPersonInteractions = (personId: string) => {
    return weeklyInteractions.filter(i => i.personId === personId);
  };

  const dailyData = useMemo(() => {
    const days: { date: Date; dayName: string; count: number; households: { id: string; members: Person[] }[]; isToday: boolean }[] = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      // Only count live conversations for the daily goal breakdown
      const dayConversations = weeklyConversations.filter(int => 
        isSameDay(parseISO(int.occurredAt), day)
      );
      const uniquePersonIds = [...new Set(dayConversations.map(int => int.personId))];
      const dayPeople = people.filter(p => uniquePersonIds.includes(p.id));
      
      const householdMap = new Map<string, Person[]>();
      for (const person of dayPeople) {
        const key = person.householdId || person.id;
        if (!householdMap.has(key)) {
          householdMap.set(key, []);
        }
        householdMap.get(key)!.push(person);
      }
      
      const households = Array.from(householdMap.entries()).map(([id, members]) => ({ id, members }));
      
      days.push({
        date: day,
        dayName: format(day, "EEE"),
        count: households.length,
        households,
        isToday: isSameDay(day, today),
      });
    }
    return days;
  }, [weekStart, weeklyConversations, people]);

  const maxDailyCount = Math.max(...dailyData.map(d => d.count), 1);

  // Use household count for weekly goal tracking (couples/families count as 1)
  const weeklyCount = uniqueHouseholdsContactedThisWeek;
  const percentage = Math.min((weeklyCount / WEEKLY_GOAL) * 100, 100);
  const dayOfWeek = new Date().getDay() || 7;
  const expectedByNow = Math.round((WEEKLY_GOAL / 7) * dayOfWeek);
  const isOnTrack = weeklyCount >= expectedByNow;


  return (
    <Layout>
      <div className="min-h-screen bg-secondary/30">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <header className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-serif font-bold text-primary">Weekly Review</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setWeekOffset(prev => prev - 1)}
                    data-testid="button-prev-week"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <p className="text-muted-foreground min-w-[180px] text-center">
                    {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
                    {weekOffset === 0 && <span className="ml-2 text-xs text-primary">(This Week)</span>}
                    {weekOffset === -1 && <span className="ml-2 text-xs text-muted-foreground">(Last Week)</span>}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setWeekOffset(prev => prev + 1)}
                    disabled={weekOffset >= 0}
                    data-testid="button-next-week"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  {weekOffset !== 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setWeekOffset(0)}
                      className="ml-2"
                      data-testid="button-today"
                    >
                      Today
                    </Button>
                  )}
                </div>
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
            
            <Card className="border-none shadow-lg bg-gradient-to-br from-amber-50 to-orange-50">
              <CardHeader className="pb-2">
                <CardTitle className="font-serif flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-600" />
                  Follow-Up Signals
                </CardTitle>
              </CardHeader>
              <CardContent>
                {signalStats ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5" /> Surfaced
                      </span>
                      <span className="font-semibold text-amber-700">{signalStats.surfaced}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5" /> Resolved
                      </span>
                      <span className="font-semibold text-emerald-600">{signalStats.resolved}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> Expired
                      </span>
                      <span className="font-semibold text-gray-500">{signalStats.expired}</span>
                    </div>
                    {signalStats.resolved > 0 && Object.keys(signalStats.byResolutionType).length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Actions Taken</p>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(signalStats.byResolutionType).map(([type, count]) => (
                            <Badge key={type} variant="secondary" className="text-xs">
                              {type === 'text' ? 'Text' : type === 'email' ? 'Email' : type === 'handwritten_note' ? 'Note' : type}: {count}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
                    No signals yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-md mb-8">
            <CardHeader className="pb-4">
              <CardTitle className="font-serif flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Daily Breakdown
              </CardTitle>
              <CardDescription>Click a day to see who you connected with</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-32 mb-2">
                {dailyData.map((day) => {
                  const barHeight = day.count > 0 ? Math.max((day.count / maxDailyCount) * 100, 15) : 0;
                  const isExpanded = expandedDay === format(day.date, "yyyy-MM-dd");
                  return (
                    <button
                      key={day.dayName}
                      onClick={() => setExpandedDay(isExpanded ? null : format(day.date, "yyyy-MM-dd"))}
                      className={`flex-1 flex flex-col items-center gap-1 transition-all ${isExpanded ? "scale-105" : "hover:scale-102"}`}
                      data-testid={`button-day-${day.dayName.toLowerCase()}`}
                    >
                      <span className="text-xs font-medium text-muted-foreground">{day.count}</span>
                      <div 
                        className={`w-full rounded-t-lg transition-all ${
                          day.isToday ? "bg-emerald-500" : day.count > 0 ? "bg-primary/70" : "bg-muted"
                        } ${isExpanded ? "ring-2 ring-primary ring-offset-2" : ""}`}
                        style={{ height: `${barHeight}%`, minHeight: day.count > 0 ? "8px" : "4px" }}
                      />
                      <span className={`text-xs ${day.isToday ? "font-bold text-emerald-600" : "text-muted-foreground"}`}>
                        {day.dayName}
                      </span>
                    </button>
                  );
                })}
              </div>
              
              {expandedDay && (
                <div className="mt-4 pt-4 border-t">
                  {(() => {
                    const dayInfo = dailyData.find(d => format(d.date, "yyyy-MM-dd") === expandedDay);
                    if (!dayInfo || dayInfo.households.length === 0) {
                      return (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          No conversations on {format(parseISO(expandedDay), "EEEE, MMM d")}
                        </p>
                      );
                    }
                    return (
                      <div>
                        <h4 className="text-sm font-medium mb-3">
                          {format(dayInfo.date, "EEEE, MMM d")} - {dayInfo.households.length} {dayInfo.households.length === 1 ? "household" : "households"}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {dayInfo.households.map((household) => (
                            <button
                              key={household.id}
                              onClick={() => setSelectedPerson(household.members[0])}
                              className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                              data-testid={`button-household-${household.id}`}
                            >
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs bg-primary/10">
                                  {getInitials(household.members[0].name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">
                                {household.members.length === 1 
                                  ? household.members[0].name 
                                  : household.members.map(m => m.name).join(" & ")}
                              </span>
                              {household.members[0].segment && (
                                <Badge variant="outline" className="text-[10px] h-4">
                                  {household.members[0].segment}
                                </Badge>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="font-serif flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                People You Connected With
              </CardTitle>
              <CardDescription>
                {peopleContactedThisWeek.length} {peopleContactedThisWeek.length === 1 ? 'person' : 'people'} across {weeklyCount} {weeklyCount === 1 ? 'household' : 'households'}
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
