import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mic, Square, Loader2, Send, MessageSquare, Sparkles, X, Bot, User, CheckCircle2, Zap, Paperclip, Plus, History, Trash2, ChevronLeft, ChevronRight, Phone, ChevronDown, ChevronUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { VoiceConversation } from "./voice-conversation";

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
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [streamingState, setStreamingState] = useState<StreamingState | null>(null);
  const [expandedActions, setExpandedActions] = useState<Set<number>>(new Set());
  
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const queryClient = useQueryClient();
  
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
    return pageContexts[currentPage] || "Flow OS - Real Estate Business Operating System";
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

    try {
      const response = await fetch("/api/ai-assistant/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          images: userMessage.images,
          context: {
            currentPage: currentPage,
            pageDescription: getPageContext(),
            appName: "Flow OS",
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
                    status: `Running ${formatToolName(data.tool)}...`,
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
                  
                case 'complete':
                  if (data.actions) {
                    accumulatedActions = data.actions;
                  }
                  if (data.model) {
                    finalModel = data.model;
                  }
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
      
    } catch (error) {
      console.error("AI error:", error);
      const errorMessage: Message = { 
        role: "assistant", 
        content: "I'm having trouble connecting right now. Please make sure the OpenAI API key is configured in your settings." 
      };
      setMessages(prev => [...prev, errorMessage]);
    }
    
    setStreamingState(null);
    setIsProcessing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // On desktop: Cmd/Ctrl+Enter to send, Enter for new line
    // This is more mobile-friendly since mobile keyboards don't have easy Shift access
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };

  // Auto-resize textarea based on content
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    // Reset height to auto to properly calculate scrollHeight
    e.target.style.height = 'auto';
    // Set height based on content, with max limit
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
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
  
  // Auto-save on close
  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      if (currentConversationId) {
        updateConversation.mutate({ id: currentConversationId, messages });
      } else {
        const title = messages[0].content.slice(0, 50) + (messages[0].content.length > 50 ? "..." : "");
        createConversation.mutate({ title, messages });
      }
    }
  }, [isOpen]);

  const formatToolName = (toolName: string): string => {
    const toolLabels: Record<string, string> = {
      search_people: "Searched contacts",
      get_person_details: "Retrieved person details",
      update_person: "Updated contact",
      create_person: "Created new contact",
      log_interaction: "Logged interaction",
      create_task: "Created task",
      update_deal_stage: "Updated deal stage",
      get_hot_warm_lists: "Retrieved Hot/Warm lists",
      get_todays_tasks: "Retrieved today's tasks"
    };
    return toolLabels[toolName] || toolName;
  };

  return (
    <>
      <Button
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl z-50 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 animate-in zoom-in duration-300"
        onClick={() => setIsOpen(true)}
        data-testid="button-ai-assistant"
      >
        <Sparkles className="h-6 w-6 text-white" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className={cn(
          "h-[85vh] sm:h-[600px] max-h-[85vh] flex flex-row p-0 gap-0 transition-all duration-300 overflow-hidden",
          showHistory ? "sm:max-w-3xl" : "sm:max-w-lg"
        )}>
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
                <Button 
                  variant={isVoiceMode ? "default" : "ghost"} 
                  size="sm" 
                  onClick={() => setIsVoiceMode(!isVoiceMode)}
                  className={cn("gap-1", isVoiceMode && "bg-violet-600 hover:bg-violet-700")}
                  title={isVoiceMode ? "Switch to text chat" : "Switch to voice conversation"}
                  data-testid="button-toggle-voice-mode"
                >
                  <Phone className="h-4 w-4" />
                  {isVoiceMode ? "Text" : "Voice"}
                </Button>
                {messages.length > 0 && !isVoiceMode && (
                  <Button variant="ghost" size="sm" onClick={clearConversation} className="text-xs text-muted-foreground">
                    Clear
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isVoiceMode ? "Talk to your AI assistant with voice" : "Agentic AI that can search, update, and create data for you"}
            </p>
          </DialogHeader>

          {isVoiceMode ? (
            <div className="flex-1 flex items-center justify-center">
              <VoiceConversation isOpen={isOpen && isVoiceMode} onClose={() => setIsVoiceMode(false)} />
            </div>
          ) : (
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
                            <span>{formatToolName(streamingState.currentTool)}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Show streaming content or status */}
                    {streamingState.content ? (
                      <p className="whitespace-pre-wrap">{streamingState.content}<span className="inline-block w-1.5 h-4 bg-violet-500 ml-0.5 animate-pulse" /></p>
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
                disabled={isProcessing}
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
                disabled={isProcessing || isRecording}
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
                disabled={isProcessing || isRecording}
              />
              
              <Button
                size="icon"
                onClick={() => sendMessage(inputText)}
                disabled={(!inputText.trim() && attachedImages.length === 0) || isProcessing || isRecording}
                className="flex-shrink-0 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          </>
          )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
