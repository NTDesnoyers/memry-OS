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
  Palette
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Business Tracker", href: "/business-tracker", icon: PieChart },
  { name: "Phone & Dialer", href: "/phone", icon: Phone },
  { name: "Meetings", href: "/meetings", icon: Video },
  { name: "People", href: "/people", icon: Users },
  { name: "Relationships (FORD)", href: "/relationships", icon: Repeat },
  { name: "Weekly Agenda", href: "/weekly-report", icon: Calendar },
  { name: "Deals", href: "/deals", icon: BarChart3 },
  { name: "Visual Pricing", href: "/visual-pricing", icon: BarChart3 },
  { name: "Haves & Wants", href: "/haves-wants", icon: Mail },
  { name: "RE Reviews", href: "/reviews", icon: Home },
  { name: "Brand Center", href: "/brand-center", icon: Palette },
  { name: "Automation Hub", href: "/automation", icon: Workflow },
  { name: "Integrations", href: "/integrations", icon: Plug },
];

interface NavContentProps {
  location: string;
  setOpen: (open: boolean) => void;
  userName: string;
  userInitials: string;
  brokerage: string;
}

function NavContent({ location, setOpen, userName, userInitials, brokerage }: NavContentProps) {
  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-xl font-serif font-bold tracking-tight text-primary">Ninja OS</h1>
        <p className="text-xs text-muted-foreground mt-1">Operating System</p>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 text-base font-normal",
                  isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                )}
                onClick={() => setOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Button>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-serif font-bold">
            {userInitials}
          </div>
          <div className="text-sm flex-1 min-w-0">
            <p className="font-medium truncate">{userName}</p>
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

  const navProps = { location, setOpen, userName, userInitials, brokerage };

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <aside className="hidden md:block w-64 fixed inset-y-0 z-50">
        <NavContent {...navProps} />
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b px-4 py-3 flex items-center justify-between" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <span className="font-serif font-bold text-primary">Ninja OS</span>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <NavContent {...navProps} />
          </SheetContent>
        </Sheet>
      </div>

      <main className="flex-1 md:ml-64 pt-16 md:pt-0" style={{ paddingTop: 'max(4rem, calc(env(safe-area-inset-top) + 3rem))' }}>
        {children}
      </main>
    </div>
  );
}
