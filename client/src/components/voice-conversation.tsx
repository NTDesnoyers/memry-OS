import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Phone, PhoneOff, Volume2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceConversationProps {
  onClose?: () => void;
  isOpen?: boolean;
}

type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

export function VoiceConversation({ onClose, isOpen = true }: VoiceConversationProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [responseText, setResponseText] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  const connect = useCallback(async () => {
    if (connectionState === "connecting" || connectionState === "connected") return;
    
    setConnectionState("connecting");
    setTranscript("");
    setResponseText("");
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      mediaStreamRef.current = stream;
      
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/voice/realtime`);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log("Voice WebSocket connected");
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleServerMessage(data);
      };
      
      ws.onerror = (error) => {
        console.error("Voice WebSocket error:", error);
        setConnectionState("error");
      };
      
      ws.onclose = () => {
        console.log("Voice WebSocket closed");
        setConnectionState("disconnected");
        cleanup();
      };
      
    } catch (error) {
      console.error("Failed to connect:", error);
      setConnectionState("error");
    }
  }, [connectionState]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    cleanup();
    setConnectionState("disconnected");
  }, []);

  const cleanup = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  const startAudioCapture = useCallback(() => {
    if (!audioContextRef.current || !mediaStreamRef.current || !wsRef.current) return;
    
    const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
    const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;
    
    processor.onaudioprocess = (e) => {
      if (isMuted || wsRef.current?.readyState !== WebSocket.OPEN) return;
      
      const inputData = e.inputBuffer.getChannelData(0);
      const pcm16 = floatTo16BitPCM(inputData);
      const base64 = arrayBufferToBase64(pcm16);
      
      wsRef.current?.send(JSON.stringify({
        type: "audio.append",
        audio: base64,
      }));
    };
    
    source.connect(processor);
    // Connect to a silent destination to keep the processor running without feedback
    const silentGain = audioContextRef.current.createGain();
    silentGain.gain.value = 0;
    processor.connect(silentGain);
    silentGain.connect(audioContextRef.current.destination);
  }, [isMuted]);

  const handleServerMessage = useCallback((data: any) => {
    switch (data.type) {
      case "session.ready":
        setConnectionState("connected");
        startAudioCapture();
        break;
        
      case "speech.started":
        setIsListening(true);
        setIsSpeaking(false);
        if (sourceNodeRef.current) {
          sourceNodeRef.current.stop();
          sourceNodeRef.current = null;
        }
        audioQueueRef.current = [];
        break;
        
      case "speech.stopped":
        setIsListening(false);
        // Clear previous response and trigger AI response
        setResponseText("");
        // Send audio commit and request response
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "audio.commit" }));
          wsRef.current.send(JSON.stringify({ type: "response.create" }));
        }
        break;
        
      case "transcription.completed":
        setTranscript(data.transcript);
        break;
        
      case "audio.delta":
        handleAudioDelta(data.delta);
        break;
        
      case "audio.done":
        setIsSpeaking(false);
        break;
        
      case "text.delta":
        setResponseText(prev => prev + data.delta);
        break;
        
      case "text.done":
        setResponseText(data.text);
        break;
        
      case "response.done":
        setIsSpeaking(false);
        break;
        
      case "error":
        console.error("Voice error:", data.message);
        if (data.message?.includes("connection") || data.message?.includes("service")) {
          setConnectionState("error");
        }
        break;
        
      case "session.ended":
        setConnectionState("disconnected");
        break;
    }
  }, [startAudioCapture]);

  const handleAudioDelta = useCallback((base64Audio: string) => {
    if (!audioContextRef.current) return;
    
    setIsSpeaking(true);
    
    const pcm16 = base64ToArrayBuffer(base64Audio);
    const float32 = pcm16ToFloat32(new Int16Array(pcm16));
    audioQueueRef.current.push(float32);
    
    if (!isPlayingRef.current) {
      playNextAudioChunk();
    }
  }, []);

  const playNextAudioChunk = useCallback(() => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }
    
    isPlayingRef.current = true;
    const audioData = audioQueueRef.current.shift()!;
    
    const buffer = audioContextRef.current.createBuffer(1, audioData.length, 24000);
    buffer.getChannelData(0).set(audioData);
    
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    sourceNodeRef.current = source;
    
    source.onended = () => {
      playNextAudioChunk();
    };
    
    source.start();
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  useEffect(() => {
    if (!isOpen) {
      disconnect();
    }
  }, [isOpen, disconnect]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <div className="flex flex-col items-center gap-6 p-6" data-testid="voice-conversation">
      <div className="relative">
        <div 
          className={cn(
            "w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300",
            connectionState === "connected" && isSpeaking && "animate-pulse",
            connectionState === "connected" ? "bg-primary/20" : "bg-muted",
            isListening && "ring-4 ring-green-500/50"
          )}
          data-testid="voice-status-indicator"
        >
          {connectionState === "connecting" ? (
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
          ) : connectionState === "connected" ? (
            isSpeaking ? (
              <Volume2 className="w-12 h-12 text-primary animate-pulse" />
            ) : isListening ? (
              <Mic className="w-12 h-12 text-green-500" />
            ) : (
              <Mic className="w-12 h-12 text-primary" />
            )
          ) : (
            <Phone className="w-12 h-12 text-muted-foreground" />
          )}
        </div>
        
        {connectionState === "connected" && (
          <div className="absolute -bottom-1 -right-1">
            <Button
              size="icon"
              variant={isMuted ? "destructive" : "secondary"}
              className="h-10 w-10 rounded-full"
              onClick={toggleMute}
              data-testid="button-toggle-mute"
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
          </div>
        )}
      </div>

      <div className="text-center space-y-2">
        <p className="text-sm font-medium" data-testid="text-connection-status">
          {connectionState === "disconnected" && "Ready to connect"}
          {connectionState === "connecting" && "Connecting..."}
          {connectionState === "connected" && (isListening ? "Listening..." : isSpeaking ? "Speaking..." : "Connected - speak anytime")}
          {connectionState === "error" && "Connection error"}
        </p>
        
        {transcript && (
          <p className="text-sm text-muted-foreground max-w-xs" data-testid="text-transcript">
            You: {transcript}
          </p>
        )}
        
        {responseText && (
          <p className="text-sm text-primary max-w-xs" data-testid="text-response">
            AI: {responseText.slice(0, 200)}{responseText.length > 200 ? "..." : ""}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        {connectionState === "disconnected" || connectionState === "error" ? (
          <Button 
            size="lg" 
            onClick={connect}
            className="gap-2"
            data-testid="button-start-voice"
          >
            <Phone className="h-5 w-5" />
            Start Voice Chat
          </Button>
        ) : connectionState === "connecting" ? (
          <Button size="lg" disabled className="gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Connecting...
          </Button>
        ) : (
          <Button 
            size="lg" 
            variant="destructive" 
            onClick={disconnect}
            className="gap-2"
            data-testid="button-end-voice"
          >
            <PhoneOff className="h-5 w-5" />
            End Call
          </Button>
        )}
      </div>
    </div>
  );
}

function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function pcm16ToFloat32(pcm16: Int16Array): Float32Array {
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / 32768;
  }
  return float32;
}
