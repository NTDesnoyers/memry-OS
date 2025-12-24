import LayoutComponent from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, 
  UserCheck, 
  UserX, 
  Clock, 
  Mail, 
  RefreshCw, 
  Loader2,
  ChevronRight,
  Calendar,
  MessageSquare,
  Zap,
  Filter,
  TrendingUp
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Person, DormantOpportunity } from "@shared/schema";
import { formatDistanceToNow, format } from "date-fns";

interface EnrichedOpportunity extends DormantOpportunity {
  person: Person | null;
}

export default function RevivalOpportunities() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);

  const { data: opportunities = [], isLoading } = useQuery<EnrichedOpportunity[]>({
    queryKey: ["/api/dormant-opportunities/pending"],
  });

  const approveOpportunity = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dormant-opportunities/${id}/approve`, { method: "POST" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Opportunity Approved", description: "Ready for campaign generation" });
      queryClient.invalidateQueries({ queryKey: ["/api/dormant-opportunities/pending"] });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Approval Failed", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const generateCampaign = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dormant-opportunities/${id}/generate-campaign`, { method: "POST" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Campaign Created", 
        description: "Email draft has been generated. View it in Drafts." 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dormant-opportunities/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drafts"] });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Campaign Generation Failed", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const approveAndGenerate = useMutation({
    mutationFn: async (id: string) => {
      const approveRes = await fetch(`/api/dormant-opportunities/${id}/approve`, { method: "POST" });
      if (!approveRes.ok) {
        const error = await approveRes.json();
        throw new Error(`Approval failed: ${error.message}`);
      }
      const res = await fetch(`/api/dormant-opportunities/${id}/generate-campaign`, { method: "POST" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Campaign Created", 
        description: "Approved and email draft generated. View it in Drafts." 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dormant-opportunities/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drafts"] });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Campaign Generation Failed", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const dismissOpportunity = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const res = await fetch(`/api/dormant-opportunities/${id}/dismiss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Opportunity Dismissed", description: "This contact won't appear in future scans" });
      queryClient.invalidateQueries({ queryKey: ["/api/dormant-opportunities/pending"] });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Dismiss Failed", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const triggerScan = useMutation({
    mutationFn: async () => {
      setIsScanning(true);
      const res = await fetch("/api/dormant-opportunities/scan-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minDaysSinceContact: 180, maxResults: 50 }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: (data) => {
      setIsScanning(false);
      toast({ 
        title: "Scan Complete", 
        description: data.message 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dormant-opportunities/pending"] });
    },
    onError: (error: Error) => {
      setIsScanning(false);
      toast({ 
        title: "Scan Failed", 
        description: error.message || "Could not complete the scan",
        variant: "destructive"
      });
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === opportunities.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(opportunities.map(o => o.id)));
    }
  };

  const handleBulkApprove = async () => {
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(ids.map(id => approveOpportunity.mutateAsync(id)));
    } catch (error) {
    }
    setSelectedIds(new Set());
  };

  const handleBulkDismiss = async () => {
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(ids.map(id => dismissOpportunity.mutateAsync({ id })));
    } catch (error) {
    }
    setSelectedIds(new Set());
  };

  const getScoreBadge = (score: number | null) => {
    if (score === null) return null;
    if (score >= 80) {
      return <Badge variant="default" className="bg-red-500">Hot Lead</Badge>;
    } else if (score >= 60) {
      return <Badge variant="default" className="bg-orange-500">High Priority</Badge>;
    } else if (score >= 40) {
      return <Badge variant="default" className="bg-yellow-500">Medium</Badge>;
    } else {
      return <Badge variant="outline">Low</Badge>;
    }
  };

  const getSegmentBadge = (segment: string | null | undefined) => {
    if (!segment) return null;
    const colors: Record<string, string> = {
      A: "bg-green-100 text-green-800 border-green-200",
      B: "bg-blue-100 text-blue-800 border-blue-200", 
      C: "bg-amber-100 text-amber-800 border-amber-200",
      D: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return <Badge variant="outline" className={colors[segment] || ""}>{segment}</Badge>;
  };

  const totalOpportunities = opportunities.length;
  const highPriority = opportunities.filter(o => (o.dormancyScore || 0) >= 60).length;
  const avgScore = opportunities.length > 0 
    ? Math.round(opportunities.reduce((sum, o) => sum + (o.dormancyScore || 0), 0) / opportunities.length)
    : 0;

  return (
    <LayoutComponent>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="page-title">
              <Sparkles className="w-6 h-6 text-amber-500" />
              Revival Opportunities
            </h1>
            <p className="text-muted-foreground">
              Dormant contacts with potential for re-engagement
            </p>
          </div>
          <Button 
            onClick={() => triggerScan.mutate()}
            disabled={isScanning}
            data-testid="button-scan"
          >
            {isScanning ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Scan Contacts
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-total">{totalOpportunities}</p>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Zap className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-high-priority">{highPriority}</p>
                  <p className="text-sm text-muted-foreground">High Priority</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-avg-score">{avgScore}</p>
                  <p className="text-sm text-muted-foreground">Avg. Score</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-selected">{selectedIds.size}</p>
                  <p className="text-sm text-muted-foreground">Selected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {selectedIds.size > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="font-medium">{selectedIds.size} selected</span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={handleBulkApprove}
                    data-testid="button-bulk-approve"
                  >
                    <UserCheck className="w-4 h-4 mr-1" />
                    Approve All
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleBulkDismiss}
                    data-testid="button-bulk-dismiss"
                  >
                    <UserX className="w-4 h-4 mr-1" />
                    Dismiss All
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Review Queue</CardTitle>
            <CardDescription>
              Contacts who haven't been reached in 180+ days. Review and decide whether to revive or dismiss.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : opportunities.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No dormant opportunities found.</p>
                <p className="text-sm">Click "Scan Contacts" to find old leads to revive.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedIds.size === opportunities.length && opportunities.length > 0}
                        onCheckedChange={toggleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Days Dormant</TableHead>
                    <TableHead>Revival Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opportunities.map((opp) => (
                    <TableRow key={opp.id} data-testid={`row-opportunity-${opp.id}`}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedIds.has(opp.id)}
                          onCheckedChange={() => toggleSelect(opp.id)}
                          data-testid={`checkbox-${opp.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-medium">
                            {opp.person?.name?.charAt(0) || "?"}
                          </div>
                          <div>
                            <Link href={`/people/${opp.person?.id}`}>
                              <span className="font-medium hover:underline cursor-pointer" data-testid={`link-person-${opp.id}`}>
                                {opp.person?.name || "Unknown"}
                              </span>
                            </Link>
                            <p className="text-sm text-muted-foreground">{opp.person?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getSegmentBadge(opp.person?.segment)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={opp.dormancyScore || 0} 
                            className="w-16 h-2"
                          />
                          <span className="text-sm font-medium">{opp.dormancyScore}</span>
                        </div>
                        {getScoreBadge(opp.dormancyScore)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{opp.daysSinceContact} days</span>
                        </div>
                        {opp.lastEmailDate && (
                          <p className="text-xs text-muted-foreground">
                            Last: {format(new Date(opp.lastEmailDate), 'MMM d, yyyy')}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 max-w-xs">
                          <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate">{opp.revivalReason || "High potential for re-engagement"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => approveAndGenerate.mutate(opp.id)}
                            disabled={approveAndGenerate.isPending}
                            data-testid={`button-generate-${opp.id}`}
                            title="Approve & Generate Email"
                          >
                            <Mail className="w-4 h-4 mr-1" />
                            Revive
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => dismissOpportunity.mutate({ id: opp.id })}
                            disabled={dismissOpportunity.isPending}
                            data-testid={`button-dismiss-${opp.id}`}
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </LayoutComponent>
  );
}
