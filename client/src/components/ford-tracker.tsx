import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MessageCircle, TrendingUp, Target } from "lucide-react";
import { startOfWeek, endOfWeek, format, isWithinInterval, parseISO } from "date-fns";

type Interaction = {
  id: string;
  occurredAt: string;
  type: string;
  deletedAt?: string | null;
};

const WEEKLY_GOAL = 50;

function getWeekBounds() {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  return { weekStart, weekEnd };
}

function countWeeklyConversations(interactions: Interaction[]): number {
  const { weekStart, weekEnd } = getWeekBounds();
  
  return interactions.filter(interaction => {
    if (interaction.deletedAt) return false;
    
    const interactionDate = parseISO(interaction.occurredAt);
    return isWithinInterval(interactionDate, { start: weekStart, end: weekEnd });
  }).length;
}

export function FordTrackerCompact() {
  const { data: interactions = [] } = useQuery<Interaction[]>({
    queryKey: ["/api/interactions"],
  });
  
  const weeklyCount = countWeeklyConversations(interactions);
  const percentage = Math.min((weeklyCount / WEEKLY_GOAL) * 100, 100);
  const { weekStart, weekEnd } = getWeekBounds();
  
  const isOnTrack = weeklyCount >= (WEEKLY_GOAL / 7) * (new Date().getDay() || 7);
  
  return (
    <div 
      className="flex items-center gap-4 px-4 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-b"
      data-testid="ford-tracker-compact"
    >
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-emerald-100 rounded-full">
          <MessageCircle className="h-4 w-4 text-emerald-600" />
        </div>
        <span className="text-sm font-medium text-emerald-800">FORD Conversations</span>
      </div>
      
      <div className="flex-1 max-w-xs">
        <Progress value={percentage} className="h-2" />
      </div>
      
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-emerald-700" data-testid="text-ford-count">
          {weeklyCount}
          <span className="text-sm font-normal text-emerald-600">/{WEEKLY_GOAL}</span>
        </span>
        
        {isOnTrack ? (
          <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
            <TrendingUp className="h-3 w-3" />
            On track
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
            <Target className="h-3 w-3" />
            Keep going
          </span>
        )}
      </div>
      
      <span className="text-xs text-muted-foreground">
        {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d")}
      </span>
    </div>
  );
}

export function FordTrackerWidget() {
  const { data: interactions = [] } = useQuery<Interaction[]>({
    queryKey: ["/api/interactions"],
  });
  
  const weeklyCount = countWeeklyConversations(interactions);
  const percentage = Math.min((weeklyCount / WEEKLY_GOAL) * 100, 100);
  const { weekStart, weekEnd } = getWeekBounds();
  const remaining = Math.max(WEEKLY_GOAL - weeklyCount, 0);
  
  const dayOfWeek = new Date().getDay() || 7;
  const expectedByNow = Math.round((WEEKLY_GOAL / 7) * dayOfWeek);
  const isOnTrack = weeklyCount >= expectedByNow;
  const daysLeft = 7 - dayOfWeek + 1;
  const perDayNeeded = remaining > 0 ? Math.ceil(remaining / daysLeft) : 0;
  
  return (
    <Card 
      className="border-none shadow-md bg-gradient-to-br from-emerald-50 to-teal-50" 
      data-testid="ford-tracker-widget"
    >
      <CardHeader className="pb-2">
        <CardTitle className="font-serif text-lg flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-emerald-600" />
          FORD Tracker
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-4xl font-bold text-emerald-700" data-testid="text-ford-widget-count">
            {weeklyCount}
            <span className="text-xl font-normal text-emerald-600">/{WEEKLY_GOAL}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">conversations this week</p>
        </div>
        
        <Progress value={percentage} className="h-3" />
        
        <div className="flex justify-between text-sm">
          {isOnTrack ? (
            <span className="flex items-center gap-1 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
              On track!
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-600">
              <Target className="h-4 w-4" />
              {remaining} to go
            </span>
          )}
          
          {remaining > 0 && (
            <span className="text-muted-foreground">
              ~{perDayNeeded}/day needed
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
