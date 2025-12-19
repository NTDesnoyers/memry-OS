import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MentionTextarea } from "@/components/mention-textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { type Person } from "@shared/schema";
import { toast } from "sonner";
import { 
  Users, 
  Heart, 
  Briefcase, 
  Gamepad2, 
  Star,
  ChevronRight,
  ChevronLeft,
  Check,
  SkipForward,
  Phone,
  Mail,
  Home,
  Sparkles
} from "lucide-react";

type FieldDef = {
  field: keyof Person;
  label: string;
  category: "ford" | "contact" | "history";
  icon: React.ReactNode;
  placeholder: string;
  isTextarea?: boolean;
};

const fieldDefinitions: FieldDef[] = [
  { field: "fordFamily", label: "Family", category: "ford", icon: <Heart className="h-4 w-4" />, placeholder: "Spouse, children, parents, pets...", isTextarea: true },
  { field: "fordOccupation", label: "Occupation", category: "ford", icon: <Briefcase className="h-4 w-4" />, placeholder: "Job title, company, work situation...", isTextarea: true },
  { field: "fordRecreation", label: "Recreation", category: "ford", icon: <Gamepad2 className="h-4 w-4" />, placeholder: "Hobbies, interests, sports, travel...", isTextarea: true },
  { field: "fordDreams", label: "Dreams", category: "ford", icon: <Star className="h-4 w-4" />, placeholder: "Goals, aspirations, bucket list items...", isTextarea: true },
  { field: "phone", label: "Phone Number", category: "contact", icon: <Phone className="h-4 w-4" />, placeholder: "(555) 123-4567" },
  { field: "email", label: "Email", category: "contact", icon: <Mail className="h-4 w-4" />, placeholder: "name@email.com" },
  { field: "address", label: "Address", category: "contact", icon: <Home className="h-4 w-4" />, placeholder: "123 Main St, City, State" },
];

type PersonWithMissing = Person & { missingFields: FieldDef[] };

export default function KnowYourPeople() {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [completedCount, setCompletedCount] = useState(0);

  const { data: people = [], isLoading } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  const peopleWithMissing = useMemo(() => {
    return people
      .map(person => {
        const missingFields = fieldDefinitions.filter(def => {
          const value = person[def.field];
          return !value || (typeof value === "string" && value.trim() === "");
        });
        return { ...person, missingFields } as PersonWithMissing;
      })
      .filter(p => p.missingFields.length > 0)
      .sort((a, b) => {
        const segmentOrder: Record<string, number> = { "A": 1, "B": 2, "C": 3, "D": 4 };
        const aOrder = segmentOrder[a.segment || "D"] || 5;
        const bOrder = segmentOrder[b.segment || "D"] || 5;
        return aOrder - bOrder;
      });
  }, [people]);

  // When navigating to a person, pre-fill fieldValues with their existing data
  const initializeFieldValues = (person: Person) => {
    const values: Record<string, string> = {};
    fieldDefinitions.forEach(def => {
      const value = person[def.field];
      if (value && typeof value === "string") {
        values[def.field] = value;
      }
    });
    setFieldValues(values);
  };

  const currentPerson = peopleWithMissing[currentIndex];
  const totalPeople = peopleWithMissing.length;
  const completedPeople = people.length - totalPeople;
  const overallProgress = people.length > 0 ? (completedPeople / people.length) * 100 : 0;

  const updateMutation = useMutation({
    mutationFn: async (data: { personId: string; updates: Partial<Person> }) => {
      const res = await fetch(`/api/people/${data.personId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data.updates),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      setCompletedCount(prev => prev + 1);
      toast.success("Saved!");
      moveToNext();
    },
    onError: () => {
      toast.error("Failed to save");
    },
  });

  const moveToNext = () => {
    if (currentIndex < totalPeople - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setFieldValues({});
    }
  };

  const moveToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Initialize field values when current person changes
  useEffect(() => {
    if (currentPerson) {
      initializeFieldValues(currentPerson);
    }
  }, [currentPerson?.id]);


  const handleSave = () => {
    if (!currentPerson) return;
    
    const updates: Partial<Person> = {};
    Object.entries(fieldValues).forEach(([field, value]) => {
      if (value.trim()) {
        (updates as any)[field] = value.trim();
      }
    });

    if (Object.keys(updates).length > 0) {
      updateMutation.mutate({ personId: currentPerson.id, updates });
    } else {
      moveToNext();
    }
  };

  const handleSkip = () => {
    moveToNext();
  };

  const getSegmentColor = (segment: string | null | undefined) => {
    switch (segment) {
      case "A": return "bg-green-100 text-green-800 border-green-300";
      case "B": return "bg-blue-100 text-blue-800 border-blue-300";
      case "C": return "bg-amber-100 text-amber-800 border-amber-300";
      case "D": return "bg-gray-100 text-gray-800 border-gray-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getCategoryStats = (fields: FieldDef[]) => {
    const ford = fields.filter(f => f.category === "ford").length;
    const contact = fields.filter(f => f.category === "contact").length;
    return { ford, contact };
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Sparkles className="h-8 w-8 animate-pulse mx-auto text-primary" />
            <p className="mt-2 text-muted-foreground">Loading your people...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (totalPeople === 0) {
    return (
      <Layout>
        <div className="min-h-screen bg-secondary/30">
          <div className="container max-w-2xl mx-auto py-12 px-4">
            <Card className="text-center py-12">
              <CardContent>
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-serif font-bold text-primary mb-2">All Caught Up!</h2>
                <p className="text-muted-foreground mb-6">
                  Every contact in your database has complete information. Nice work keeping your relationships organized.
                </p>
                <Link href="/people">
                  <Button data-testid="button-view-people">View All People</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  const stats = currentPerson ? getCategoryStats(currentPerson.missingFields) : { ford: 0, contact: 0 };

  return (
    <Layout>
      <div className="min-h-screen bg-secondary/30">
        <div className="container max-w-3xl mx-auto py-8 px-4">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-serif font-bold text-primary flex items-center gap-2">
                <Users className="h-6 w-6" />
                Know Your People
              </h1>
              <Badge variant="outline" className="text-sm">
                {currentIndex + 1} of {totalPeople}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              Let's fill in some gaps. I found {totalPeople} people with missing information.
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Database completeness</span>
                <span>{Math.round(overallProgress)}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>
          </div>

          {currentPerson && (
            <Card className="mb-6" data-testid={`card-person-${currentPerson.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Link href={`/people/${currentPerson.id}`}>
                      <CardTitle className="text-xl font-serif hover:text-primary/80 cursor-pointer" data-testid="link-person-name">
                        {currentPerson.name}
                      </CardTitle>
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      {currentPerson.segment && (
                        <Badge className={getSegmentColor(currentPerson.segment)} data-testid="badge-segment">
                          {currentPerson.segment}
                        </Badge>
                      )}
                      {currentPerson.role && (
                        <span className="text-sm text-muted-foreground">{currentPerson.role}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {stats.ford > 0 && <div>{stats.ford} FORD fields missing</div>}
                    {stats.contact > 0 && <div>{stats.contact} contact fields missing</div>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                  <p className="text-muted-foreground italic">
                    "What do you know about {currentPerson.name.split(" ")[0]}? Fill in what you can, skip what you don't know."
                  </p>
                </div>

                <div className="space-y-4">
                  {fieldDefinitions.filter(f => f.category === "ford").map((field) => {
                    const isMissing = currentPerson.missingFields.some(mf => mf.field === field.field);
                    return (
                      <div key={field.field} className="space-y-1">
                        <label className="flex items-center gap-2 text-sm font-medium">
                          {field.icon}
                          {field.label}
                          {!isMissing && <Check className="h-3 w-3 text-green-600" />}
                        </label>
                        <MentionTextarea
                          placeholder={`${field.placeholder} (type @ to mention someone)`}
                          value={fieldValues[field.field] || ""}
                          onChange={(value) => setFieldValues(prev => ({ ...prev, [field.field]: value }))}
                          className="resize-none"
                          rows={2}
                          data-testid={`input-${field.field}`}
                        />
                      </div>
                    );
                  })}
                  
                  {currentPerson.missingFields.filter(f => f.category === "contact").length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-3">Contact Info (optional)</p>
                      {fieldDefinitions.filter(f => f.category === "contact" && currentPerson.missingFields.some(mf => mf.field === f.field)).map((field) => (
                        <div key={field.field} className="space-y-1 mb-3">
                          <label className="flex items-center gap-2 text-sm font-medium">
                            {field.icon}
                            {field.label}
                          </label>
                          <Input
                            placeholder={field.placeholder}
                            value={fieldValues[field.field] || ""}
                            onChange={(e) => setFieldValues(prev => ({ ...prev, [field.field]: e.target.value }))}
                            data-testid={`input-${field.field}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="sticky bottom-0 bg-white pt-4 pb-2 border-t mt-4 -mx-6 px-6">
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="default"
                      onClick={moveToPrevious}
                      disabled={currentIndex === 0}
                      data-testid="button-previous"
                      className="flex-shrink-0"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Prev
                    </Button>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="default"
                        onClick={handleSkip}
                        data-testid="button-skip"
                      >
                        Skip
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        data-testid="button-save-next"
                        className="min-w-[100px]"
                      >
                        {updateMutation.isPending ? "Saving..." : "Save & Next"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {completedCount > 0 && (
            <div className="text-center text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 inline mr-1" />
              You've updated {completedCount} {completedCount === 1 ? "person" : "people"} this session!
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
