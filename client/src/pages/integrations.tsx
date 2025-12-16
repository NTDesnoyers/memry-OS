import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { RefreshCw, CheckCircle2, AlertCircle, Link as LinkIcon, Settings, Clock, Eye, Share2, ListTodo, Bot, Video, FileText, Sparkles, Brain } from "lucide-react";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";
import { useToast } from "@/hooks/use-toast";

export default function Integrations() {
  const { toast } = useToast();
  
  // Cloze State
  const [clozeKey, setClozeKey] = useState(localStorage.getItem("cloze_api_key") || "");
  const [showClozeKey, setShowClozeKey] = useState(false);
  
  // Todoist State
  const [todoistKey, setTodoistKey] = useState(localStorage.getItem("todoist_api_key") || "");
  const [showTodoistKey, setShowTodoistKey] = useState(false);
  
  // OpenAI State
  const [openaiKey, setOpenaiKey] = useState(localStorage.getItem("openai_api_key") || "");
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);

  // Anthropic State
  const [anthropicKey, setAnthropicKey] = useState(localStorage.getItem("anthropic_api_key") || "");
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);

  // Google Gemini State
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem("gemini_api_key") || "");
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  // Fathom State
  const [fathomKey, setFathomKey] = useState(localStorage.getItem("fathom_api_key") || "");
  const [showFathomKey, setShowFathomKey] = useState(false);

  // Granola State
  const [granolaKey, setGranolaKey] = useState(localStorage.getItem("granola_api_key") || "");
  const [showGranolaKey, setShowGranolaKey] = useState(false);

  const saveKey = (service: string, key: string, storageKey: string) => {
    if (!key.trim()) return;
    localStorage.setItem(storageKey, key);
    toast({
      title: "Saved",
      description: `${service} API key saved securely.`,
    });
  };

  return (
    <Layout>
      <div className="min-h-screen bg-secondary/30 relative">
        <div 
          className="fixed inset-0 opacity-40 mix-blend-multiply pointer-events-none -z-10"
          style={{ backgroundImage: `url(${paperBg})`, backgroundSize: 'cover' }}
        />
        
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <header className="mb-8">
            <h1 className="text-3xl font-serif font-bold text-primary">Integrations</h1>
            <p className="text-muted-foreground">Manage your connections to external tools</p>
          </header>

          <div className="grid gap-8">
            {/* Cloze Integration */}
            <Card className="border-none shadow-md">
              <CardHeader className="bg-blue-50/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">C</div>
                  <div>
                    <CardTitle className="font-serif">Cloze CRM</CardTitle>
                    <CardDescription>Sync Contacts, Interactions, and Follow-ups</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input 
                      type={showClozeKey ? "text" : "password"} 
                      value={clozeKey}
                      onChange={(e) => setClozeKey(e.target.value)}
                      placeholder="sk_live_..."
                      className="bg-background/50"
                    />
                    <Button variant="outline" size="icon" onClick={() => setShowClozeKey(!showClozeKey)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => saveKey("Cloze", clozeKey, "cloze_api_key")}>Save</Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded border border-green-100">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Ready for One-Way Sync (Ninja OS → Cloze)</span>
                </div>
              </CardContent>
            </Card>

            {/* Todoist Integration */}
            <Card className="border-none shadow-md">
              <CardHeader className="bg-red-50/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">
                    <ListTodo className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="font-serif">Todoist</CardTitle>
                    <CardDescription>Auto-create tasks from voice dictation</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>API Token</Label>
                  <div className="flex gap-2">
                    <Input 
                      type={showTodoistKey ? "text" : "password"} 
                      value={todoistKey}
                      onChange={(e) => setTodoistKey(e.target.value)}
                      placeholder="Start with 'Voice Dictation'..."
                      className="bg-background/50"
                    />
                    <Button variant="outline" size="icon" onClick={() => setShowTodoistKey(!showTodoistKey)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => saveKey("Todoist", todoistKey, "todoist_api_key")}>Save</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Found in Todoist Settings → Integrations → Developer</p>
                </div>
              </CardContent>
            </Card>

            {/* OpenAI Integration */}
            <Card className="border-none shadow-md">
              <CardHeader className="bg-purple-50/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                    <Bot className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="font-serif">OpenAI (GPT-4)</CardTitle>
                    <CardDescription>Powers voice summarization and complex reasoning</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input 
                      type={showOpenaiKey ? "text" : "password"} 
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      placeholder="sk-..."
                      className="bg-background/50"
                    />
                    <Button variant="outline" size="icon" onClick={() => setShowOpenaiKey(!showOpenaiKey)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => saveKey("OpenAI", openaiKey, "openai_api_key")}>Save</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Anthropic Integration */}
            <Card className="border-none shadow-md">
              <CardHeader className="bg-orange-50/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold">
                    <Brain className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="font-serif">Anthropic (Claude)</CardTitle>
                    <CardDescription>Excellent for long context analysis and drafting</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input 
                      type={showAnthropicKey ? "text" : "password"} 
                      value={anthropicKey}
                      onChange={(e) => setAnthropicKey(e.target.value)}
                      placeholder="sk-ant-..."
                      className="bg-background/50"
                    />
                    <Button variant="outline" size="icon" onClick={() => setShowAnthropicKey(!showAnthropicKey)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => saveKey("Anthropic", anthropicKey, "anthropic_api_key")}>Save</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Google Gemini Integration */}
            <Card className="border-none shadow-md">
              <CardHeader className="bg-blue-50/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="font-serif">Google Gemini</CardTitle>
                    <CardDescription>Multimodal capabilities and fast processing</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input 
                      type={showGeminiKey ? "text" : "password"} 
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder="AIza..."
                      className="bg-background/50"
                    />
                    <Button variant="outline" size="icon" onClick={() => setShowGeminiKey(!showGeminiKey)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => saveKey("Google Gemini", geminiKey, "gemini_api_key")}>Save</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fathom.video Integration */}
            <Card className="border-none shadow-md">
              <CardHeader className="bg-emerald-50/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold">
                    <Video className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="font-serif">Fathom.video</CardTitle>
                    <CardDescription>Import meeting recordings and transcripts</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input 
                      type={showFathomKey ? "text" : "password"} 
                      value={fathomKey}
                      onChange={(e) => setFathomKey(e.target.value)}
                      placeholder="fathom_..."
                      className="bg-background/50"
                    />
                    <Button variant="outline" size="icon" onClick={() => setShowFathomKey(!showFathomKey)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => saveKey("Fathom", fathomKey, "fathom_api_key")}>Save</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Granola Integration */}
            <Card className="border-none shadow-md">
              <CardHeader className="bg-amber-50/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="font-serif">Granola</CardTitle>
                    <CardDescription>Enhanced meeting notes and summarization</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input 
                      type={showGranolaKey ? "text" : "password"} 
                      value={granolaKey}
                      onChange={(e) => setGranolaKey(e.target.value)}
                      placeholder="gn_..."
                      className="bg-background/50"
                    />
                    <Button variant="outline" size="icon" onClick={() => setShowGranolaKey(!showGranolaKey)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => saveKey("Granola", granolaKey, "granola_api_key")}>Save</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </Layout>
  );
}
