import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Flag, ExternalLink, Trash2, ChevronRight, Copy, CheckCircle, Clock, AlertTriangle, HelpCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isFounderMode } from "@/lib/feature-mode";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";

type IssueStatus = "open" | "triaged" | "in_progress" | "resolved";

interface IssueReport {
  id: string;
  userId?: string;
  userEmail?: string;
  type: string;
  description: string;
  screenshotUrl?: string;
  context?: {
    route: string;
    timestamp: string;
    featureMode: string;
    userAgent?: string;
    recentActions?: string[];
    aiConversation?: Array<{ role: string; content: string }>;
  };
  status: IssueStatus;
  resolution?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const statusConfig: Record<IssueStatus, { label: string; color: string; icon: typeof Clock }> = {
  open: { label: "Open", color: "bg-red-100 text-red-700 border-red-200", icon: AlertTriangle },
  triaged: { label: "Triaged", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Loader2 },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle },
};

const typeIcons: Record<string, typeof Flag> = {
  bug: AlertTriangle,
  suggestion: HelpCircle,
  question: HelpCircle,
};

function IssueCard({ issue, onClick }: { issue: IssueReport; onClick: () => void }) {
  const StatusIcon = statusConfig[issue.status]?.icon || Clock;
  const TypeIcon = typeIcons[issue.type] || Flag;

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
      data-testid={`card-issue-${issue.id}`}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <TypeIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Badge variant="outline" className="text-xs capitalize">
              {issue.type}
            </Badge>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </div>
        <p className="text-sm line-clamp-2">{issue.description}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{issue.userEmail || "Anonymous"}</span>
          <span>{format(new Date(issue.createdAt), "MMM d, h:mm a")}</span>
        </div>
        {issue.context?.route && (
          <div className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded w-fit">
            {issue.context.route}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IssueColumn({ status, issues, onIssueClick }: { status: IssueStatus; issues: IssueReport[]; onIssueClick: (issue: IssueReport) => void }) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className="flex-1 min-w-[280px] max-w-[350px]">
      <div className={`rounded-lg border ${config.color} p-2 mb-3`}>
        <div className="flex items-center gap-2">
          <StatusIcon className="h-4 w-4" />
          <span className="font-medium text-sm">{config.label}</span>
          <Badge variant="secondary" className="ml-auto text-xs">
            {issues.length}
          </Badge>
        </div>
      </div>
      <div className="space-y-2">
        {issues.map(issue => (
          <IssueCard key={issue.id} issue={issue} onClick={() => onIssueClick(issue)} />
        ))}
        {issues.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No issues
          </div>
        )}
      </div>
    </div>
  );
}

export default function IssuesReviewPage() {
  const { user } = useAuth();
  const founderMode = isFounderMode(user?.email);
  const [selectedIssue, setSelectedIssue] = useState<IssueReport | null>(null);
  const [resolution, setResolution] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: issues = [], isLoading } = useQuery<IssueReport[]>({
    queryKey: ["/api/issues"],
  });

  const updateIssue = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; status?: IssueStatus; resolution?: string }) => {
      const response = await apiRequest("PATCH", `/api/issues/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/issues"] });
      toast({ title: "Issue updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });

  const deleteIssue = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/issues/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/issues"] });
      setSelectedIssue(null);
      toast({ title: "Issue deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    },
  });

  const handleStatusChange = (newStatus: IssueStatus) => {
    if (!selectedIssue) return;
    const data: { id: string; status: IssueStatus; resolution?: string; resolvedAt?: string } = {
      id: selectedIssue.id,
      status: newStatus,
    };
    if (newStatus === "resolved" && resolution) {
      data.resolution = resolution;
      data.resolvedAt = new Date().toISOString();
    }
    updateIssue.mutate(data);
    setSelectedIssue({ ...selectedIssue, status: newStatus });
  };

  const copyForAgent = () => {
    if (!selectedIssue) return;
    const text = `## Issue Report

**Type:** ${selectedIssue.type}
**Status:** ${selectedIssue.status}
**Reporter:** ${selectedIssue.userEmail || "Anonymous"}
**Date:** ${format(new Date(selectedIssue.createdAt), "PPpp")}
**Route:** ${selectedIssue.context?.route || "N/A"}
**Feature Mode:** ${selectedIssue.context?.featureMode || "N/A"}

### Description
${selectedIssue.description}

### Context
\`\`\`json
${JSON.stringify(selectedIssue.context, null, 2)}
\`\`\`

${selectedIssue.screenshotUrl ? `### Screenshot\n[Screenshot attached as base64 data]` : ""}
`;
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard", description: "Issue details copied for Replit Agent" });
  };

  if (!founderMode) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <Flag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Restricted</h1>
        <p className="text-muted-foreground">
          This page is only available to the founder.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const issuesByStatus: Record<IssueStatus, IssueReport[]> = {
    open: issues.filter(i => i.status === "open"),
    triaged: issues.filter(i => i.status === "triaged"),
    in_progress: issues.filter(i => i.status === "in_progress"),
    resolved: issues.filter(i => i.status === "resolved"),
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flag className="h-6 w-6 text-orange-500" />
            Issue Tracker
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review and manage flagged issues from beta testers
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {issues.length} total issues
        </Badge>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        <IssueColumn status="open" issues={issuesByStatus.open} onIssueClick={setSelectedIssue} />
        <IssueColumn status="triaged" issues={issuesByStatus.triaged} onIssueClick={setSelectedIssue} />
        <IssueColumn status="in_progress" issues={issuesByStatus.in_progress} onIssueClick={setSelectedIssue} />
        <IssueColumn status="resolved" issues={issuesByStatus.resolved} onIssueClick={setSelectedIssue} />
      </div>

      <Dialog open={!!selectedIssue} onOpenChange={(open) => !open && setSelectedIssue(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-orange-500" />
              Issue Details
            </DialogTitle>
          </DialogHeader>

          {selectedIssue && (
            <div className="space-y-4 mt-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="capitalize">{selectedIssue.type}</Badge>
                <Badge className={statusConfig[selectedIssue.status]?.color}>
                  {statusConfig[selectedIssue.status]?.label}
                </Badge>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Reporter</Label>
                <p className="text-sm">{selectedIssue.userEmail || "Anonymous"}</p>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <p className="text-sm bg-muted p-3 rounded-md">{selectedIssue.description}</p>
              </div>

              {selectedIssue.context && (
                <div>
                  <Label className="text-xs text-muted-foreground">Context</Label>
                  <div className="text-xs space-y-1 bg-muted p-3 rounded-md font-mono">
                    <div>Route: {selectedIssue.context.route}</div>
                    <div>Mode: {selectedIssue.context.featureMode}</div>
                    <div>Time: {format(new Date(selectedIssue.context.timestamp), "PPpp")}</div>
                    {selectedIssue.context.recentActions?.length ? (
                      <div>
                        <span>Recent Actions:</span>
                        <ul className="ml-4 list-disc">
                          {selectedIssue.context.recentActions.map((action, i) => (
                            <li key={i}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {selectedIssue.screenshotUrl && (
                <div>
                  <Label className="text-xs text-muted-foreground">Screenshot</Label>
                  <img
                    src={selectedIssue.screenshotUrl}
                    alt="Issue screenshot"
                    className="rounded border max-h-64 w-full object-contain bg-muted mt-1"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Update Status</Label>
                <div className="flex flex-wrap gap-2">
                  {(["open", "triaged", "in_progress", "resolved"] as IssueStatus[]).map(status => (
                    <Button
                      key={status}
                      variant={selectedIssue.status === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleStatusChange(status)}
                      disabled={updateIssue.isPending}
                    >
                      {statusConfig[status].label}
                    </Button>
                  ))}
                </div>
              </div>

              {selectedIssue.status === "resolved" || resolution ? (
                <div>
                  <Label>Resolution Notes</Label>
                  <Textarea
                    value={resolution || selectedIssue.resolution || ""}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="How was this resolved?"
                    rows={2}
                  />
                </div>
              ) : null}

              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" onClick={copyForAgent} className="gap-2">
                  <Copy className="h-4 w-4" />
                  Copy for Agent
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteIssue.mutate(selectedIssue.id)}
                  disabled={deleteIssue.isPending}
                  className="gap-2 ml-auto"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
