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
  ExternalLink,
  Upload,
  Search
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import type { Person, Task } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { getInitials } from "@/lib/utils";
import { Link } from "wouter";
import { isFounderMode } from "@/lib/feature-mode";
import { useAuth } from "@/hooks/use-auth";

type GeneratedDraft = {
  id: string;
  personId: string | null;
  interactionId: string | null;
  type: "email" | "handwritten_note" | "task";
  content: string;
  subject: string | null;
  status: string;
  metadata: any;
  businessCardIncluded: boolean | null;
  createdAt: string;
  updatedAt: string;
};

const draftTypes = [
  { value: "all", label: "All", icon: Sparkles },
  { value: "email", label: "Emails", icon: Mail },
  { value: "handwritten_note", label: "Notes", icon: FileText },
  { value: "task", label: "Tasks", icon: CheckSquare },
];

// Card component for actual tasks (from tasks table)
function ActualTaskCard({ 
  task, 
  person, 
  onComplete, 
  onDelete 
}: { 
  task: Task; 
  person?: Person;
  onComplete: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow" data-testid={`task-card-${task.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-green-50">
            <CheckSquare className="h-5 w-5 text-green-700" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Task
              </Badge>
              {task.completed ? (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <Check className="h-3 w-3 mr-1" />
                  Done
                </Badge>
              ) : (
                <Badge variant="outline" className="text-gray-500">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              )}
              {task.dueDate && (
                <Badge variant="outline" className="text-xs">
                  Due {format(new Date(task.dueDate), "MMM d")}
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

            <p className="font-medium text-sm mb-1">{task.title}</p>
            
            {task.description && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {task.description}
              </p>
            )}
            
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
              </span>
              
              <div className="flex items-center gap-1">
                {!task.completed && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={onComplete}
                    className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                    data-testid={`complete-task-${task.id}`}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={onDelete}
                  className="h-8 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                  data-testid={`delete-task-${task.id}`}
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

function DraftCard({ 
  draft, 
  person, 
  onMarkSent, 
  onEdit, 
  onDelete, 
  onCopy,
  onSendEmail,
  gmailConnected,
  onToggleBusinessCard
}: { 
  draft: GeneratedDraft; 
  person?: Person;
  onMarkSent: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onSendEmail?: () => void;
  gmailConnected?: boolean;
  onToggleBusinessCard?: (included: boolean) => void;
}) {
  const typeConfig = {
    email: { icon: Mail, label: "Email", color: "bg-blue-50 text-blue-700 border-blue-200" },
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
            
            {draft.type === "handwritten_note" && (
              <div className="flex items-center gap-2 mt-3 py-2 px-3 bg-amber-50 rounded-lg">
                <Checkbox
                  id={`business-card-${draft.id}`}
                  checked={draft.businessCardIncluded ?? false}
                  onCheckedChange={(checked) => onToggleBusinessCard?.(checked === true)}
                  data-testid={`checkbox-business-card-${draft.id}`}
                />
                <Label 
                  htmlFor={`business-card-${draft.id}`}
                  className="text-sm text-amber-800 cursor-pointer"
                >
                  Business card included
                </Label>
              </div>
            )}
            
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

type GmailStatus = { connected: boolean; email?: string };

export default function Drafts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"pending" | "completed">("pending");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<GeneratedDraft | null>(null);
  const [editContent, setEditContent] = useState("");
  
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadTranscript, setUploadTranscript] = useState("");
  const [uploadPersonId, setUploadPersonId] = useState<string | null>(null);
  const [personSearchOpen, setPersonSearchOpen] = useState(false);
  const [personSearchQuery, setPersonSearchQuery] = useState("");

  const { data: drafts = [], isLoading } = useQuery<GeneratedDraft[]>({
    queryKey: ["/api/generated-drafts"],
  });

  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  const { data: gmailStatus } = useQuery<GmailStatus>({
    queryKey: ["/api/gmail/status"],
  });

  // Also fetch actual tasks (from tasks table, created via AI)
  const { data: actualTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ to, subject, body, draftId }: { to: string; subject: string; body: string; draftId: string }) => {
      return apiRequest("POST", "/api/gmail/send", { to, subject, body, draftId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generated-drafts"] });
      toast({ title: "Email sent successfully!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to send email", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateDraft = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; status?: string; content?: string; businessCardIncluded?: boolean }) => {
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

  // Mutations for actual tasks
  const completeTask = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/tasks/${id}`, { completed: true, status: "completed" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task completed" });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task deleted" });
    },
  });

  const processAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/interactions/process-all");
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/generated-drafts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/interactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      const processed = data?.processed || 0;
      const skipped = data?.skipped || 0;
      toast({ 
        title: "Processing Complete", 
        description: processed > 0 
          ? `Processed ${processed} conversations, created new drafts.`
          : `No new conversations to process (${skipped} already done).`
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

  const uploadTranscriptMutation = useMutation({
    mutationFn: async (data: { title: string; transcript: string; personId: string | null }) => {
      const response = await apiRequest("POST", "/api/interactions/upload-transcript", data);
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/generated-drafts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/interactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      setShowUploadDialog(false);
      setUploadTitle("");
      setUploadTranscript("");
      setUploadPersonId(null);
      const draftsCreated = data?.draftsCreated || 0;
      toast({ 
        title: "Transcript Processed", 
        description: draftsCreated > 0 
          ? `Created ${draftsCreated} follow-up drafts.`
          : "Transcript saved. Link to a contact to generate drafts."
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Upload Failed", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const getPerson = (personId: string | null) => {
    if (!personId) return undefined;
    return people.find(p => p.id === personId);
  };

  // Filter pending/completed actual tasks
  const pendingActualTasks = actualTasks.filter(t => !t.completed && t.status === "pending");
  const completedActualTasks = actualTasks.filter(t => t.completed || t.status !== "pending");

  const filteredDrafts = drafts.filter(draft => {
    // Filter by type
    const typeMatch = activeTab === "all" || draft.type === activeTab;
    // Filter by status
    const statusMatch = statusFilter === "pending" 
      ? draft.status === "pending" 
      : draft.status !== "pending";
    return typeMatch && statusMatch;
  });

  // Get actual tasks for display based on filters
  const filteredActualTasks = (activeTab === "all" || activeTab === "task")
    ? (statusFilter === "pending" ? pendingActualTasks : completedActualTasks)
    : [];

  const pendingCount = drafts.filter(d => d.status === "pending").length + pendingActualTasks.length;
  const completedCount = drafts.filter(d => d.status !== "pending").length + completedActualTasks.length;

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

  const handleToggleBusinessCard = (draftId: string, included: boolean) => {
    updateDraft.mutate({ id: draftId, businessCardIncluded: included });
  };

  const handleSendEmail = (draft: GeneratedDraft) => {
    const person = getPerson(draft.personId);
    if (!person?.email) {
      toast({ 
        title: "No email address", 
        description: "This contact doesn't have an email address on file.",
        variant: "destructive" 
      });
      return;
    }
    sendEmailMutation.mutate({
      to: person.email,
      subject: draft.subject || "Following up on our conversation",
      body: draft.content,
      draftId: draft.id
    });
  };

  const stats = {
    total: drafts.length + actualTasks.length,
    pending: drafts.filter(d => d.status === "pending").length + pendingActualTasks.length,
    emails: drafts.filter(d => d.type === "email").length,
    notes: drafts.filter(d => d.type === "handwritten_note").length,
    tasks: drafts.filter(d => d.type === "task").length + actualTasks.length,
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-amber-500" />
              Actions
            </h1>
            <p className="text-gray-500 mt-1 text-sm md:text-base">
              Tasks, emails, and notes to review and send
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button 
              variant="outline"
              onClick={() => setShowUploadDialog(true)}
              data-testid="upload-transcript-btn"
              className="w-full sm:w-auto"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Transcript
            </Button>
            <Button 
              onClick={() => processAllMutation.mutate()}
              disabled={processAllMutation.isPending}
              data-testid="process-all-btn"
              className="w-full sm:w-auto"
            >
              {processAllMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Process Conversations
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-gray-500">Total Actions</div>
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

        {/* Status Filter Tabs - Pending / Completed */}
        <div className="flex items-center gap-2 mb-4">
          <Button 
            variant={statusFilter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("pending")}
            className="flex items-center gap-2"
            data-testid="pending-filter-btn"
          >
            <Clock className="h-4 w-4" />
            Pending
            <Badge variant="secondary" className="ml-1">{pendingCount}</Badge>
          </Button>
          <Button 
            variant={statusFilter === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("completed")}
            className="flex items-center gap-2"
            data-testid="completed-filter-btn"
          >
            <Check className="h-4 w-4" />
            Completed
            <Badge variant="secondary" className="ml-1">{completedCount}</Badge>
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            {draftTypes.map(type => (
              <TabsTrigger key={type.value} value={type.value} className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3">
                <type.icon className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">{type.label}</span>
                <span className="sm:hidden">{type.value === "all" ? "All" : type.value === "email" ? "Email" : type.value === "handwritten_note" ? "Notes" : "Tasks"}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab}>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (filteredDrafts.length === 0 && filteredActualTasks.length === 0) ? (
              <Card>
                <CardContent className="py-12 text-center">
                  {statusFilter === "completed" ? (
                    <>
                      <Check className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-lg font-medium text-gray-600">No completed actions</h3>
                      <p className="text-gray-400 mt-1">
                        Actions you've completed will appear here for your records
                      </p>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-lg font-medium text-gray-600">No pending actions</h3>
                      <p className="text-gray-400 mt-1">
                        Log conversations with the AI assistant to generate follow-up tasks and drafts
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
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {/* Render actual tasks first */}
                {filteredActualTasks.map(task => (
                  <ActualTaskCard
                    key={`task-${task.id}`}
                    task={task}
                    person={getPerson(task.personId)}
                    onComplete={() => completeTask.mutate(task.id)}
                    onDelete={() => deleteTask.mutate(task.id)}
                  />
                ))}
                {/* Then render drafts */}
                {filteredDrafts.map(draft => (
                  <DraftCard
                    key={draft.id}
                    draft={draft}
                    person={getPerson(draft.personId)}
                    onMarkSent={() => handleMarkSent(draft)}
                    onEdit={() => handleEdit(draft)}
                    onDelete={() => deleteDraft.mutate(draft.id)}
                    onCopy={() => handleCopy(draft.content)}
                    onSendEmail={() => handleSendEmail(draft)}
                    gmailConnected={isFounderMode(user?.email) && gmailStatus?.connected}
                    onToggleBusinessCard={(included) => handleToggleBusinessCard(draft.id, included)}
                  />
                ))}
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

        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Conversation Transcript</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="transcript-title">Meeting/Conversation Title</Label>
                <Input
                  id="transcript-title"
                  placeholder="e.g., Coffee with John Smith"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  data-testid="upload-title-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Link to Contact (optional)</Label>
                <Popover open={personSearchOpen} onOpenChange={setPersonSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                      data-testid="person-select-btn"
                    >
                      {uploadPersonId 
                        ? people.find(p => p.id === uploadPersonId)?.name || "Select contact..."
                        : "Select contact to generate drafts..."}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Search contacts..." 
                        value={personSearchQuery}
                        onValueChange={setPersonSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>No contact found.</CommandEmpty>
                        <CommandGroup>
                          {people
                            .filter(p => 
                              p.name.toLowerCase().includes(personSearchQuery.toLowerCase())
                            )
                            .slice(0, 10)
                            .map(person => (
                              <CommandItem
                                key={person.id}
                                value={person.name}
                                onSelect={() => {
                                  setUploadPersonId(person.id);
                                  setPersonSearchOpen(false);
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs">
                                      {getInitials(person.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{person.name}</span>
                                </div>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {uploadPersonId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUploadPersonId(null)}
                    className="text-xs text-gray-500"
                  >
                    Clear selection
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="transcript-content">Transcript</Label>
                <p className="text-sm text-gray-500">
                  Paste your meeting transcript from Granola, Otter, or any transcription service
                </p>
                <Textarea
                  id="transcript-content"
                  placeholder="Paste your meeting transcript here..."
                  value={uploadTranscript}
                  onChange={(e) => setUploadTranscript(e.target.value)}
                  rows={12}
                  className="font-mono text-sm"
                  data-testid="upload-transcript-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => uploadTranscriptMutation.mutate({
                  title: uploadTitle,
                  transcript: uploadTranscript,
                  personId: uploadPersonId
                })}
                disabled={uploadTranscriptMutation.isPending || !uploadTranscript.trim()}
                data-testid="submit-upload-btn"
              >
                {uploadTranscriptMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Upload & Process
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
