import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Sparkles, Target, Briefcase, Heart, Check, Plus, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

type ProfileData = {
  id?: string;
  intakeStep: number;
  intakeCompletedAt?: string | null;
  mtp: string | null;
  missionStatement: string | null;
  coreValues: string[];
  philosophy: string | null;
  decisionFramework: string | null;
  yearsExperience: number | null;
  teamStructure: string | null;
  annualGoalTransactions: number | null;
  annualGoalGci: number | null;
  specializations: string[];
  focusAreas: string[];
  familySummary: string | null;
  hobbies: string[];
  communityInvolvement: string | null;
};

const SPECIALIZATIONS = [
  { value: "luxury", label: "Luxury Properties" },
  { value: "first_time", label: "First-Time Buyers" },
  { value: "investment", label: "Investment Properties" },
  { value: "relocation", label: "Relocation" },
  { value: "commercial", label: "Commercial" },
  { value: "land", label: "Land & Lots" },
  { value: "new_construction", label: "New Construction" },
  { value: "condos", label: "Condos & Townhomes" },
];

const TEAM_STRUCTURES = [
  { value: "solo", label: "Solo Agent" },
  { value: "team_lead", label: "Team Leader" },
  { value: "team_member", label: "Team Member" },
  { value: "partnership", label: "Partnership" },
  { value: "brokerage_owner", label: "Brokerage Owner" },
];

const STEPS = [
  { id: 1, title: "Guiding Principles", icon: Target, description: "Your mission, values, and decision framework" },
  { id: 2, title: "Professional Profile", icon: Briefcase, description: "Experience, specializations, and goals" },
  { id: 3, title: "Personal Context", icon: Heart, description: "Help your AI understand you better" },
];

function ValueInput({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("");
  
  const addValue = () => {
    if (input.trim() && !values.includes(input.trim())) {
      onChange([...values, input.trim()]);
      setInput("");
    }
  };
  
  const removeValue = (v: string) => {
    onChange(values.filter(val => val !== v));
  };
  
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a core value..."
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addValue())}
          data-testid="input-core-value"
        />
        <Button type="button" onClick={addValue} size="icon" variant="outline" data-testid="button-add-value">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {values.map((v, i) => (
          <Badge key={i} variant="secondary" className="gap-1" data-testid={`badge-value-${i}`}>
            {v}
            <button onClick={() => removeValue(v)} className="ml-1 hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}

function AreaInput({ areas, onChange }: { areas: string[]; onChange: (a: string[]) => void }) {
  const [input, setInput] = useState("");
  
  const addArea = () => {
    if (input.trim() && !areas.includes(input.trim())) {
      onChange([...areas, input.trim()]);
      setInput("");
    }
  };
  
  const removeArea = (a: string) => {
    onChange(areas.filter(area => area !== a));
  };
  
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a neighborhood or city..."
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addArea())}
          data-testid="input-focus-area"
        />
        <Button type="button" onClick={addArea} size="icon" variant="outline" data-testid="button-add-area">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {areas.map((a, i) => (
          <Badge key={i} variant="outline" data-testid={`badge-area-${i}`}>
            {a}
            <button onClick={() => removeArea(a)} className="ml-1 hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}

function HobbyInput({ hobbies, onChange }: { hobbies: string[]; onChange: (h: string[]) => void }) {
  const [input, setInput] = useState("");
  
  const addHobby = () => {
    if (input.trim() && !hobbies.includes(input.trim())) {
      onChange([...hobbies, input.trim()]);
      setInput("");
    }
  };
  
  const removeHobby = (h: string) => {
    onChange(hobbies.filter(hobby => hobby !== h));
  };
  
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a hobby or interest..."
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHobby())}
          data-testid="input-hobby"
        />
        <Button type="button" onClick={addHobby} size="icon" variant="outline" data-testid="button-add-hobby">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {hobbies.map((h, i) => (
          <Badge key={i} variant="secondary" data-testid={`badge-hobby-${i}`}>
            {h}
            <button onClick={() => removeHobby(h)} className="ml-1 hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}

export default function IntakePage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ["/api/profile"],
  });
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<ProfileData>>({});
  
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<ProfileData>) => {
      const res = await apiRequest("PUT", "/api/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
  });
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="intake-loading">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  const merged: ProfileData = {
    intakeStep: profile?.intakeStep ?? 0,
    intakeCompletedAt: profile?.intakeCompletedAt ?? null,
    mtp: formData.mtp ?? profile?.mtp ?? null,
    missionStatement: formData.missionStatement ?? profile?.missionStatement ?? null,
    coreValues: formData.coreValues ?? profile?.coreValues ?? [],
    philosophy: formData.philosophy ?? profile?.philosophy ?? null,
    decisionFramework: formData.decisionFramework ?? profile?.decisionFramework ?? null,
    yearsExperience: formData.yearsExperience ?? profile?.yearsExperience ?? null,
    teamStructure: formData.teamStructure ?? profile?.teamStructure ?? null,
    annualGoalTransactions: formData.annualGoalTransactions ?? profile?.annualGoalTransactions ?? null,
    annualGoalGci: formData.annualGoalGci ?? profile?.annualGoalGci ?? null,
    specializations: formData.specializations ?? profile?.specializations ?? [],
    focusAreas: formData.focusAreas ?? profile?.focusAreas ?? [],
    familySummary: formData.familySummary ?? profile?.familySummary ?? null,
    hobbies: formData.hobbies ?? profile?.hobbies ?? [],
    communityInvolvement: formData.communityInvolvement ?? profile?.communityInvolvement ?? null,
  };
  
  const progress = ((currentStep - 1) / STEPS.length) * 100;
  
  const saveAndContinue = async () => {
    const newStep = currentStep + 1;
    await updateMutation.mutateAsync({
      ...merged,
      intakeStep: newStep,
      intakeCompletedAt: newStep > STEPS.length ? new Date().toISOString() : null,
    });
    if (newStep > STEPS.length) {
      setLocation("/");
    } else {
      setCurrentStep(newStep);
      setFormData({});
    }
  };
  
  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setFormData({});
    }
  };
  
  const skipForNow = () => {
    setLocation("/");
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8" data-testid="intake-page">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold font-serif">Welcome to Memry</h1>
          </div>
          <p className="text-muted-foreground">
            Let's personalize your AI Chief of Staff experience
          </p>
        </div>
        
        <div className="mb-6">
          <Progress value={progress} className="h-2" data-testid="intake-progress" />
          <div className="flex justify-between mt-2">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`flex items-center gap-1 text-xs ${
                  currentStep >= step.id ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {currentStep > step.id ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <step.icon className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{step.title}</span>
              </div>
            ))}
          </div>
        </div>
        
        {currentStep === 1 && (
          <Card data-testid="step-1-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Guiding Principles
              </CardTitle>
              <CardDescription>
                These help your AI understand your "why" when offering advice and suggestions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="mtp">Master Transformative Purpose (MTP)</Label>
                <p className="text-xs text-muted-foreground">
                  Your big, audacious purpose - the impact you want to make
                </p>
                <Textarea
                  id="mtp"
                  placeholder="e.g., To help every family find their perfect home and build generational wealth through real estate"
                  value={merged.mtp || ""}
                  onChange={(e) => setFormData({ ...formData, mtp: e.target.value })}
                  rows={3}
                  data-testid="input-mtp"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mission">Mission Statement</Label>
                <p className="text-xs text-muted-foreground">
                  How you pursue your MTP day-to-day
                </p>
                <Textarea
                  id="mission"
                  placeholder="e.g., I guide clients through their real estate journey with expertise, empathy, and integrity"
                  value={merged.missionStatement || ""}
                  onChange={(e) => setFormData({ ...formData, missionStatement: e.target.value })}
                  rows={2}
                  data-testid="input-mission"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Core Values</Label>
                <p className="text-xs text-muted-foreground">
                  The principles that guide your decisions (add 3-5)
                </p>
                <ValueInput
                  values={merged.coreValues}
                  onChange={(v) => setFormData({ ...formData, coreValues: v })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="philosophy">Business Philosophy</Label>
                <p className="text-xs text-muted-foreground">
                  Your approach to building relationships and doing business
                </p>
                <Textarea
                  id="philosophy"
                  placeholder="e.g., Relationships first, transactions second. I focus on being a trusted advisor..."
                  value={merged.philosophy || ""}
                  onChange={(e) => setFormData({ ...formData, philosophy: e.target.value })}
                  rows={2}
                  data-testid="input-philosophy"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="decision">Decision Framework</Label>
                <p className="text-xs text-muted-foreground">
                  How do you evaluate opportunities and make business decisions?
                </p>
                <Textarea
                  id="decision"
                  placeholder="e.g., I ask: Does this align with my values? Will it serve my clients well? Does it energize me?"
                  value={merged.decisionFramework || ""}
                  onChange={(e) => setFormData({ ...formData, decisionFramework: e.target.value })}
                  rows={2}
                  data-testid="input-decision-framework"
                />
              </div>
            </CardContent>
          </Card>
        )}
        
        {currentStep === 2 && (
          <Card data-testid="step-2-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Professional Profile
              </CardTitle>
              <CardDescription>
                Help your AI understand your business context
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="years">Years in Real Estate</Label>
                  <Input
                    id="years"
                    type="number"
                    min={0}
                    value={merged.yearsExperience ?? ""}
                    onChange={(e) => setFormData({ ...formData, yearsExperience: parseInt(e.target.value) || null })}
                    data-testid="input-years"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="team">Team Structure</Label>
                  <Select
                    value={merged.teamStructure || ""}
                    onValueChange={(v) => setFormData({ ...formData, teamStructure: v })}
                  >
                    <SelectTrigger data-testid="select-team-structure">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {TEAM_STRUCTURES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transactions">Annual Transaction Goal</Label>
                  <Input
                    id="transactions"
                    type="number"
                    min={0}
                    placeholder="e.g., 24"
                    value={merged.annualGoalTransactions ?? ""}
                    onChange={(e) => setFormData({ ...formData, annualGoalTransactions: parseInt(e.target.value) || null })}
                    data-testid="input-transactions-goal"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gci">Annual GCI Goal ($)</Label>
                  <Input
                    id="gci"
                    type="number"
                    min={0}
                    placeholder="e.g., 250000"
                    value={merged.annualGoalGci ?? ""}
                    onChange={(e) => setFormData({ ...formData, annualGoalGci: parseInt(e.target.value) || null })}
                    data-testid="input-gci-goal"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Specializations</Label>
                <p className="text-xs text-muted-foreground">
                  What types of properties or clients do you focus on?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {SPECIALIZATIONS.map((s) => (
                    <div key={s.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={s.value}
                        checked={merged.specializations.includes(s.value)}
                        onCheckedChange={(checked) => {
                          const newSpecs = checked
                            ? [...merged.specializations, s.value]
                            : merged.specializations.filter((x) => x !== s.value);
                          setFormData({ ...formData, specializations: newSpecs });
                        }}
                        data-testid={`checkbox-spec-${s.value}`}
                      />
                      <label htmlFor={s.value} className="text-sm cursor-pointer">
                        {s.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Geographic Focus Areas</Label>
                <p className="text-xs text-muted-foreground">
                  Neighborhoods, cities, or regions you specialize in
                </p>
                <AreaInput
                  areas={merged.focusAreas}
                  onChange={(a) => setFormData({ ...formData, focusAreas: a })}
                />
              </div>
            </CardContent>
          </Card>
        )}
        
        {currentStep === 3 && (
          <Card data-testid="step-3-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Personal Context
              </CardTitle>
              <CardDescription>
                This helps your AI connect with you on FORD topics and build authentic relationships
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="family">Family Summary</Label>
                <p className="text-xs text-muted-foreground">
                  Spouse, kids, pets - whatever you're comfortable sharing
                </p>
                <Textarea
                  id="family"
                  placeholder="e.g., Married to Sarah, two kids (Emma 8, Jake 5), golden retriever named Max"
                  value={merged.familySummary || ""}
                  onChange={(e) => setFormData({ ...formData, familySummary: e.target.value })}
                  rows={2}
                  data-testid="input-family"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Hobbies & Interests</Label>
                <p className="text-xs text-muted-foreground">
                  What do you enjoy outside of work?
                </p>
                <HobbyInput
                  hobbies={merged.hobbies}
                  onChange={(h) => setFormData({ ...formData, hobbies: h })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="community">Community Involvement</Label>
                <p className="text-xs text-muted-foreground">
                  Volunteer work, organizations, causes you support
                </p>
                <Textarea
                  id="community"
                  placeholder="e.g., Board member at local Habitat for Humanity, youth soccer coach"
                  value={merged.communityInvolvement || ""}
                  onChange={(e) => setFormData({ ...formData, communityInvolvement: e.target.value })}
                  rows={2}
                  data-testid="input-community"
                />
              </div>
              
              <div className="bg-primary/5 p-4 rounded-lg">
                <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  How this helps
                </h4>
                <p className="text-xs text-muted-foreground">
                  Your AI will use this context to suggest conversation starters, 
                  identify shared interests with clients, and help you build deeper 
                  connections through authentic FORD conversations.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        
        <div className="flex justify-between mt-6">
          <div>
            {currentStep > 1 ? (
              <Button variant="ghost" onClick={goBack} data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            ) : (
              <Button variant="ghost" onClick={skipForNow} data-testid="button-skip">
                Skip for now
              </Button>
            )}
          </div>
          
          <Button
            onClick={saveAndContinue}
            disabled={updateMutation.isPending}
            data-testid="button-continue"
          >
            {updateMutation.isPending ? (
              "Saving..."
            ) : currentStep === STEPS.length ? (
              <>
                Complete Setup
                <Check className="h-4 w-4 ml-2" />
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
