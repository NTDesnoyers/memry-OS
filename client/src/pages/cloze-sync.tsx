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
import { RefreshCw, CheckCircle2, AlertCircle, Link as LinkIcon, Settings, Clock, Eye } from "lucide-react";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";
import { useToast } from "@/hooks/use-toast";

export default function ClozeSync() {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState(localStorage.getItem("cloze_api_key") || "");
  const [showApiKey, setShowApiKey] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid API key",
        variant: "destructive"
      });
      return;
    }
    localStorage.setItem("cloze_api_key", apiKey);
    toast({
      title: "Success",
      description: "Cloze API key saved securely",
    });
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter an API key first",
        variant: "destructive"
      });
      return;
    }
    
    setSyncing(true);
    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Connection Successful",
        description: "Connected to Cloze API",
      });
      setSyncing(false);
    }, 1500);
  };

  const handleFullSync = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please configure your API key first",
        variant: "destructive"
      });
      return;
    }
    
    setSyncing(true);
    setTimeout(() => {
      toast({
        title: "Sync Complete",
        description: "Synced 47 contacts, 156 interactions, and 12 follow-ups to Cloze",
      });
      setSyncing(false);
    }, 2000);
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
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                C
              </div>
              <div>
                <h1 className="text-3xl font-serif font-bold text-primary">Cloze Integration</h1>
                <p className="text-muted-foreground">Sync Ninja OS data to your Cloze CRM</p>
              </div>
            </div>
          </header>

          <Tabs defaultValue="settings" className="w-full">
            <TabsList className="bg-card/50 backdrop-blur-sm">
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" /> Settings
              </TabsTrigger>
              <TabsTrigger value="mapping" className="gap-2">
                <LinkIcon className="h-4 w-4" /> Data Mapping
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <Clock className="h-4 w-4" /> Sync History
              </TabsTrigger>
            </TabsList>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6 mt-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Ninja OS is the source of truth.</strong> Data flows ONE direction: from Ninja OS → Cloze. Changes made in Cloze won't update here, but this allows Cloze to be a "downstream mirror" for reminders and follow-ups.
                </AlertDescription>
              </Alert>

              <Card className="border-none shadow-md">
                <CardHeader className="bg-primary/5 pb-4">
                  <CardTitle className="font-serif">API Key Configuration</CardTitle>
                  <CardDescription>Securely connect your Cloze account</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="api-key">Cloze API Key</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="api-key"
                        type={showApiKey ? "text" : "password"}
                        placeholder="sk_live_..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="bg-background/50"
                      />
                      <Button 
                        size="icon" 
                        variant="outline"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Find your API key at <code className="bg-muted px-1 py-0.5 rounded">Cloze Dashboard → Settings → API & Integrations</code>
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800"><strong>Note:</strong> Your API key is stored locally in your browser. It's never sent to any server except Cloze's official API.</p>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSaveApiKey} className="gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Save API Key
                    </Button>
                    <Button 
                      onClick={handleTestConnection} 
                      variant="outline"
                      disabled={syncing || !apiKey.trim()}
                      className="gap-2"
                    >
                      {syncing ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" /> Testing...
                        </>
                      ) : (
                        <>
                          <LinkIcon className="h-4 w-4" /> Test Connection
                        </>
                      )}
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-semibold">What Gets Synced?</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">Contacts (People)</p>
                          <p className="text-xs text-muted-foreground">Name, email, phone, tags, relationship status (Hot/Warm/Nurture)</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">Interactions</p>
                          <p className="text-xs text-muted-foreground">Call, email, text, in-person meetings with dates and summaries</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">FORD Records</p>
                          <p className="text-xs text-muted-foreground">Family, Occupation, Recreation, Dreams notes</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">Follow-ups & Tasks</p>
                          <p className="text-xs text-muted-foreground">Auto-generated follow-ups, due dates, completion status</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h3 className="font-semibold">Sync Options</h3>
                    <Button 
                      onClick={handleFullSync}
                      disabled={syncing || !apiKey.trim()}
                      className="w-full gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
                    >
                      {syncing ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" /> Full Sync in Progress...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" /> Sync All Data to Cloze
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      Syncs all contacts, interactions, and follow-ups. You can also sync individual records from their pages.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Data Mapping Tab */}
            <TabsContent value="mapping" className="space-y-6 mt-6">
              <Card className="border-none shadow-md">
                <CardHeader className="bg-primary/5 pb-4">
                  <CardTitle className="font-serif">Ninja OS → Cloze Field Mapping</CardTitle>
                  <CardDescription>How your data is transformed for Cloze</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">People / Contacts</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-secondary/50">
                          <tr>
                            <th className="p-3 text-left font-medium">Ninja OS Field</th>
                            <th className="p-3 text-left font-medium">Cloze Field</th>
                            <th className="p-3 text-left font-medium">Type</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {[
                            { from: "first_name + last_name", to: "Name", type: "Text" },
                            { from: "email", to: "Email", type: "Email" },
                            { from: "phone", to: "Phone", type: "Phone" },
                            { from: "tags", to: "Tags", type: "Array" },
                            { from: "status (Hot/Warm/Nurture)", to: "Custom Field: Status", type: "Select" },
                            { from: "relationship_type", to: "Custom Field: Type", type: "Select" },
                            { from: "notes", to: "Notes", type: "Text" },
                          ].map((row, i) => (
                            <tr key={i} className="hover:bg-secondary/20">
                              <td className="p-3"><code className="bg-muted px-2 py-1 rounded text-xs">{row.from}</code></td>
                              <td className="p-3"><code className="bg-muted px-2 py-1 rounded text-xs">{row.to}</code></td>
                              <td className="p-3"><Badge variant="outline">{row.type}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Interactions</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-secondary/50">
                          <tr>
                            <th className="p-3 text-left font-medium">Ninja OS Field</th>
                            <th className="p-3 text-left font-medium">Cloze Field</th>
                            <th className="p-3 text-left font-medium">Type</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {[
                            { from: "date", to: "Interaction Date", type: "Date" },
                            { from: "interaction_type", to: "Interaction Type", type: "Select" },
                            { from: "summary", to: "Notes", type: "Text" },
                            { from: "counts_for_ford", to: "FORD Interaction", type: "Boolean" },
                          ].map((row, i) => (
                            <tr key={i} className="hover:bg-secondary/20">
                              <td className="p-3"><code className="bg-muted px-2 py-1 rounded text-xs">{row.from}</code></td>
                              <td className="p-3"><code className="bg-muted px-2 py-1 rounded text-xs">{row.to}</code></td>
                              <td className="p-3"><Badge variant="outline">{row.type}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Follow-ups</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-secondary/50">
                          <tr>
                            <th className="p-3 text-left font-medium">Ninja OS Field</th>
                            <th className="p-3 text-left font-medium">Cloze Field</th>
                            <th className="p-3 text-left font-medium">Type</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {[
                            { from: "due_date", to: "Due Date", type: "Date" },
                            { from: "follow_up_type", to: "Task Type", type: "Select" },
                            { from: "completed", to: "Completed", type: "Boolean" },
                            { from: "completion_notes", to: "Notes", type: "Text" },
                          ].map((row, i) => (
                            <tr key={i} className="hover:bg-secondary/20">
                              <td className="p-3"><code className="bg-muted px-2 py-1 rounded text-xs">{row.from}</code></td>
                              <td className="p-3"><code className="bg-muted px-2 py-1 rounded text-xs">{row.to}</code></td>
                              <td className="p-3"><Badge variant="outline">{row.type}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <Alert>
                    <AlertDescription>
                      <strong>One-way sync only:</strong> Ninja OS → Cloze. Any changes you make in Cloze won't update back to Ninja OS. This keeps Ninja OS as the authoritative source.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-6 mt-6">
              <Card className="border-none shadow-md">
                <CardHeader className="bg-primary/5 pb-4">
                  <CardTitle className="font-serif">Sync History</CardTitle>
                  <CardDescription>Recent syncs to Cloze</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {[
                      { date: "Today, 2:15 PM", type: "Full Sync", status: "Success", details: "47 contacts, 156 interactions, 12 follow-ups" },
                      { date: "Yesterday, 9:30 AM", type: "Contact: Alice Johnson", status: "Success", details: "Updated contact & FORD record" },
                      { date: "2 days ago, 3:45 PM", type: "Full Sync", status: "Success", details: "45 contacts, 142 interactions" },
                    ].map((sync, i) => (
                      <div key={i} className="border rounded-lg p-4 hover:bg-secondary/30 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{sync.type}</h4>
                              <Badge className={sync.status === "Success" ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-amber-100 text-amber-800 hover:bg-amber-200"}>
                                {sync.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{sync.details}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">{sync.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
