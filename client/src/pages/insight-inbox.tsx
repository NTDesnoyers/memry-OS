import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  BookOpen, 
  Plus, 
  ExternalLink, 
  Archive, 
  Check, 
  RefreshCw,
  Sparkles,
  Calendar,
  Tag,
  Clock
} from "lucide-react";
import type { SavedContent, DailyDigest } from "@shared/schema";

function formatDate(date: string | Date | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function ContentCard({ content, onMarkRead, onArchive }: { 
  content: SavedContent; 
  onMarkRead: () => void;
  onArchive: () => void;
}) {
  return (
    <Card className="mb-3" data-testid={`content-card-${content.id}`}>
      <CardContent className="pt-4">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm mb-1 truncate">
              {content.title || content.url}
            </h3>
            {content.summary && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {content.summary}
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              {content.siteName && (
                <span className="text-xs text-muted-foreground">{content.siteName}</span>
              )}
              {content.tags?.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(content.createdAt)}
              </span>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(content.url, "_blank")}
              data-testid={`open-content-${content.id}`}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
            {content.status === "unread" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMarkRead}
                data-testid={`mark-read-${content.id}`}
              >
                <Check className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onArchive}
              data-testid={`archive-content-${content.id}`}
            >
              <Archive className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {content.keyPoints && content.keyPoints.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs font-medium mb-1">Key Points:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {content.keyPoints.slice(0, 3).map((point, i) => (
                <li key={i}>• {point}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickCaptureDialog({ onSuccess }: { onSuccess: () => void }) {
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const captureMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await apiRequest("POST", "/api/content/capture", { url, source: "manual" });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Content saved", description: "Article will be processed shortly" });
      setUrl("");
      setOpen(false);
      onSuccess();
    },
    onError: (err: any) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    }
  });
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-quick-capture">
          <Plus className="w-4 h-4 mr-2" />
          Save URL
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Content</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <Input
            placeholder="Paste URL here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            data-testid="input-capture-url"
          />
          <Button
            onClick={() => captureMutation.mutate(url)}
            disabled={!url || captureMutation.isPending}
            className="w-full"
            data-testid="button-submit-capture"
          >
            {captureMutation.isPending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Save & Process
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function InsightInbox() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: allContent = [], isLoading } = useQuery<SavedContent[]>({
    queryKey: ["/api/content"],
  });
  
  const { data: todaysDigest } = useQuery<DailyDigest>({
    queryKey: ["/api/digests/today"],
    retry: false
  });
  
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/content/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
    }
  });
  
  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/content/${id}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      toast({ title: "Archived" });
    }
  });
  
  const generateDigestMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/digests/generate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/digests/today"] });
      toast({ title: "Digest generated" });
    }
  });
  
  const unreadContent = allContent.filter(c => c.status === "unread");
  const readContent = allContent.filter(c => c.status === "read");
  const archivedContent = allContent.filter(c => c.status === "archived");
  
  const filteredUnread = unreadContent.filter(c => 
    !searchTerm || 
    c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const filteredRead = readContent.filter(c => 
    !searchTerm || 
    c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="w-6 h-6" />
              Insight Inbox
            </h1>
            <p className="text-muted-foreground text-sm">
              Save articles, get AI summaries, and never lose a good idea
            </p>
          </div>
          <QuickCaptureDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/content"] })} />
        </div>
        
        {todaysDigest && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Today's Digest
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="prose prose-sm max-w-none text-sm"
                dangerouslySetInnerHTML={{ __html: todaysDigest.summaryHtml || "" }}
              />
            </CardContent>
          </Card>
        )}
        
        {!todaysDigest && unreadContent.length > 0 && (
          <Card className="mb-6">
            <CardContent className="py-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {unreadContent.length} articles ready for today's digest
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateDigestMutation.mutate()}
                disabled={generateDigestMutation.isPending}
                data-testid="button-generate-digest"
              >
                {generateDigestMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Generate Digest
              </Button>
            </CardContent>
          </Card>
        )}
        
        <div className="mb-4">
          <Input
            placeholder="Search by title or tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
            data-testid="input-search-content"
          />
        </div>
        
        <Tabs defaultValue="unread">
          <TabsList>
            <TabsTrigger value="unread" data-testid="tab-unread">
              Unread ({filteredUnread.length})
            </TabsTrigger>
            <TabsTrigger value="read" data-testid="tab-read">
              Read ({filteredRead.length})
            </TabsTrigger>
            <TabsTrigger value="archived" data-testid="tab-archived">
              Archived ({archivedContent.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="unread">
            <ScrollArea className="h-[calc(100vh-400px)]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredUnread.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No unread content</p>
                  <p className="text-sm">Save articles with the button above</p>
                </div>
              ) : (
                filteredUnread.map((content) => (
                  <ContentCard
                    key={content.id}
                    content={content}
                    onMarkRead={() => markReadMutation.mutate(content.id)}
                    onArchive={() => archiveMutation.mutate(content.id)}
                  />
                ))
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="read">
            <ScrollArea className="h-[calc(100vh-400px)]">
              {filteredRead.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No read content</p>
                </div>
              ) : (
                filteredRead.map((content) => (
                  <ContentCard
                    key={content.id}
                    content={content}
                    onMarkRead={() => {}}
                    onArchive={() => archiveMutation.mutate(content.id)}
                  />
                ))
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="archived">
            <ScrollArea className="h-[calc(100vh-400px)]">
              {archivedContent.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No archived content</p>
                </div>
              ) : (
                archivedContent.map((content) => (
                  <ContentCard
                    key={content.id}
                    content={content}
                    onMarkRead={() => {}}
                    onArchive={() => {}}
                  />
                ))
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
