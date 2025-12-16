import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Mic, Square, Loader2, CheckCircle2, ListTodo, Mail, Sparkles, FileText, Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

// Types for Speech Recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function VoiceLogger() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Speech Recognition
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
      }
    }
  }, []);

  const startRecording = () => {
    setTranscript("");
    setResult(null);
    setIsRecording(true);
    setIsOpen(true);
    recognitionRef.current?.start();
  };

  const stopRecording = () => {
    setIsRecording(false);
    recognitionRef.current?.stop();
    processRecording();
  };

  const processRecording = async () => {
    setIsProcessing(true);
    
    // Simulate LLM Processing Delay
    setTimeout(() => {
      // Mock LLM Output based on transcript (or generic if empty for demo)
      const mockAnalysis = {
        summary: transcript || "Discussed market trends and potential listing in Spring. Mentioned daughter's graduation coming up.",
        ford: {
          family: "Daughter graduating soon",
          occupation: "Considering retirement in 2 years",
          recreation: "Planning trip to Italy",
          dreams: "Downsizing to a condo downtown"
        },
        tasks: [
          { id: 1, text: "Send market report for 22030", due: "Tomorrow" },
          { id: 2, text: "Call regarding Italy trip recommendations", due: "Next Week" }
        ],
        drafts: [
          { 
            type: "Email", 
            subject: "Great catching up! + Market Info",
            content: "Hi [Name],\n\nIt was wonderful speaking with you today! I'm so excited to hear about your daughter's upcoming graduation - what a milestone!\n\nPer our conversation, I'll pull those market stats for your neighborhood and send them over tomorrow. I think you'll be pleasantly surprised by the current equity position.\n\nBest,\nNathan"
          }
        ]
      };
      
      setResult(mockAnalysis);
      setIsProcessing(false);
    }, 2000);
  };

  const handleSave = () => {
    toast({
      title: "Processed & Saved",
      description: "Interaction logged, FORD updated, tasks sent to Todoist.",
    });
    setIsOpen(false);
    setResult(null);
    setTranscript("");
  };

  return (
    <>
      {/* Floating Action Button */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl z-50 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 animate-in zoom-in duration-300"
        onClick={startRecording}
      >
        <Mic className="h-6 w-6 text-white" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isRecording ? (
                <>
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  Listening...
                </>
              ) : isProcessing ? (
                <>
                  <Sparkles className="h-5 w-5 text-purple-500 animate-pulse" />
                  Analyzing with AI...
                </>
              ) : (
                "Interaction Processed"
              )}
            </DialogTitle>
          </DialogHeader>

          {!result ? (
            <div className="space-y-4 py-4">
              <div className="min-h-[150px] p-4 bg-secondary/30 rounded-lg border-2 border-dashed border-secondary text-lg">
                {transcript || <span className="text-muted-foreground italic">Start speaking to log an interaction...</span>}
              </div>
              
              <div className="flex justify-center">
                {isRecording ? (
                  <Button variant="destructive" size="lg" onClick={stopRecording} className="gap-2">
                    <Square className="h-4 w-4 fill-current" /> Stop & Process
                  </Button>
                ) : (
                  <Button onClick={startRecording} className="gap-2" disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                    {isProcessing ? "Processing..." : "Resume Recording"}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <Tabs defaultValue="summary" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="summary">Summary & FORD</TabsTrigger>
                  <TabsTrigger value="actions">Tasks & Drafts</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase">Summary</h4>
                      <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">Log Created</Badge>
                    </div>
                    <p className="text-sm bg-secondary/30 p-3 rounded-md">
                      {result.summary}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase">FORD Updates</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(result.ford).map(([key, value]: any) => (
                        <Card key={key} className="border-none bg-blue-50/50">
                          <CardContent className="p-3">
                            <span className="text-xs font-bold uppercase text-blue-700 block mb-1">{key}</span>
                            <span className="text-sm text-blue-900">{value}</span>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="actions" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase flex items-center gap-2">
                        <ListTodo className="h-4 w-4" /> Todoist Tasks
                      </h4>
                      <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-none">2 Tasks</Badge>
                    </div>
                    {result.tasks.map((task: any) => (
                      <div key={task.id} className="flex items-center gap-3 p-3 bg-secondary/20 rounded-md border-l-4 border-red-500">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{task.text}</p>
                          <p className="text-xs text-muted-foreground">Due: {task.due}</p>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600">
                           <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-2" />

                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase flex items-center gap-2">
                      <Mail className="h-4 w-4" /> Auto-Drafted Email
                    </h4>
                    {result.drafts.map((draft: any, i: number) => (
                      <Card key={i} className="border border-border shadow-sm">
                        <CardContent className="p-4 space-y-3">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Subject:</p>
                            <p className="text-sm font-medium">{draft.subject}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Body:</p>
                            <Textarea 
                              defaultValue={draft.content} 
                              className="text-sm min-h-[120px] bg-background"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline">Discard</Button>
                            <Button size="sm" className="gap-2">
                              <Send className="h-3 w-3" /> Send
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          <DialogFooter className="sm:justify-between">
             {result && (
               <>
                 <span className="text-xs text-muted-foreground flex items-center mt-2 sm:mt-0">
                   <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" /> Synced with Todoist
                 </span>
                 <div className="flex gap-2">
                   <Button variant="outline" onClick={() => {setResult(null); setTranscript(""); setIsOpen(false);}}>Cancel</Button>
                   <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">Confirm & Save Log</Button>
                 </div>
               </>
             )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
