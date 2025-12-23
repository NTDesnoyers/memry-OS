import Layout from "@/components/layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Baby, Briefcase, Heart, Home, Users, GraduationCap, 
  MapPin, TrendingUp, Clock, Eye, Check, X, MessageSquare,
  Linkedin, Facebook, Instagram, Twitter, AlertCircle, RefreshCw,
  Sparkles, CircleDot
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Person = {
  id: string;
  name: string;
  segment?: string | null;
  linkedinUrl?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  twitterUrl?: string | null;
};

type LifeEventAlert = {
  id: string;
  personId: string | null;
  eventType: string;
  eventCategory: string;
  confidence: string | null;
  sourceUrl: string | null;
  sourcePlatform: string | null;
  rawContent: string | null;
  summary: string | null;
  suggestedOutreach: string | null;
  status: string | null;
  actionTaken: string | null;
  detectedAt: string;
  reviewedAt: string | null;
  createdAt: string;
};

const EVENT_CATEGORIES = {
  family: { label: "Family & Household", icon: Users, color: "bg-pink-100 text-pink-700" },
  career: { label: "Financial & Career", icon: Briefcase, color: "bg-blue-100 text-blue-700" },
  life_transition: { label: "Life Transitions", icon: Heart, color: "bg-purple-100 text-purple-700" },
  property: { label: "Property & Location", icon: Home, color: "bg-green-100 text-green-700" },
};

const EVENT_TYPES = {
  new_baby: { label: "New Baby", icon: Baby, description: "Increase in family size" },
  young_children: { label: "Young Children", icon: Users, description: "Children age 10 and under" },
  teenage_children: { label: "Teenage Children", icon: Users, description: "Teenage children needing more space" },
  empty_nest: { label: "Empty Nest", icon: Home, description: "Children recently left home" },
  career_growth: { label: "Career Growth", icon: TrendingUp, description: "Promotion or company expansion" },
  job_loss: { label: "Job Change", icon: Briefcase, description: "Company downsizing or job change" },
  inheritance: { label: "Inheritance", icon: GraduationCap, description: "Substantial inheritance received" },
  below_means: { label: "Living Below Means", icon: TrendingUp, description: "Capacity to upgrade" },
  investment_interest: { label: "Investment Interest", icon: Home, description: "Interest in wake-up money" },
  engagement: { label: "Engagement", icon: CircleDot, description: "Getting married" },
  divorce: { label: "Divorce", icon: Heart, description: "Household separation" },
  remarriage: { label: "Remarriage", icon: CircleDot, description: "Divorced and remarried" },
  remote_work: { label: "Remote Work", icon: MapPin, description: "Dream to live anywhere" },
  long_tenure: { label: "Long Tenure", icon: Clock, description: "Lived in same house 8+ years" },
  owns_lot: { label: "Owns Building Lot", icon: Home, description: "Intent to build or sell" },
  long_commute: { label: "Long Commute", icon: MapPin, description: "Time pain, relocation motivation" },
};

const PLATFORMS = {
  linkedin: { icon: Linkedin, color: "text-blue-600" },
  facebook: { icon: Facebook, color: "text-blue-500" },
  instagram: { icon: Instagram, color: "text-pink-500" },
  twitter: { icon: Twitter, color: "text-sky-500" },
};

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function getConfidenceBadge(confidence: string | null) {
  switch (confidence) {
    case "high": return <Badge className="bg-green-100 text-green-700">High Confidence</Badge>;
    case "medium": return <Badge className="bg-yellow-100 text-yellow-700">Medium Confidence</Badge>;
    case "low": return <Badge className="bg-gray-100 text-gray-700">Low Confidence</Badge>;
    default: return null;
  }
}

function getStatusBadge(status: string | null) {
  switch (status) {
    case "new": return <Badge className="bg-blue-100 text-blue-700">New</Badge>;
    case "reviewed": return <Badge className="bg-yellow-100 text-yellow-700">Reviewed</Badge>;
    case "actioned": return <Badge className="bg-green-100 text-green-700">Actioned</Badge>;
    case "dismissed": return <Badge className="bg-gray-100 text-gray-700">Dismissed</Badge>;
    default: return <Badge className="bg-blue-100 text-blue-700">New</Badge>;
  }
}

export default function LifeEvents() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAlert, setSelectedAlert] = useState<LifeEventAlert | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const { data: alerts = [], isLoading: alertsLoading } = useQuery<LifeEventAlert[]>({
    queryKey: ["/api/life-event-alerts"],
  });

  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  const updateAlertMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LifeEventAlert> }) => {
      return apiRequest("PATCH", `/api/life-event-alerts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/life-event-alerts"] });
      toast({ title: "Alert updated" });
      setSelectedAlert(null);
      setActionNotes("");
    },
  });

  const personMap = new Map(people.map(p => [p.id, p]));

  const filteredAlerts = alerts.filter(alert => {
    if (activeTab === "all") return true;
    if (activeTab === "new") return alert.status === "new" || !alert.status;
    if (activeTab === "reviewed") return alert.status === "reviewed";
    if (activeTab === "actioned") return alert.status === "actioned";
    return alert.eventCategory === activeTab;
  });

  const newCount = alerts.filter(a => a.status === "new" || !a.status).length;
  const reviewedCount = alerts.filter(a => a.status === "reviewed").length;
  const actionedCount = alerts.filter(a => a.status === "actioned").length;

  const peopleWithSocialLinks = people.filter(
    p => p.linkedinUrl || p.facebookUrl || p.instagramUrl || p.twitterUrl
  );

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="page-title">
              <Sparkles className="h-6 w-6 text-purple-500" />
              Life Event Monitor
            </h1>
            <p className="text-muted-foreground">
              Track life changes in your sphere that signal real estate opportunities
            </p>
          </div>
          <Button variant="outline" className="gap-2" data-testid="button-scan">
            <RefreshCw className="h-4 w-4" />
            Scan Profiles
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Monitoring</p>
                  <p className="text-2xl font-bold" data-testid="stat-monitoring">{peopleWithSocialLinks.length}</p>
                </div>
                <Eye className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">People with social profiles linked</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">New Alerts</p>
                  <p className="text-2xl font-bold text-blue-600" data-testid="stat-new">{newCount}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Awaiting your review</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Reviewed</p>
                  <p className="text-2xl font-bold text-yellow-600" data-testid="stat-reviewed">{reviewedCount}</p>
                </div>
                <Eye className="h-8 w-8 text-yellow-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Ready for action</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Actioned</p>
                  <p className="text-2xl font-bold text-green-600" data-testid="stat-actioned">{actionedCount}</p>
                </div>
                <Check className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Outreach completed</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Life Event Triggers</CardTitle>
            <CardDescription>
              Events we monitor for that signal potential real estate needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Object.entries(EVENT_CATEGORIES).map(([key, cat]) => {
                const Icon = cat.icon;
                const categoryEvents = Object.entries(EVENT_TYPES).filter(([_, e]) => {
                  if (key === "family") return ["new_baby", "young_children", "teenage_children", "empty_nest"].includes(_);
                  if (key === "career") return ["career_growth", "job_loss", "inheritance", "below_means", "investment_interest"].includes(_);
                  if (key === "life_transition") return ["engagement", "divorce", "remarriage", "remote_work"].includes(_);
                  if (key === "property") return ["long_tenure", "owns_lot", "long_commute"].includes(_);
                  return false;
                });
                return (
                  <div key={key} className="space-y-2">
                    <div className={`flex items-center gap-2 p-2 rounded-lg ${cat.color}`}>
                      <Icon className="h-4 w-4" />
                      <span className="font-medium text-sm">{cat.label}</span>
                    </div>
                    <ul className="text-sm space-y-1 pl-2">
                      {categoryEvents.map(([eventKey, event]) => (
                        <li key={eventKey} className="text-muted-foreground">
                          {event.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detected Events</CardTitle>
            <CardDescription>
              Life events detected from social media monitoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all" data-testid="tab-all">All ({alerts.length})</TabsTrigger>
                <TabsTrigger value="new" data-testid="tab-new">New ({newCount})</TabsTrigger>
                <TabsTrigger value="reviewed" data-testid="tab-reviewed">Reviewed ({reviewedCount})</TabsTrigger>
                <TabsTrigger value="actioned" data-testid="tab-actioned">Actioned ({actionedCount})</TabsTrigger>
              </TabsList>
              
              <TabsContent value={activeTab} className="mt-4">
                {alertsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading alerts...</div>
                ) : filteredAlerts.length === 0 ? (
                  <div className="text-center py-12 space-y-4">
                    <Sparkles className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <h3 className="font-medium">No life events detected yet</h3>
                      <p className="text-sm text-muted-foreground">
                        Add social media profiles to your contacts to start monitoring for life changes
                      </p>
                    </div>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {filteredAlerts.map(alert => {
                        const person = alert.personId ? personMap.get(alert.personId) : null;
                        const eventType = EVENT_TYPES[alert.eventType as keyof typeof EVENT_TYPES];
                        const category = EVENT_CATEGORIES[alert.eventCategory as keyof typeof EVENT_CATEGORIES];
                        const platform = alert.sourcePlatform ? PLATFORMS[alert.sourcePlatform as keyof typeof PLATFORMS] : null;
                        const EventIcon = eventType?.icon || AlertCircle;
                        const PlatformIcon = platform?.icon;
                        
                        return (
                          <Card 
                            key={alert.id} 
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => setSelectedAlert(alert)}
                            data-testid={`alert-card-${alert.id}`}
                          >
                            <CardContent className="pt-4">
                              <div className="flex items-start gap-4">
                                <Avatar className="h-12 w-12">
                                  <AvatarFallback className={category?.color || "bg-gray-100"}>
                                    <EventIcon className="h-6 w-6" />
                                  </AvatarFallback>
                                </Avatar>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-medium">
                                      {person?.name || "Unknown Person"}
                                    </h4>
                                    {getStatusBadge(alert.status)}
                                    {getConfidenceBadge(alert.confidence)}
                                    {PlatformIcon && (
                                      <PlatformIcon className={`h-4 w-4 ${platform?.color}`} />
                                    )}
                                  </div>
                                  
                                  <p className="text-sm font-medium text-muted-foreground mt-1">
                                    {eventType?.label || alert.eventType}
                                  </p>
                                  
                                  {alert.summary && (
                                    <p className="text-sm mt-2 line-clamp-2">{alert.summary}</p>
                                  )}
                                  
                                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                    <span>
                                      Detected {formatDistanceToNow(new Date(alert.detectedAt), { addSuffix: true })}
                                    </span>
                                    {alert.sourceUrl && (
                                      <a 
                                        href={alert.sourceUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline"
                                        onClick={e => e.stopPropagation()}
                                      >
                                        View source
                                      </a>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex gap-2">
                                  {alert.status !== "actioned" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedAlert(alert);
                                      }}
                                      data-testid={`button-action-${alert.id}`}
                                    >
                                      <MessageSquare className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
          <DialogContent className="max-w-2xl">
            {selectedAlert && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {(() => {
                      const eventType = EVENT_TYPES[selectedAlert.eventType as keyof typeof EVENT_TYPES];
                      const Icon = eventType?.icon || AlertCircle;
                      return <Icon className="h-5 w-5" />;
                    })()}
                    {EVENT_TYPES[selectedAlert.eventType as keyof typeof EVENT_TYPES]?.label || selectedAlert.eventType}
                  </DialogTitle>
                  <DialogDescription>
                    {personMap.get(selectedAlert.personId || "")?.name || "Unknown Person"}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {selectedAlert.summary && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">What we detected</h4>
                      <p className="text-sm text-muted-foreground">{selectedAlert.summary}</p>
                    </div>
                  )}
                  
                  {selectedAlert.rawContent && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Original content</h4>
                      <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                        {selectedAlert.rawContent}
                      </p>
                    </div>
                  )}
                  
                  {selectedAlert.suggestedOutreach && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Suggested outreach</h4>
                      <p className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg border border-blue-100">
                        {selectedAlert.suggestedOutreach}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="text-sm font-medium mb-1">Your action notes</h4>
                    <Textarea
                      placeholder="What action did you take? (e.g., Called to congratulate, sent a card, etc.)"
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      data-testid="input-action-notes"
                    />
                  </div>
                </div>
                
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => updateAlertMutation.mutate({
                      id: selectedAlert.id,
                      data: { status: "dismissed", reviewedAt: new Date().toISOString() }
                    })}
                    data-testid="button-dismiss"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Dismiss
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => updateAlertMutation.mutate({
                      id: selectedAlert.id,
                      data: { status: "reviewed", reviewedAt: new Date().toISOString() }
                    })}
                    data-testid="button-mark-reviewed"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Mark Reviewed
                  </Button>
                  <Button
                    onClick={() => updateAlertMutation.mutate({
                      id: selectedAlert.id,
                      data: { 
                        status: "actioned", 
                        actionTaken: actionNotes,
                        reviewedAt: new Date().toISOString() 
                      }
                    })}
                    data-testid="button-mark-actioned"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Mark Actioned
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
