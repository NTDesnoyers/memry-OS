import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, MessageSquare, ClipboardCheck } from "lucide-react";
import LayoutComponent from "@/components/layout";

interface BetaStats {
  totalUsers: number;
  activeUsersLast7Days: number;
  usersWithFollowupsLast7Days: number;
  avgConversationsPerUser: number;
  retentionWeekOverWeek: number;
}

function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon 
}: { 
  title: string; 
  value: string | number; 
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function BetaDashboard() {
  const { data: stats, isLoading, error } = useQuery<BetaStats>({
    queryKey: ["/api/beta/stats"],
    refetchInterval: 60000,
  });

  if (error) {
    return (
      <LayoutComponent>
        <div className="container mx-auto py-8 px-4">
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">You don't have permission to view this page.</p>
          </Card>
        </div>
      </LayoutComponent>
    );
  }

  return (
    <LayoutComponent>
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">Beta Analytics</h1>
          <p className="text-muted-foreground mt-1">Track beta user engagement and key metrics</p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-4 bg-muted rounded w-24"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-32"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : stats ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <StatCard
                title="Total Users"
                value={stats.totalUsers}
                description="Approved beta users"
                icon={Users}
              />
              <StatCard
                title="Weekly Active"
                value={stats.activeUsersLast7Days}
                description="Active in last 7 days"
                icon={Activity}
              />
              <StatCard
                title="Avg Conversations"
                value={stats.avgConversationsPerUser}
                description="Per active user this week"
                icon={MessageSquare}
              />
              <StatCard
                title="Users with Follow-ups"
                value={stats.usersWithFollowupsLast7Days}
                description="Created follow-up this week"
                icon={ClipboardCheck}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Engagement Summary</CardTitle>
                  <CardDescription>Key engagement metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">WAU Rate</span>
                      <span className="font-medium">
                        {stats.totalUsers > 0 
                          ? `${Math.round((stats.activeUsersLast7Days / stats.totalUsers) * 100)}%`
                          : '0%'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Follow-up Adoption (7d)</span>
                      <span className="font-medium">
                        {stats.activeUsersLast7Days > 0 
                          ? `${Math.round((stats.usersWithFollowupsLast7Days / stats.activeUsersLast7Days) * 100)}%`
                          : '0%'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Week-over-Week Retention</span>
                      <span className="font-medium">{stats.retentionWeekOverWeek}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Weekly Goal Progress</CardTitle>
                  <CardDescription>Target: 50 household conversations/week per user</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Avg conversations/user</span>
                        <span>{stats.avgConversationsPerUser} / 50</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all"
                          style={{ width: `${Math.min((stats.avgConversationsPerUser / 50) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Tracking unique household conversations from live interactions (calls, meetings, in-person, video).
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </LayoutComponent>
  );
}
