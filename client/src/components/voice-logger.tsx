import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mic, Square, Loader2, Send, MessageSquare, Sparkles, X, Bot, User, CheckCircle2, Zap } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

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

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: Action[];
}

export function VoiceLogger() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [currentPage, setCurrentPage] = useState("");
  
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
      "/weekly-report": "Weekly Meeting Agenda - Ninja Selling weekly planning",
      "/business-tracker": "Business Tracker - annual goals, transactions, and PIE metrics",
      "/haves-wants": "Haves & Wants - client matching and newsletter management",
      "/visual-pricing": "Visual Pricing - market analysis and comparable properties",
      "/automation": "Automation Hub - workflow automations and integrations",
      "/integrations": "Integrations - connected services and API settings",
    };
    return pageContexts[currentPage] || "Ninja OS - Real Estate Business Operating System";
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return;
    
    const userMessage: Message = { role: "user", content: text.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsProcessing(true);

    try {
      const response = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          context: {
            currentPage: currentPage,
            pageDescription: getPageContext(),
            appName: "Ninja OS",
            appDescription: "A real estate business operating system following Ninja Selling methodology",
          }
        }),
      });

      if (!response.ok) {
        throw new Error("AI request failed");
      }

      const data = await response.json();
      const assistantMessage: Message = { 
        role: "assistant", 
        content: data.response,
        actions: data.actions
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
    
    setIsProcessing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };

  const clearConversation = () => {
    setMessages([]);
  };

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
        <DialogContent className="sm:max-w-lg h-[600px] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-base">
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                Ninja AI Assistant
              </DialogTitle>
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearConversation} className="text-xs text-muted-foreground">
                  Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Agentic AI that can search, update, and create data for you
            </p>
          </DialogHeader>

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
                        <div className="flex items-center gap-1.5 text-xs text-violet-600 font-medium mb-1">
                          <Zap className="h-3 w-3" />
                          Actions taken
                        </div>
                        {message.actions.map((action, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />
                            <span>{formatToolName(action.tool)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === "user" && (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                  )}
                </div>
              ))}

              {isProcessing && (
                <div className="flex gap-3 justify-start">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-secondary rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                    </div>
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
              
              <Textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                className="min-h-[44px] max-h-32 resize-none"
                rows={1}
                disabled={isProcessing || isRecording}
              />
              
              <Button
                size="icon"
                onClick={() => sendMessage(inputText)}
                disabled={!inputText.trim() || isProcessing || isRecording}
                className="flex-shrink-0 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
