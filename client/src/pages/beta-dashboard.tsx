import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Activity, MessageSquare, ClipboardCheck, Plus, Trash2, UserCheck, Loader2, Mail } from "lucide-react";
import LayoutComponent from "@/components/layout";
import { useState } from "react";
import { format } from "date-fns";

interface BetaStats {
  totalUsers: number;
  activeUsersLast7Days: number;
  usersWithFollowupsLast7Days: number;
  avgConversationsPerUser: number;
  retentionWeekOverWeek: number;
}

interface AdminBetaStats {
  users: { total: number; signedUpLast7Days: number };
  events: { total: number; byType: Record<string, number> };
  activation: { activatedUsers: number; activationRate: number };
}

interface WhitelistEntry {
  id: string;
  email: string;
  addedBy: string | null;
  note: string | null;
  usedAt: string | null;
  createdAt: string;
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
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState("");
  const [note, setNote] = useState("");

  const { data: adminStats, isLoading: adminStatsLoading } = useQuery<AdminBetaStats>({
    queryKey: ["/api/admin/beta-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/beta-stats");
      if (!res.ok) throw new Error("Failed to fetch admin stats");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const { data: stats, isLoading, error } = useQuery<BetaStats>({
    queryKey: ["/api/beta/stats"],
    refetchInterval: 60000,
  });

  const { data: whitelist = [], isLoading: whitelistLoading } = useQuery<WhitelistEntry[]>({
    queryKey: ["/api/beta/whitelist"],
    queryFn: async () => {
      const res = await fetch("/api/beta/whitelist");
      if (!res.ok) throw new Error("Failed to fetch whitelist");
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async ({ email, note }: { email: string; note?: string }) => {
      const res = await fetch("/api/beta/whitelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, note }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to add email");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/beta/whitelist"] });
      setNewEmail("");
      setNote("");
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/beta/whitelist/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove email");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/beta/whitelist"] });
    },
  });

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmail.trim()) {
      addMutation.mutate({ email: newEmail.trim(), note: note.trim() || undefined });
    }
  };

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

        {/* Quick Stats - Plain Text */}
        {adminStats && (
          <Card className="mb-8 bg-muted/30" data-testid="quick-stats">
            <CardContent className="pt-6">
              <div className="font-mono text-sm space-y-1">
                <p>Users: {adminStats.users.total} total ({adminStats.users.signedUpLast7Days} last 7 days)</p>
                <p>Activated: {adminStats.activation.activatedUsers} ({Math.round(adminStats.activation.activationRate * 100)}%)</p>
                <p>Events logged: {adminStats.events.total}</p>
                {adminStats.events.byType.login_failed > 0 && (
                  <p className="text-destructive">Login failures: {adminStats.events.byType.login_failed}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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

            {/* Beta Whitelist Management */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Beta Whitelist
                </CardTitle>
                <CardDescription>
                  Pre-approve emails for instant beta access. When someone signs up with a whitelisted email, they'll be automatically approved.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddEmail} className="flex gap-2 mb-6" data-testid="whitelist-form">
                  <div className="flex-1">
                    <Input
                      type="email"
                      placeholder="Enter email address..."
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      data-testid="whitelist-email-input"
                    />
                  </div>
                  <div className="w-48">
                    <Input
                      type="text"
                      placeholder="Note (optional)"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      data-testid="whitelist-note-input"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={!newEmail.trim() || addMutation.isPending}
                    data-testid="whitelist-add-button"
                  >
                    {addMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Add
                  </Button>
                </form>

                {addMutation.isError && (
                  <div className="text-sm text-destructive mb-4" data-testid="whitelist-error">
                    {addMutation.error.message}
                  </div>
                )}

                {whitelistLoading ? (
                  <div className="text-sm text-muted-foreground">Loading whitelist...</div>
                ) : whitelist.length === 0 ? (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    No emails whitelisted yet. Add emails above to pre-approve beta testers.
                  </div>
                ) : (
                  <div className="space-y-2" data-testid="whitelist-entries">
                    {whitelist.map((entry) => (
                      <div 
                        key={entry.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        data-testid={`whitelist-entry-${entry.id}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{entry.email}</span>
                            {entry.usedAt && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                Signed up
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Added {format(new Date(entry.createdAt), 'MMM d, yyyy')}
                            {entry.note && <span> · {entry.note}</span>}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMutation.mutate(entry.id)}
                          disabled={removeMutation.isPending}
                          data-testid={`whitelist-delete-${entry.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </LayoutComponent>
  );
}
