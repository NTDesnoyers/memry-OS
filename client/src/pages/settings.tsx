import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
  Mic
} from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import type { Interaction, Person } from "@shared/schema";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";
import { getInitials } from "@/lib/utils";

const interactionTypes = [
  { value: "call", label: "Call", icon: Phone, color: "bg-green-50 text-green-700 border-green-200" },
  { value: "meeting", label: "Meeting", icon: Video, color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "text", label: "Text", icon: MessageCircle, color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "email", label: "Email", icon: Mail, color: "bg-orange-50 text-orange-700 border-orange-200" },
];

const settingsLinks = [
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

  const { data: deletedInteractions = [], isLoading: isLoadingDeleted } = useQuery<Interaction[]>({
    queryKey: ["/api/interactions/deleted"],
  });

  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

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
              Configure your Ninja OS preferences and integrations.
            </p>
          </div>

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
              <CardTitle className="text-lg">Zapier Webhook</CardTitle>
              <CardDescription>
                Use this endpoint to send data from Granola or other services via Zapier.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-3 font-mono text-sm break-all">
                POST {typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/conversation
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Send JSON with: type, title, summary, transcript, occurredAt, externalLink, externalId, source
              </p>
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
