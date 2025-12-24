import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Users,
  Briefcase,
  CheckSquare,
  MessageSquare,
  Phone,
  Calendar,
  Home,
  Search,
  Plus,
  Sparkles,
  TrendingUp,
  UserPlus,
  FileText,
  Settings,
  Repeat,
  Inbox,
  GraduationCap,
  BookOpen,
  Link,
  Zap,
  Mail,
  BarChart3,
  RefreshCw,
  Send,
  Building2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Person {
  id: string;
  name: string;
  email?: string;
  segment?: string;
}

interface Deal {
  id: string;
  title?: string;
  personId?: string;
  stage?: string;
}

interface Task {
  id: string;
  title: string;
  status?: string;
  dueDate?: string;
}

const navigationCommands = [
  { name: "Dashboard", href: "/", icon: Home, keywords: ["home", "main"] },
  { name: "Flow", href: "/flow", icon: Repeat, keywords: ["timeline", "activity"] },
  { name: "People", href: "/people", icon: Users, keywords: ["contacts", "clients"] },
  { name: "Lead Inbox", href: "/leads", icon: Inbox, keywords: ["leads", "prospects"] },
  { name: "Insight Inbox", href: "/insights", icon: BookOpen, keywords: ["articles", "content", "reading"] },
  { name: "Business Tracker", href: "/business-tracker", icon: TrendingUp, keywords: ["deals", "pipeline"] },
  { name: "Calendar", href: "/calendar", icon: Calendar, keywords: ["schedule", "meetings"] },
  { name: "Coaching", href: "/coaching", icon: GraduationCap, keywords: ["training", "skills"] },
  { name: "Reviews", href: "/reviews", icon: FileText, keywords: ["weekly", "review"] },
  { name: "Settings", href: "/settings", icon: Settings, keywords: ["preferences", "config"] },
];

const quickActions = [
  { name: "Log a Call", action: "log_call", icon: Phone, keywords: ["phone", "conversation"] },
  { name: "Create Task", action: "create_task", icon: CheckSquare, keywords: ["todo", "reminder"] },
  { name: "Add Contact", action: "add_contact", icon: UserPlus, keywords: ["new", "person"] },
  { name: "Save URL", action: "save_url", icon: Link, keywords: ["article", "link", "content", "capture"] },
  { name: "Ask AI", action: "ai_query", icon: Sparkles, keywords: ["assistant", "help"] },
];

const skillPacks = [
  { 
    name: "Compare Listings", 
    action: "compare_listings", 
    icon: Building2, 
    keywords: ["zillow", "mls", "compare", "properties", "analysis"],
    description: "Paste listing URLs to get AI comparison table"
  },
  { 
    name: "Draft Revival Email", 
    action: "draft_revival", 
    icon: Mail, 
    keywords: ["dormant", "reengage", "email", "outreach"],
    description: "Generate personalized email for dormant contacts"
  },
  { 
    name: "Bulk Lead Outreach", 
    action: "bulk_outreach", 
    icon: RefreshCw, 
    keywords: ["leads", "batch", "follow", "nurture"],
    description: "AI-powered batch messaging for old leads"
  },
  { 
    name: "Quick Text Client", 
    action: "quick_text", 
    icon: Send, 
    keywords: ["sms", "text", "message", "contact"],
    description: "Fast compose and send text to a contact"
  },
  { 
    name: "Market Update", 
    action: "market_update", 
    icon: BarChart3, 
    keywords: ["market", "stats", "report", "newsletter"],
    description: "Generate market update content for sharing"
  },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [activeSkill, setActiveSkill] = useState<string | null>(null);

  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people"],
    enabled: open,
  });

  const { data: deals = [] } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
    enabled: open,
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: open,
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = useCallback((callback: () => void) => {
    setOpen(false);
    setInputValue("");
    callback();
  }, []);

  const handleNavigation = useCallback((href: string) => {
    handleSelect(() => setLocation(href));
  }, [handleSelect, setLocation]);

  const handleQuickAction = useCallback((action: string) => {
    handleSelect(() => {
      switch (action) {
        case "log_call":
          setLocation("/flow");
          setTimeout(() => {
            const event = new CustomEvent("ninja:open-log-interaction");
            window.dispatchEvent(event);
          }, 100);
          break;
        case "create_task":
          setLocation("/");
          setTimeout(() => {
            const event = new CustomEvent("ninja:open-create-task");
            window.dispatchEvent(event);
          }, 100);
          break;
        case "add_contact":
          setLocation("/people/new");
          break;
        case "save_url":
          setLocation("/insights");
          setTimeout(() => {
            const captureBtn = document.querySelector('[data-testid="button-quick-capture"]') as HTMLButtonElement;
            if (captureBtn) captureBtn.click();
          }, 200);
          break;
        case "ai_query":
          const event = new CustomEvent("ninja:open-ai-assistant");
          window.dispatchEvent(event);
          break;
      }
    });
  }, [handleSelect, setLocation]);

  const handlePersonSelect = useCallback((personId: string) => {
    handleSelect(() => setLocation(`/people/${personId}`));
  }, [handleSelect, setLocation]);

  const handleSkill = useCallback((action: string) => {
    handleSelect(() => {
      switch (action) {
        case "compare_listings":
          const listingUrls = prompt("Paste listing URLs (one per line or comma-separated):");
          if (listingUrls) {
            const event = new CustomEvent("ninja:open-ai-assistant", {
              detail: { 
                initialMessage: `Compare these real estate listings and create a detailed comparison table with key features, pros/cons, and recommendations:\n\n${listingUrls}`
              }
            });
            window.dispatchEvent(event);
          }
          break;
        case "draft_revival":
          setLocation("/revival");
          toast({
            title: "Draft Revival Email",
            description: "Select a dormant contact and click 'Revive' to generate a personalized email."
          });
          break;
        case "bulk_outreach":
          setLocation("/revival");
          toast({
            title: "Bulk Lead Outreach",
            description: "Scan for dormant contacts and approve them for batch outreach campaigns."
          });
          setTimeout(() => {
            const scanBtn = document.querySelector('[data-testid="button-scan"]') as HTMLButtonElement;
            if (scanBtn) scanBtn.click();
          }, 500);
          break;
        case "quick_text":
          const contactName = prompt("Enter contact name to text:");
          if (contactName) {
            const message = prompt("Enter your message:");
            if (message) {
              const event = new CustomEvent("ninja:open-ai-assistant", {
                detail: { 
                  initialMessage: `Draft a personalized text message to ${contactName}. My message intent: "${message}". Make it casual and friendly, keeping my voice and style.`
                }
              });
              window.dispatchEvent(event);
            }
          }
          break;
        case "market_update":
          const event = new CustomEvent("ninja:open-ai-assistant", {
            detail: { 
              initialMessage: `Generate a market update for my real estate newsletter. Include current trends, inventory levels, interest rate impacts, and actionable advice for buyers and sellers. Make it engaging and shareable.`
            }
          });
          window.dispatchEvent(event);
          break;
      }
    });
  }, [handleSelect, setLocation, toast]);

  const isAiQuery = inputValue.startsWith(">");
  const isSkillQuery = inputValue.startsWith("/");
  const searchTerm = isAiQuery ? inputValue.slice(1).trim() : isSkillQuery ? inputValue.slice(1).trim() : inputValue;

  const filteredPeople = people
    .filter((p) => p.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    .slice(0, 5);

  const filteredDeals = deals
    .filter((d) => d.title?.toLowerCase().includes(searchTerm.toLowerCase()))
    .slice(0, 3);

  const filteredTasks = tasks
    .filter((t) => t.title?.toLowerCase().includes(searchTerm.toLowerCase()) && t.status !== "completed")
    .slice(0, 3);

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Command Palette">
      <CommandInput
        placeholder="Search, > for AI, / for Skills..."
        value={inputValue}
        onValueChange={setInputValue}
        data-testid="command-palette-input"
      />
      <CommandList>
        <CommandEmpty>
          {isAiQuery ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
              <p>Press Enter to ask the AI Assistant</p>
              <p className="text-xs text-muted-foreground">"{searchTerm}"</p>
            </div>
          ) : isSkillQuery ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <Zap className="h-8 w-8 text-amber-500" />
              <p>Type to filter skills...</p>
              <p className="text-xs text-muted-foreground">e.g., /compare, /email, /text</p>
            </div>
          ) : (
            "No results found."
          )}
        </CommandEmpty>

        {isAiQuery && searchTerm && (
          <CommandGroup heading="AI Assistant">
            <CommandItem
              onSelect={() => handleQuickAction("ai_query")}
              data-testid="command-ai-query"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              <span>Ask: "{searchTerm}"</span>
            </CommandItem>
          </CommandGroup>
        )}

        {isSkillQuery && (
          <CommandGroup heading="Skills (DIA-Style Shortcuts)">
            {skillPacks
              .filter(skill => 
                !searchTerm || 
                skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                skill.keywords.some(k => k.includes(searchTerm.toLowerCase()))
              )
              .map((skill) => (
              <CommandItem
                key={skill.action}
                onSelect={() => handleSkill(skill.action)}
                data-testid={`command-skill-${skill.action}`}
              >
                <skill.icon className="mr-2 h-4 w-4 text-amber-500" />
                <div className="flex flex-col">
                  <span>{skill.name}</span>
                  <span className="text-xs text-muted-foreground">{skill.description}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!isAiQuery && !isSkillQuery && (
          <>
            <CommandGroup heading="Quick Actions">
              {quickActions.map((action) => (
                <CommandItem
                  key={action.action}
                  onSelect={() => handleQuickAction(action.action)}
                  data-testid={`command-action-${action.action}`}
                >
                  <action.icon className="mr-2 h-4 w-4" />
                  <span>{action.name}</span>
                  {action.action === "ai_query" && (
                    <CommandShortcut>{">"}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandGroup heading="Skills">
              {skillPacks
                .filter(skill => 
                  skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  skill.keywords.some(k => k.includes(searchTerm.toLowerCase()))
                )
                .map((skill) => (
                <CommandItem
                  key={skill.action}
                  onSelect={() => handleSkill(skill.action)}
                  data-testid={`command-skill-${skill.action}`}
                >
                  <skill.icon className="mr-2 h-4 w-4 text-amber-500" />
                  <div className="flex flex-col">
                    <span>{skill.name}</span>
                    <span className="text-xs text-muted-foreground">{skill.description}</span>
                  </div>
                  <CommandShortcut>/</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            {filteredPeople.length > 0 && (
              <CommandGroup heading="People">
                {filteredPeople.map((person) => (
                  <CommandItem
                    key={person.id}
                    onSelect={() => handlePersonSelect(person.id)}
                    data-testid={`command-person-${person.id}`}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    <span>{person.name}</span>
                    {person.segment && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {person.segment}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredDeals.length > 0 && (
              <CommandGroup heading="Deals">
                {filteredDeals.map((deal) => (
                  <CommandItem
                    key={deal.id}
                    onSelect={() => handleNavigation("/business-tracker")}
                    data-testid={`command-deal-${deal.id}`}
                  >
                    <Briefcase className="mr-2 h-4 w-4" />
                    <span>{deal.title || "Untitled Deal"}</span>
                    {deal.stage && (
                      <span className="ml-2 text-xs text-muted-foreground capitalize">
                        {deal.stage}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredTasks.length > 0 && (
              <CommandGroup heading="Tasks">
                {filteredTasks.map((task) => (
                  <CommandItem
                    key={task.id}
                    onSelect={() => handleNavigation("/")}
                    data-testid={`command-task-${task.id}`}
                  >
                    <CheckSquare className="mr-2 h-4 w-4" />
                    <span>{task.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandSeparator />

            <CommandGroup heading="Navigation">
              {navigationCommands.map((nav) => (
                <CommandItem
                  key={nav.href}
                  onSelect={() => handleNavigation(nav.href)}
                  data-testid={`command-nav-${nav.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <nav.icon className="mr-2 h-4 w-4" />
                  <span>{nav.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
