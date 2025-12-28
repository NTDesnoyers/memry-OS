import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Settings, 
  Plug, 
  Palette, 
  Workflow, 
  ExternalLink, 
  Trash2, 
  RotateCcw, 
  Loader2,
  Clock,
  Phone,
  Video,
  Mail,
  MessageCircle,
  Mic,
  Upload,
  FileText,
  Search,
  Check,
  X,
  Eye,
  Sparkles,
  Target,
  ArrowRight,
  Instagram,
  Facebook,
  Unlink,
  Link2
} from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import type { Interaction, Person, HandwrittenNoteUpload } from "@shared/schema";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";
import { getInitials } from "@/lib/utils";
import { useState, useRef } from "react";

const interactionTypes = [
  { value: "call", label: "Call", icon: Phone, color: "bg-green-50 text-green-700 border-green-200" },
  { value: "meeting", label: "Meeting", icon: Video, color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "text", label: "Text", icon: MessageCircle, color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "email", label: "Email", icon: Mail, color: "bg-orange-50 text-orange-700 border-orange-200" },
];

const settingsLinks = [
  {
    title: "Guiding Principles",
    description: "Your MTP, mission, values, and decision framework",
    href: "/intake",
    icon: Target,
  },
  {
    title: "Voice Profile",
    description: "Your communication style patterns learned from conversations",
    href: "/voice-profile",
    icon: Mic,
  },
  {
    title: "Brand Center",
    description: "Manage your headshot, logos, colors, and branding assets",
    href: "/brand-center",
    icon: Palette,
  },
  {
    title: "Integrations",
    description: "Connect Fathom, Granola, Todoist, and other services",
    href: "/integrations",
    icon: Plug,
  },
  {
    title: "Automation",
    description: "Configure automated workflows and triggers",
    href: "/automation",
    icon: Workflow,
  },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [personSearch, setPersonSearch] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  const { data: deletedInteractions = [], isLoading: isLoadingDeleted } = useQuery<Interaction[]>({
    queryKey: ["/api/interactions/deleted"],
  });

  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  const { data: noteUploads = [], isLoading: isLoadingNotes } = useQuery<HandwrittenNoteUpload[]>({
    queryKey: ["/api/handwritten-notes"],
  });

  type ProfileData = {
    intakeStep: number;
    intakeCompletedAt?: string | null;
    mtp: string | null;
    missionStatement: string | null;
    coreValues: string[];
  };

  const { data: profile } = useQuery<ProfileData>({
    queryKey: ["/api/profile"],
  });
  
  const profileComplete = profile?.intakeCompletedAt != null;

  type MetaStatus = {
    connected: boolean;
    accountName?: string;
    instagramUsername?: string;
    expiresAt?: string;
  };

  const { data: metaStatus, isLoading: isLoadingMeta } = useQuery<MetaStatus>({
    queryKey: ["/api/meta/status"],
  });

  const connectMeta = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/meta/oauth-url");
      if (!res.ok) throw new Error("Failed to get OAuth URL");
      const data = await res.json();
      window.location.href = data.url;
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const disconnectMeta = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/meta/disconnect", { method: "POST" });
      if (!res.ok) throw new Error("Failed to disconnect");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meta/status"] });
      toast({ title: "Disconnected", description: "Meta account has been disconnected." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const uploadNote = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/handwritten-notes/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/handwritten-notes"] });
      toast({ title: "Uploaded", description: "Image uploaded. Running OCR..." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const runOCR = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/handwritten-notes/${id}/ocr`, { method: "POST" });
      if (!res.ok) throw new Error("OCR failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/handwritten-notes"] });
      toast({ title: "OCR Complete", description: "Text extracted from image." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const tagPerson = useMutation({
    mutationFn: async ({ id, personId }: { id: string; personId: string }) => {
      const res = await fetch(`/api/handwritten-notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId, status: "complete" }),
      });
      if (!res.ok) throw new Error("Failed to tag");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/handwritten-notes"] });
      toast({ title: "Tagged", description: "Person linked to note." });
    },
  });

  const addToVoiceProfile = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/handwritten-notes/${id}/add-to-voice-profile`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to add");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/handwritten-notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/voice-profile"] });
      toast({ title: "Added", description: "Note added to your voice profile." });
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/handwritten-notes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/handwritten-notes"] });
      toast({ title: "Deleted" });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const result = await uploadNote.mutateAsync(file);
    // Automatically run OCR after upload
    if (result?.id) {
      runOCR.mutate(result.id);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const filteredPeople = people.filter(p => 
    p.name.toLowerCase().includes(personSearch.toLowerCase())
  );

  const restoreInteraction = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/interactions/${id}/restore`, {
        method: "POST",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to restore");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interactions/deleted"] });
      queryClient.invalidateQueries({ queryKey: ["/api/interactions"] });
      toast({
        title: "Restored",
        description: "Conversation has been restored.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const permanentlyDeleteInteraction = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/interactions/${id}/permanent`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interactions/deleted"] });
      toast({
        title: "Permanently Deleted",
        description: "Conversation has been permanently removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getPersonById = (id: string | null) => {
    if (!id) return null;
    return people.find(p => p.id === id) || null;
  };

  const getTypeConfig = (type: string) => {
    return interactionTypes.find(t => t.value === type) || interactionTypes[0];
  };

  const getDaysRemaining = (deletedAt: Date | null) => {
    if (!deletedAt) return 30;
    const days = 30 - differenceInDays(new Date(), new Date(deletedAt));
    return Math.max(0, days);
  };

  return (
    <Layout>
      <div 
        className="min-h-screen p-6 md:p-8"
        style={{ backgroundImage: `url(${paperBg})`, backgroundSize: 'cover', backgroundAttachment: 'fixed' }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Settings className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-serif font-bold">Settings</h1>
            </div>
            <p className="text-muted-foreground">
              Configure your Flow OS preferences and integrations.
            </p>
          </div>

          {/* Profile Summary Card */}
          <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10" data-testid="card-profile-summary">
            <CardContent className="p-5">
              {profileComplete ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      <h3 className="font-medium">Your Guiding Principles</h3>
                    </div>
                    <Link href="/intake">
                      <Button variant="ghost" size="sm" className="text-xs" data-testid="button-edit-profile">
                        Edit
                      </Button>
                    </Link>
                  </div>
                  {profile?.mtp && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">MTP</p>
                      <p className="text-sm" data-testid="text-mtp-preview">{profile.mtp}</p>
                    </div>
                  )}
                  {profile?.coreValues && profile.coreValues.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {profile.coreValues.slice(0, 5).map((value, i) => (
                        <Badge key={i} variant="secondary" className="text-xs" data-testid={`badge-value-${i}`}>
                          {value}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Complete Your Profile</h3>
                      <p className="text-sm text-muted-foreground">
                        Help your AI Chief of Staff understand your mission and values
                      </p>
                    </div>
                  </div>
                  <Link href="/intake">
                    <Button size="sm" className="gap-1" data-testid="button-complete-profile">
                      Get Started <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Social Media Connection Card */}
          <Card className="mb-6" data-testid="card-social-connections">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Instagram className="h-5 w-5 text-pink-600" />
                <CardTitle className="text-lg">Social Media Posting</CardTitle>
              </div>
              <CardDescription>
                Connect your Instagram/Facebook to let the AI post on your behalf
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingMeta ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Checking connection...</span>
                </div>
              ) : metaStatus?.connected ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-600 via-pink-600 to-orange-400 flex items-center justify-center">
                        <Instagram className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-green-800">Connected</p>
                        <p className="text-sm text-green-600">
                          {metaStatus.instagramUsername ? `@${metaStatus.instagramUsername}` : metaStatus.accountName}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => disconnectMeta.mutate()}
                      disabled={disconnectMeta.isPending}
                      data-testid="button-disconnect-meta"
                    >
                      {disconnectMeta.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Unlink className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The AI can now post to your Instagram and Facebook Page. Just ask it to post something!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Connect your Instagram Business/Creator account to enable AI-powered social posting.
                  </p>
                  <Button 
                    onClick={() => connectMeta.mutate()}
                    disabled={connectMeta.isPending}
                    className="gap-2"
                    data-testid="button-connect-meta"
                  >
                    {connectMeta.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                    Connect Instagram & Facebook
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Requires: Instagram Business/Creator account linked to a Facebook Page
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            {settingsLinks.map((item) => (
              <Link key={item.href} href={item.href}>
                <Card className="cursor-pointer hover:shadow-md transition-shadow" data-testid={`card-settings-${item.href.slice(1)}`}>
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <Card className="mt-8">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Upload Historical Data</CardTitle>
              </div>
              <CardDescription>
                Upload old handwritten notes to train your voice profile. Photos will be processed with OCR.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center mb-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  data-testid="input-note-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadNote.isPending || runOCR.isPending}
                  className="gap-2"
                  data-testid="button-upload-note"
                >
                  {uploadNote.isPending || runOCR.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {uploadNote.isPending ? "Uploading..." : "Processing OCR..."}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" /> Upload Handwritten Note Photo
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  JPG, PNG, or HEIC photos of handwritten notes
                </p>
              </div>

              {isLoadingNotes ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : noteUploads.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No notes uploaded yet. Upload photos of your handwritten notes to train your voice.
                </p>
              ) : (
                <div className="space-y-3">
                  {noteUploads.map((note) => {
                    const taggedPerson = note.personId ? people.find(p => p.id === note.personId) : null;
                    
                    return (
                      <div key={note.id} className="border rounded-lg p-3" data-testid={`note-upload-${note.id}`}>
                        <div className="flex items-start gap-3">
                          <div className="w-16 h-16 bg-muted rounded overflow-hidden shrink-0">
                            <img 
                              src={note.imageUrl} 
                              alt="Note" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge 
                                variant="outline" 
                                className={
                                  note.status === "complete" 
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : note.status === "pending_tag"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-gray-50 text-gray-700 border-gray-200"
                                }
                              >
                                {note.status === "complete" ? "Complete" : 
                                 note.status === "pending_tag" ? "Needs Tagging" : "Processing"}
                              </Badge>
                              {note.recipientName && (
                                <span className="text-sm">To: {note.recipientName}</span>
                              )}
                            </div>
                            
                            {note.ocrText && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {note.ocrText}
                              </p>
                            )}
                            
                            {taggedPerson && (
                              <div className="flex items-center gap-1 mb-2">
                                <Avatar className="h-5 w-5">
                                  <AvatarFallback className="text-xs">{getInitials(taggedPerson.name)}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium">{taggedPerson.name}</span>
                              </div>
                            )}
                            
                            <div className="flex flex-wrap gap-2">
                              {note.status === "pending_ocr" && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => runOCR.mutate(note.id)}
                                  disabled={runOCR.isPending}
                                >
                                  <Eye className="h-3 w-3 mr-1" /> Run OCR
                                </Button>
                              )}
                              
                              {note.status === "pending_tag" && note.ocrText && (
                                <Select onValueChange={(personId) => tagPerson.mutate({ id: note.id, personId })}>
                                  <SelectTrigger className="w-40 h-8 text-sm">
                                    <SelectValue placeholder="Tag person..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {people.slice(0, 20).map(p => (
                                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              
                              {note.ocrText && note.status !== "complete" && (
                                <Button 
                                  size="sm" 
                                  onClick={() => addToVoiceProfile.mutate(note.id)}
                                  disabled={addToVoiceProfile.isPending}
                                >
                                  <Sparkles className="h-3 w-3 mr-1" /> Add to Voice
                                </Button>
                              )}
                              
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-red-500"
                                onClick={() => deleteNote.mutate(note.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-8">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Recently Deleted</CardTitle>
              </div>
              <CardDescription>
                Deleted conversations are kept for 30 days before being permanently removed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDeleted ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : deletedInteractions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Trash2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No deleted conversations</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deletedInteractions.map(interaction => {
                    const person = getPersonById(interaction.personId);
                    const typeConfig = getTypeConfig(interaction.type);
                    const TypeIcon = typeConfig.icon;
                    const daysRemaining = getDaysRemaining(interaction.deletedAt);

                    return (
                      <div 
                        key={interaction.id}
                        className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                        data-testid={`deleted-interaction-${interaction.id}`}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-muted text-muted-foreground">
                            {person ? getInitials(person.name) : '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-medium text-sm">
                              {person?.name || 'Unknown Contact'}
                            </span>
                            <Badge variant="outline" className={`${typeConfig.color} text-xs`}>
                              <TypeIcon className="h-3 w-3 mr-1" />
                              {typeConfig.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{format(new Date(interaction.occurredAt), "MMM d, yyyy")}</span>
                            <span>·</span>
                            <span className={daysRemaining <= 7 ? "text-destructive font-medium" : ""}>
                              {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
                            </span>
                          </div>
                          {interaction.summary && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {interaction.summary}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => restoreInteraction.mutate(interaction.id)}
                            disabled={restoreInteraction.isPending}
                            className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10"
                            data-testid={`button-restore-${interaction.id}`}
                          >
                            {restoreInteraction.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                            <span className="ml-1 hidden sm:inline">Restore</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => permanentlyDeleteInteraction.mutate(interaction.id)}
                            disabled={permanentlyDeleteInteraction.isPending}
                            className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            data-testid={`button-permanent-delete-${interaction.id}`}
                          >
                            {permanentlyDeleteInteraction.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            <span className="ml-1 hidden sm:inline">Delete</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
