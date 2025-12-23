import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Phone, Heart, Briefcase, Gamepad2, Star, Clock, Lightbulb, ArrowRight, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Person = {
  id: string;
  name: string;
  phone?: string | null;
  fordFamily?: string | null;
  fordOccupation?: string | null;
  fordRecreation?: string | null;
  fordDreams?: string | null;
  profession?: string | null;
  relationshipSegment?: string | null;
};

type Interaction = {
  id: string;
  personId: string | null;
  type: string;
  title: string | null;
  summary: string | null;
  occurredAt: string | null;
  createdAt: string;
};

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

interface PreCallDialogProps {
  person: Person | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCall?: () => void;
}

export function PreCallDialog({ person, open, onOpenChange, onCall }: PreCallDialogProps) {
  const { data: interactions = [] } = useQuery<Interaction[]>({
    queryKey: ["/api/interactions"],
    enabled: open && !!person,
  });
  
  if (!person) return null;
  
  const personInteractions = interactions
    .filter(i => i.personId === person.id)
    .sort((a, b) => new Date(b.occurredAt || b.createdAt).getTime() - new Date(a.occurredAt || a.createdAt).getTime());
  
  const lastInteraction = personInteractions[0];
  const hasFord = person.fordFamily || person.fordOccupation || person.fordRecreation || person.fordDreams;
  
  const handleCall = () => {
    if (person.phone) {
      window.location.href = `tel:${person.phone}`;
    }
    onCall?.();
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/10 text-lg">
                  {getInitials(person.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-xl">{person.name}</DialogTitle>
                <DialogDescription>
                  {person.profession || "No profession recorded"}
                  {person.relationshipSegment && ` • ${person.relationshipSegment}`}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 py-2">
            {lastInteraction && (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
                    <Clock className="h-4 w-4" />
                    Last Conversation
                  </CardTitle>
                  <CardDescription className="text-blue-600 text-xs">
                    {formatDistanceToNow(new Date(lastInteraction.occurredAt || lastInteraction.createdAt), { addSuffix: true })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <p className="text-sm">{lastInteraction.summary || lastInteraction.title || "No summary available"}</p>
                </CardContent>
              </Card>
            )}
            
            {hasFord && (
              <Card>
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm">FORD Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 px-4 pb-3">
                  {person.fordFamily && (
                    <div className="flex items-start gap-2">
                      <Heart className="h-4 w-4 text-pink-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Family</p>
                        <p className="text-sm">{person.fordFamily}</p>
                      </div>
                    </div>
                  )}
                  {person.fordOccupation && (
                    <div className="flex items-start gap-2">
                      <Briefcase className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Occupation</p>
                        <p className="text-sm">{person.fordOccupation}</p>
                      </div>
                    </div>
                  )}
                  {person.fordRecreation && (
                    <div className="flex items-start gap-2">
                      <Gamepad2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Recreation</p>
                        <p className="text-sm">{person.fordRecreation}</p>
                      </div>
                    </div>
                  )}
                  {person.fordDreams && (
                    <div className="flex items-start gap-2">
                      <Star className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Dreams</p>
                        <p className="text-sm">{person.fordDreams}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            <Card className="bg-purple-50 border-purple-200">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2 text-purple-700">
                  <Lightbulb className="h-4 w-4" />
                  Suggested Talking Points
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <ul className="space-y-1.5 text-sm">
                  {!person.fordFamily && <li className="flex items-center gap-2"><ArrowRight className="h-3 w-3 shrink-0" /> Ask about their family</li>}
                  {!person.fordRecreation && <li className="flex items-center gap-2"><ArrowRight className="h-3 w-3 shrink-0" /> Discover their hobbies</li>}
                  {!person.fordDreams && <li className="flex items-center gap-2"><ArrowRight className="h-3 w-3 shrink-0" /> Explore their goals and dreams</li>}
                  {lastInteraction?.summary && <li className="flex items-center gap-2"><ArrowRight className="h-3 w-3 shrink-0" /> Follow up on last conversation</li>}
                  {!lastInteraction && <li className="flex items-center gap-2"><ArrowRight className="h-3 w-3 shrink-0" /> This is your first recorded conversation!</li>}
                </ul>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
        
        <div className="pt-4 border-t flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleCall} data-testid="button-call-now">
            <Phone className="h-4 w-4 mr-2" />
            Call Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function usePreCallDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [person, setPerson] = useState<Person | null>(null);
  
  const openPreCall = (personToCall: Person) => {
    setPerson(personToCall);
    setIsOpen(true);
  };
  
  const closePreCall = () => {
    setIsOpen(false);
    setPerson(null);
  };
  
  return {
    isOpen,
    person,
    openPreCall,
    closePreCall,
    setIsOpen,
  };
}
