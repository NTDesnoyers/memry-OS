import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Lightbulb, 
  TrendingUp, 
  Calendar as CalendarIcon, 
  Plus, 
  Sparkles, 
  FileText, 
  Video, 
  Mail, 
  Mic,
  MessageSquare,
  ChevronRight,
  Loader2,
  Wand2,
  Eye,
  Edit,
  Trash2,
  Clock,
  Hash,
  Pickaxe,
  RefreshCw,
  HeartHandshake,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Brain,
  ArrowRightLeft
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { ContentTopic, ContentIdea, ContentCalendarItem, CoachingInsight } from "@shared/schema";

const contentTypeIcons: Record<string, React.ReactNode> = {
  blog: <FileText className="h-4 w-4" />,
  video_short: <Video className="h-4 w-4" />,
  video_long: <Video className="h-4 w-4" />,
  email_newsletter: <Mail className="h-4 w-4" />,
  podcast: <Mic className="h-4 w-4" />,
  faq: <MessageSquare className="h-4 w-4" />,
  social: <Hash className="h-4 w-4" />,
};

const contentTypeLabels: Record<string, string> = {
  blog: "Blog Post",
  video_short: "Short Video",
  video_long: "Long Video",
  email_newsletter: "Newsletter",
  podcast: "Podcast",
  faq: "FAQ",
  social: "Social Post",
};

const statusColors: Record<string, string> = {
  idea: "bg-gray-100 text-gray-800",
  outlined: "bg-blue-100 text-blue-800",
  drafted: "bg-yellow-100 text-yellow-800",
  published: "bg-green-100 text-green-800",
  archived: "bg-slate-100 text-slate-500",
  planned: "bg-purple-100 text-purple-800",
  in_progress: "bg-orange-100 text-orange-800",
  ready: "bg-emerald-100 text-emerald-800",
};

export default function ContentIntelligence() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("topics");
  const [showNewTopicDialog, setShowNewTopicDialog] = useState(false);
  const [showNewIdeaDialog, setShowNewIdeaDialog] = useState(false);
  const [showViewDraftDialog, setShowViewDraftDialog] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<ContentIdea | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<ContentTopic | null>(null);
  
  const [newTopic, setNewTopic] = useState({ title: "", description: "", category: "" });
  const [newIdea, setNewIdea] = useState({ title: "", description: "", contentType: "blog", topicId: "" });

  const { data: topics = [], isLoading: topicsLoading } = useQuery<ContentTopic[]>({
    queryKey: ["/api/content-topics"],
  });

  const { data: ideas = [], isLoading: ideasLoading } = useQuery<ContentIdea[]>({
    queryKey: ["/api/content-ideas"],
  });

  const { data: calendarItems = [], isLoading: calendarLoading } = useQuery<ContentCalendarItem[]>({
    queryKey: ["/api/content-calendar"],
  });

  // Coaching Insights
  const { data: coachingInsights = [], isLoading: coachingLoading } = useQuery<CoachingInsight[]>({
    queryKey: ["/api/coaching-insights"],
  });

  type ListeningStats = {
    totalAnalyzed: number;
    avgObservationRatio: number;
    avgFeelingAcknowledgments: number;
    avgNeedClarifications: number;
    avgAssumedNeeds: number;
    avgRequestConfirmations: number;
    questionBreakdown: {
      exploratory: number;
      clarifying: number;
      feelingBased: number;
      needBased: number;
      solutionLeading: number;
      closed: number;
    };
    avgDepthScore: number;
    avgTrustScore: number;
  };

  const { data: listeningStats } = useQuery<ListeningStats>({
    queryKey: ["/api/listening-analysis/stats"],
  });

  // Mining status polling
  const { data: miningStatus } = useQuery<{
    isProcessing: boolean;
    total: number;
    processed: number;
    topicsFound: number;
    newTopics: number;
  }>({
    queryKey: ["/api/content-topics/mining-status"],
    refetchInterval: (query) => query.state.data?.isProcessing ? 2000 : false,
  });

  const mineAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/content-topics/mine-all", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to start mining");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Mining Started", description: "Analyzing all conversations for content topics..." });
      queryClient.invalidateQueries({ queryKey: ["/api/content-topics/mining-status"] });
    },
    onError: (error: any) => {
      if (error.message?.includes("409")) {
        toast({ title: "Already Running", description: "Topic mining is already in progress." });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    },
  });

  // Refetch topics when mining completes
  const prevMiningRef = useRef(miningStatus?.isProcessing);
  useEffect(() => {
    if (prevMiningRef.current === true && miningStatus?.isProcessing === false) {
      queryClient.invalidateQueries({ queryKey: ["/api/content-topics"] });
      toast({ 
        title: "Mining Complete", 
        description: `Found ${miningStatus.topicsFound} topics (${miningStatus.newTopics} new)` 
      });
    }
    prevMiningRef.current = miningStatus?.isProcessing;
  }, [miningStatus?.isProcessing]);

  const analyzeListeningMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/listening-analysis/analyze", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to analyze listening");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Analysis Complete", 
        description: data.message 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/coaching-insights"] });
      queryClient.invalidateQueries({ queryKey: ["/api/listening-analysis/stats"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const coachingFeedbackMutation = useMutation({
    mutationFn: async ({ id, feedback }: { id: string; feedback: string }) => {
      const res = await fetch(`/api/coaching-insights/${id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback }),
      });
      if (!res.ok) throw new Error("Failed to submit feedback");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coaching-insights"] });
      toast({ title: "Feedback Recorded", description: "Thank you for your feedback!" });
    },
  });

  const dismissInsightMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/coaching-insights/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
      if (!res.ok) throw new Error("Failed to dismiss insight");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coaching-insights"] });
    },
  });

  const createTopicMutation = useMutation({
    mutationFn: async (data: typeof newTopic) => {
      const res = await fetch("/api/content-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create topic");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-topics"] });
      toast({ title: "Topic Created", description: "New content topic added." });
      setShowNewTopicDialog(false);
      setNewTopic({ title: "", description: "", category: "" });
    },
  });

  const createIdeaMutation = useMutation({
    mutationFn: async (data: typeof newIdea) => {
      const res = await fetch("/api/content-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create idea");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-ideas"] });
      toast({ title: "Idea Created", description: "New content idea added." });
      setShowNewIdeaDialog(false);
      setNewIdea({ title: "", description: "", contentType: "blog", topicId: "" });
    },
  });

  const generateIdeasMutation = useMutation({
    mutationFn: async (topicId: string) => {
      const res = await fetch(`/api/content-topics/${topicId}/generate-ideas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to generate ideas");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-ideas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content-topics"] });
      toast({ 
        title: "Ideas Generated", 
        description: `Created ${data.ideas?.length || 0} content ideas.` 
      });
    },
  });

  const generateDraftMutation = useMutation({
    mutationFn: async (ideaId: string) => {
      const res = await fetch(`/api/content-ideas/${ideaId}/generate-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to generate draft");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-ideas"] });
      setSelectedIdea(data);
      setShowViewDraftDialog(true);
      toast({ title: "Draft Generated", description: "Content draft is ready for review." });
    },
  });

  const deleteTopicMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/content-topics/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete topic");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-topics"] });
      toast({ title: "Topic Deleted" });
    },
  });

  const deleteIdeaMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/content-ideas/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete idea");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-ideas"] });
      toast({ title: "Idea Deleted" });
    },
  });

  const scheduleIdeaMutation = useMutation({
    mutationFn: async ({ ideaId, scheduledDate, channel }: { ideaId: string; scheduledDate: string; channel: string }) => {
      const res = await fetch(`/api/content-ideas/${ideaId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledDate, channel }),
      });
      if (!res.ok) throw new Error("Failed to schedule");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-calendar"] });
      toast({ title: "Scheduled", description: "Content added to calendar." });
    },
  });

  const getIdeasForTopic = (topicId: string) => {
    return ideas.filter(i => i.topicId === topicId);
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="page-title">Content Intelligence</h1>
            <p className="text-muted-foreground">
              Turn client conversations into valuable content
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-xl grid-cols-4">
            <TabsTrigger value="topics" data-testid="tab-topics">
              <TrendingUp className="h-4 w-4 mr-2" />
              Topics
            </TabsTrigger>
            <TabsTrigger value="ideas" data-testid="tab-ideas">
              <Lightbulb className="h-4 w-4 mr-2" />
              Ideas
            </TabsTrigger>
            <TabsTrigger value="calendar" data-testid="tab-calendar">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="listening" data-testid="tab-listening">
              <HeartHandshake className="h-4 w-4 mr-2" />
              Listening
            </TabsTrigger>
          </TabsList>

          <TabsContent value="topics" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Recurring themes from your conversations. Higher mention counts = more relevant content opportunities.
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => mineAllMutation.mutate()} 
                  disabled={miningStatus?.isProcessing || mineAllMutation.isPending}
                  variant="outline"
                  data-testid="btn-mine-all"
                >
                  {miningStatus?.isProcessing ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Pickaxe className="h-4 w-4 mr-2" />
                  )}
                  {miningStatus?.isProcessing ? "Mining..." : "Mine All Conversations"}
                </Button>
                <Button onClick={() => setShowNewTopicDialog(true)} data-testid="btn-add-topic">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Topic
                </Button>
              </div>
            </div>
            
            {miningStatus?.isProcessing && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Mining conversations for pain points...</span>
                    <span className="text-sm text-muted-foreground">
                      {miningStatus.processed} / {miningStatus.total}
                    </span>
                  </div>
                  <Progress 
                    value={miningStatus.total > 0 ? (miningStatus.processed / miningStatus.total) * 100 : 0} 
                    className="h-2"
                  />
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{miningStatus.topicsFound} topics found</span>
                    <span>{miningStatus.newTopics} new topics created</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {topicsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : topics.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No Topics Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Topics will be discovered from your conversations, or you can add them manually.
                  </p>
                  <Button onClick={() => setShowNewTopicDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Topic
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {topics.map((topic) => (
                  <Card key={topic.id} className="hover:shadow-md transition-shadow" data-testid={`topic-card-${topic.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{topic.title}</CardTitle>
                          {topic.category && (
                            <Badge variant="outline" className="mt-1">{topic.category}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-primary/10 text-primary">
                            {topic.mentionCount}x mentioned
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {topic.description && (
                        <p className="text-sm text-muted-foreground mb-3">{topic.description}</p>
                      )}
                      
                      {topic.sampleQuotes && topic.sampleQuotes.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Sample quote:</p>
                          <p className="text-sm italic text-muted-foreground line-clamp-2">
                            "{topic.sampleQuotes[0]}"
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Button 
                          size="sm" 
                          onClick={() => {
                            setSelectedTopic(topic);
                            generateIdeasMutation.mutate(topic.id);
                          }}
                          disabled={generateIdeasMutation.isPending}
                          data-testid={`btn-generate-ideas-${topic.id}`}
                        >
                          {generateIdeasMutation.isPending && selectedTopic?.id === topic.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4 mr-2" />
                          )}
                          Generate Ideas
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteTopicMutation.mutate(topic.id)}
                          data-testid={`btn-delete-topic-${topic.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {getIdeasForTopic(topic.id).length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            {getIdeasForTopic(topic.id).length} ideas generated
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {getIdeasForTopic(topic.id).slice(0, 3).map((idea) => (
                              <Badge key={idea.id} variant="secondary" className="text-xs">
                                {contentTypeIcons[idea.contentType]}
                                <span className="ml-1">{contentTypeLabels[idea.contentType]}</span>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ideas" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Content ideas generated from topics. Generate drafts with AI or write your own.
              </p>
              <Button onClick={() => setShowNewIdeaDialog(true)} data-testid="btn-add-idea">
                <Plus className="h-4 w-4 mr-2" />
                Add Idea
              </Button>
            </div>

            {ideasLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : ideas.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No Ideas Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add topics first, then generate ideas with AI.
                  </p>
                  <Button onClick={() => setActiveTab("topics")}>
                    Go to Topics
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {ideas.map((idea) => (
                  <Card key={idea.id} className="hover:shadow-md transition-shadow" data-testid={`idea-card-${idea.id}`}>
                    <CardContent className="py-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 p-2 bg-muted rounded-lg">
                          {contentTypeIcons[idea.contentType]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">{idea.title}</h4>
                            <Badge className={statusColors[idea.status || 'idea']}>
                              {idea.status || 'idea'}
                            </Badge>
                            {idea.aiGenerated && (
                              <Badge variant="outline" className="text-xs">
                                <Sparkles className="h-3 w-3 mr-1" />
                                AI
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {idea.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span>{contentTypeLabels[idea.contentType]}</span>
                            {idea.topicId && (
                              <>
                                <ChevronRight className="h-3 w-3" />
                                <span>
                                  {topics.find(t => t.id === idea.topicId)?.title || 'Unknown Topic'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {idea.draft ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedIdea(idea);
                                setShowViewDraftDialog(true);
                              }}
                              data-testid={`btn-view-draft-${idea.id}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Draft
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedIdea(idea);
                                generateDraftMutation.mutate(idea.id);
                              }}
                              disabled={generateDraftMutation.isPending}
                              data-testid={`btn-generate-draft-${idea.id}`}
                            >
                              {generateDraftMutation.isPending && selectedIdea?.id === idea.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Wand2 className="h-4 w-4 mr-2" />
                              )}
                              Generate Draft
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteIdeaMutation.mutate(idea.id)}
                            data-testid={`btn-delete-idea-${idea.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Your content publishing schedule. Drag ideas here or schedule from the Ideas tab.
              </p>
            </div>

            {calendarLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : calendarItems.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No Scheduled Content</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate drafts from ideas and schedule them for publishing.
                  </p>
                  <Button onClick={() => setActiveTab("ideas")}>
                    Go to Ideas
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {calendarItems.map((item) => (
                  <Card key={item.id} data-testid={`calendar-item-${item.id}`}>
                    <CardContent className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 p-2 bg-muted rounded-lg">
                          {contentTypeIcons[item.contentType]}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{item.title}</h4>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {item.scheduledDate 
                              ? format(new Date(item.scheduledDate), "MMM d, yyyy")
                              : "Not scheduled"
                            }
                            {item.channel && (
                              <>
                                <span>•</span>
                                <span>{item.channel}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Badge className={statusColors[item.status || 'planned']}>
                          {item.status || 'planned'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="listening" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Listening Skill Insights</h3>
                <p className="text-sm text-muted-foreground">
                  Pattern-based coaching from your conversations
                </p>
              </div>
              <Button 
                onClick={() => analyzeListeningMutation.mutate()}
                disabled={analyzeListeningMutation.isPending}
                data-testid="btn-analyze-listening"
              >
                {analyzeListeningMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4 mr-2" />
                )}
                Analyze Conversations
              </Button>
            </div>

            {listeningStats && listeningStats.totalAnalyzed > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Your Listening Profile</CardTitle>
                  <CardDescription>Based on {listeningStats.totalAnalyzed} analyzed conversations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {(listeningStats.avgObservationRatio * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Observation Focus</div>
                    </div>
                    <div className="text-center p-3 bg-pink-50 rounded-lg">
                      <div className="text-2xl font-bold text-pink-600">
                        {listeningStats.avgFeelingAcknowledgments.toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground">Feeling Acknowledgments</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {listeningStats.avgDepthScore.toFixed(1)}/10
                      </div>
                      <div className="text-xs text-muted-foreground">Conversation Depth</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {listeningStats.avgTrustScore.toFixed(1)}/10
                      </div>
                      <div className="text-xs text-muted-foreground">Trust Building</div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2">Question Types (avg per conversation)</h4>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                      <div className="text-center p-2 bg-emerald-50 rounded">
                        <div className="font-semibold text-emerald-700">{listeningStats.questionBreakdown.exploratory.toFixed(1)}</div>
                        <div className="text-muted-foreground">Exploratory</div>
                      </div>
                      <div className="text-center p-2 bg-sky-50 rounded">
                        <div className="font-semibold text-sky-700">{listeningStats.questionBreakdown.clarifying.toFixed(1)}</div>
                        <div className="text-muted-foreground">Clarifying</div>
                      </div>
                      <div className="text-center p-2 bg-rose-50 rounded">
                        <div className="font-semibold text-rose-700">{listeningStats.questionBreakdown.feelingBased.toFixed(1)}</div>
                        <div className="text-muted-foreground">Feeling</div>
                      </div>
                      <div className="text-center p-2 bg-amber-50 rounded">
                        <div className="font-semibold text-amber-700">{listeningStats.questionBreakdown.needBased.toFixed(1)}</div>
                        <div className="text-muted-foreground">Need</div>
                      </div>
                      <div className="text-center p-2 bg-orange-50 rounded">
                        <div className="font-semibold text-orange-700">{listeningStats.questionBreakdown.solutionLeading.toFixed(1)}</div>
                        <div className="text-muted-foreground">Solution</div>
                      </div>
                      <div className="text-center p-2 bg-slate-50 rounded">
                        <div className="font-semibold text-slate-700">{listeningStats.questionBreakdown.closed.toFixed(1)}</div>
                        <div className="text-muted-foreground">Closed</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div>
              <h4 className="text-base font-medium mb-3">Coaching Insights</h4>
              {coachingLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : coachingInsights.filter(i => i.status === 'active').length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center">
                    <HeartHandshake className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground mb-2">No coaching insights yet</p>
                    <p className="text-sm text-muted-foreground">
                      Click "Analyze Conversations" to generate insights from your conversations
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {coachingInsights.filter(i => i.status === 'active').map((insight) => (
                    <Card key={insight.id} className="hover:shadow-md transition-shadow" data-testid={`insight-card-${insight.id}`}>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {insight.type === 'micro_shift' && <ArrowRightLeft className="h-5 w-5 text-blue-500" />}
                            {insight.type === 'question_swap' && <RefreshCw className="h-5 w-5 text-green-500" />}
                            {insight.type === 'pattern_observation' && <Eye className="h-5 w-5 text-purple-500" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{insight.insight}</p>
                            {insight.suggestedBehavior && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Try: {insight.suggestedBehavior}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {insight.type === 'micro_shift' ? 'Micro Shift' : 
                                 insight.type === 'question_swap' ? 'Question Swap' : 'Pattern'}
                              </Badge>
                              {insight.category && (
                                <Badge variant="secondary" className="text-xs">
                                  {insight.category.replace('_', ' ')}
                                </Badge>
                              )}
                              {insight.confidenceScore && (
                                <span className="text-xs text-muted-foreground">
                                  {insight.confidenceScore}% confidence
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-3 border-t">
                          <span className="text-xs text-muted-foreground">Was this helpful?</span>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => coachingFeedbackMutation.mutate({ id: insight.id, feedback: 'accurate' })}
                              disabled={coachingFeedbackMutation.isPending}
                              data-testid={`feedback-accurate-${insight.id}`}
                            >
                              <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                              Yes
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => coachingFeedbackMutation.mutate({ id: insight.id, feedback: 'not_right' })}
                              disabled={coachingFeedbackMutation.isPending}
                              data-testid={`feedback-not-right-${insight.id}`}
                            >
                              <ThumbsDown className="h-3.5 w-3.5 mr-1" />
                              No
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => coachingFeedbackMutation.mutate({ id: insight.id, feedback: 'tell_me_more' })}
                              disabled={coachingFeedbackMutation.isPending}
                              data-testid={`feedback-more-${insight.id}`}
                            >
                              <HelpCircle className="h-3.5 w-3.5 mr-1" />
                              Tell me more
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-muted-foreground hover:text-destructive"
                              onClick={() => dismissInsightMutation.mutate(insight.id)}
                              disabled={dismissInsightMutation.isPending}
                              data-testid={`dismiss-insight-${insight.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showNewTopicDialog} onOpenChange={setShowNewTopicDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Content Topic</DialogTitle>
            <DialogDescription>
              Add a recurring theme or pain point from client conversations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={newTopic.title}
                onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
                placeholder="e.g., Inspection Contingencies"
                data-testid="input-topic-title"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={newTopic.category}
                onValueChange={(v) => setNewTopic({ ...newTopic, category: v })}
              >
                <SelectTrigger data-testid="select-topic-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buying">Buying Process</SelectItem>
                  <SelectItem value="selling">Selling Process</SelectItem>
                  <SelectItem value="financing">Financing</SelectItem>
                  <SelectItem value="inspection">Inspections</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="closing">Closing</SelectItem>
                  <SelectItem value="market">Market Trends</SelectItem>
                  <SelectItem value="investment">Investment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newTopic.description}
                onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
                placeholder="Describe the common questions or concerns..."
                data-testid="input-topic-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTopicDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createTopicMutation.mutate(newTopic)}
              disabled={!newTopic.title || createTopicMutation.isPending}
              data-testid="btn-save-topic"
            >
              {createTopicMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Topic
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewIdeaDialog} onOpenChange={setShowNewIdeaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Content Idea</DialogTitle>
            <DialogDescription>
              Create a specific content piece to develop.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={newIdea.title}
                onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })}
                placeholder="e.g., 5 Things First-Time Buyers Miss in Inspections"
                data-testid="input-idea-title"
              />
            </div>
            <div>
              <Label>Content Type</Label>
              <Select
                value={newIdea.contentType}
                onValueChange={(v) => setNewIdea({ ...newIdea, contentType: v })}
              >
                <SelectTrigger data-testid="select-idea-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blog">Blog Post</SelectItem>
                  <SelectItem value="video_short">Short Video (60s)</SelectItem>
                  <SelectItem value="video_long">Long Video (5-10min)</SelectItem>
                  <SelectItem value="email_newsletter">Email Newsletter</SelectItem>
                  <SelectItem value="podcast">Podcast Episode</SelectItem>
                  <SelectItem value="faq">FAQ Entry</SelectItem>
                  <SelectItem value="social">Social Media Post</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Related Topic (optional)</Label>
              <Select
                value={newIdea.topicId}
                onValueChange={(v) => setNewIdea({ ...newIdea, topicId: v })}
              >
                <SelectTrigger data-testid="select-idea-topic">
                  <SelectValue placeholder="Select topic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No topic</SelectItem>
                  {topics.map((topic) => (
                    <SelectItem key={topic.id} value={topic.id}>
                      {topic.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newIdea.description}
                onChange={(e) => setNewIdea({ ...newIdea, description: e.target.value })}
                placeholder="What should this content cover?"
                data-testid="input-idea-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewIdeaDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createIdeaMutation.mutate(newIdea)}
              disabled={!newIdea.title || createIdeaMutation.isPending}
              data-testid="btn-save-idea"
            >
              {createIdeaMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Idea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showViewDraftDialog} onOpenChange={setShowViewDraftDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedIdea?.title}</DialogTitle>
            <DialogDescription>
              {contentTypeLabels[selectedIdea?.contentType || 'blog']} - AI Generated Draft
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm">
                {selectedIdea?.draft || "No draft available"}
              </pre>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDraftDialog(false)}>
              Close
            </Button>
            <Button onClick={() => {
              if (selectedIdea) {
                const today = new Date().toISOString();
                scheduleIdeaMutation.mutate({
                  ideaId: selectedIdea.id,
                  scheduledDate: today,
                  channel: "website"
                });
              }
            }}>
              <CalendarIcon className="h-4 w-4 mr-2" />
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
