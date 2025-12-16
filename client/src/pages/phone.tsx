import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, useRef } from "react";
import { 
  Phone, 
  Video, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Users, 
  Clock, 
  Search, 
  MoreVertical, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  User,
  Loader2,
  ListTodo
} from "lucide-react";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";
import { useToast } from "@/hooks/use-toast";

// Mock Data
const recentCalls = [
  { id: 1, name: "Alice Johnson", time: "2 hours ago", duration: "14:20", type: "outgoing" },
  { id: 2, name: "Bob Smith", time: "Yesterday", duration: "05:45", type: "incoming" },
  { id: 3, name: "Carol White", time: "Yesterday", duration: "22:10", type: "outgoing" },
];

const contacts = [
  { id: 1, name: "Alice Johnson", phone: "(555) 123-4567", role: "Buyer" },
  { id: 2, name: "Bob Smith", phone: "(555) 987-6543", role: "Seller" },
  { id: 3, name: "Carol White", phone: "(555) 456-7890", role: "Past Client" },
  { id: 4, name: "David Brown", phone: "(555) 234-5678", role: "Lead" },
];

export default function PhoneDialer() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("keypad");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [callStatus, setCallStatus] = useState<"idle" | "calling" | "connected" | "summary">("idle");
  const [activeContact, setActiveContact] = useState<any>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState<any>(null);

  // Timer for active call
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === "connected") {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCall = (contact: any = null) => {
    if (!contact && !phoneNumber) return;
    
    const contactToCall = contact || { name: phoneNumber, role: "Unknown" };
    setActiveContact(contactToCall);
    setCallStatus("calling");
    
    // Simulate connection after 2 seconds
    setTimeout(() => {
      setCallStatus("connected");
      toast({
        title: "Call Connected",
        description: "Granola AI is recording and transcribing this call.",
      });
    }, 1500);
  };

  const handleHangup = () => {
    setCallStatus("summary");
    // Simulate AI processing
    setTimeout(() => {
      setGeneratedSummary({
        summary: "Discussed potential listing price for the downtown property. Client is concerned about interest rates but motivated to sell before summer. Agreed to send CMA by Friday.",
        tasks: [
          "Prepare CMA for Downtown Property",
          "Send email with interest rate trends",
          "Schedule follow-up call for Friday"
        ]
      });
      toast({
        title: "Call Processed",
        description: "Meeting notes and tasks have been generated.",
      });
    }, 2000);
  };

  const closeSummary = () => {
    setCallStatus("idle");
    setGeneratedSummary(null);
    setPhoneNumber("");
    setActiveContact(null);
  };

  const appendDigit = (digit: string) => {
    if (phoneNumber.length < 15) {
      setPhoneNumber(prev => prev + digit);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-secondary/30 relative flex items-center justify-center p-4">
        <div 
          className="fixed inset-0 opacity-40 mix-blend-multiply pointer-events-none -z-10"
          style={{ backgroundImage: `url(${paperBg})`, backgroundSize: 'cover' }}
        />
        
        {/* Main Phone Interface */}
        <Card className="w-full max-w-4xl h-[80vh] border-none shadow-xl flex overflow-hidden bg-background/95 backdrop-blur-sm">
          
          {/* Left Sidebar (Navigation/History) */}
          <div className="w-80 border-r bg-muted/30 flex flex-col">
            <div className="p-4 border-b">
              <h2 className="font-serif font-bold text-xl text-primary flex items-center gap-2">
                <Phone className="h-5 w-5" /> Phone
              </h2>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <div className="px-4 pt-4">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="keypad">Keypad</TabsTrigger>
                  <TabsTrigger value="contacts">Contacts</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="keypad" className="flex-1 p-4 flex flex-col">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Recent Calls</h3>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {recentCalls.map(call => (
                        <div key={call.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-background border border-transparent hover:border-border cursor-pointer transition-all group" onClick={() => handleCall({ name: call.name, role: "Client" })}>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{call.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{call.name}</p>
                              <p className="text-xs text-muted-foreground">{call.time}</p>
                            </div>
                          </div>
                          <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                            <Phone className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>

              <TabsContent value="contacts" className="flex-1 p-4 flex flex-col">
                <div className="relative mb-4">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search contacts..." className="pl-9" />
                </div>
                <ScrollArea className="flex-1">
                  <div className="space-y-2">
                    {contacts.map(contact => (
                      <div key={contact.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-background border border-transparent hover:border-border cursor-pointer transition-all group" onClick={() => handleCall(contact)}>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{contact.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{contact.name}</p>
                            <p className="text-xs text-muted-foreground">{contact.role}</p>
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                          <Phone className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Area (Active Call / Dialpad / Summary) */}
          <div className="flex-1 flex flex-col relative">
            
            {/* IDLE STATE: Dialpad */}
            {callStatus === "idle" && (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="mb-8 w-full max-w-xs">
                  <Input 
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="text-center text-3xl font-mono h-16 border-none shadow-none bg-transparent focus-visible:ring-0 placeholder:text-muted/20"
                    placeholder="Enter number..."
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-6 mb-8">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, "*", 0, "#"].map((key) => (
                    <Button 
                      key={key} 
                      variant="outline" 
                      className="h-16 w-16 rounded-full text-2xl font-light hover:bg-primary/5 hover:border-primary/50 transition-all"
                      onClick={() => appendDigit(key.toString())}
                    >
                      {key}
                    </Button>
                  ))}
                </div>

                <Button 
                  size="lg" 
                  className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600 shadow-lg hover:shadow-green-500/25 transition-all"
                  onClick={() => handleCall()}
                  disabled={!phoneNumber}
                >
                  <Phone className="h-8 w-8 fill-current" />
                </Button>
              </div>
            )}

            {/* ACTIVE CALL STATE */}
            {(callStatus === "calling" || callStatus === "connected") && (
              <div className="flex-1 flex flex-col items-center justify-between py-12 bg-gradient-to-b from-background to-secondary/20">
                <div className="text-center space-y-4">
                  <Avatar className="h-24 w-24 mx-auto ring-4 ring-primary/10">
                    <AvatarFallback className="text-3xl">{activeContact?.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-2xl font-bold">{activeContact?.name}</h2>
                    <p className="text-muted-foreground">{callStatus === "calling" ? "Calling..." : "Connected"}</p>
                  </div>
                  {callStatus === "connected" && (
                     <Badge variant="outline" className="px-3 py-1 text-base font-mono bg-background">
                       {formatTime(callDuration)}
                     </Badge>
                  )}
                </div>

                {/* AI Visualizer */}
                {callStatus === "connected" && (
                  <div className="w-full max-w-md px-8 py-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                       <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" />
                       <span className="text-xs font-medium text-purple-600">Granola AI Recording</span>
                    </div>
                    <div className="flex items-center justify-center gap-1 h-12">
                      {[...Array(20)].map((_, i) => (
                        <div 
                          key={i} 
                          className="w-1 bg-primary/40 rounded-full animate-bounce"
                          style={{ 
                            height: `${Math.random() * 100}%`,
                            animationDelay: `${i * 0.05}s`,
                            animationDuration: '1s' 
                          }} 
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-6">
                   <Button variant="outline" size="icon" className="h-14 w-14 rounded-full" onClick={() => setIsMuted(!isMuted)}>
                     {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                   </Button>
                   <Button 
                     variant="destructive" 
                     size="icon" 
                     className="h-14 w-14 rounded-full shadow-lg shadow-destructive/30"
                     onClick={handleHangup}
                   >
                     <PhoneOff className="h-6 w-6" />
                   </Button>
                   <Button variant="outline" size="icon" className="h-14 w-14 rounded-full">
                     <Users className="h-6 w-6" />
                   </Button>
                </div>
              </div>
            )}

            {/* SUMMARY STATE */}
            {callStatus === "summary" && (
              <div className="flex-1 p-8 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
                 {!generatedSummary ? (
                   <div className="text-center space-y-4">
                     <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                     <h3 className="text-lg font-medium">Generating Call Summary...</h3>
                     <p className="text-sm text-muted-foreground">AI is analyzing the conversation and extracting tasks.</p>
                   </div>
                 ) : (
                   <div className="w-full max-w-md space-y-6">
                     <div className="text-center mb-6">
                       <div className="inline-flex items-center justify-center p-3 bg-green-100 text-green-700 rounded-full mb-4">
                         <CheckCircle2 className="h-8 w-8" />
                       </div>
                       <h2 className="text-2xl font-bold">Call Summary Ready</h2>
                       <p className="text-muted-foreground">Saved to {activeContact?.name}'s profile</p>
                     </div>

                     <Card>
                       <CardHeader className="pb-3 bg-secondary/30">
                         <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                           <FileText className="h-4 w-4" /> Notes
                         </CardTitle>
                       </CardHeader>
                       <CardContent className="pt-4 text-sm leading-relaxed">
                         {generatedSummary.summary}
                       </CardContent>
                     </Card>

                     <Card>
                       <CardHeader className="pb-3 bg-secondary/30">
                         <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                           <ListTodo className="h-4 w-4" /> Action Items
                         </CardTitle>
                       </CardHeader>
                       <CardContent className="pt-4">
                         <ul className="space-y-3">
                           {generatedSummary.tasks.map((task: string, i: number) => (
                             <li key={i} className="flex items-start gap-2 text-sm">
                               <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                               {task}
                             </li>
                           ))}
                         </ul>
                       </CardContent>
                     </Card>

                     <Button className="w-full" onClick={closeSummary}>Done</Button>
                   </div>
                 )}
              </div>
            )}

          </div>
        </Card>
      </div>
    </Layout>
  );
}
