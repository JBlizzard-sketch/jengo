import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  Building, 
  LayoutDashboard, 
  AlertCircle, 
  Megaphone, 
  Users, 
  CreditCard, 
  Wrench,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/buildings", label: "Buildings", icon: Building },
  { href: "/issues", label: "Issues", icon: AlertCircle },
  { href: "/announcements", label: "Announcements", icon: Megaphone },
  { href: "/visitors", label: "Visitors", icon: Users },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/contractors", label: "Contractors", icon: Wrench },
];

function SidebarNav({ isMobile = false, close = () => {} }) {
  const [location] = useLocation();

  return (
    <nav className="flex flex-col gap-2 p-4">
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
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-sidebar">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Jengo</h1>
          <p className="text-sm text-muted-foreground">Property Management</p>
        </div>
        <SidebarNav />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <h1 className="text-xl font-bold text-primary">Jengo</h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="p-6">
                <h1 className="text-2xl font-bold text-primary">Jengo</h1>
              </div>
              <SidebarNav isMobile />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
