import { useState, useEffect } from "react";
import { MessageSquarePlus, X, Send, Bug, Lightbulb, Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

type FeedbackType = "bug" | "idea" | "praise";

const feedbackTypes: { type: FeedbackType; icon: typeof Bug; label: string; color: string }[] = [
  { type: "bug", icon: Bug, label: "Bug Report", color: "text-red-500 bg-red-50 border-red-200" },
  { type: "idea", icon: Lightbulb, label: "Feature Idea", color: "text-amber-500 bg-amber-50 border-amber-200" },
  { type: "praise", icon: Heart, label: "Praise", color: "text-pink-500 bg-pink-50 border-pink-200" },
];

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("idea");
  const [message, setMessage] = useState("");
  const [currentPage, setCurrentPage] = useState("");

  useEffect(() => {
    setCurrentPage(window.location.pathname);
  }, [isOpen]);

  useEffect(() => {
    const handleOpenFeedback = () => setIsOpen(true);
    window.addEventListener("ninja:open-feedback", handleOpenFeedback);
    return () => window.removeEventListener("ninja:open-feedback", handleOpenFeedback);
  }, []);

  const submitFeedback = useMutation({
    mutationFn: async (data: { type: FeedbackType; message: string; page: string; userAgent: string }) => {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to submit feedback");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Thanks for your feedback!");
      setMessage("");
      setIsOpen(false);
    },
    onError: () => {
      toast.error("Failed to submit feedback. Please try again.");
    },
  });

  const handleSubmit = () => {
    if (!message.trim()) {
      toast.error("Please enter your feedback");
      return;
    }
    submitFeedback.mutate({
      type: feedbackType,
      message: message.trim(),
      page: currentPage,
      userAgent: navigator.userAgent,
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 bg-amber-500 hover:bg-amber-600 text-white rounded-full p-3 shadow-lg transition-all hover:scale-105"
        data-testid="button-feedback"
        aria-label="Send feedback"
      >
        <MessageSquarePlus className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in slide-in-from-bottom-4"
            role="dialog"
            aria-labelledby="feedback-title"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 id="feedback-title" className="text-lg font-semibold">
                Share Your Feedback
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
                data-testid="button-close-feedback"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">What type of feedback?</Label>
                <div className="flex gap-2">
                  {feedbackTypes.map(({ type, icon: Icon, label, color }) => (
                    <button
                      key={type}
                      onClick={() => setFeedbackType(type)}
                      className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
                        feedbackType === type ? color : "border-gray-200 hover:border-gray-300"
                      }`}
                      data-testid={`button-feedback-type-${type}`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="feedback-message" className="text-sm font-medium mb-2 block">
                  {feedbackType === "bug" && "What happened? What did you expect?"}
                  {feedbackType === "idea" && "Describe your idea or suggestion"}
                  {feedbackType === "praise" && "What's working well for you?"}
                </Label>
                <Textarea
                  id="feedback-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    feedbackType === "bug"
                      ? "I clicked on... and expected... but instead..."
                      : feedbackType === "idea"
                      ? "It would be great if..."
                      : "I really love how..."
                  }
                  rows={4}
                  className="resize-none"
                  data-testid="input-feedback-message"
                />
              </div>

              <div className="text-xs text-gray-500">
                Page: {currentPage}
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 rounded-b-xl">
              <Button
                onClick={handleSubmit}
                disabled={submitFeedback.isPending || !message.trim()}
                className="w-full bg-amber-500 hover:bg-amber-600"
                data-testid="button-submit-feedback"
              >
                {submitFeedback.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Feedback
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
