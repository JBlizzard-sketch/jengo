import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Building,
  LayoutDashboard,
  AlertCircle,
  Megaphone,
  Users,
  UserRound,
  CreditCard,
  Wrench,
  Menu,
  ExternalLink,
  Search,
  BarChart2,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SearchPalette } from "@/components/search-palette";

interface Alerts {
  openIssues: number;
  overduePayments: number;
  pendingVisitors: number;
  residentComments: number;
}

function Badge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function SidebarNav({
  alerts,
  onSearchOpen,
  close = () => {},
}: {
  alerts: Alerts | null;
  onSearchOpen: () => void;
  close?: () => void;
}) {
  const [location] = useLocation();

  const NAV_ITEMS = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard, badge: 0 },
    { href: "/buildings", label: "Buildings", icon: Building, badge: 0 },
    { href: "/residents", label: "Residents", icon: UserRound, badge: 0 },
    {
      href: "/issues",
      label: "Issues",
      icon: AlertCircle,
      badge: (alerts?.openIssues ?? 0) + (alerts?.residentComments ?? 0),
    },
    { href: "/announcements", label: "Announcements", icon: Megaphone, badge: 0 },
    { href: "/visitors", label: "Visitors", icon: Users, badge: alerts?.pendingVisitors ?? 0 },
    { href: "/payments", label: "Payments", icon: CreditCard, badge: alerts?.overduePayments ?? 0 },
    { href: "/reports", label: "Reports", icon: BarChart2, badge: 0 },
    { href: "/contractors", label: "Contractors", icon: Wrench, badge: 0 },
    { href: "/settings", label: "Settings", icon: Settings, badge: 0 },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Search button */}
      <div className="px-4 pb-2">
        <button
          onClick={() => { onSearchOpen(); close(); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground bg-muted/50 hover:bg-muted transition-colors border border-border"
          data-testid="button-search"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="text-[10px] font-mono bg-background border border-border rounded px-1 py-0.5">⌘K</kbd>
        </button>
      </div>

      <nav className="flex flex-col gap-1 px-4 pb-4 flex-1">
        {NAV_ITEMS.map((item) => {
          const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} onClick={close}>
              <div
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${
                  active
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                <Badge count={item.badge} />
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border">
        <a
          href="/portal"
          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          onClick={close}
        >
          <ExternalLink className="w-4 h-4 flex-shrink-0" />
          <span>Resident Portal</span>
        </a>
      </div>
    </div>
  );
}

export function MainLayout({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Alerts | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const load = () => {
      fetch("/api/dashboard/alerts")
        .then(r => r.ok ? r.json() : null)
        .then(d => d && setAlerts(d))
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-sidebar">
        <div className="p-6 pb-3">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Jengo</h1>
          <p className="text-sm text-muted-foreground">Property Management</p>
        </div>
        <SidebarNav alerts={alerts} onSearchOpen={() => setSearchOpen(true)} />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <h1 className="text-xl font-bold text-primary">Jengo</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)}>
              <Search className="w-5 h-5" />
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Menu className="w-6 h-6" />
                  {alerts &&
                    alerts.openIssues + alerts.overduePayments + alerts.pendingVisitors + alerts.residentComments >
                      0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-destructive" />
                    )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="p-6 pb-3">
                  <h1 className="text-2xl font-bold text-primary">Jengo</h1>
                </div>
                <SidebarNav alerts={alerts} onSearchOpen={() => setSearchOpen(true)} />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {children}
        </main>
      </div>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
