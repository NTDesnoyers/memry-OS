import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Mic, 
  MessageCircle, 
  Hand,
  Smile,
  HelpCircle,
  PartyPopper,
  Trash2,
  RefreshCw,
  Loader2,
  Volume2,
  Quote,
  Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type VoicePattern = {
  id: string;
  category: string;
  value: string;
  context: string | null;
  frequency: number;
  source: string | null;
  createdAt: string;
};

const categoryConfig: Record<string, { 
  icon: typeof Mic; 
  label: string; 
  description: string;
  color: string;
  bgColor: string;
}> = {
  greetings: { 
    icon: Hand, 
    label: "Greetings", 
    description: "How you open conversations",
    color: "text-blue-600",
    bgColor: "bg-blue-50"
  },
  signoffs: { 
    icon: PartyPopper, 
    label: "Sign-offs", 
    description: "How you close conversations",
    color: "text-purple-600",
    bgColor: "bg-purple-50"
  },
  expressions: { 
    icon: MessageCircle, 
    label: "Expressions", 
    description: "Common phrases you use",
    color: "text-green-600",
    bgColor: "bg-green-50"
  },
  tone_notes: { 
    icon: Volume2, 
    label: "Tone Notes", 
    description: "Observations about your speaking style",
    color: "text-orange-600",
    bgColor: "bg-orange-50"
  },
  compliment_patterns: { 
    icon: Smile, 
    label: "Compliments", 
    description: "How you give praise and encouragement",
    color: "text-pink-600",
    bgColor: "bg-pink-50"
  },
  question_styles: { 
    icon: HelpCircle, 
    label: "Questions", 
    description: "How you ask questions and show interest",
    color: "text-cyan-600",
    bgColor: "bg-cyan-50"
  },
};

function PatternCard({ pattern, onDelete }: { pattern: VoicePattern; onDelete: () => void }) {
  const config = categoryConfig[pattern.category] || categoryConfig.expressions;
  
  return (
    <div 
      className="flex items-start gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 group transition-colors"
      data-testid={`pattern-${pattern.id}`}
    >
      <Quote className={`h-4 w-4 mt-1 ${config.color} flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">"{pattern.value}"</p>
        {pattern.frequency > 1 && (
          <p className="text-xs text-gray-500 mt-1">Used {pattern.frequency} times</p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
        onClick={onDelete}
        data-testid={`delete-pattern-${pattern.id}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function CategorySection({ 
  category, 
  patterns, 
  onDeletePattern 
}: { 
  category: string; 
  patterns: VoicePattern[]; 
  onDeletePattern: (id: string) => void;
}) {
  const config = categoryConfig[category] || categoryConfig.expressions;
  const Icon = config.icon;
  const sortedPatterns = [...patterns].sort((a, b) => (b.frequency || 1) - (a.frequency || 1));
  
  return (
    <Card className="overflow-hidden" data-testid={`category-${category}`}>
      <CardHeader className={`${config.bgColor} border-b`}>
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${config.color}`} />
          <div>
            <CardTitle className="text-lg">{config.label}</CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </div>
          <Badge variant="secondary" className="ml-auto">
            {patterns.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {patterns.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No patterns learned yet
          </p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {sortedPatterns.map(pattern => (
              <PatternCard 
                key={pattern.id} 
                pattern={pattern} 
                onDelete={() => onDeletePattern(pattern.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function VoiceProfilePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: patterns = [], isLoading } = useQuery<VoicePattern[]>({
    queryKey: ["/api/voice-profile"],
  });

  const { data: processingStatus } = useQuery<{
    isProcessing: boolean;
    processed: number;
    totalToProcess: number;
    failed: number;
  }>({
    queryKey: ["/api/interactions/process-status"],
    refetchInterval: 5000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/voice-profile/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voice-profile"] });
      toast({ title: "Pattern removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove pattern", variant: "destructive" });
    },
  });

  const triggerProcessMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/interactions/process-all");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: data.message || "Processing started" });
      queryClient.invalidateQueries({ queryKey: ["/api/interactions/process-status"] });
    },
    onError: () => {
      toast({ title: "Failed to start processing", variant: "destructive" });
    },
  });

  const groupedPatterns = patterns.reduce((acc, pattern) => {
    if (!acc[pattern.category]) {
      acc[pattern.category] = [];
    }
    acc[pattern.category].push(pattern);
    return acc;
  }, {} as Record<string, VoicePattern[]>);

  const totalPatterns = patterns.length;
  const categories = Object.keys(categoryConfig);
  
  const topExpressions = (groupedPatterns.expressions || [])
    .sort((a, b) => (b.frequency || 1) - (a.frequency || 1))
    .slice(0, 5);

  const isProcessing = processingStatus?.isProcessing;
  const processProgress = processingStatus?.processed || 0;
  const processTotal = processingStatus?.totalToProcess || 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mic className="h-6 w-6 text-indigo-600" />
              Voice Profile
            </h1>
            <p className="text-gray-600 mt-1">
              How the AI has learned to sound like you
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {isProcessing && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing {processProgress}/{processTotal}
              </div>
            )}
            <Button
              variant="outline"
              onClick={() => triggerProcessMutation.mutate()}
              disabled={isProcessing || triggerProcessMutation.isPending}
              data-testid="button-process-conversations"
            >
              {triggerProcessMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Learn from Conversations
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : totalPatterns === 0 ? (
          <Card className="p-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No voice patterns learned yet</h2>
            <p className="text-gray-500 mb-6">
              Process your conversations to teach the AI how you communicate.
              It will learn your greetings, expressions, and speaking style.
            </p>
            <Button
              onClick={() => triggerProcessMutation.mutate()}
              disabled={triggerProcessMutation.isPending}
            >
              <Mic className="h-4 w-4 mr-2" />
              Start Learning from Conversations
            </Button>
          </Card>
        ) : (
          <>
            <Card className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-full shadow-sm">
                    <Sparkles className="h-8 w-8 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-800">
                      {totalPatterns} patterns learned from your conversations
                    </h2>
                    <p className="text-gray-600 text-sm mt-1">
                      The AI uses these to write emails and notes that sound like you
                    </p>
                    {topExpressions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {topExpressions.map((exp, i) => (
                          <Badge key={i} variant="secondary" className="bg-white">
                            "{exp.value}"
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-indigo-600">
                          {groupedPatterns.expressions?.length || 0}
                        </div>
                        <div className="text-xs text-gray-500">Expressions</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {groupedPatterns.greetings?.length || 0}
                        </div>
                        <div className="text-xs text-gray-500">Greetings</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-orange-600">
                          {groupedPatterns.tone_notes?.length || 0}
                        </div>
                        <div className="text-xs text-gray-500">Tone Notes</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              {categories.map(category => (
                <CategorySection
                  key={category}
                  category={category}
                  patterns={groupedPatterns[category] || []}
                  onDeletePattern={(id) => deleteMutation.mutate(id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
