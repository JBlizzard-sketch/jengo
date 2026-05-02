import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useResidentAuth } from "@/contexts/resident-auth";
import { Building, LayoutDashboard, AlertCircle, Megaphone, Users, CreditCard, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV_ITEMS = [
  { href: "/portal/dashboard", label: "My Home", icon: LayoutDashboard },
  { href: "/portal/issues", label: "My Issues", icon: AlertCircle },
  { href: "/portal/payments", label: "Payments", icon: CreditCard },
  { href: "/portal/announcements", label: "Notices", icon: Megaphone },
  { href: "/portal/visitors", label: "My Visitors", icon: Users },
];

function SidebarNav({ close = () => {} }: { close?: () => void }) {
  const [location] = useLocation();
  const { resident, logout } = useResidentAuth();

  return (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <Building className="w-5 h-5 text-primary" />
          <span className="font-bold text-primary">Jengo</span>
          <span className="text-xs text-muted-foreground ml-1">Resident Portal</span>
        </div>
        {resident && (
          <div>
            <p className="font-semibold text-sm text-foreground">{resident.name}</p>
            <p className="text-xs text-muted-foreground">Unit {resident.unitNumber}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 flex flex-col gap-1 p-4">
        {NAV_ITEMS.map(item => {
          const active = location === item.href;
          return (
            <Link key={item.href} href={item.href} onClick={close}>
              <div className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${
                active
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}>
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground" onClick={logout} data-testid="button-logout">
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
        <a href="/" className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1">
          ← Management view
        </a>
      </div>
    </div>
  );
}

export function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden md:flex flex-col w-60 border-r border-border bg-sidebar">
        <SidebarNav />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-primary" />
            <span className="font-bold text-primary">Jengo</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon"><Menu className="w-5 h-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0">
              <SidebarNav />
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
