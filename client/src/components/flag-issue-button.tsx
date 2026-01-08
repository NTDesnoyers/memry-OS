import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Flag, X, Camera, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import html2canvas from "html2canvas";
import { isFounderMode } from "@/lib/feature-mode";
import { useAuth } from "@/hooks/use-auth";

type IssueType = "bug" | "suggestion" | "question";

interface FlagIssueButtonProps {
  recentActions?: string[];
  aiConversation?: Array<{ role: string; content: string }>;
}

export function FlagIssueButton({ recentActions = [], aiConversation = [] }: FlagIssueButtonProps) {
  const [open, setOpen] = useState(false);
  const [issueType, setIssueType] = useState<IssueType>("bug");
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const { toast } = useToast();
  const [location] = useLocation();
  const { user } = useAuth();
  const founderMode = isFounderMode(user?.email);

  const captureScreenshot = async () => {
    setIsCapturing(true);
    try {
      // Close the dialog momentarily to capture clean screenshot
      const mainContent = document.querySelector('main') || document.getElementById('root') || document.body;
      
      const canvas = await html2canvas(mainContent as HTMLElement, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        scale: 0.75, // Reduce scale for better performance
        backgroundColor: '#1a1a1a', // Match dark theme
        removeContainer: true,
        foreignObjectRendering: false, // Avoid CORS issues
        ignoreElements: (element) => {
          // Ignore dialog, toasts, and floating buttons
          const isDialog = element.getAttribute("role") === "dialog" || 
                          element.classList.contains("flag-issue-button") ||
                          element.hasAttribute("data-radix-portal") ||
                          element.classList.contains("toaster");
          return isDialog;
        },
        onclone: (doc) => {
          // Remove any problematic elements from the cloned document
          const dialogs = doc.querySelectorAll('[role="dialog"], [data-radix-portal]');
          dialogs.forEach(el => el.remove());
        }
      });
      const dataUrl = canvas.toDataURL("image/png", 0.8);
      setScreenshot(dataUrl);
    } catch (error) {
      console.error("Failed to capture screenshot:", error);
      toast({
        title: "Screenshot skipped",
        description: "Automatic capture didn't work - you can still submit your feedback.",
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const submitIssue = useMutation({
    mutationFn: async (data: {
      type: IssueType;
      description: string;
      screenshotUrl?: string;
      context: {
        route: string;
        timestamp: string;
        featureMode: string;
        userAgent: string;
        recentActions: string[];
        aiConversation: Array<{ role: string; content: string }>;
      };
    }) => {
      const response = await apiRequest("POST", "/api/issues", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Issue reported",
        description: "Thanks for the feedback! We'll look into this.",
      });
      setOpen(false);
      setDescription("");
      setScreenshot(null);
      setIssueType("bug");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpen = async () => {
    setOpen(true);
    await captureScreenshot();
  };

  const handleSubmit = () => {
    if (!description.trim()) {
      toast({
        title: "Description required",
        description: "Please describe the issue you're experiencing.",
        variant: "destructive",
      });
      return;
    }

    submitIssue.mutate({
      type: issueType,
      description: description.trim(),
      screenshotUrl: screenshot || undefined,
      context: {
        route: location,
        timestamp: new Date().toISOString(),
        featureMode: founderMode ? "founder" : "beta",
        userAgent: navigator.userAgent,
        recentActions: recentActions.slice(-10),
        aiConversation: aiConversation.slice(-5),
      },
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        handleOpen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return createPortal(
    <>
      <Button
        onClick={(e) => {
          e.stopPropagation();
          handleOpen();
        }}
        size="sm"
        variant="outline"
        className="flag-issue-button fixed bottom-24 right-4 z-[9999] gap-2 shadow-lg bg-background hover:bg-muted border-orange-300 text-orange-600 hover:text-orange-700"
        data-testid="button-flag-issue"
      >
        <Flag className="h-4 w-4" />
        <span className="hidden sm:inline">Flag Issue</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-orange-500" />
              Flag an Issue
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>What type of feedback is this?</Label>
              <RadioGroup
                value={issueType}
                onValueChange={(v) => setIssueType(v as IssueType)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bug" id="bug" />
                  <Label htmlFor="bug" className="cursor-pointer">Bug</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="suggestion" id="suggestion" />
                  <Label htmlFor="suggestion" className="cursor-pointer">Suggestion</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="question" id="question" />
                  <Label htmlFor="question" className="cursor-pointer">Question</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">What happened?</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue or suggestion..."
                rows={4}
                data-testid="input-issue-description"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Screenshot
              </Label>
              {isCapturing ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Capturing...
                </div>
              ) : screenshot ? (
                <div className="relative">
                  <img
                    src={screenshot}
                    alt="Screenshot"
                    className="rounded border max-h-48 w-full object-contain bg-muted"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => setScreenshot(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={captureScreenshot}
                  className="gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Capture Screenshot
                </Button>
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              We'll also capture your current page ({location}) and some context to help diagnose the issue.
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitIssue.isPending || !description.trim()}
                className="gap-2"
                data-testid="button-submit-issue"
              >
                {submitIssue.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>,
    document.body
  );
}
