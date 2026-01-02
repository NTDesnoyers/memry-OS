import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Loader2, Check, X, Square, MessageSquare, Phone, Video, Mail, MessageCircle, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface QuickLogResult {
  success: boolean;
  interactionId?: string;
  personName?: string;
  personId?: string;
  summary?: string;
  isNewContact?: boolean;
  type?: string;
  fordNotes?: Record<string, string>;
  followUpCreated?: boolean;
  error?: string;
}

const typeIcons: Record<string, any> = {
  call: Phone,
  meeting: Video,
  text: MessageCircle,
  email: Mail,
  voice_note: Mic,
};

const typeLabels: Record<string, string> = {
  call: "Phone Call",
  meeting: "Meeting",
  text: "Text Message",
  email: "Email",
  voice_note: "Voice Note",
};

export function QuickVoiceLog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<QuickLogResult | null>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-US";

        recognitionRef.current.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          if (event.error === "not-allowed") {
            toast({
              title: "Microphone access denied",
              description: "Please allow microphone access to use voice logging.",
              variant: "destructive",
            });
          }
          setIsRecording(false);
        };

        recognitionRef.current.onend = () => {
          if (isRecording) {
            try {
              recognitionRef.current?.start();
            } catch (e) {
              setIsRecording(false);
            }
          }
        };
      }
    }

    return () => {
      recognitionRef.current?.stop();
    };
  }, [isRecording, toast]);

  const quickLogMutation = useMutation({
    mutationFn: async (text: string): Promise<QuickLogResult> => {
      const res = await fetch("/api/voice-memories/quick-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to log conversation");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/interactions-with-participants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      setResult(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to log",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpen = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Not supported",
        description: "Voice input is not supported in this browser. Try Chrome or Safari.",
        variant: "destructive",
      });
      return;
    }
    setTranscript("");
    setResult(null);
    setIsOpen(true);
    setIsRecording(true);
    try {
      recognitionRef.current.start();
    } catch (e) {
      console.error("Failed to start recognition:", e);
      setIsRecording(false);
    }
  };

  const handleClose = () => {
    setIsRecording(false);
    recognitionRef.current?.stop();
    setIsOpen(false);
    setTranscript("");
    setResult(null);
  };

  const stopRecording = () => {
    setIsRecording(false);
    recognitionRef.current?.stop();
  };

  const handleSave = () => {
    if (transcript.trim()) {
      quickLogMutation.mutate(transcript);
    }
  };

  const handleDone = () => {
    if (result?.personName) {
      toast({
        title: "Logged conversation",
        description: `Saved ${typeLabels[result.type || "voice_note"] || "note"} about ${result.personName}`,
      });
    }
    handleClose();
  };

  const TypeIcon = result?.type ? typeIcons[result.type] || Mic : Mic;

  return (
    <>
      <Button
        size="icon"
        className="fixed bottom-24 right-4 md:bottom-6 z-50 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        onClick={handleOpen}
        data-testid="button-quick-voice-log"
      >
        <Mic className="h-6 w-6" />
      </Button>

      <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0">
          <div className="flex flex-col h-full">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Flow
              </SheetTitle>
            </SheetHeader>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-lg mx-auto">
                {isRecording && (
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground mb-1">You</div>
                      <div className="bg-secondary rounded-2xl rounded-tl-sm p-4 relative">
                        <div className="absolute -top-1 -left-1 h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                        <p className="text-sm leading-relaxed">
                          {transcript || (
                            <span className="text-muted-foreground italic">Listening...</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!isRecording && transcript && !result && !quickLogMutation.isPending && (
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground mb-1">You said</div>
                      <div className="bg-secondary rounded-2xl rounded-tl-sm p-4">
                        <p className="text-sm leading-relaxed">{transcript}</p>
                      </div>
                    </div>
                  </div>
                )}

                {quickLogMutation.isPending && (
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Sparkles className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground mb-1">Flow</div>
                      <div className="bg-primary/5 border border-primary/20 rounded-2xl rounded-tl-sm p-4">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">Processing your memory...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {result && (
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Sparkles className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground mb-1">Flow</div>
                      <div className="bg-primary/5 border border-primary/20 rounded-2xl rounded-tl-sm p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">Saved to your records</span>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          {result.personName && (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span>{result.personName}</span>
                              {result.isNewContact && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">New contact</span>
                              )}
                            </div>
                          )}
                          
                          {result.type && (
                            <div className="flex items-center gap-2">
                              <TypeIcon className="h-4 w-4 text-muted-foreground" />
                              <span>{typeLabels[result.type] || result.type}</span>
                            </div>
                          )}
                          
                          {result.summary && (
                            <p className="text-muted-foreground pt-1 border-t">
                              {result.summary}
                            </p>
                          )}
                          
                          {result.followUpCreated && (
                            <div className="flex items-center gap-2 text-amber-700 bg-amber-50 px-2 py-1 rounded">
                              <Check className="h-3 w-3" />
                              <span className="text-xs">Follow-up task created</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t bg-background">
              <div className="max-w-lg mx-auto">
                {isRecording ? (
                  <div className="flex flex-col items-center gap-4">
                    <Button
                      size="lg"
                      variant="destructive"
                      className="h-16 w-16 rounded-full"
                      onClick={stopRecording}
                      data-testid="button-stop-recording"
                    >
                      <Square className="h-6 w-6 fill-white" />
                    </Button>
                    <p className="text-sm text-muted-foreground">Tap to stop recording</p>
                  </div>
                ) : transcript && !result && !quickLogMutation.isPending ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleClose}
                      data-testid="button-cancel-voice"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleSave}
                      data-testid="button-save-voice"
                    >
                      {quickLogMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Save Memory
                    </Button>
                  </div>
                ) : quickLogMutation.isPending ? (
                  <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Processing...</span>
                  </div>
                ) : result ? (
                  <Button
                    className="w-full"
                    onClick={handleDone}
                    data-testid="button-done-voice"
                  >
                    Done
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleClose}
                    data-testid="button-close-voice"
                  >
                    Close
                  </Button>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
