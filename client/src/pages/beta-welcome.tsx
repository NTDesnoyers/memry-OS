import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle2, ChevronRight, Sparkles, Users, MessageSquare, Zap, 
  Brain, Mic, FileSpreadsheet, Calendar, Mail, AlertCircle, Loader2,
  ArrowRight, Clock, Rocket
} from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";

const FEATURES_READY = [
  { icon: Brain, title: "AI Assistant", description: "Ask questions, get suggestions, draft messages with 9 AI tools" },
  { icon: Mic, title: "Voice Conversation", description: "Talk to your AI Chief of Staff instead of typing" },
  { icon: Zap, title: "Dormant Lead Revival", description: "Scan Gmail for contacts you've lost touch with" },
  { icon: Users, title: "Contact & FORD Tracking", description: "Track Family, Occupation, Recreation, Dreams for every relationship" },
  { icon: MessageSquare, title: "Command Palette Skills", description: "Quick shortcuts: compare listings, draft emails, bulk outreach" },
  { icon: Calendar, title: "Weekly Meeting Agenda", description: "Plan your week using Ninja Selling's proven methodology" },
];

const FEATURES_COMING = [
  { title: "CRM Integration", description: "Sync with Follow Up Boss, Cloze, Lofty, and more", eta: "February" },
  { title: "iMessage/SMS Sync", description: "Import text conversations with photos and media", eta: "Q1 2025" },
  { title: "Automatic Meeting Prep", description: "AI prepares talking points before every call", eta: "Q1 2025" },
];

const CRM_OPTIONS = [
  { id: 'follow_up_boss', label: 'Follow Up Boss' },
  { id: 'cloze', label: 'Cloze' },
  { id: 'lofty', label: 'Lofty/Chime' },
  { id: 'kvcore', label: 'kvCORE' },
  { id: 'boomtown', label: 'BoomTown' },
  { id: 'realvolve', label: 'Realvolve' },
  { id: 'other', label: 'Other' },
  { id: 'none', label: 'No CRM currently' },
];

export default function BetaWelcome() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<'intro' | 'signup' | 'success'>('intro');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    brokerage: '',
    isNinjaCertified: false,
    currentCRM: '',
    otherCRM: '',
    expectations: '',
    agreeToFeedback: false,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch('/api/beta/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: {
            name: data.name,
            email: data.email,
            phone: data.phone || undefined,
            brokerage: data.brokerage || undefined,
            isNinjaCertified: data.isNinjaCertified,
          },
          crmTools: data.currentCRM ? [data.currentCRM] : [],
          otherTools: data.otherCRM || undefined,
          painPoints: data.expectations || undefined,
          meetingTools: [],
          callTools: [],
          messagingTools: [],
          emailTools: ['gmail'],
          priorities: [],
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to sign up');
      }
      return res.json();
    },
    onSuccess: () => {
      setStep('success');
      toast.success('Welcome to the beta!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = () => {
    if (!formData.name || !formData.email) {
      toast.error('Please enter your name and email');
      return;
    }
    if (!formData.agreeToFeedback) {
      toast.error('Please agree to provide feedback during the beta');
      return;
    }
    submitMutation.mutate(formData);
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">You're In!</h1>
            <p className="text-gray-600 mb-6">
              Welcome to the Ninja OS beta. You now have full access to explore and test the platform.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-amber-900 mb-2">Quick Start Tips:</h3>
              <ul className="text-sm text-amber-800 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-amber-600">1.</span>
                  Press <kbd className="px-1.5 py-0.5 bg-amber-100 rounded text-xs font-mono">Cmd+K</kbd> to open the Command Palette
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600">2.</span>
                  Type <kbd className="px-1.5 py-0.5 bg-amber-100 rounded text-xs font-mono">&gt;</kbd> to ask the AI anything
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600">3.</span>
                  Type <kbd className="px-1.5 py-0.5 bg-amber-100 rounded text-xs font-mono">/</kbd> for quick skills like compare listings
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600">4.</span>
                  Use the feedback button (bottom right) to report bugs or ideas
                </li>
              </ul>
            </div>
            <Button 
              onClick={() => navigate('/')} 
              className="w-full bg-amber-600 hover:bg-amber-700"
              data-testid="button-go-to-dashboard"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'signup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">Join the Beta</CardTitle>
            <CardDescription>Tell us a bit about yourself</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  data-testid="input-beta-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  data-testid="input-beta-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="jane@example.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  data-testid="input-beta-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <Label htmlFor="brokerage">Brokerage (optional)</Label>
                <Input
                  id="brokerage"
                  data-testid="input-beta-brokerage"
                  value={formData.brokerage}
                  onChange={(e) => setFormData(prev => ({ ...prev, brokerage: e.target.value }))}
                  placeholder="Keller Williams, RE/MAX, etc."
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="ninja-certified"
                  data-testid="switch-beta-ninja"
                  checked={formData.isNinjaCertified}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isNinjaCertified: checked }))}
                />
                <Label htmlFor="ninja-certified">I'm Ninja Selling Certified</Label>
              </div>
            </div>

            <div className="pt-2">
              <Label className="text-base font-medium mb-3 block">What CRM do you currently use?</Label>
              <div className="grid grid-cols-2 gap-2">
                {CRM_OPTIONS.map((crm) => (
                  <label
                    key={crm.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                      formData.currentCRM === crm.id ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    data-testid={`radio-crm-${crm.id}`}
                  >
                    <input
                      type="radio"
                      name="currentCRM"
                      value={crm.id}
                      checked={formData.currentCRM === crm.id}
                      onChange={(e) => setFormData(prev => ({ ...prev, currentCRM: e.target.value }))}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      formData.currentCRM === crm.id ? 'border-amber-500' : 'border-gray-300'
                    }`}>
                      {formData.currentCRM === crm.id && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                    </div>
                    {crm.label}
                  </label>
                ))}
              </div>
              {formData.currentCRM === 'other' && (
                <Input
                  className="mt-2"
                  data-testid="input-other-crm"
                  value={formData.otherCRM}
                  onChange={(e) => setFormData(prev => ({ ...prev, otherCRM: e.target.value }))}
                  placeholder="Which CRM do you use?"
                />
              )}
            </div>

            <div>
              <Label htmlFor="expectations">What are you hoping to get from Ninja OS? (optional)</Label>
              <Textarea
                id="expectations"
                data-testid="input-beta-expectations"
                value={formData.expectations}
                onChange={(e) => setFormData(prev => ({ ...prev, expectations: e.target.value }))}
                placeholder="E.g., save time on follow-ups, never forget a birthday, close more referrals..."
                className="mt-2"
                rows={3}
              />
            </div>

            <label className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 cursor-pointer">
              <Checkbox
                checked={formData.agreeToFeedback}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, agreeToFeedback: checked as boolean }))}
                data-testid="checkbox-agree-feedback"
              />
              <div className="text-sm">
                <div className="font-medium text-amber-900">I agree to provide feedback</div>
                <div className="text-amber-700 mt-0.5">
                  As a beta tester, I'll share my experience and report any issues I encounter
                </div>
              </div>
            </label>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep('intro')} data-testid="button-back-to-intro">
                Back
              </Button>
              <Button 
                onClick={handleSubmit} 
                className="flex-1 bg-amber-600 hover:bg-amber-700"
                disabled={submitMutation.isPending}
                data-testid="button-submit-beta"
              >
                {submitMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Joining...</>
                ) : (
                  <>Join Beta <ChevronRight className="h-4 w-4 ml-2" /></>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <Badge className="bg-amber-100 text-amber-800 mb-4">Beta Access</Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Welcome to <span className="text-amber-600">Ninja OS</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your AI-powered relationship intelligence platform for Ninja Selling. 
            We're excited to have you as a beta tester!
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6">
            <div className="flex items-center gap-3 text-white">
              <Rocket className="h-6 w-6" />
              <h2 className="text-xl font-bold">What's Ready Now</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-4">
              {FEATURES_READY.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{feature.title}</div>
                    <div className="text-sm text-gray-500">{feature.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6">
            <div className="flex items-center gap-3 text-white">
              <Clock className="h-6 w-6" />
              <h2 className="text-xl font-bold">Coming Soon</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {FEATURES_COMING.map((feature, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-amber-100 bg-amber-50">
                  <div>
                    <div className="font-medium text-gray-900">{feature.title}</div>
                    <div className="text-sm text-gray-600">{feature.description}</div>
                  </div>
                  <Badge variant="outline" className="text-amber-700 border-amber-300">
                    {feature.eta}
                  </Badge>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <strong>Note:</strong> CRM integration is our top priority. For now, you can import contacts via CSV 
                  or add them manually. We're working to connect directly with Follow Up Boss, Cloze, and Lofty first.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <h3 className="font-bold text-lg mb-4">What We Ask of Beta Testers</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-amber-600">1</span>
              </div>
              <div className="font-medium">Explore Freely</div>
              <div className="text-sm text-gray-500 mt-1">Try all the features and push the limits</div>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-amber-600">2</span>
              </div>
              <div className="font-medium">Share Feedback</div>
              <div className="text-sm text-gray-500 mt-1">Use the feedback button to report bugs and ideas</div>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-amber-600">3</span>
              </div>
              <div className="font-medium">Be Patient</div>
              <div className="text-sm text-gray-500 mt-1">Things may break—that's why we need you!</div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Button 
            size="lg" 
            onClick={() => setStep('signup')} 
            className="bg-amber-600 hover:bg-amber-700 text-lg px-8"
            data-testid="button-join-beta"
          >
            Join the Beta
            <ChevronRight className="h-5 w-5 ml-2" />
          </Button>
          <p className="text-sm text-gray-500 mt-4">
            Already signed up? <a href="/" className="text-amber-600 hover:underline">Go to Dashboard</a>
          </p>
        </div>
      </div>
    </div>
  );
}
