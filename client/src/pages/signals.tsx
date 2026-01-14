import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  MessageSquare,
  Mail, 
  FileText, 
  X,
  Loader2,
  Clock,
  Undo2,
  Check,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import type { Person, FollowUpSignal } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { getInitials } from "@/lib/utils";
import { Link } from "wouter";

type SignalWithPerson = FollowUpSignal & { person?: Person };

type ResolutionType = 'text' | 'email' | 'handwritten_note' | 'skip';

const resolutionOptions = [
  { type: 'text' as const, label: 'Text', icon: MessageSquare, color: 'bg-green-50 text-green-700 hover:bg-green-100' },
  { type: 'email' as const, label: 'Email', icon: Mail, color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
  { type: 'handwritten_note' as const, label: 'Note', icon: FileText, color: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
  { type: 'skip' as const, label: 'Skip', icon: X, color: 'bg-gray-50 text-gray-500 hover:bg-gray-100' },
];

function SignalCard({ 
  signal, 
  onResolve,
  isResolving,
  recentlyResolved,
  onUndo
}: { 
  signal: SignalWithPerson;
  onResolve: (signalId: string, resolutionType: ResolutionType) => void;
  isResolving: boolean;
  recentlyResolved?: { signalId: string; resolutionType: string; timestamp: number };
  onUndo: (signalId: string) => void;
}) {
  const person = signal.person;
  const isThisRecentlyResolved = recentlyResolved?.signalId === signal.id;
  
  return (
    <Card 
      className={`transition-all duration-300 ${isThisRecentlyResolved ? 'opacity-50 bg-green-50' : 'hover:shadow-md'}`}
      data-testid={`signal-card-${signal.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Link href={person ? `/people/${person.id}` : '#'}>
            <Avatar className="h-12 w-12 cursor-pointer hover:ring-2 hover:ring-primary">
              <AvatarFallback className="bg-slate-100 text-slate-700 font-medium">
                {person ? getInitials(person.name) : '?'}
              </AvatarFallback>
            </Avatar>
          </Link>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Link href={person ? `/people/${person.id}` : '#'}>
                <span className="font-semibold text-foreground hover:underline cursor-pointer" data-testid="signal-person-name">
                  {person?.name || 'Unknown Contact'}
                </span>
              </Link>
              {person?.segment && (
                <Badge variant="outline" className="text-xs">
                  {person.segment}
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                {signal.priorityScore}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mb-2" data-testid="signal-reasoning">
              {signal.reasoning}
            </p>
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Expires {formatDistanceToNow(new Date(signal.expiresAt), { addSuffix: true })}
            </div>
          </div>
        </div>
        
        {isThisRecentlyResolved ? (
          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <div className="flex items-center gap-2 text-green-700">
              <Check className="h-4 w-4" />
              <span className="text-sm font-medium">
                Resolved: {recentlyResolved?.resolutionType}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUndo(signal.id)}
              data-testid="undo-resolve"
            >
              <Undo2 className="h-4 w-4 mr-1" />
              Undo
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-4 pt-3 border-t">
            {resolutionOptions.map((option) => (
              <Button
                key={option.type}
                variant="ghost"
                size="sm"
                className={`flex-1 ${option.color}`}
                onClick={() => onResolve(signal.id, option.type)}
                disabled={isResolving}
                data-testid={`resolve-${option.type}`}
              >
                <option.icon className="h-4 w-4 mr-1" />
                {option.label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SignalsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [recentlyResolved, setRecentlyResolved] = useState<{ signalId: string; resolutionType: string; timestamp: number } | null>(null);
  
  const { data: signals = [], isLoading } = useQuery<SignalWithPerson[]>({
    queryKey: ["/api/signals"],
    refetchInterval: 30000,
  });
  
  const resolveMutation = useMutation({
    mutationFn: async ({ signalId, resolutionType }: { signalId: string; resolutionType: ResolutionType }) => {
      const res = await apiRequest("POST", `/api/signals/${signalId}/resolve`, { resolutionType });
      return res.json();
    },
    onSuccess: (_, { signalId, resolutionType }) => {
      setRecentlyResolved({ signalId, resolutionType, timestamp: Date.now() });
      toast({
        title: "Signal resolved",
        description: `Marked as ${resolutionType}. Undo available for 10 seconds.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error resolving signal",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const undoMutation = useMutation({
    mutationFn: async (signalId: string) => {
      const res = await apiRequest("POST", `/api/signals/${signalId}/undo`);
      return res.json();
    },
    onSuccess: () => {
      setRecentlyResolved(null);
      queryClient.invalidateQueries({ queryKey: ["/api/signals"] });
      toast({
        title: "Undo successful",
        description: "Signal restored to pending.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Undo failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  useEffect(() => {
    if (recentlyResolved) {
      const timeout = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/signals"] });
        setRecentlyResolved(null);
      }, 10000);
      
      return () => clearTimeout(timeout);
    }
  }, [recentlyResolved, queryClient]);
  
  const handleResolve = (signalId: string, resolutionType: ResolutionType) => {
    resolveMutation.mutate({ signalId, resolutionType });
  };
  
  const handleUndo = (signalId: string) => {
    undoMutation.mutate(signalId);
  };
  
  const pendingSignals = signals.filter(s => 
    s.status === 'pending' || recentlyResolved?.signalId === s.id
  );
  
  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Follow-Up Signals</h1>
              <p className="text-muted-foreground">
                Decision checkpoints from recent conversations. Resolve each one with a single tap.
              </p>
            </div>
          </div>
          
          {pendingSignals.length > 0 && (
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {pendingSignals.length} pending
              </Badge>
            </div>
          )}
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : pendingSignals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No pending signals</h3>
              <p className="text-sm text-muted-foreground mt-2">
                New signals will appear here after you log conversations.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingSignals.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                onResolve={handleResolve}
                isResolving={resolveMutation.isPending}
                recentlyResolved={recentlyResolved || undefined}
                onUndo={handleUndo}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
