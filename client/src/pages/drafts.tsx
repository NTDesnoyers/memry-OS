import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Mail, 
  FileText, 
  CheckSquare,
  Check,
  Loader2,
  Copy,
  Trash2,
  Edit2,
  Send,
  Sparkles,
  Clock,
  User,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import type { Person } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

type GeneratedDraft = {
  id: string;
  personId: string | null;
  interactionId: string | null;
  type: "email" | "handwritten_note" | "task";
  content: string;
  subject: string | null;
  status: string;
  metadata: any;
  createdAt: string;
  updatedAt: string;
};

const draftTypes = [
  { value: "all", label: "All Drafts", icon: Sparkles },
  { value: "email", label: "Emails", icon: Mail },
  { value: "handwritten_note", label: "Handwritten Notes", icon: FileText },
  { value: "task", label: "Tasks", icon: CheckSquare },
];

function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function DraftCard({ 
  draft, 
  person, 
  onMarkSent, 
  onEdit, 
  onDelete, 
  onCopy,
  onSendEmail,
  gmailConnected
}: { 
  draft: GeneratedDraft; 
  person?: Person;
  onMarkSent: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onSendEmail?: () => void;
  gmailConnected?: boolean;
}) {
  const typeConfig = {
    email: { icon: Mail, label: "Thank-you Email", color: "bg-blue-50 text-blue-700 border-blue-200" },
    handwritten_note: { icon: FileText, label: "Handwritten Note", color: "bg-amber-50 text-amber-700 border-amber-200" },
    task: { icon: CheckSquare, label: "Follow-up Task", color: "bg-green-50 text-green-700 border-green-200" },
  };

  const config = typeConfig[draft.type] || typeConfig.email;
  const Icon = config.icon;

  return (
    <Card className="hover:shadow-md transition-shadow" data-testid={`draft-card-${draft.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${config.color.split(' ')[0]}`}>
            <Icon className={`h-5 w-5 ${config.color.split(' ')[1]}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className={config.color}>
                {config.label}
              </Badge>
              {draft.status === "sent" || draft.status === "used" ? (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <Check className="h-3 w-3 mr-1" />
                  {draft.status === "sent" ? "Sent" : "Used"}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-gray-500">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              )}
            </div>
            
            {person && (
              <Link href={`/people/${person.id}`}>
                <div className="flex items-center gap-2 mb-2 hover:underline cursor-pointer">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-slate-100">
                      {getInitials(person.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-sm">{person.name}</span>
                </div>
              </Link>
            )}

            {draft.subject && (
              <p className="font-medium text-sm mb-1">{draft.subject}</p>
            )}
            
            <p className="text-sm text-gray-600 line-clamp-3 whitespace-pre-wrap">
              {draft.content}
            </p>
            
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(draft.createdAt), { addSuffix: true })}
              </span>
              
              <div className="flex items-center gap-1">
                {draft.type === "email" && draft.status === "pending" && gmailConnected && person?.email && (
                  <Button 
                    size="sm" 
                    variant="default"
                    onClick={onSendEmail}
                    className="h-8 px-3 bg-blue-600 hover:bg-blue-700"
                    data-testid={`send-email-${draft.id}`}
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    Send
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={onCopy}
                  className="h-8 px-2"
                  data-testid={`copy-draft-${draft.id}`}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={onEdit}
                  className="h-8 px-2"
                  data-testid={`edit-draft-${draft.id}`}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                {draft.status === "pending" && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={onMarkSent}
                    className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                    data-testid={`mark-sent-${draft.id}`}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={onDelete}
                  className="h-8 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                  data-testid={`delete-draft-${draft.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Drafts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<GeneratedDraft | null>(null);
  const [editContent, setEditContent] = useState("");

  const { data: drafts = [], isLoading } = useQuery<GeneratedDraft[]>({
    queryKey: ["/api/generated-drafts"],
  });

  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  const updateDraft = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; status?: string; content?: string }) => {
      return apiRequest("PATCH", `/api/generated-drafts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generated-drafts"] });
      setShowEditDialog(false);
      toast({ title: "Draft updated" });
    },
  });

  const deleteDraft = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/generated-drafts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generated-drafts"] });
      toast({ title: "Draft deleted" });
    },
  });

  const processAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/interactions/process-all");
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/generated-drafts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/interactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      toast({ 
        title: "Processing Complete", 
        description: `Processed ${data.processed} conversations, created new drafts.` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Processing Failed", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const getPerson = (personId: string | null) => {
    if (!personId) return undefined;
    return people.find(p => p.id === personId);
  };

  const filteredDrafts = drafts.filter(draft => {
    if (activeTab === "all") return true;
    return draft.type === activeTab;
  });

  const pendingDrafts = filteredDrafts.filter(d => d.status === "pending");
  const completedDrafts = filteredDrafts.filter(d => d.status !== "pending");

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
    toast({ title: "Copied to clipboard" });
  };

  const handleEdit = (draft: GeneratedDraft) => {
    setSelectedDraft(draft);
    setEditContent(draft.content);
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (selectedDraft) {
      updateDraft.mutate({ id: selectedDraft.id, content: editContent });
    }
  };

  const handleMarkSent = (draft: GeneratedDraft) => {
    const newStatus = draft.type === "task" ? "used" : "sent";
    updateDraft.mutate({ id: draft.id, status: newStatus });
  };

  const stats = {
    total: drafts.length,
    pending: drafts.filter(d => d.status === "pending").length,
    emails: drafts.filter(d => d.type === "email").length,
    notes: drafts.filter(d => d.type === "handwritten_note").length,
    tasks: drafts.filter(d => d.type === "task").length,
  };

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-amber-500" />
              AI-Generated Drafts
            </h1>
            <p className="text-gray-500 mt-1">
              Review and send follow-up emails, handwritten notes, and tasks generated from your conversations
            </p>
          </div>
          <Button 
            onClick={() => processAllMutation.mutate()}
            disabled={processAllMutation.isPending}
            data-testid="process-all-btn"
          >
            {processAllMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Process New Conversations
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-gray-500">Total Drafts</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
              <div className="text-sm text-gray-500">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.emails}</div>
              <div className="text-sm text-gray-500">Emails</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">{stats.notes}</div>
              <div className="text-sm text-gray-500">Notes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.tasks}</div>
              <div className="text-sm text-gray-500">Tasks</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            {draftTypes.map(type => (
              <TabsTrigger key={type.value} value={type.value} className="flex items-center gap-2">
                <type.icon className="h-4 w-4" />
                {type.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab}>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredDrafts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Sparkles className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-600">No drafts yet</h3>
                  <p className="text-gray-400 mt-1">
                    Import conversations from Fathom and process them to generate follow-up drafts
                  </p>
                  <Button 
                    className="mt-4" 
                    variant="outline"
                    onClick={() => processAllMutation.mutate()}
                    disabled={processAllMutation.isPending}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Process Conversations
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {pendingDrafts.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Pending ({pendingDrafts.length})
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {pendingDrafts.map(draft => (
                        <DraftCard
                          key={draft.id}
                          draft={draft}
                          person={getPerson(draft.personId)}
                          onMarkSent={() => handleMarkSent(draft)}
                          onEdit={() => handleEdit(draft)}
                          onDelete={() => deleteDraft.mutate(draft.id)}
                          onCopy={() => handleCopy(draft.content)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {completedDrafts.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      Completed ({completedDrafts.length})
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {completedDrafts.map(draft => (
                        <DraftCard
                          key={draft.id}
                          draft={draft}
                          person={getPerson(draft.personId)}
                          onMarkSent={() => handleMarkSent(draft)}
                          onEdit={() => handleEdit(draft)}
                          onDelete={() => deleteDraft.mutate(draft.id)}
                          onCopy={() => handleCopy(draft.content)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Draft</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={12}
                className="font-mono text-sm"
                data-testid="edit-draft-content"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveEdit}
                disabled={updateDraft.isPending}
                data-testid="save-edit-btn"
              >
                {updateDraft.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
