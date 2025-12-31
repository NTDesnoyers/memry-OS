import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Loader2, Check, X, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  error?: string;
}

export function QuickVoiceLog() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");
  const isRecordingRef = useRef(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const handleRecognitionEnd = useCallback(() => {
    if (transcriptRef.current.trim()) {
      setShowConfirm(true);
    }
    setIsRecording(false);
  }, []);

  const handleRecognitionError = useCallback((event: any) => {
    console.error("Speech recognition error", event.error);
    if (event.error === "not-allowed") {
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to use voice logging.",
        variant: "destructive",
      });
    }
    setIsRecording(false);
  }, [toast]);

  const handleRecognitionResult = useCallback((event: any) => {
    let currentTranscript = "";
    for (let i = 0; i < event.results.length; i++) {
      currentTranscript += event.results[i][0].transcript;
    }
    setTranscript(currentTranscript);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-US";

        recognitionRef.current.onresult = handleRecognitionResult;
        recognitionRef.current.onerror = handleRecognitionError;
        recognitionRef.current.onend = handleRecognitionEnd;
      }
    }

    return () => {
      recognitionRef.current?.stop();
    };
  }, [handleRecognitionResult, handleRecognitionError, handleRecognitionEnd]);

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
      
      if (data.personName) {
        toast({
          title: "Logged conversation",
          description: `Saved note about ${data.personName}${data.isNewContact ? " (new contact)" : ""}`,
        });
      } else {
        toast({
          title: "Logged conversation",
          description: "Saved voice note (no person matched)",
        });
      }
      
      setTranscript("");
      setShowConfirm(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to log",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const startRecording = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Not supported",
        description: "Voice input is not supported in this browser. Try Chrome or Safari.",
        variant: "destructive",
      });
      return;
    }
    setTranscript("");
    setShowConfirm(false);
    setIsRecording(true);
    try {
      recognitionRef.current.start();
    } catch (e) {
      console.error("Failed to start recognition:", e);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    recognitionRef.current?.stop();
  };

  const handleConfirm = () => {
    if (transcript.trim()) {
      quickLogMutation.mutate(transcript);
    }
  };

  const handleCancel = () => {
    setTranscript("");
    setShowConfirm(false);
  };

  if (showConfirm) {
    return (
      <div className="fixed bottom-24 right-4 md:bottom-6 z-50 flex flex-col items-end gap-2" data-testid="quick-voice-confirm">
        <div className="bg-background border rounded-lg shadow-lg p-4 max-w-sm">
          <div className="text-sm text-muted-foreground mb-2">Save this note?</div>
          <p className="text-sm mb-3 max-h-24 overflow-y-auto">{transcript}</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={quickLogMutation.isPending}
              data-testid="button-cancel-voice-log"
            >
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={quickLogMutation.isPending}
              data-testid="button-confirm-voice-log"
            >
              {quickLogMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              Save
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Button
      size="icon"
      className={cn(
        "fixed bottom-24 right-4 md:bottom-6 z-50 h-14 w-14 rounded-full shadow-lg transition-all",
        isRecording 
          ? "bg-red-500 hover:bg-red-600 animate-pulse" 
          : "bg-primary hover:bg-primary/90"
      )}
      onClick={isRecording ? stopRecording : startRecording}
      data-testid="button-quick-voice-log"
    >
      {isRecording ? (
        <Square className="h-6 w-6 fill-white" />
      ) : (
        <Mic className="h-6 w-6" />
      )}
      {isRecording && transcript && (
        <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          <Check className="h-3 w-3" />
        </span>
      )}
    </Button>
  );
}
