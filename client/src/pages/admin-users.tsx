import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Users, Shield } from "lucide-react";
import { format } from "date-fns";

type AuthUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  status: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function AdminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: allUsers = [], isLoading } = useQuery<AuthUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update user status");
      return res.json();
    },
    onSuccess: (user: AuthUser) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: `User ${user.status === 'approved' ? 'approved' : user.status === 'denied' ? 'denied' : 'updated'}`,
        description: `${user.email} is now ${user.status}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    },
  });

  const pendingUsers = allUsers.filter(u => u.status === 'pending');
  const approvedUsers = allUsers.filter(u => u.status === 'approved');
  const deniedUsers = allUsers.filter(u => u.status === 'denied');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'denied':
        return <Badge className="bg-red-100 text-red-800">Denied</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
    }
  };

  const UserCard = ({ user }: { user: AuthUser }) => (
    <div 
      className="flex items-center justify-between p-4 border rounded-lg bg-card"
      data-testid={`user-card-${user.id}`}
    >
      <div className="flex items-center gap-4">
        {user.profileImageUrl ? (
          <img 
            src={user.profileImageUrl} 
            alt={user.firstName || user.email || 'User'} 
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-medium">
              {(user.firstName?.[0] || user.email?.[0] || '?').toUpperCase()}
            </span>
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : user.email || 'Unknown User'}
            </span>
            {user.isAdmin && (
              <Badge variant="secondary" className="gap-1">
                <Shield className="h-3 w-3" />
                Admin
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <p className="text-xs text-muted-foreground">
            Joined {format(new Date(user.createdAt), 'MMM d, yyyy')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {getStatusBadge(user.status)}
        {user.status === 'pending' && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-green-600 border-green-200 hover:bg-green-50"
              onClick={() => updateStatusMutation.mutate({ userId: user.id, status: 'approved' })}
              disabled={updateStatusMutation.isPending}
              data-testid={`button-approve-${user.id}`}
            >
              <CheckCircle className="h-4 w-4" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => updateStatusMutation.mutate({ userId: user.id, status: 'denied' })}
              disabled={updateStatusMutation.isPending}
              data-testid={`button-deny-${user.id}`}
            >
              <XCircle className="h-4 w-4" />
              Deny
            </Button>
          </>
        )}
        {user.status === 'approved' && !user.isAdmin && (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1 text-red-600"
            onClick={() => updateStatusMutation.mutate({ userId: user.id, status: 'denied' })}
            disabled={updateStatusMutation.isPending}
            data-testid={`button-revoke-${user.id}`}
          >
            Revoke
          </Button>
        )}
        {user.status === 'denied' && (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1 text-green-600"
            onClick={() => updateStatusMutation.mutate({ userId: user.id, status: 'approved' })}
            disabled={updateStatusMutation.isPending}
            data-testid={`button-restore-${user.id}`}
          >
            Approve
          </Button>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-48" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-serif font-bold">User Management</h1>
            <p className="text-muted-foreground">Approve or deny access to Flow OS</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold">{pendingUsers.length}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{approvedUsers.length}</p>
                  <p className="text-sm text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{deniedUsers.length}</p>
                  <p className="text-sm text-muted-foreground">Denied</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="pending" className="gap-2" data-testid="tab-pending">
              <Clock className="h-4 w-4" />
              Pending ({pendingUsers.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2" data-testid="tab-approved">
              <CheckCircle className="h-4 w-4" />
              Approved ({approvedUsers.length})
            </TabsTrigger>
            <TabsTrigger value="denied" className="gap-2" data-testid="tab-denied">
              <XCircle className="h-4 w-4" />
              Denied ({deniedUsers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4 space-y-3">
            {pendingUsers.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No pending requests
                </CardContent>
              </Card>
            ) : (
              pendingUsers.map(user => <UserCard key={user.id} user={user} />)
            )}
          </TabsContent>

          <TabsContent value="approved" className="mt-4 space-y-3">
            {approvedUsers.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No approved users
                </CardContent>
              </Card>
            ) : (
              approvedUsers.map(user => <UserCard key={user.id} user={user} />)
            )}
          </TabsContent>

          <TabsContent value="denied" className="mt-4 space-y-3">
            {deniedUsers.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No denied users
                </CardContent>
              </Card>
            ) : (
              deniedUsers.map(user => <UserCard key={user.id} user={user} />)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
