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
  LogOut,
  FileEdit,
  Handshake,
  Mic,
  UserX,
  Lightbulb,
  PanelLeftClose,
  PanelLeft,
  Pin,
  PinOff,
  TrendingUp,
  FileText,
  GraduationCap,
  Eye,
  Activity,
  Inbox
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { VoiceLogger } from "@/components/voice-logger";
import { useQuery } from "@tanstack/react-query";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Flow", href: "/flow", icon: Repeat },
  { name: "People", href: "/people", icon: Users },
  { name: "Life Events", href: "/life-events", icon: Eye },
  { name: "Event Log", href: "/event-log", icon: Activity },
  { name: "Lead Inbox", href: "/leads", icon: Inbox },
  { name: "Coaching", href: "/coaching", icon: GraduationCap },
  { name: "Business Tracker", href: "/business-tracker", icon: PieChart },
  { name: "Visual Pricing", href: "/visual-pricing", icon: TrendingUp },
  { name: "Reviews", href: "/reviews", icon: FileText },
  { name: "Content", href: "/content", icon: Lightbulb },
  { name: "Haves & Wants", href: "/haves-wants", icon: Mail },
  { name: "Referrals", href: "/referrals", icon: Handshake },
  { name: "Calendar", href: "/calendar", icon: Calendar },
];

const profileMenuItems = [
  { name: "Voice Profile", href: "/voice-profile", icon: Mic },
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
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  pinned?: boolean;
  onTogglePin?: () => void;
}

function NavContent({ location, setOpen, userName, userInitials, brokerage, headshotUrl, collapsed, onToggleCollapse, pinned, onTogglePin }: NavContentProps) {
  return (
    <div className={cn("flex flex-col h-full bg-sidebar border-r border-sidebar-border text-sidebar-foreground transition-all duration-200", collapsed && "w-16")}>
      <div className={cn("p-6 border-b border-sidebar-border", collapsed && "p-3 flex justify-center")}>
        {collapsed ? (
          <span className="text-xl font-serif font-bold text-primary">N</span>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-serif font-bold tracking-tight text-primary">Ninja OS</h1>
              <div className="flex items-center gap-1">
                {onTogglePin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onTogglePin}
                    title={pinned ? "Unpin sidebar" : "Pin sidebar"}
                    data-testid="pin-sidebar"
                  >
                    {pinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
                  </Button>
                )}
                {onToggleCollapse && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onToggleCollapse}
                    title="Collapse sidebar"
                    data-testid="collapse-sidebar"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Operating System</p>
          </>
        )}
      </div>
      <nav className={cn("flex-1 p-3 space-y-1 overflow-y-auto", collapsed && "p-2")}>
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 text-base font-normal h-11 px-3",
                  isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                  collapsed && "justify-center px-0"
                )}
                onClick={() => setOpen(false)}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Button>
            </Link>
          );
        })}
      </nav>
      <div className={cn("p-3 border-t border-sidebar-border space-y-2", collapsed && "p-2")}>
        {collapsed ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="w-full h-11"
              onClick={onToggleCollapse}
              title="Expand sidebar"
              data-testid="expand-sidebar"
            >
              <PanelLeft className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="w-full h-10"
                  data-testid="button-settings-menu-collapsed"
                  title="Settings"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="right" className="w-56 ml-1">
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
            <div className="flex justify-center py-1">
              <Avatar className="h-8 w-8">
                {headshotUrl && <AvatarImage src={headshotUrl} alt={userName} />}
                <AvatarFallback className="bg-primary/10 text-primary font-serif font-bold text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
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
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });
  const [pinned, setPinned] = useState(() => {
    const saved = localStorage.getItem('sidebarPinned');
    return saved !== 'false'; // Default to pinned
  });

  const toggleCollapse = () => {
    const newValue = !collapsed;
    setCollapsed(newValue);
    localStorage.setItem('sidebarCollapsed', String(newValue));
  };

  const togglePin = () => {
    const newValue = !pinned;
    setPinned(newValue);
    localStorage.setItem('sidebarPinned', String(newValue));
  };

  const { data: profile } = useQuery<ProfileData>({
    queryKey: ["/api/profile"],
    staleTime: 5 * 60 * 1000,
  });

  const userName = profile?.name || "Your Name";
  const userInitials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const brokerage = profile?.brokerage || "Ninja Selling";
  const headshotUrl = profile?.headshotUrl;

  const navProps = { 
    location, 
    setOpen, 
    userName, 
    userInitials, 
    brokerage, 
    headshotUrl,
    collapsed,
    onToggleCollapse: toggleCollapse,
    pinned,
    onTogglePin: togglePin
  };

  const sidebarWidth = collapsed ? 'w-16' : 'w-64';
  const mainMargin = collapsed ? 'md:ml-16' : 'md:ml-64';

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <aside className={cn("hidden md:block fixed inset-y-0 z-50 transition-all duration-200", sidebarWidth)}>
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
            <NavContent {...navProps} collapsed={false} />
          </SheetContent>
        </Sheet>
      </div>

      <main className={cn("flex-1 pt-16 md:pt-0 transition-all duration-200", mainMargin)} style={{ paddingTop: 'max(4rem, calc(env(safe-area-inset-top) + 3rem))' }}>
        {children}
      </main>
      
      <VoiceLogger />
    </div>
  );
}
