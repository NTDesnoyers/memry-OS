import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowRight, Clock, FileEdit, Mail, Sparkles, User } from "lucide-react";
import { FordTrackerCompact } from "@/components/ford-tracker";

interface Person {
  id: string;
  name: string;
  segment?: string | null;
  lastContact?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface GeneratedDraft {
  id: string;
  personId?: string | null;
  type: string;
  title?: string | null;
  status: string;
  person?: Person | null;
}

interface DormantOpportunity {
  id: string;
  personId?: string | null;
  status: string;
  dormancyScore?: number | null;
  daysSinceContact?: number | null;
  revivalReason?: string | null;
  person?: Person | null;
}

function getDaysOverdue(lastContact: string | null | undefined): number {
  if (!lastContact) return Number.MAX_SAFE_INTEGER;
  const lastDate = new Date(lastContact);
  const now = new Date();
  const diffTime = now.getTime() - lastDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function getContactFrequency(segment: string | null | undefined): number {
  switch (segment?.toLowerCase()) {
    case 'a': return 30;  // Monthly
    case 'b': return 90;  // Quarterly
    case 'c': return 180; // Bi-annually
    case 'd': return 365; // Annually
    default: return 90;   // Default to quarterly
  }
}

function getAttentionReason(person: Person): string {
  if (!person.lastContact) {
    return "No contact on record - reach out soon";
  }
  
  const days = getDaysOverdue(person.lastContact);
  const frequency = getContactFrequency(person.segment);
  const overdue = days - frequency;
  
  if (overdue > 365) {
    return `${Math.floor(overdue / 365)}+ years since last contact`;
  } else if (overdue > 180) {
    return `${Math.floor(overdue / 30)} months overdue for follow-up`;
  } else if (overdue > 30) {
    return `${overdue} days past scheduled contact`;
  } else {
    return "Due for a check-in";
  }
}

export function BetaNeedsAttention() {
  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  const { data: drafts = [] } = useQuery<GeneratedDraft[]>({
    queryKey: ["/api/generated-drafts"],
  });

  const { data: dormantOpportunities = [] } = useQuery<DormantOpportunity[]>({
    queryKey: ["/api/dormant-opportunities/pending"],
  });

  const pendingDrafts = drafts.filter(d => d.status === "pending");
  const hasPendingDrafts = pendingDrafts.length > 0;

  const overdueContacts = people
    .filter(p => {
      const days = getDaysOverdue(p.lastContact);
      const frequency = getContactFrequency(p.segment);
      return days > frequency;
    })
    .sort((a, b) => getDaysOverdue(b.lastContact) - getDaysOverdue(a.lastContact))
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <FordTrackerCompact />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <header className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-primary tracking-tight mb-2">
            Needs Your Attention
          </h1>
          <p className="text-muted-foreground">
            Relationships that could use a quick touch today
          </p>
        </header>

        {hasPendingDrafts && (
          <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10" data-testid="pending-drafts-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileEdit className="h-5 w-5 text-primary" />
                {pendingDrafts.length} Follow-up Draft{pendingDrafts.length > 1 ? 's' : ''} Ready
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Review and send personalized follow-ups with one click
              </p>
              <Link href="/drafts">
                <Button size="lg" className="w-full gap-2" data-testid="button-approve-drafts">
                  <Mail className="h-4 w-4" />
                  Approve Follow-up Drafts
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6" data-testid="overdue-contacts-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-orange-500" />
              Overdue Contacts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overdueContacts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Great! No overdue contacts right now.
              </p>
            ) : (
              overdueContacts.map((person) => (
                <Link key={person.id} href={`/people/${person.id}`}>
                  <div 
                    className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer group"
                    data-testid={`contact-overdue-${person.id}`}
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{person.name}</span>
                        {person.segment && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                            {person.segment}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                        <AlertCircle className="h-3 w-3 text-orange-500" />
                        {getAttentionReason(person)}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform flex-shrink-0 mt-3" />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {dormantOpportunities.length > 0 && (
          <Card className="border-purple-200/50 bg-gradient-to-r from-purple-50/50 to-indigo-50/50" data-testid="dormant-opportunities-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-purple-500" />
                {dormantOpportunities.length} Revival Opportunit{dormantOpportunities.length > 1 ? 'ies' : 'y'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Dormant leads ready for re-engagement campaigns
              </p>
              <Link href="/revival">
                <Button variant="outline" className="w-full gap-2" data-testid="button-view-revival">
                  <Sparkles className="h-4 w-4" />
                  View Revival Opportunities
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {!hasPendingDrafts && overdueContacts.length === 0 && dormantOpportunities.length === 0 && (
          <Card className="text-center py-8">
            <CardContent>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎉</span>
              </div>
              <h3 className="font-medium text-lg mb-2">You're all caught up!</h3>
              <p className="text-sm text-muted-foreground">
                No urgent follow-ups needed right now.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
