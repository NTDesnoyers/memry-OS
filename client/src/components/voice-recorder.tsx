import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Square, Loader2, Check, X } from "lucide-react";

interface VoiceRecorderProps {
  onTranscriptionComplete: (transcript: string) => void;
  onCancel?: () => void;
  personId?: string;
  className?: string;
}

export function VoiceRecorder({ 
  onTranscriptionComplete, 
  onCancel,
  personId,
  className = "" 
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = async () => {
    try {
      setError(null);
      setTranscript(null);
      chunksRef.current = [];
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4"
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        
        if (chunksRef.current.length === 0) {
          setError("No audio recorded");
          setIsProcessing(false);
          return;
        }
        
        const audioBlob = new Blob(chunksRef.current, { 
          type: mediaRecorder.mimeType 
        });
        
        await transcribeAudio(audioBlob);
      };
      
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
      
    } catch (err: any) {
      console.error("Failed to start recording:", err);
      if (err.name === "NotAllowedError") {
        setError("Microphone access denied. Please allow microphone access to record.");
      } else if (err.name === "NotFoundError") {
        setError("No microphone found. Please connect a microphone.");
      } else {
        setError("Failed to start recording. Please try again.");
      }
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      setIsProcessing(true);
      setIsRecording(false);
      mediaRecorderRef.current.stop();
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      if (personId) {
        formData.append("personId", personId);
      }
      
      const response = await fetch("/api/voice-memories/transcribe", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Transcription failed");
      }
      
      const data = await response.json();
      setTranscript(data.transcript);
      setIsProcessing(false);
      
    } catch (err: any) {
      console.error("Transcription error:", err);
      setError(err.message || "Failed to transcribe audio");
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (transcript) {
      onTranscriptionComplete(transcript);
      setTranscript(null);
      setRecordingTime(0);
    }
  };

  const handleCancel = () => {
    setTranscript(null);
    setRecordingTime(0);
    setError(null);
    onCancel?.();
  };

  if (transcript) {
    return (
      <Card className={`border-2 border-green-200 bg-green-50/50 ${className}`}>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-green-700">
            <Check className="h-5 w-5" />
            <span className="font-medium">Recording transcribed</span>
          </div>
          <div className="bg-white rounded-lg p-3 text-sm max-h-48 overflow-y-auto border">
            {transcript}
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleConfirm}
              className="flex-1"
              data-testid="confirm-transcript"
            >
              <Check className="h-4 w-4 mr-2" />
              Use This Transcript
            </Button>
            <Button 
              variant="outline" 
              onClick={handleCancel}
              data-testid="cancel-transcript"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 ${isRecording ? "border-red-300 bg-red-50/50" : "border-dashed border-muted-foreground/30"} ${className}`}>
      <CardContent className="p-6 flex flex-col items-center justify-center gap-4">
        {error && (
          <div className="text-sm text-red-600 text-center bg-red-50 p-2 rounded-lg w-full">
            {error}
          </div>
        )}
        
        {isProcessing ? (
          <>
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Transcribing your recording...</p>
          </>
        ) : isRecording ? (
          <>
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-25" />
              <div className="relative h-16 w-16 rounded-full bg-red-500 flex items-center justify-center">
                <Mic className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="text-2xl font-mono font-bold text-red-600">
              {formatTime(recordingTime)}
            </div>
            <p className="text-sm text-muted-foreground">Recording... Tap to stop</p>
            <Button 
              onClick={stopRecording}
              variant="destructive"
              size="lg"
              className="gap-2"
              data-testid="stop-recording"
            >
              <Square className="h-5 w-5" />
              Stop Recording
            </Button>
          </>
        ) : (
          <>
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Mic className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium">Record Voice Note</p>
              <p className="text-sm text-muted-foreground">
                Describe your conversation and we'll extract the details
              </p>
            </div>
            <Button 
              onClick={startRecording}
              size="lg"
              className="gap-2"
              data-testid="start-recording"
            >
              <Mic className="h-5 w-5" />
              Start Recording
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
