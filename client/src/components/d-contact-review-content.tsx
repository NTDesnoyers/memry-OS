import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Clock, TrendingDown, CheckCircle, Trash2, ArrowUpRight, UserX, RefreshCw, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Person, EightByEightCampaign } from "@shared/schema";

interface DContactReviewResult {
  person: Person;
  reason: 'stale' | 'low_engagement' | 'campaign_completed';
  monthsInSegment: number;
  contactAttempts: number;
  contactResponses: number;
  activeCampaign?: EightByEightCampaign;
}

export default function DContactReviewContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>("");
  const [promoteSegment, setPromoteSegment] = useState<string>("A");

  const { data: reviewContacts = [], isLoading } = useQuery<DContactReviewResult[]>({
    queryKey: ["/api/d-contacts/review"],
  });

  const generateReviewTask = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/d-contacts/generate-review-task", { method: "POST" });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Review Task Created", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const batchAction = useMutation({
    mutationFn: async ({ personIds, action, newSegment }: { personIds: string[]; action: string; newSegment?: string }) => {
      const res = await fetch("/api/d-contacts/batch-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personIds, action, newSegment }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Action Complete", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/d-contacts/review"] });
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      setSelectedIds(new Set());
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
    if (selectedIds.size === reviewContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(reviewContacts.map(c => c.person.id)));
    }
  };

  const handleBatchAction = () => {
    if (selectedIds.size === 0) return;
    
    const personIds = Array.from(selectedIds);
    if (bulkAction === "delete") {
      batchAction.mutate({ personIds, action: "delete" });
    } else if (bulkAction === "promote") {
      batchAction.mutate({ personIds, action: "promote", newSegment: promoteSegment });
    } else if (bulkAction === "keep") {
      batchAction.mutate({ personIds, action: "keep" });
    }
  };

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case 'stale':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="w-3 h-3 mr-1" />Ready to reconnect (6+ mo)</Badge>;
      case 'low_engagement':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200"><TrendingDown className="w-3 h-3 mr-1" />Could use attention</Badge>;
      case 'campaign_completed':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><CheckCircle className="w-3 h-3 mr-1" />8x8 Complete</Badge>;
      default:
        return <Badge variant="outline">{reason}</Badge>;
    }
  };

  const staleCt = reviewContacts.filter(c => c.reason === 'stale').length;
  const lowEngagementCt = reviewContacts.filter(c => c.reason === 'low_engagement').length;
  const campaignCompletedCt = reviewContacts.filter(c => c.reason === 'campaign_completed').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <UserX className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <div className="text-2xl font-bold" data-testid="text-total-count">{reviewContacts.length}</div>
                <div className="text-sm text-muted-foreground">Need Review</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold" data-testid="text-stale-count">{staleCt}</div>
                <div className="text-sm text-muted-foreground">Ready to reconnect</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold" data-testid="text-low-engagement-count">{lowEngagementCt}</div>
                <div className="text-sm text-muted-foreground">Could use attention</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold" data-testid="text-campaign-count">{campaignCompletedCt}</div>
                <div className="text-sm text-muted-foreground">8x8 Complete</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              D Contacts Requiring Decision
            </CardTitle>
            <Button
              onClick={() => generateReviewTask.mutate()}
              disabled={generateReviewTask.isPending || reviewContacts.length === 0}
              variant="outline"
              data-testid="button-generate-task"
            >
              {generateReviewTask.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Create Review Task
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
              <Select value={bulkAction} onValueChange={setBulkAction}>
                <SelectTrigger className="w-40" data-testid="select-bulk-action">
                  <SelectValue placeholder="Action..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="promote">Promote</SelectItem>
                  <SelectItem value="keep">Keep in D</SelectItem>
                </SelectContent>
              </Select>
              {bulkAction === "promote" && (
                <Select value={promoteSegment} onValueChange={setPromoteSegment}>
                  <SelectTrigger className="w-32" data-testid="select-promote-segment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A - Advocate</SelectItem>
                    <SelectItem value="B">B - Strong</SelectItem>
                    <SelectItem value="C">C - Network</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Button
                onClick={handleBatchAction}
                disabled={!bulkAction || batchAction.isPending}
                size="sm"
                data-testid="button-apply-action"
              >
                {batchAction.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : reviewContacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p className="font-medium">No D contacts need review</p>
              <p className="text-sm">All your D contacts are in good standing</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedIds.size === reviewContacts.length && reviewContacts.length > 0}
                      onCheckedChange={toggleSelectAll}
                      data-testid="checkbox-select-all"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Time in D</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewContacts.map((contact) => (
                  <TableRow key={contact.person.id} data-testid={`row-contact-${contact.person.id}`}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(contact.person.id)}
                        onCheckedChange={() => toggleSelect(contact.person.id)}
                        data-testid={`checkbox-${contact.person.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Link href={`/people/${contact.person.id}`} className="font-medium text-primary hover:underline">
                        {contact.person.name}
                      </Link>
                      {contact.person.email && (
                        <div className="text-sm text-muted-foreground">{contact.person.email}</div>
                      )}
                    </TableCell>
                    <TableCell>{getReasonBadge(contact.reason)}</TableCell>
                    <TableCell>{contact.monthsInSegment} months</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="text-muted-foreground">{contact.contactAttempts} attempts</span>
                        {contact.contactResponses > 0 && (
                          <span className="text-green-600 ml-2">{contact.contactResponses} responses</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => batchAction.mutate({ personIds: [contact.person.id], action: "promote", newSegment: "A" })}
                          title="Promote to A"
                          data-testid={`button-promote-${contact.person.id}`}
                        >
                          <ArrowUpRight className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => batchAction.mutate({ personIds: [contact.person.id], action: "keep" })}
                          title="Keep in D"
                          data-testid={`button-keep-${contact.person.id}`}
                        >
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => batchAction.mutate({ personIds: [contact.person.id], action: "delete" })}
                          title="Delete"
                          data-testid={`button-delete-${contact.person.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
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
  );
}
