import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { 
  Video, 
  Calendar, 
  Clock, 
  MoreVertical, 
  Bot, 
  Sparkles, 
  Play, 
  FileText, 
  CheckCircle2, 
  Plus,
  Link as LinkIcon,
  Mic,
  StopCircle,
  Loader2,
  ExternalLink
} from "lucide-react";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";
import { useToast } from "@/hooks/use-toast";

const upcomingMeetings = [
  { 
    id: 1, 
    title: "Listing Presentation - 123 Oak St", 
    time: "Today, 2:00 PM", 
    platform: "Zoom", 
    attendees: ["John Doe", "Jane Doe"],
    status: "upcoming"
  },
  { 
    id: 2, 
    title: "Team Weekly Sync", 
    time: "Tomorrow, 9:00 AM", 
    platform: "Google Meet", 
    attendees: ["Team"],
    status: "upcoming"
  }
];

const pastMeetings = [
  { 
    id: 3, 
    title: "Buyer Consultation - Smith Family", 
    time: "Yesterday, 10:00 AM", 
    duration: "45 min",
    platform: "Zoom",
    summary: "Discussed budget ($600k) and preferred neighborhoods (Northside). Need to setup search alert.",
    status: "processed"
  },
  { 
    id: 4, 
    title: "Vendor Call - Inspection Co", 
    time: "Yesterday, 1:30 PM", 
    duration: "15 min",
    platform: "Phone",
    summary: "Confirmed inspection for Friday at 9am.",
    status: "processed"
  }
];

export default function Meetings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<string[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showZoomDialog, setShowZoomDialog] = useState(false);
  const [zoomLink, setZoomLink] = useState("");

  const handleJoinZoom = () => {
    if (!zoomLink.trim()) {
      toast({
        title: "Enter a link",
        description: "Please paste a valid Zoom meeting link.",
        variant: "destructive",
      });
      return;
    }

    // Validate Zoom link format
    const zoomRegex = /zoom\.(us|com)/i;
    if (!zoomRegex.test(zoomLink)) {
      toast({
        title: "Invalid Link",
        description: "Please enter a valid Zoom meeting link.",
        variant: "destructive",
      });
      return;
    }

    // Open Zoom link in new tab
    window.open(zoomLink, "_blank");
    setShowZoomDialog(false);
    setZoomLink("");

    toast({
      title: "Opening Zoom",
      description: "Your meeting is opening in a new tab. Click 'Start Recording' when ready.",
    });
  };

  // Simulate live recording
  const startRecording = () => {
    setIsRecording(true);
    setRecordingDuration(0);
    setLiveTranscript([]);
    
    toast({
      title: "AI Assistant Joined",
      description: "Recording and transcribing meeting...",
    });

    // Simulate duration timer
    const timerInterval = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);

    // Simulate incoming transcript
    const transcriptInterval = setInterval(() => {
      const phrases = [
        "Okay, let's look at the market data.",
        "Interest rates have stabilized recently.",
        "What is your timeline for moving?",
        "We can list the property next week.",
        "I'll send over the paperwork tonight."
      ];
      const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
      setLiveTranscript(prev => [...prev, randomPhrase]);
    }, 3000);

    // Store cleanup for stop
    (window as any).stopRecordingCleanup = () => {
      clearInterval(timerInterval);
      clearInterval(transcriptInterval);
    };
  };

  const stopRecording = () => {
    setIsRecording(false);
    if ((window as any).stopRecordingCleanup) {
      (window as any).stopRecordingCleanup();
    }
    toast({
      title: "Meeting Ended",
      description: "Processing transcript and extracting tasks...",
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Layout>
      <div className="min-h-screen bg-secondary/30 relative">
        <div 
          className="fixed inset-0 opacity-40 mix-blend-multiply pointer-events-none -z-10"
          style={{ backgroundImage: `url(${paperBg})`, backgroundSize: 'cover' }}
        />
        
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <header className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-3xl font-serif font-bold text-primary flex items-center gap-3">
                <Video className="h-8 w-8 text-blue-600" />
                Meetings Assistant
              </h1>
              <p className="text-muted-foreground mt-2">
                Your AI companion for Zoom, Google Meet, and calls.
              </p>
            </div>
            <Button size="lg" className="gap-2 shadow-lg" onClick={() => setActiveTab("live")}>
              <Play className="h-4 w-4" /> Start Instant Meeting
            </Button>
          </header>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-background/50 backdrop-blur-sm border p-1">
              <TabsTrigger value="upcoming" className="gap-2"><Calendar className="h-4 w-4" /> Upcoming</TabsTrigger>
              <TabsTrigger value="live" className="gap-2"><Bot className="h-4 w-4" /> Live Assistant</TabsTrigger>
              <TabsTrigger value="past" className="gap-2"><Clock className="h-4 w-4" /> Past Recordings</TabsTrigger>
            </TabsList>

            {/* UPCOMING MEETINGS */}
            <TabsContent value="upcoming" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                {upcomingMeetings.map(meeting => (
                  <Card key={meeting.id} className="border-none shadow-md hover:shadow-lg transition-all">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <Badge variant="outline" className="mb-2 bg-blue-50 text-blue-700 border-blue-200">
                          {meeting.platform}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </div>
                      <CardTitle className="text-lg font-serif">{meeting.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3" /> {meeting.time}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex -space-x-2">
                          {meeting.attendees.map((att, i) => (
                            <Avatar key={i} className="h-8 w-8 border-2 border-background">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">{att[0]}</AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        <Button variant="outline" className="gap-2" onClick={() => {
                          setActiveTab("live");
                          setTimeout(startRecording, 500);
                        }}>
                          <Bot className="h-4 w-4" /> Join & Record
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                <Card className="border-2 border-dashed border-muted bg-transparent shadow-none flex items-center justify-center p-6 h-full min-h-[200px]">
                   <div className="text-center">
                     <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                       <Plus className="h-6 w-6 text-muted-foreground" />
                     </div>
                     <h3 className="font-medium text-muted-foreground">Sync Calendar</h3>
                     <p className="text-xs text-muted-foreground mt-1 mb-4">Connect Google/Outlook Calendar</p>
                     <Button variant="outline" size="sm">Connect</Button>
                   </div>
                </Card>
              </div>
            </TabsContent>

            {/* LIVE ASSISTANT */}
            <TabsContent value="live" className="space-y-6">
              <Card className="border-none shadow-xl bg-slate-900 text-white overflow-hidden min-h-[500px] flex flex-col">
                <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                  <div className="flex items-center gap-4">
                    <div className={`h-3 w-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`} />
                    <div>
                      <h2 className="font-semibold text-lg">AI Meeting Assistant</h2>
                      <p className="text-slate-400 text-sm">
                        {isRecording ? `Recording • ${formatTime(recordingDuration)}` : 'Ready to join'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {!isRecording ? (
                      <Button className="bg-green-600 hover:bg-green-700 text-white gap-2" onClick={startRecording}>
                        <Play className="h-4 w-4" /> Start Recording
                      </Button>
                    ) : (
                      <Button variant="destructive" className="gap-2" onClick={stopRecording}>
                        <StopCircle className="h-4 w-4" /> End Meeting
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex-1 p-8 flex flex-col items-center justify-center relative">
                  {/* Visualizer */}
                  {isRecording ? (
                    <div className="w-full max-w-2xl space-y-8">
                      <div className="flex justify-center gap-1 h-16 items-center">
                        {[...Array(30)].map((_, i) => (
                          <div 
                            key={i} 
                            className="w-1.5 bg-blue-500/80 rounded-full animate-bounce"
                            style={{ 
                              height: `${Math.random() * 100}%`,
                              animationDelay: `${i * 0.05}s`,
                              animationDuration: '0.8s' 
                            }} 
                          />
                        ))}
                      </div>
                      
                      <div className="space-y-4">
                        <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider text-center">Live Transcript</h3>
                        <div className="space-y-2 text-center">
                          {liveTranscript.length === 0 && (
                            <p className="text-slate-500 italic">Listening for speech...</p>
                          )}
                          {liveTranscript.slice(-3).map((text, i) => (
                            <p key={i} className="text-lg md:text-xl font-light text-slate-200 animate-in fade-in slide-in-from-bottom-2">
                              "{text}"
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-4">
                      <div className="h-20 w-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Bot className="h-10 w-10 text-slate-400" />
                      </div>
                      <h3 className="text-xl font-medium">Ready to take notes</h3>
                      <p className="text-slate-400 max-w-md mx-auto">
                        The AI Assistant will record audio, transcribe in real-time, and automatically generate tasks and summaries for your CRM.
                      </p>
                      <div className="flex flex-wrap gap-3 justify-center mt-6">
                        <Button 
                          variant="outline" 
                          className="border-blue-500/50 text-white hover:bg-blue-500/20 gap-2"
                          onClick={() => setShowZoomDialog(true)}
                          data-testid="button-paste-zoom"
                        >
                          <LinkIcon className="h-4 w-4 text-blue-400" /> Paste Zoom Link
                        </Button>
                        <Button 
                          variant="outline" 
                          className="border-slate-600 text-slate-400 hover:bg-slate-800 gap-2 opacity-70"
                          onClick={() => {
                            toast({
                              title: "Coming Soon",
                              description: "Google Meet integration is coming in a future update.",
                            });
                          }}
                          data-testid="button-google-meet"
                        >
                          <Video className="h-4 w-4" /> Google Meet
                        </Button>
                        <Button 
                          variant="outline" 
                          className="border-slate-600 text-slate-400 hover:bg-slate-800 gap-2 opacity-70"
                          onClick={() => {
                            toast({
                              title: "Coming Soon",
                              description: "Microsoft Teams integration is coming in a future update.",
                            });
                          }}
                          data-testid="button-teams"
                        >
                          <Video className="h-4 w-4" /> Teams
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>

            {/* PAST MEETINGS */}
            <TabsContent value="past" className="space-y-4">
              {pastMeetings.map(meeting => (
                <Card key={meeting.id} className="border-none shadow-sm hover:shadow-md transition-all">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="font-normal text-xs">{meeting.platform}</Badge>
                          <span className="text-xs text-muted-foreground">{meeting.time} • {meeting.duration}</span>
                        </div>
                        <h3 className="text-lg font-semibold">{meeting.title}</h3>
                        <p className="text-sm text-muted-foreground">{meeting.summary}</p>
                      </div>
                      
                      <div className="flex items-center gap-2 border-l pl-6">
                        <div className="grid gap-2">
                          <Button size="sm" variant="outline" className="w-full justify-start gap-2">
                            <FileText className="h-4 w-4 text-blue-500" /> View Transcript
                          </Button>
                          <Button size="sm" variant="outline" className="w-full justify-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" /> 3 Tasks Created
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Zoom Link Dialog */}
      <Dialog open={showZoomDialog} onOpenChange={setShowZoomDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-blue-500" />
              Join Zoom Meeting
            </DialogTitle>
            <DialogDescription>
              Paste your Zoom meeting link below. We'll open it in a new tab so you can join.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="zoom-link" className="mb-2 block">Zoom Meeting Link</Label>
              <Input
                id="zoom-link"
                placeholder="https://zoom.us/j/123456789"
                value={zoomLink}
                onChange={(e) => setZoomLink(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleJoinZoom();
                  }
                }}
                data-testid="input-zoom-link"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              After joining, click "Start Recording" to have the AI Assistant take notes.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowZoomDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleJoinZoom} className="gap-2" data-testid="button-join-zoom">
              <ExternalLink className="h-4 w-4" />
              Open Zoom
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
