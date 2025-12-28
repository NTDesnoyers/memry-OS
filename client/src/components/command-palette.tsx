import { useEffect, useState, useCallback, useMemo } from "react";
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
  RefreshCw,
  Send,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isFounderMode, BETA_NAV_HREFS, BETA_QUICK_ACTION_IDS, BETA_SKILL_IDS } from "@/lib/feature-mode";

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

const allNavigationCommands = [
  { name: "Today", href: "/", icon: Home, keywords: ["home", "main", "dashboard"] },
  { name: "Flow", href: "/flow", icon: Repeat, keywords: ["timeline", "activity"] },
  { name: "Contacts", href: "/people", icon: Users, keywords: ["people", "clients"] },
  { name: "Drafts", href: "/drafts", icon: FileText, keywords: ["follow-up", "emails"] },
  { name: "Revival", href: "/revival", icon: Sparkles, keywords: ["dormant", "outreach"] },
  { name: "Add Memory", href: "/conversations", icon: MessageSquare, keywords: ["log", "interaction"] },
  { name: "Lead Inbox", href: "/leads", icon: Inbox, keywords: ["leads", "prospects"] },
  { name: "Insight Inbox", href: "/insights", icon: BookOpen, keywords: ["articles", "content", "reading"] },
  { name: "Business Tracker", href: "/business-tracker", icon: TrendingUp, keywords: ["deals", "pipeline"] },
  { name: "Calendar", href: "/calendar", icon: Calendar, keywords: ["schedule", "meetings"] },
  { name: "Coaching", href: "/coaching", icon: GraduationCap, keywords: ["training", "skills"] },
  { name: "Reviews", href: "/reviews", icon: FileText, keywords: ["weekly", "review"] },
  { name: "Settings", href: "/settings", icon: Settings, keywords: ["preferences", "config"] },
];

const allQuickActions = [
  { name: "Log a Call", action: "log_call", icon: Phone, keywords: ["phone", "conversation"], founderOnly: true },
  { name: "Create Task", action: "create_task", icon: CheckSquare, keywords: ["todo", "reminder"], founderOnly: true },
  { name: "Add Contact", action: "add_contact", icon: UserPlus, keywords: ["new", "person"], founderOnly: false },
  { name: "Save URL", action: "save_url", icon: Link, keywords: ["article", "link", "content", "capture"], founderOnly: true },
  { name: "Ask AI", action: "ai_query", icon: Sparkles, keywords: ["assistant", "help"], founderOnly: true },
];

const allSkillPacks = [
  { 
    name: "Draft Revival Email", 
    action: "draft_revival", 
    icon: Mail, 
    keywords: ["dormant", "reengage", "email", "outreach"],
    description: "Generate personalized email for dormant contacts",
    founderOnly: false
  },
  { 
    name: "Bulk Lead Outreach", 
    action: "bulk_outreach", 
    icon: RefreshCw, 
    keywords: ["leads", "batch", "follow", "nurture"],
    description: "AI-powered batch messaging for old leads",
    founderOnly: true
  },
  { 
    name: "Quick Text Client", 
    action: "quick_text", 
    icon: Send, 
    keywords: ["sms", "text", "message", "contact"],
    description: "Fast compose and send text to a contact",
    founderOnly: false
  },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  
  const founderMode = isFounderMode();
  
  const navigationCommands = useMemo(() => {
    if (founderMode) return allNavigationCommands;
    return allNavigationCommands.filter(nav => BETA_NAV_HREFS.has(nav.href));
  }, [founderMode]);
  
  const quickActions = useMemo(() => {
    if (founderMode) return allQuickActions;
    return allQuickActions.filter(action => BETA_QUICK_ACTION_IDS.has(action.action));
  }, [founderMode]);
  
  const skillPacks = useMemo(() => {
    if (founderMode) return allSkillPacks;
    return allSkillPacks.filter(skill => BETA_SKILL_IDS.has(skill.action));
  }, [founderMode]);

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
          toast({
            title: "Quick Text",
            description: "Open AI Assistant to draft a personalized text message."
          });
          const textEvent = new CustomEvent("ninja:open-ai-assistant", {
            detail: { 
              initialMessage: `Help me draft a quick text message to a client. I'll tell you who I'm texting and what I want to say...`
            }
          });
          window.dispatchEvent(textEvent);
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
        placeholder={founderMode ? "Search, > for AI, / for Skills..." : "Search contacts..."}
        value={inputValue}
        onValueChange={setInputValue}
        data-testid="command-palette-input"
      />
      <CommandList>
        <CommandEmpty>
          {isAiQuery && founderMode ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
              <p>Press Enter to ask the AI Assistant</p>
              <p className="text-xs text-muted-foreground">"{searchTerm}"</p>
            </div>
          ) : isSkillQuery ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <Zap className="h-8 w-8 text-amber-500" />
              <p>Type to filter skills...</p>
              <p className="text-xs text-muted-foreground">e.g., /draft, /text</p>
            </div>
          ) : (
            "No results found."
          )}
        </CommandEmpty>

        {founderMode && isAiQuery && searchTerm && (
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

            {!searchTerm && (
              <CommandGroup heading="Skills (type / for shortcuts)">
                {skillPacks.slice(0, 3).map((skill) => (
                  <CommandItem
                    key={skill.action}
                    onSelect={() => handleSkill(skill.action)}
                    data-testid={`command-skill-${skill.action}`}
                  >
                    <skill.icon className="mr-2 h-4 w-4 text-amber-500" />
                    <span>{skill.name}</span>
                    <CommandShortcut>/</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

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

            {founderMode && filteredDeals.length > 0 && (
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

            {founderMode && filteredTasks.length > 0 && (
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
