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
} from "lucide-react";

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
  { name: "Ask AI", action: "ai_query", icon: Sparkles, keywords: ["assistant", "help"] },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [, setLocation] = useLocation();

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

  const isAiQuery = inputValue.startsWith(">");
  const searchTerm = isAiQuery ? inputValue.slice(1).trim() : inputValue;

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
        placeholder="Search or type > to ask AI..."
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

        {!isAiQuery && (
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
