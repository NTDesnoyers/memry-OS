import Layout from "@/components/layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Loader2, Play, HelpCircle, Lightbulb, Target, CheckCircle, Sparkles, GraduationCap, RefreshCw, Headphones, Brain, Mic, BarChart3, Zap, MessageCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Person = {
  id: string;
  name: string;
  phone?: string | null;
  fordFamily?: string | null;
  fordOccupation?: string | null;
  fordRecreation?: string | null;
  fordDreams?: string | null;
  profession?: string | null;
  relationshipSegment?: string | null;
};

type Interaction = {
  id: string;
  personId: string | null;
  type: string;
  title: string | null;
  summary: string | null;
  transcript: string | null;
  occurredAt: string | null;
  createdAt: string;
  coachingAnalysis?: CoachingAnalysis | null;
};

type CoachingAnalysis = {
  overallScore: number;
  listeningScore: number;
  questioningScore: number;
  fordCoverage: number;
  strengths: string[];
  improvements: string[];
  missedOpportunities: string[];
  suggestedQuestions: string[];
  keyMoments: {
    timestamp?: string;
    type: "good" | "missed" | "improvement";
    description: string;
  }[];
  analyzedAt: string;
};

type ListeningAnalysis = {
  id: string;
  interactionId: string;
  observationCount: number;
  interpretationCount: number;
  feelingAcknowledgments: number;
  needClarifications: number;
  assumedNeeds: number;
  exploratoryQuestions: number;
  clarifyingQuestions: number;
  feelingQuestions: number;
  needQuestions: number;
  solutionLeadingQuestions: number;
  closedQuestions: number;
  conversationDepthScore: number;
  trustBuildingScore: number;
  createdAt: string;
};

type CoachingInsight = {
  id: string;
  type: string;
  category: string;
  insight: string;
  originalBehavior?: string | null;
  suggestedBehavior?: string | null;
  confidenceScore: number;
  status: string;
  createdAt: string;
};

type VoiceProfile = {
  greetings: string[];
  signoffs: string[];
  expressions: string[];
  toneNotes: string[];
  complimentPatterns: string[];
  questionStyles: string[];
};

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function ScoreGauge({ score, label, color, size = "medium" }: { score: number; label: string; color: string; size?: "small" | "medium" }) {
  const dimensions = size === "small" ? { w: 16, h: 16, r: 24, cx: 32, cy: 32, stroke: 6 } : { w: 20, h: 20, r: 32, cx: 40, cy: 40, stroke: 8 };
  return (
    <div className="text-center">
      <div className="relative inline-flex items-center justify-center">
        <svg className={`w-${dimensions.w} h-${dimensions.h} transform -rotate-90`} style={{ width: dimensions.w * 4, height: dimensions.h * 4 }}>
          <circle
            className="text-muted stroke-current"
            strokeWidth={dimensions.stroke}
            fill="transparent"
            r={dimensions.r}
            cx={dimensions.cx}
            cy={dimensions.cy}
          />
          <circle
            className={`${color} stroke-current transition-all duration-500`}
            strokeWidth={dimensions.stroke}
            strokeLinecap="round"
            fill="transparent"
            r={dimensions.r}
            cx={dimensions.cx}
            cy={dimensions.cy}
            strokeDasharray={`${score * (dimensions.r * 2 * Math.PI / 100)} ${dimensions.r * 2 * Math.PI}`}
          />
        </svg>
        <span className={`absolute ${size === "small" ? "text-sm" : "text-xl"} font-bold`}>{score}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function ConversationCard({ 
  interaction, 
  person, 
  onAnalyze, 
  isAnalyzing,
  onSelect,
  isSelected
}: { 
  interaction: Interaction; 
  person?: Person;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const hasAnalysis = !!interaction.coachingAnalysis;
  const analysis = interaction.coachingAnalysis;
  
  return (
    <Card 
      className={`hover:shadow-md transition-all cursor-pointer ${isSelected ? 'ring-2 ring-primary' : ''}`} 
      data-testid={`coaching-card-${interaction.id}`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {person && (
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary/10">
                      {getInitials(person.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{person.name}</span>
                </div>
              )}
              <Badge variant="outline">{interaction.type}</Badge>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(interaction.occurredAt || interaction.createdAt), { addSuffix: true })}
              </span>
            </div>
            
            {interaction.title && (
              <p className="text-sm font-medium mb-1">{interaction.title}</p>
            )}
            
            {hasAnalysis && analysis && (
              <div className="mt-2 flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${analysis.overallScore >= 80 ? 'bg-green-500' : analysis.overallScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                  <span className="text-sm font-medium">{analysis.overallScore}/100</span>
                </div>
              </div>
            )}
          </div>
          
          <Button 
            variant={hasAnalysis ? "outline" : "default"}
            size="sm"
            onClick={(e) => { e.stopPropagation(); onAnalyze(); }}
            disabled={isAnalyzing || !interaction.transcript}
            data-testid={`button-analyze-${interaction.id}`}
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : hasAnalysis ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AnalysisDetail({ analysis, interaction, person }: { analysis: CoachingAnalysis; interaction: Interaction; person?: Person }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Conversation Analysis
          </h3>
          <p className="text-sm text-muted-foreground">
            {person?.name} - {format(new Date(interaction.occurredAt || interaction.createdAt), "MMM d, yyyy")}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        <ScoreGauge score={analysis.overallScore} label="Overall" color="text-primary" />
        <ScoreGauge score={analysis.listeningScore} label="Listening" color="text-blue-500" />
        <ScoreGauge score={analysis.questioningScore} label="Questioning" color="text-purple-500" />
        <ScoreGauge score={analysis.fordCoverage} label="FORD Depth" color="text-green-500" />
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-green-700">
              <CheckCircle className="h-4 w-4" />
              What You Did Well
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.strengths.map((strength, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  {strength}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        
        <Card className="bg-amber-50 border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
              <Target className="h-4 w-4" />
              Areas to Improve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.improvements.map((improvement, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-amber-600 mt-1">•</span>
                  {improvement}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
      
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
            <HelpCircle className="h-4 w-4" />
            Questions You Could Have Asked
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analysis.suggestedQuestions.map((question, i) => (
              <div key={i} className="flex items-start gap-2 p-2 bg-white rounded-lg border border-blue-100">
                <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <span className="text-sm">{question}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CoachingInsightsTab({ insights }: { insights: CoachingInsight[] }) {
  const activeInsights = insights.filter(i => i.status === 'active');
  
  const groupedInsights = {
    micro_shift: activeInsights.filter(i => i.type === 'micro_shift'),
    question_swap: activeInsights.filter(i => i.type === 'question_swap'),
    pattern_observation: activeInsights.filter(i => i.type === 'pattern_observation'),
  };
  
  if (activeInsights.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No coaching insights yet</p>
          <p className="text-sm text-muted-foreground">
            Analyze more conversations to generate personalized coaching insights
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {groupedInsights.micro_shift.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Micro-Shifts
            </CardTitle>
            <CardDescription>Small changes that make a big difference</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {groupedInsights.micro_shift.map((insight) => (
              <div key={insight.id} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm">{insight.insight}</p>
                {insight.suggestedBehavior && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Try: {insight.suggestedBehavior}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      
      {groupedInsights.question_swap.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-500" />
              Question Swaps
            </CardTitle>
            <CardDescription>Better questions to ask</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {groupedInsights.question_swap.map((insight) => (
              <div key={insight.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm">{insight.insight}</p>
                {insight.originalBehavior && insight.suggestedBehavior && (
                  <div className="mt-2 text-xs">
                    <p className="text-red-600 line-through">{insight.originalBehavior}</p>
                    <p className="text-green-600">{insight.suggestedBehavior}</p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      
      {groupedInsights.pattern_observation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              Pattern Observations
            </CardTitle>
            <CardDescription>Trends in your conversations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {groupedInsights.pattern_observation.map((insight) => (
              <div key={insight.id} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm">{insight.insight}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ListeningSkillsTab({ analyses }: { analyses: ListeningAnalysis[] }) {
  if (analyses.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Headphones className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No listening analysis yet</p>
          <p className="text-sm text-muted-foreground">
            Analyze conversations to see your listening patterns
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const avgDepth = analyses.reduce((sum, a) => sum + a.conversationDepthScore, 0) / analyses.length;
  const avgTrust = analyses.reduce((sum, a) => sum + a.trustBuildingScore, 0) / analyses.length;
  const totalExploratory = analyses.reduce((sum, a) => sum + a.exploratoryQuestions, 0);
  const totalClosed = analyses.reduce((sum, a) => sum + a.closedQuestions, 0);
  const totalFeelingAck = analyses.reduce((sum, a) => sum + a.feelingAcknowledgments, 0);
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{avgDepth.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Avg Depth Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{avgTrust.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Avg Trust Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-purple-600">{totalExploratory}</p>
            <p className="text-xs text-muted-foreground">Exploratory Questions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-pink-600">{totalFeelingAck}</p>
            <p className="text-xs text-muted-foreground">Feeling Acknowledgments</p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Question Types Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "Exploratory", value: totalExploratory, color: "bg-green-500" },
              { label: "Clarifying", value: analyses.reduce((sum, a) => sum + a.clarifyingQuestions, 0), color: "bg-blue-500" },
              { label: "Feeling-based", value: analyses.reduce((sum, a) => sum + a.feelingQuestions, 0), color: "bg-pink-500" },
              { label: "Need-based", value: analyses.reduce((sum, a) => sum + a.needQuestions, 0), color: "bg-purple-500" },
              { label: "Solution-leading", value: analyses.reduce((sum, a) => sum + a.solutionLeadingQuestions, 0), color: "bg-amber-500" },
              { label: "Closed", value: totalClosed, color: "bg-gray-500" },
            ].map(({ label, value, color }) => {
              const total = analyses.reduce((sum, a) => 
                sum + a.exploratoryQuestions + a.clarifyingQuestions + a.feelingQuestions + 
                a.needQuestions + a.solutionLeadingQuestions + a.closedQuestions, 0);
              const percentage = total > 0 ? (value / total) * 100 : 0;
              return (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{label}</span>
                    <span>{value} ({percentage.toFixed(0)}%)</span>
                  </div>
                  <Progress value={percentage} className={`h-2 ${color}`} />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function VoiceProfileTab({ voiceProfile }: { voiceProfile: VoiceProfile | null }) {
  if (!voiceProfile) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Mic className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Voice profile not learned yet</p>
          <p className="text-sm text-muted-foreground">
            Process more conversations to learn your communication style
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Communication Patterns</CardTitle>
          <CardDescription>Learned from your conversation transcripts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {voiceProfile.greetings?.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Greetings</p>
              <div className="flex flex-wrap gap-2">
                {voiceProfile.greetings.map((g, i) => (
                  <Badge key={i} variant="secondary">"{g}"</Badge>
                ))}
              </div>
            </div>
          )}
          
          {voiceProfile.signoffs?.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Sign-offs</p>
              <div className="flex flex-wrap gap-2">
                {voiceProfile.signoffs.map((s, i) => (
                  <Badge key={i} variant="secondary">"{s}"</Badge>
                ))}
              </div>
            </div>
          )}
          
          {voiceProfile.expressions?.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Expressions</p>
              <div className="flex flex-wrap gap-2">
                {voiceProfile.expressions.map((e, i) => (
                  <Badge key={i} variant="outline">"{e}"</Badge>
                ))}
              </div>
            </div>
          )}
          
          {voiceProfile.toneNotes?.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Tone Observations</p>
              <ul className="space-y-1">
                {voiceProfile.toneNotes.map((t, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span>•</span> {t}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Coaching() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  
  const { data: interactions = [], isLoading } = useQuery<Interaction[]>({
    queryKey: ["/api/interactions"],
  });
  
  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });
  
  const { data: listeningAnalyses = [] } = useQuery<ListeningAnalysis[]>({
    queryKey: ["/api/listening-analysis"],
  });
  
  const { data: coachingInsights = [] } = useQuery<CoachingInsight[]>({
    queryKey: ["/api/coaching-insights"],
  });
  
  const { data: voiceProfileData } = useQuery<{ greetings: string[]; signoffs: string[]; expressions: string[]; toneNotes: string[]; complimentPatterns: string[]; questionStyles: string[] } | null>({
    queryKey: ["/api/voice-profile"],
  });
  
  const analyzeMutation = useMutation({
    mutationFn: async (interactionId: string) => {
      const response = await apiRequest("POST", `/api/interactions/${interactionId}/coaching-analysis`);
      if (!response.ok) throw new Error("Failed to analyze conversation");
      return response.json();
    },
    onSuccess: (data: { success: boolean; analysis: CoachingAnalysis }, interactionId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/interactions"] });
      const interaction = interactions.find(i => i.id === interactionId);
      if (interaction) {
        setSelectedInteraction({ ...interaction, coachingAnalysis: data.analysis });
      }
      toast({ title: "Analysis complete", description: "Your conversation has been analyzed" });
    },
    onError: (error: any) => {
      toast({ title: "Analysis failed", description: error.message, variant: "destructive" });
    },
    onSettled: () => {
      setAnalyzingId(null);
    }
  });
  
  const getPersonById = (id: string | null) => people.find(p => p.id === id);
  
  const conversationsWithTranscripts = interactions
    .filter(i => i.transcript && i.transcript.length > 100)
    .sort((a, b) => new Date(b.occurredAt || b.createdAt).getTime() - new Date(a.occurredAt || a.createdAt).getTime());
  
  const analyzedConversations = conversationsWithTranscripts.filter(i => i.coachingAnalysis);
  
  const handleAnalyze = (interaction: Interaction) => {
    setAnalyzingId(interaction.id);
    setSelectedInteraction(interaction);
    analyzeMutation.mutate(interaction.id);
  };
  
  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="min-h-screen bg-secondary/30">
        <div className="px-6 py-6">
          <header className="mb-6">
            <h1 className="text-3xl font-serif font-bold text-primary flex items-center gap-3">
              <GraduationCap className="h-8 w-8" />
              Coaching Hub
            </h1>
            <p className="text-muted-foreground">
              Improve your questioning, listening, and relationship-building skills
            </p>
          </header>
          
          <Tabs defaultValue="replay" className="space-y-6">
            <TabsList className="grid grid-cols-4 w-full max-w-xl">
              <TabsTrigger value="replay" data-testid="tab-replay">
                <Play className="h-4 w-4 mr-2" />
                Replay
              </TabsTrigger>
              <TabsTrigger value="insights" data-testid="tab-insights">
                <Lightbulb className="h-4 w-4 mr-2" />
                Insights
              </TabsTrigger>
              <TabsTrigger value="listening" data-testid="tab-listening">
                <Headphones className="h-4 w-4 mr-2" />
                Listening
              </TabsTrigger>
              <TabsTrigger value="voice" data-testid="tab-voice">
                <Mic className="h-4 w-4 mr-2" />
                Voice
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="replay">
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <Card className="h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Conversations</CardTitle>
                      <CardDescription>
                        {conversationsWithTranscripts.length} with transcripts • {analyzedConversations.length} analyzed
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[calc(100vh-280px)]">
                        <div className="p-4 space-y-3">
                          {conversationsWithTranscripts.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                              No conversations with transcripts yet
                            </p>
                          ) : (
                            conversationsWithTranscripts.map((interaction) => (
                              <ConversationCard
                                key={interaction.id}
                                interaction={interaction}
                                person={getPersonById(interaction.personId)}
                                onAnalyze={() => handleAnalyze(interaction)}
                                isAnalyzing={analyzingId === interaction.id}
                                onSelect={() => setSelectedInteraction(interaction)}
                                isSelected={selectedInteraction?.id === interaction.id}
                              />
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="lg:col-span-2">
                  {selectedInteraction?.coachingAnalysis ? (
                    <Card className="h-full">
                      <CardContent className="p-6 overflow-auto max-h-[calc(100vh-220px)]">
                        <AnalysisDetail 
                          analysis={selectedInteraction.coachingAnalysis}
                          interaction={selectedInteraction}
                          person={getPersonById(selectedInteraction.personId)}
                        />
                      </CardContent>
                    </Card>
                  ) : analyzingId ? (
                    <Card>
                      <CardContent className="p-12 flex flex-col items-center justify-center">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                        <p className="text-lg font-medium">Analyzing conversation...</p>
                        <p className="text-sm text-muted-foreground">
                          Reviewing questioning techniques, listening patterns, and FORD coverage
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="p-12 flex flex-col items-center justify-center text-center">
                        <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">Select a conversation to analyze</p>
                        <p className="text-sm text-muted-foreground max-w-md">
                          Click on any conversation and hit the play button to get AI coaching feedback
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="insights">
              <CoachingInsightsTab insights={coachingInsights} />
            </TabsContent>
            
            <TabsContent value="listening">
              <ListeningSkillsTab analyses={listeningAnalyses} />
            </TabsContent>
            
            <TabsContent value="voice">
              <VoiceProfileTab voiceProfile={voiceProfileData || null} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
