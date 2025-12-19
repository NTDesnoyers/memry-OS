import {
  Users,
  Calendar,
  BarChart3,
  Home,
  Repeat,
  LayoutDashboard,
  Menu,
  PieChart,
  Plug,
  Workflow,
  Phone,
  Video,
  Mail,
  Settings,
  Palette,
  Sparkles,
  MessageSquare,
  ChevronUp,
  LogOut
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { VoiceLogger } from "@/components/voice-logger";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Business Tracker", href: "/business-tracker", icon: PieChart },
  { name: "Phone & Dialer", href: "/phone", icon: Phone },
  { name: "Meetings", href: "/meetings", icon: Video },
  { name: "Conversations", href: "/conversations", icon: MessageSquare },
  { name: "People", href: "/people", icon: Users },
  { name: "Know Your People", href: "/know-your-people", icon: Sparkles },
  { name: "Relationships (FORD)", href: "/relationships", icon: Repeat },
  { name: "Weekly Agenda", href: "/weekly-report", icon: Calendar },
  { name: "Deals", href: "/deals", icon: BarChart3 },
  { name: "Visual Pricing", href: "/visual-pricing", icon: BarChart3 },
  { name: "Haves & Wants", href: "/haves-wants", icon: Mail },
  { name: "RE Reviews", href: "/reviews", icon: Home },
];

const profileMenuItems = [
  { name: "Brand Center", href: "/brand-center", icon: Palette },
  { name: "Integrations", href: "/integrations", icon: Plug },
  { name: "Automation", href: "/automation", icon: Workflow },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface NavContentProps {
  location: string;
  setOpen: (open: boolean) => void;
  userName: string;
  userInitials: string;
  brokerage: string;
  headshotUrl?: string;
}

function NavContent({ location, setOpen, userName, userInitials, brokerage, headshotUrl }: NavContentProps) {
  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-xl font-serif font-bold tracking-tight text-primary">Ninja OS</h1>
        <p className="text-xs text-muted-foreground mt-1">Operating System</p>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 text-base font-normal h-11 px-3",
                  isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                )}
                onClick={() => setOpen(false)}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </Button>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border space-y-2">
        {/* Settings button - clear and obvious */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 h-10 px-3 text-muted-foreground hover:text-foreground"
              data-testid="button-settings-menu"
            >
              <Settings className="h-5 w-5" />
              <span className="font-medium">Settings</span>
              <ChevronUp className="h-4 w-4 ml-auto" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-56 mb-1">
            {profileMenuItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <DropdownMenuItem 
                    className={cn("cursor-pointer gap-2", isActive && "bg-accent")}
                    onClick={() => setOpen(false)}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </DropdownMenuItem>
                </Link>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile info - compact display */}
        <div className="flex items-center gap-3 px-2 py-1">
          <Avatar className="h-8 w-8">
            {headshotUrl && <AvatarImage src={headshotUrl} alt={userName} />}
            <AvatarFallback className="bg-primary/10 text-primary font-serif font-bold text-xs">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="text-sm flex-1 min-w-0">
            <p className="font-medium truncate text-sm">{userName}</p>
            <p className="text-xs text-muted-foreground truncate">{brokerage}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ProfileData {
  name?: string;
  brokerage?: string;
  headshotUrl?: string;
}

export default function LayoutComponent({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then(res => res.json())
      .then(data => setProfile(data))
      .catch(() => setProfile(null));
  }, []);

  const userName = profile?.name || "Your Name";
  const userInitials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const brokerage = profile?.brokerage || "Ninja Selling";
  const headshotUrl = profile?.headshotUrl;

  const navProps = { location, setOpen, userName, userInitials, brokerage, headshotUrl };

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <aside className="hidden md:block w-64 fixed inset-y-0 z-50">
        <NavContent {...navProps} />
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b px-4 py-2 flex items-center justify-between will-change-transform" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
        <span className="font-serif font-bold text-primary text-lg">Ninja OS</span>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 will-change-transform">
            <NavContent {...navProps} />
          </SheetContent>
        </Sheet>
      </div>

      <main className="flex-1 md:ml-64 pt-16 md:pt-0" style={{ paddingTop: 'max(4rem, calc(env(safe-area-inset-top) + 3rem))' }}>
        {children}
      </main>
      
      <VoiceLogger />
    </div>
  );
}
