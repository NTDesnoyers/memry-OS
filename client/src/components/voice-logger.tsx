import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mic, Square, Loader2, Send, MessageSquare, Sparkles, Bot, User, CheckCircle2, Zap, Paperclip, Plus, History, Trash2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Minus, Check, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface AiConversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Action {
  tool: string;
  result: string;
}

interface AttachedImage {
  data: string;
  type: string;
  name?: string;
}

interface ModelInfo {
  name: string;
  reason: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: Action[];
  images?: AttachedImage[];
  model?: ModelInfo;
  isStreaming?: boolean;
}

interface StreamingState {
  content: string;
  actions: Action[];
  status: string;
  currentTool: string | null;
}

type InputMode = 'log_conversation' | 'quick_update' | 'ask_search';

export function VoiceLogger() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [currentPage, setCurrentPage] = useState("");
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [streamingState, setStreamingState] = useState<StreamingState | null>(null);
  const [expandedActions, setExpandedActions] = useState<Set<number>>(new Set());
  const [showCompletionBadge, setShowCompletionBadge] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('log_conversation');
  const [modeAutoSelected, setModeAutoSelected] = useState(false);
  
  // Action Mode: Track logged conversations for thread reset
  const [loggedConversations, setLoggedConversations] = useState<Array<{ personName: string; interactionId: string }>>([]);
  const [expectedLogCount, setExpectedLogCount] = useState<number | null>(null);
  const [pendingReset, setPendingReset] = useState<{ personNames: string[] } | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const completionBadgeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch all conversations
  const { data: conversations = [] } = useQuery<AiConversation[]>({
    queryKey: ["/api/ai-conversations"],
    queryFn: async () => {
      const res = await fetch("/api/ai-conversations");
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    },
    enabled: isOpen,
  });
  
  // Create conversation mutation
  const createConversation = useMutation({
    mutationFn: async (data: { title: string; messages: Message[] }) => {
      const res = await fetch("/api/ai-conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create conversation");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-conversations"] });
    },
  });
  
  // Update conversation mutation
  const updateConversation = useMutation({
    mutationFn: async ({ id, messages }: { id: string; messages: Message[] }) => {
      const res = await fetch(`/api/ai-conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      if (!res.ok) throw new Error("Failed to update conversation");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-conversations"] });
    },
  });
  
  // Delete conversation mutation
  const deleteConversation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ai-conversations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete conversation");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-conversations"] });
    },
  });

  useEffect(() => {
    setCurrentPage(window.location.pathname);
  }, [isOpen]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          if (isRecording) stopRecording();
        };

        recognitionRef.current.onend = () => {
          if (isRecording) {
            recognitionRef.current?.start();
          }
        };
      }
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startRecording = () => {
    setTranscript("");
    setIsRecording(true);
    recognitionRef.current?.start();
  };

  const stopRecording = () => {
    setIsRecording(false);
    recognitionRef.current?.stop();
    if (transcript.trim()) {
      sendMessage(transcript);
      setTranscript("");
    }
  };

  const getPageContext = () => {
    const pageContexts: Record<string, string> = {
      "/": "Dashboard - overview of business metrics, daily focus, and weekly stats",
      "/people": "People/Contacts page - CRM contact list with FORD relationship tracking",
      "/deals": "Deals page - active real estate transactions and pipeline",
      "/reviews": "Real Estate Reviews - annual property reviews for clients",
      "/brand-center": "Brand Center - managing logos, headshot, and branding assets",
      "/relationships": "FORD Relationships - tracking Family, Occupation, Recreation, Dreams",
      "/weekly-report": "Weekly Meeting Agenda - relationship-based weekly planning",
      "/business-tracker": "Business Tracker - annual goals, transactions, and PIE metrics",
      "/haves-wants": "Haves & Wants - client matching and newsletter management",
      "/visual-pricing": "Visual Pricing - market analysis and comparable properties",
      "/automation": "Automation Hub - workflow automations and integrations",
      "/integrations": "Integrations - connected services and API settings",
    };
    return pageContexts[currentPage] || "Memry - Relationship Intelligence for Real Estate";
  };

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result as string;
      setAttachedImages(prev => [...prev, { data, type: file.type, name: file.name }]);
    };
    reader.readAsDataURL(file);
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    const itemsArray = Array.from(items);
    for (const item of itemsArray) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) processFile(file);
        break;
      }
    }
  }, [processFile]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const filesArray = Array.from(files);
    for (const file of filesArray) {
      processFile(file);
    }
    e.target.value = "";
  }, [processFile]);

  const removeImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const detectInputMode = useCallback((text: string): InputMode => {
    const trimmed = text.trim();
    const length = trimmed.length;
    
    // Question patterns → ask/search
    const questionPatterns = /^(what|who|where|when|why|how|show|find|search|list|get|tell me|can you|could you)/i;
    if (questionPatterns.test(trimmed) || trimmed.endsWith('?')) {
      return 'ask_search';
    }
    
    // Transcript patterns → log conversation (includes "I just had", "Just had", "I had", etc.)
    const transcriptPatterns = /speaker [a-z]:|^(i\s+)?(just\s+)?(had|spoke|talked|met|called|chatted)/i;
    if (transcriptPatterns.test(trimmed)) {
      return 'log_conversation';
    }
    
    // Common conversation logging phrases anywhere in text
    const conversationPhrases = /\b(had a call|had a meeting|talked to|spoke with|met with|called|just got off|conversation with)\b/i;
    if (conversationPhrases.test(trimmed)) {
      return 'log_conversation';
    }
    
    // Long text (likely transcript) → log conversation
    if (length > 500) {
      return 'log_conversation';
    }
    
    // Medium text (100-500) with past tense verbs → log conversation
    const pastTensePatterns = /\b(discussed|mentioned|said|told|asked|agreed|decided|talked about|went over)\b/i;
    if (length > 100 && pastTensePatterns.test(trimmed)) {
      return 'log_conversation';
    }
    
    // Short text → quick update
    if (length < 100) {
      return 'quick_update';
    }
    
    // Default to log_conversation for safety
    return 'log_conversation';
  }, []);

  const sendMessage = async (text: string) => {
    if ((!text.trim() && attachedImages.length === 0) || isProcessing) return;
    
    const userMessage: Message = { 
      role: "user", 
      content: text.trim(),
      images: attachedImages.length > 0 ? [...attachedImages] : undefined
    };
    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setAttachedImages([]);
    setIsProcessing(true);
    
    // Initialize streaming state
    setStreamingState({ content: '', actions: [], status: 'Thinking...', currentTool: null });

    // Capture the current mode before sending
    const currentMode = inputMode;
    
    // ACTION MODE: Clear logged conversations and expected count at start of new request
    // This prevents stale entries from previous attempts from triggering false resets
    if (currentMode === 'log_conversation') {
      setLoggedConversations([]);
      setExpectedLogCount(null);
    }
    
    try {
      const response = await fetch("/api/ai-assistant/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          images: userMessage.images,
          inputMode: currentMode,
          context: {
            currentPage: currentPage,
            pageDescription: getPageContext(),
            appName: "Memry",
            appDescription: "A real estate business operating system for relationship-based selling",
          }
        }),
      });

      if (!response.ok) {
        throw new Error("AI request failed");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error("No response body");
      }
      
      let accumulatedContent = '';
      let accumulatedActions: Action[] = [];
      let finalModel: ModelInfo | undefined;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'status':
                  setStreamingState(prev => ({ 
                    content: prev?.content || '', 
                    actions: prev?.actions || [], 
                    status: data.message, 
                    currentTool: prev?.currentTool || null 
                  }));
                  break;
                  
                case 'tool_start':
                  setStreamingState(prev => ({ 
                    content: prev?.content || '',
                    actions: prev?.actions || [],
                    status: formatToolName(data.tool, false),
                    currentTool: data.tool 
                  }));
                  break;
                  
                case 'tool_complete':
                  accumulatedActions.push({ tool: data.tool, result: data.result });
                  setStreamingState(prev => ({ 
                    content: prev?.content || '',
                    actions: [...accumulatedActions],
                    currentTool: null,
                    status: 'Thinking...'
                  }));
                  
                  // P2-1 FIX: Show confirmation toast and invalidate cache immediately for contact tools
                  // This ensures user sees clear feedback when AI updates/creates contact info
                  if (data.tool === 'update_person' && data.result && !data.result.startsWith('Error') && !data.result.startsWith('Failed')) {
                    // Parse the success message: "Successfully updated {name}: {fields}"
                    const match = data.result.match(/Successfully updated ([^:]+): (.+)/);
                    if (match) {
                      const personName = match[1].trim();
                      const fieldsUpdated = match[2].trim();
                      toast({
                        title: `Updated ${personName}`,
                        description: `Changed: ${fieldsUpdated}`,
                      });
                    } else {
                      // Fallback toast if format doesn't match
                      toast({
                        title: "Contact updated",
                        description: data.result,
                      });
                    }
                    // Invalidate people cache immediately after confirmed success
                    queryClient.invalidateQueries({ queryKey: ["/api/people"] });
                  }
                  
                  // Also handle create_person success for user feedback
                  if (data.tool === 'create_person' && data.result && !data.result.startsWith('Error') && !data.result.startsWith('Failed') && !data.result.startsWith('BLOCKED')) {
                    // Parse: "Created new contact: {name} (ID: ...)"
                    const match = data.result.match(/Created new contact: ([^(]+)/);
                    if (match) {
                      toast({
                        title: "Contact created",
                        description: match[1].trim(),
                      });
                    }
                    queryClient.invalidateQueries({ queryKey: ["/api/people"] });
                  }
                  break;
                  
                case 'token':
                  accumulatedContent += data.content;
                  setStreamingState(prev => ({ 
                    content: accumulatedContent,
                    actions: prev?.actions || [],
                    status: '',
                    currentTool: null
                  }));
                  // Auto-scroll as content streams
                  requestAnimationFrame(() => {
                    if (scrollRef.current) {
                      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                    }
                  });
                  break;
                  
                case 'conversation_logged':
                  // Action Mode: Track successful log_interaction calls
                  // Wait for all logs to complete before triggering reset
                  // Track the expected total from the backend
                  if (data.totalLogged) {
                    setExpectedLogCount(data.totalLogged);
                  }
                  setLoggedConversations(prev => [...prev, { 
                    personName: data.personName, 
                    interactionId: data.interactionId 
                  }]);
                  break;
                  
                case 'complete':
                  if (data.actions) {
                    accumulatedActions = data.actions;
                  }
                  if (data.model) {
                    finalModel = data.model;
                  }
                  // Show completion status briefly
                  setStreamingState(prev => ({
                    content: prev?.content || '',
                    actions: accumulatedActions,
                    status: 'complete',
                    currentTool: null
                  }));
                  break;
                  
                case 'error':
                  throw new Error(data.message);
              }
            } catch (parseError) {
              // Skip invalid JSON lines
            }
          }
        }
      }
      
      // Finalize the message
      const assistantMessage: Message = { 
        role: "assistant", 
        content: accumulatedContent || "I completed the requested actions.",
        actions: accumulatedActions.length > 0 ? accumulatedActions : undefined,
        model: finalModel
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Always invalidate all relevant caches after AI assistant completes
      // This ensures changes are immediately visible across the app even when
      // actions happen via backend logic (fallback drafts, post-save processing, etc.)
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      queryClient.invalidateQueries({ queryKey: ["/api/interactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/generated-drafts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-review"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/signals"] });
      
      // ACTION MODE: If conversations were logged, trigger thread reset
      // This enforces the "one conversation per thread" rule
      // Only trigger reset when ALL expected logs are received (prevents partial-failure resets)
      // Use functional setState to access the latest values
      setExpectedLogCount(expected => {
        setLoggedConversations(prev => {
          // Only trigger reset if:
          // 1. Mode is log_conversation
          // 2. We have logged conversations
          // 3. Count matches expected (all logs received)
          if (currentMode === 'log_conversation' && prev.length > 0) {
            if (expected !== null && prev.length === expected) {
              const personNames = prev.map(c => c.personName);
              // Trigger the reset flow
              setPendingReset({ personNames });
              console.log(`[ACTION MODE] All ${expected} logs received, triggering reset`);
            } else if (expected !== null && prev.length !== expected) {
              // Partial logging - some failed. Don't reset, allow retry
              console.warn(`[ACTION MODE] Partial logging: ${prev.length}/${expected} logs received. No reset.`);
            }
          }
          return prev;
        });
        return expected;
      });
      
    } catch (error) {
      console.error("AI error:", error);
      const errorMessage: Message = { 
        role: "assistant", 
        content: "I'm having trouble connecting right now. Please make sure the OpenAI API key is configured in your settings." 
      };
      setMessages(prev => [...prev, errorMessage]);
      setStreamingState(null);
      setIsProcessing(false);
      return;
    }
    
    // Brief delay to show success moment before clearing streaming state
    await new Promise(resolve => setTimeout(resolve, 800));
    setStreamingState(null);
    setIsProcessing(false);
    
    // Show completion badge on floating button when not open
    if (!isOpen) {
      // Clear any existing timeout
      if (completionBadgeTimeoutRef.current) {
        clearTimeout(completionBadgeTimeoutRef.current);
      }
      setShowCompletionBadge(true);
      // Auto-hide badge after 5 seconds
      completionBadgeTimeoutRef.current = setTimeout(() => {
        setShowCompletionBadge(false);
        completionBadgeTimeoutRef.current = null;
      }, 5000);
    }
  };
  
  // Handle minimize with animation - close immediately, animation is handled by Dialog's exit animation
  const handleMinimize = () => {
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // On desktop: Cmd/Ctrl+Enter to send, Enter for new line
    // This is more mobile-friendly since mobile keyboards don't have easy Shift access
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };

  // Auto-resize textarea based on content and detect input mode
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setInputText(newText);
    // Reset height to auto to properly calculate scrollHeight
    e.target.style.height = 'auto';
    // Set height based on content, with max limit
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
    
    // Always run auto-detection when there's meaningful input
    // This ensures mode updates when text changes (typing or clearing)
    if (newText.length > 15) {
      const detectedMode = detectInputMode(newText);
      setInputMode(detectedMode);
      setModeAutoSelected(true);
    } else if (newText.length === 0) {
      // Reset to default when input is cleared
      setInputMode('log_conversation');
      setModeAutoSelected(false);
    }
  };

  const clearConversation = () => {
    // Save conversation before clearing
    if (messages.length > 0) {
      if (currentConversationId) {
        updateConversation.mutate({ id: currentConversationId, messages });
      } else {
        const title = messages[0].content.slice(0, 50) + (messages[0].content.length > 50 ? "..." : "");
        createConversation.mutate({ title, messages });
      }
    }
    setMessages([]);
    setCurrentConversationId(null);
  };
  
  const startNewConversation = () => {
    // Save current conversation if it has messages
    if (messages.length > 0 && !currentConversationId) {
      const title = messages[0].content.slice(0, 50) + (messages[0].content.length > 50 ? "..." : "");
      createConversation.mutate({ title, messages });
    } else if (messages.length > 0 && currentConversationId) {
      updateConversation.mutate({ id: currentConversationId, messages });
    }
    setMessages([]);
    setCurrentConversationId(null);
    setShowHistory(false);
  };
  
  const loadConversation = (conversation: AiConversation) => {
    // Save current conversation first if needed
    if (messages.length > 0 && currentConversationId) {
      updateConversation.mutate({ id: currentConversationId, messages });
    } else if (messages.length > 0 && !currentConversationId) {
      const title = messages[0].content.slice(0, 50) + (messages[0].content.length > 50 ? "..." : "");
      createConversation.mutate({ title, messages });
    }
    
    setMessages(conversation.messages || []);
    setCurrentConversationId(conversation.id);
    setShowHistory(false);
  };
  
  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConversation.mutate(id);
    if (currentConversationId === id) {
      setMessages([]);
      setCurrentConversationId(null);
    }
  };
  
  // Auto-save on close - only for Reflection Mode (ask_search)
  // Action Mode (log_conversation) threads reset immediately, no history save
  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      // Only save Reflection Mode conversations to history
      // Action Mode (log_conversation) handles its own reset without saving
      if (inputMode === 'ask_search') {
        if (currentConversationId) {
          updateConversation.mutate({ id: currentConversationId, messages });
        } else {
          const title = messages[0].content.slice(0, 50) + (messages[0].content.length > 50 ? "..." : "");
          createConversation.mutate({ title, messages });
        }
        console.log('[REFLECTION MODE] Conversation saved to history on close');
      } else {
        // For Action Mode (log_conversation) or quick_update, don't save to history
        // Thread will be available until reset or new session
        console.log(`[${inputMode.toUpperCase()}] Thread not saved to history`);
      }
    }
  }, [isOpen]);

  const formatToolName = (toolName: string, isComplete: boolean = true): string => {
    const toolLabels: Record<string, { active: string; complete: string }> = {
      search_people: { active: "Scanning your contacts...", complete: "Found contact in your database" },
      get_person_details: { active: "Looking up details...", complete: "Retrieved contact details" },
      update_person: { active: "Updating contact notes...", complete: "Saved contact updates" },
      create_person: { active: "Adding new contact...", complete: "Created new contact" },
      log_interaction: { active: "Saving conversation...", complete: "Conversation saved" },
      create_task: { active: "Creating follow-up...", complete: "Follow-up action queued" },
      update_deal_stage: { active: "Updating deal...", complete: "Deal status updated" },
      get_hot_warm_lists: { active: "Checking hot leads...", complete: "Retrieved active leads" },
      get_todays_tasks: { active: "Loading tasks...", complete: "Retrieved today's tasks" },
      link_household: { active: "Linking household...", complete: "Household linked" },
      mark_person_hot: { active: "Marking as hot...", complete: "Marked as hot lead" }
    };
    const label = toolLabels[toolName];
    if (!label) return toolName;
    return isComplete ? label.complete : label.active;
  };

  // Clear completion badge when opening the chat
  useEffect(() => {
    if (isOpen) {
      setShowCompletionBadge(false);
      // Clear the timeout since badge was dismissed by opening
      if (completionBadgeTimeoutRef.current) {
        clearTimeout(completionBadgeTimeoutRef.current);
        completionBadgeTimeoutRef.current = null;
      }
    }
  }, [isOpen]);
  
  // Cleanup completion badge timeout on unmount
  useEffect(() => {
    return () => {
      if (completionBadgeTimeoutRef.current) {
        clearTimeout(completionBadgeTimeoutRef.current);
      }
    };
  }, []);
  
  // ACTION MODE: Handle thread reset after successful conversation logging
  // This enforces the "one conversation per thread" rule
  useEffect(() => {
    if (pendingReset) {
      const personNames = pendingReset.personNames;
      const successMessage = personNames.length === 1
        ? `Conversation with ${personNames[0]} logged successfully.`
        : `Conversations logged for: ${personNames.join(', ')}.`;
      
      // Show success briefly, then reset thread
      const timer = setTimeout(() => {
        // Reset thread state (no history save for Action Mode)
        setMessages([]);
        setCurrentConversationId(null);
        setInputText('');
        setAttachedImages([]);
        setLoggedConversations([]);
        setExpectedLogCount(null);
        setPendingReset(null);
        setInputMode('log_conversation');
        setModeAutoSelected(false);
        
        console.log(`[ACTION MODE] Thread reset after logging: ${successMessage}`);
      }, 2000); // 2 second delay to show the AI's response before reset
      
      return () => clearTimeout(timer);
    }
  }, [pendingReset]);

  return (
    <>
      {/* Floating AI Assistant Button */}
      <Button
        size="lg"
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl z-50 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 transition-all duration-300",
          isProcessing && !isOpen && "animate-pulse ring-4 ring-violet-400/50",
          showCompletionBadge && "ring-4 ring-green-400/70"
        )}
        onClick={() => setIsOpen(true)}
        data-testid="button-ai-assistant"
      >
        {showCompletionBadge ? (
          <Check className="h-6 w-6 text-white" />
        ) : isProcessing && !isOpen ? (
          <Loader2 className="h-6 w-6 text-white animate-spin" />
        ) : (
          <Sparkles className="h-6 w-6 text-white" />
        )}
        {/* Processing indicator badge */}
        {isProcessing && !isOpen && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-amber-500 rounded-full animate-pulse" />
        )}
        {/* Completion indicator badge */}
        {showCompletionBadge && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full flex items-center justify-center">
            <Check className="h-2.5 w-2.5 text-white" />
          </span>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen} modal={false}>
        <DialogContent 
          hideCloseButton
          className={cn(
            "h-[85vh] sm:h-[600px] max-h-[85vh] flex flex-row p-0 gap-0 overflow-hidden",
            showHistory ? "sm:max-w-3xl" : "sm:max-w-lg"
          )}
          onPointerDownOutside={(e) => {
            // Don't close the chat when clicking on the FlagIssueButton or its dialog
            const target = e.target as HTMLElement;
            if (target.closest('.flag-issue-button') || target.closest('[role="dialog"]')) {
              e.preventDefault();
            }
          }}
        >
          {/* History Sidebar */}
          {showHistory && (
            <div className="w-56 border-r flex flex-col bg-muted/30 flex-shrink-0 h-full overflow-hidden">
              <div className="p-2 border-b flex items-center justify-between flex-shrink-0">
                <h3 className="font-medium text-xs flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" />
                  Chat History
                </h3>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowHistory(false)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
              </div>
              <ScrollArea className="flex-1 overflow-hidden">
                <div className="p-1.5 space-y-0.5">
                  <button
                    onClick={startNewConversation}
                    className="w-full px-2 py-1.5 text-xs text-left rounded flex items-center gap-1.5 hover:bg-secondary transition-colors text-violet-600 font-medium"
                    data-testid="button-new-conversation"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New Conversation
                  </button>
                  
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => loadConversation(conv)}
                      className={cn(
                        "w-full px-2 py-1.5 text-xs text-left rounded cursor-pointer group flex items-center gap-1.5 transition-colors",
                        currentConversationId === conv.id ? "bg-secondary" : "hover:bg-secondary/50"
                      )}
                      data-testid={`conversation-item-${conv.id}`}
                    >
                      <MessageSquare className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="truncate text-xs leading-tight">{conv.title}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          {format(new Date(conv.updatedAt), "MMM d, h:mm a")}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                      >
                        <Trash2 className="h-2.5 w-2.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  
                  {conversations.length === 0 && (
                    <p className="text-[10px] text-muted-foreground text-center py-3">
                      No saved conversations yet
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
          
          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-base">
                {!showHistory && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 mr-1" 
                    onClick={() => setShowHistory(true)}
                    title="View chat history"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                )}
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                Flow AI Assistant
              </DialogTitle>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearConversation} className="text-xs text-muted-foreground">
                    Clear
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
                  onClick={handleMinimize}
                  title="Minimize"
                  data-testid="button-minimize-chat"
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Agentic AI that can search, update, and create data for you
            </p>
          </DialogHeader>

          <>
          <ScrollArea className="flex-1 px-4" ref={scrollRef}>
            <div className="py-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8 space-y-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-r from-violet-100 to-purple-100 flex items-center justify-center mx-auto">
                    <Sparkles className="h-8 w-8 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg">How can I help you?</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Ask me anything about your business, contacts, or real estate
                    </p>
                  </div>
                  <div className="grid gap-2 text-sm">
                    <button 
                      onClick={() => sendMessage("Show me my Hot and Warm lists")}
                      className="p-3 text-left rounded-lg border hover:bg-secondary/50 transition-colors"
                      data-testid="quick-action-hot-warm"
                    >
                      <span className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-violet-500" />
                        Show me my Hot and Warm lists
                      </span>
                    </button>
                    <button 
                      onClick={() => sendMessage("Find Miguel Shaban and show me his details")}
                      className="p-3 text-left rounded-lg border hover:bg-secondary/50 transition-colors"
                      data-testid="quick-action-find-person"
                    >
                      <span className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-violet-500" />
                        Find Miguel Shaban and show me his details
                      </span>
                    </button>
                    <button 
                      onClick={() => sendMessage("Log a call with Miguel - we discussed his home search timeline")}
                      className="p-3 text-left rounded-lg border hover:bg-secondary/50 transition-colors"
                      data-testid="quick-action-log-call"
                    >
                      <span className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-violet-500" />
                        Log a call with Miguel about his home search
                      </span>
                    </button>
                    <button 
                      onClick={() => sendMessage("Create a new contact: John Smith, segment B")}
                      className="p-3 text-left rounded-lg border hover:bg-secondary/50 transition-colors"
                      data-testid="quick-action-create-contact"
                    >
                      <span className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-violet-500" />
                        Create a new contact: John Smith
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary"
                    )}
                  >
                    {message.actions && message.actions.length > 0 && (
                      <div className="mb-2 pb-2 border-b border-border/50">
                        <button
                          onClick={() => {
                            setExpandedActions(prev => {
                              const next = new Set(prev);
                              if (next.has(index)) {
                                next.delete(index);
                              } else {
                                next.add(index);
                              }
                              return next;
                            });
                          }}
                          className="flex items-center gap-1.5 text-xs text-violet-600 font-medium hover:text-violet-700 transition-colors w-full"
                        >
                          <Zap className="h-3 w-3" />
                          <span>{message.actions.length} action{message.actions.length > 1 ? 's' : ''} taken</span>
                          {expandedActions.has(index) ? (
                            <ChevronUp className="h-3 w-3 ml-auto" />
                          ) : (
                            <ChevronDown className="h-3 w-3 ml-auto" />
                          )}
                        </button>
                        {expandedActions.has(index) && (
                          <div className="mt-1.5 space-y-0.5">
                            {message.actions.map((action, i) => (
                              <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                <CheckCircle2 className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />
                                <span>{formatToolName(action.tool)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {message.images && message.images.length > 0 && (
                      <div className="flex gap-2 flex-wrap mb-2">
                        {message.images.map((img, i) => (
                          <img 
                            key={i}
                            src={img.data} 
                            alt={img.name || "Attached"} 
                            className="max-h-32 max-w-[200px] rounded-lg border"
                          />
                        ))}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.role === "assistant" && message.model && (
                      <div className="mt-2 pt-2 border-t border-border/30 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Sparkles className="h-2.5 w-2.5" />
                        <span>{message.model.name}</span>
                        <span className="text-muted-foreground/50">•</span>
                        <span className="italic">{message.model.reason}</span>
                      </div>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                  )}
                </div>
              ))}

              {/* ACTION MODE: Success banner with pending reset indicator */}
              {pendingReset && !streamingState && (
                <div className="flex gap-3 justify-start animate-in fade-in">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-green-50 border border-green-200">
                    <div className="flex items-center gap-2 text-green-700 font-medium mb-1">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Conversation logged successfully</span>
                    </div>
                    <p className="text-green-600 text-xs">
                      {pendingReset.personNames.length === 1
                        ? `Logged with ${pendingReset.personNames[0]}`
                        : `Logged for: ${pendingReset.personNames.join(', ')}`}
                    </p>
                    <p className="text-muted-foreground text-xs mt-1 flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Starting fresh thread...
                    </p>
                  </div>
                </div>
              )}

              {/* Streaming message display */}
              {streamingState && (
                <div className="flex gap-3 justify-start">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm bg-secondary">
                    {/* Show actions being executed */}
                    {(streamingState.actions.length > 0 || streamingState.currentTool) && (
                      <div className="mb-2 pb-2 border-b border-border/50">
                        <div className="flex items-center gap-1.5 text-xs text-violet-600 font-medium mb-1">
                          <Zap className="h-3 w-3" />
                          Working...
                        </div>
                        {streamingState.actions.map((action, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />
                            <span>{formatToolName(action.tool)}</span>
                          </div>
                        ))}
                        {streamingState.currentTool && (
                          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 mt-0.5 text-violet-500 flex-shrink-0 animate-spin" />
                            <span>{formatToolName(streamingState.currentTool, false)}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Show streaming content or status */}
                    {streamingState.content ? (
                      <p className="whitespace-pre-wrap">{streamingState.content}<span className="inline-block w-1.5 h-4 bg-violet-500 ml-0.5 animate-pulse" /></p>
                    ) : streamingState.status === 'complete' ? (
                      <div className="flex items-center gap-2 text-green-600 font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Done{streamingState.actions.length > 0 ? ` - ${streamingState.actions.length} action${streamingState.actions.length > 1 ? 's' : ''} completed` : ''}</span>
                      </div>
                    ) : streamingState.status ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                        <span>{streamingState.status}</span>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t flex-shrink-0 space-y-3">
            {/* Mode Selector - What is this input? */}
            {(inputText.length > 30 || modeAutoSelected) && (
              <div className="flex items-center gap-1 text-xs" data-testid="mode-selector">
                <span className="text-muted-foreground mr-1">This is:</span>
                <button
                  onClick={() => { setInputMode('log_conversation'); setModeAutoSelected(false); }}
                  className={cn(
                    "px-2 py-1 rounded-full transition-colors",
                    inputMode === 'log_conversation' 
                      ? "bg-violet-100 text-violet-700 font-medium" 
                      : "text-muted-foreground hover:bg-secondary"
                  )}
                  data-testid="mode-log-conversation"
                >
                  Log conversation
                </button>
                <button
                  onClick={() => { setInputMode('quick_update'); setModeAutoSelected(false); }}
                  className={cn(
                    "px-2 py-1 rounded-full transition-colors",
                    inputMode === 'quick_update' 
                      ? "bg-blue-100 text-blue-700 font-medium" 
                      : "text-muted-foreground hover:bg-secondary"
                  )}
                  data-testid="mode-quick-update"
                >
                  Quick update
                </button>
                <button
                  onClick={() => { setInputMode('ask_search'); setModeAutoSelected(false); }}
                  className={cn(
                    "px-2 py-1 rounded-full transition-colors",
                    inputMode === 'ask_search' 
                      ? "bg-green-100 text-green-700 font-medium" 
                      : "text-muted-foreground hover:bg-secondary"
                  )}
                  data-testid="mode-ask-search"
                >
                  Ask / search
                </button>
              </div>
            )}

            {isRecording && (
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-200">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <span className="text-sm text-red-700 flex-1">
                  {transcript || "Listening..."}
                </span>
                <Button size="sm" variant="destructive" onClick={stopRecording}>
                  <Square className="h-3 w-3 mr-1 fill-current" /> Stop
                </Button>
              </div>
            )}

            {attachedImages.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {attachedImages.map((img, i) => (
                  <div key={i} className="relative group">
                    <img 
                      src={img.data} 
                      alt={img.name || "Attached image"} 
                      className="h-16 w-16 object-cover rounded-lg border"
                    />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={isRecording ? stopRecording : startRecording}
                className={cn(
                  "flex-shrink-0",
                  isRecording && "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                )}
                disabled={isProcessing || !!pendingReset}
              >
                {isRecording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
              </Button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                multiple
                className="hidden"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="flex-shrink-0"
                disabled={isProcessing || isRecording || !!pendingReset}
                title="Attach image"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              
              <Textarea
                ref={inputRef}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Ask me anything... (paste images with Ctrl+V)"
                className="min-h-[44px] max-h-[200px] resize-none overflow-y-auto"
                rows={1}
                disabled={isRecording || !!pendingReset}
              />
              
              <Button
                size="icon"
                onClick={() => sendMessage(inputText)}
                disabled={(!inputText.trim() && attachedImages.length === 0) || isProcessing || isRecording || !!pendingReset}
                className="flex-shrink-0 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          </>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
