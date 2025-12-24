import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Sparkles,
  X,
  Clock,
  Check,
  ChevronDown,
  ChevronUp,
  Zap,
  Eye,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ObserverSuggestion } from "@shared/schema";

const intentIcons: Record<string, React.ElementType> = {
  delegate: RefreshCw,
  automate: Zap,
  shortcut: ExternalLink,
  insight: Eye,
};

const intentColors: Record<string, string> = {
  delegate: "bg-purple-500/10 text-purple-600 border-purple-200",
  automate: "bg-amber-500/10 text-amber-600 border-amber-200",
  shortcut: "bg-blue-500/10 text-blue-600 border-blue-200",
  insight: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
};

interface SuggestionCardProps {
  suggestion: ObserverSuggestion;
  onAccept: (id: string) => void;
  onSnooze: (id: string) => void;
  onDismiss: (id: string, feedback?: string, patternId?: string | null) => void;
  isProcessing: boolean;
}

function SuggestionCard({ suggestion, onAccept, onSnooze, onDismiss, isProcessing }: SuggestionCardProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const IntentIcon = intentIcons[suggestion.intent] || Sparkles;
  const intentClass = intentColors[suggestion.intent] || "bg-muted text-muted-foreground";

  return (
    <div className="p-3 rounded-lg border bg-card shadow-sm transition-all hover:shadow-md" data-testid={`suggestion-card-${suggestion.id}`}>
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-md border", intentClass)}>
          <IntentIcon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">
              {suggestion.intent}
            </Badge>
            {suggestion.confidence && suggestion.confidence >= 80 && (
              <Badge variant="secondary" className="text-xs">High Confidence</Badge>
            )}
          </div>
          <p className="text-sm font-medium text-foreground">{suggestion.title}</p>
          <p className="text-sm text-muted-foreground mb-2">{suggestion.description}</p>
          {!showFeedback ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="default"
                className="h-7 text-xs"
                onClick={() => onAccept(suggestion.id)}
                disabled={isProcessing}
                data-testid={`accept-suggestion-${suggestion.id}`}
              >
                <Check className="h-3 w-3 mr-1" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onSnooze(suggestion.id)}
                disabled={isProcessing}
                data-testid={`snooze-suggestion-${suggestion.id}`}
              >
                <Clock className="h-3 w-3 mr-1" />
                Later
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => setShowFeedback(true)}
                disabled={isProcessing}
                data-testid={`dismiss-suggestion-${suggestion.id}`}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Was this helpful?</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => onDismiss(suggestion.id, "not_helpful", suggestion.patternId)}
                disabled={isProcessing}
                data-testid={`feedback-not-helpful-${suggestion.id}`}
              >
                <ThumbsDown className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => onDismiss(suggestion.id, "not_now", suggestion.patternId)}
                disabled={isProcessing}
                data-testid={`feedback-not-now-${suggestion.id}`}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ObserverOverlay() {
  const [isOpen, setIsOpen] = useState(true);
  const [location] = useLocation();
  const queryClient = useQueryClient();

  const { data: suggestions = [], isLoading, refetch } = useQuery<ObserverSuggestion[]>({
    queryKey: ["/api/observer/suggestions"],
    queryFn: async () => {
      const res = await fetch("/api/observer/suggestions");
      if (!res.ok) throw new Error("Failed to fetch suggestions");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const acceptMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/observer/suggestions/${id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to accept");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/observer/suggestions"] });
    },
  });

  const snoozeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/observer/suggestions/${id}/snooze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes: 60 }),
      });
      if (!res.ok) throw new Error("Failed to snooze");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/observer/suggestions"] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async ({ id, feedback, patternId }: { id: string; feedback?: string; patternId?: string }) => {
      const res = await fetch(`/api/observer/suggestions/${id}/dismiss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackNote: feedback }),
      });
      if (!res.ok) throw new Error("Failed to dismiss");
      
      if (patternId && feedback === 'not_helpful') {
        await fetch(`/api/observer/patterns/by-key/${patternId}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ delta: -1 }),
        });
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/observer/suggestions"] });
    },
  });

  const handleAccept = (id: string) => {
    acceptMutation.mutate(id);
  };

  const handleSnooze = (id: string) => {
    snoozeMutation.mutate(id);
  };

  const handleDismiss = (id: string, feedback?: string, patternId?: string | null) => {
    dismissMutation.mutate({ id, feedback, patternId: patternId || undefined });
  };

  const isProcessing = acceptMutation.isPending || snoozeMutation.isPending || dismissMutation.isPending;

  if (suggestions.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-4 z-40 w-80" data-testid="observer-overlay">
      <div className={cn(
        "rounded-lg border bg-background shadow-lg overflow-hidden transition-all",
        !isOpen && "cursor-pointer hover:shadow-xl"
      )}>
        <div
          className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/5 to-primary/10 border-b cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
          data-testid="observer-toggle"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI Assistant</span>
            {suggestions.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {suggestions.length}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" data-testid="observer-collapse-btn">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>

        {isOpen && (
          <div className="max-h-96 overflow-y-auto p-3 space-y-3" data-testid="observer-suggestions-list">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No suggestions right now
              </p>
            ) : (
              suggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onAccept={handleAccept}
                  onSnooze={handleSnooze}
                  onDismiss={handleDismiss}
                  isProcessing={isProcessing}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
