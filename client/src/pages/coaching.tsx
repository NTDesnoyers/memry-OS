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
import { Loader2, Play, MessageSquare, HelpCircle, Lightbulb, Target, TrendingUp, CheckCircle, AlertCircle, Clock, ChevronRight, Sparkles, GraduationCap, RefreshCw } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Person = {
  id: string;
  name: string;
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

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function ScoreGauge({ score, label, color }: { score: number; label: string; color: string }) {
  return (
    <div className="text-center">
      <div className="relative inline-flex items-center justify-center">
        <svg className="w-20 h-20 transform -rotate-90">
          <circle
            className="text-muted stroke-current"
            strokeWidth="8"
            fill="transparent"
            r="32"
            cx="40"
            cy="40"
          />
          <circle
            className={`${color} stroke-current transition-all duration-500`}
            strokeWidth="8"
            strokeLinecap="round"
            fill="transparent"
            r="32"
            cx="40"
            cy="40"
            strokeDasharray={`${score * 2.01} 201`}
          />
        </svg>
        <span className="absolute text-xl font-bold">{score}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function ConversationCard({ 
  interaction, 
  person, 
  onAnalyze, 
  isAnalyzing 
}: { 
  interaction: Interaction; 
  person?: Person;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}) {
  const hasAnalysis = !!interaction.coachingAnalysis;
  const analysis = interaction.coachingAnalysis;
  
  return (
    <Card className="hover:shadow-md transition-shadow" data-testid={`coaching-card-${interaction.id}`}>
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
            
            {interaction.summary && (
              <p className="text-sm text-muted-foreground line-clamp-2">{interaction.summary}</p>
            )}
            
            {hasAnalysis && analysis && (
              <div className="mt-3 flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${analysis.overallScore >= 80 ? 'bg-green-500' : analysis.overallScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                  <span className="text-sm font-medium">{analysis.overallScore}/100</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {analysis.improvements.length} areas to improve
                </span>
              </div>
            )}
          </div>
          
          <Button 
            variant={hasAnalysis ? "outline" : "default"}
            size="sm"
            onClick={onAnalyze}
            disabled={isAnalyzing || !interaction.transcript}
            data-testid={`button-analyze-${interaction.id}`}
          >
            {isAnalyzing ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Analyzing...</>
            ) : hasAnalysis ? (
              <><RefreshCw className="h-4 w-4 mr-1" /> Re-analyze</>
            ) : (
              <><Play className="h-4 w-4 mr-1" /> Analyze</>
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
        <p className="text-xs text-muted-foreground">
          Analyzed {formatDistanceToNow(new Date(analysis.analyzedAt), { addSuffix: true })}
        </p>
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
      
      {analysis.missedOpportunities.length > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              Missed Opportunities
            </CardTitle>
            <CardDescription className="text-red-600">
              Moments where you could have probed deeper
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.missedOpportunities.map((missed, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-red-600 mt-1">•</span>
                  {missed}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
            <HelpCircle className="h-4 w-4" />
            Questions You Could Have Asked
          </CardTitle>
          <CardDescription className="text-blue-600">
            Based on the context of this conversation
          </CardDescription>
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
      
      {analysis.keyMoments.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Key Moments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.keyMoments.map((moment, i) => (
                <div 
                  key={i} 
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    moment.type === 'good' ? 'bg-green-50' :
                    moment.type === 'missed' ? 'bg-red-50' : 'bg-amber-50'
                  }`}
                >
                  {moment.type === 'good' ? (
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  ) : moment.type === 'missed' ? (
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                  ) : (
                    <Target className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  )}
                  <div>
                    {moment.timestamp && (
                      <span className="text-xs text-muted-foreground">{moment.timestamp}</span>
                    )}
                    <p className="text-sm">{moment.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
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
  
  const analyzeMutation = useMutation({
    mutationFn: async (interactionId: string) => {
      const response = await apiRequest("POST", `/api/interactions/${interactionId}/coaching-analysis`);
      return response;
    },
    onSuccess: (data, interactionId) => {
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
  const unanalyzedConversations = conversationsWithTranscripts.filter(i => !i.coachingAnalysis);
  
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
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <header className="mb-6">
            <h1 className="text-3xl font-serif font-bold text-primary flex items-center gap-3">
              <GraduationCap className="h-8 w-8" />
              Coaching
            </h1>
            <p className="text-muted-foreground">
              Replay and analyze your conversations to improve your questioning and listening skills
            </p>
          </header>
          
          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Conversations to Review</CardTitle>
                  <CardDescription>
                    {conversationsWithTranscripts.length} conversations with transcripts
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Tabs defaultValue="unanalyzed" className="w-full">
                    <div className="px-4">
                      <TabsList className="w-full grid grid-cols-2">
                        <TabsTrigger value="unanalyzed" data-testid="tab-unanalyzed">
                          New ({unanalyzedConversations.length})
                        </TabsTrigger>
                        <TabsTrigger value="analyzed" data-testid="tab-analyzed">
                          Reviewed ({analyzedConversations.length})
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    
                    <TabsContent value="unanalyzed" className="mt-0">
                      <ScrollArea className="h-[500px]">
                        <div className="p-4 space-y-3">
                          {unanalyzedConversations.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                              All conversations have been analyzed!
                            </p>
                          ) : (
                            unanalyzedConversations.map((interaction) => (
                              <ConversationCard
                                key={interaction.id}
                                interaction={interaction}
                                person={getPersonById(interaction.personId)}
                                onAnalyze={() => handleAnalyze(interaction)}
                                isAnalyzing={analyzingId === interaction.id}
                              />
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                    
                    <TabsContent value="analyzed" className="mt-0">
                      <ScrollArea className="h-[500px]">
                        <div className="p-4 space-y-3">
                          {analyzedConversations.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                              No conversations analyzed yet
                            </p>
                          ) : (
                            analyzedConversations.map((interaction) => (
                              <div 
                                key={interaction.id}
                                className="cursor-pointer"
                                onClick={() => setSelectedInteraction(interaction)}
                              >
                                <ConversationCard
                                  interaction={interaction}
                                  person={getPersonById(interaction.personId)}
                                  onAnalyze={() => handleAnalyze(interaction)}
                                  isAnalyzing={analyzingId === interaction.id}
                                />
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-3">
              {selectedInteraction?.coachingAnalysis ? (
                <Card>
                  <CardContent className="p-6">
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
                      Our AI is reviewing your questioning techniques, listening patterns, and FORD coverage
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-12 flex flex-col items-center justify-center text-center">
                    <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">Select a conversation to analyze</p>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Click "Analyze" on any conversation to get AI-powered coaching feedback on your questioning, listening, and relationship-building skills
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
