import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, LogIn, LogOut, XCircle, Search, Clock, CheckCircle, RefreshCw, Building } from "lucide-react";

interface GateVisitor {
  id: number;
  visitorName: string;
  visitorPhone: string | null;
  visitorIdNumber: string | null;
  purpose: string | null;
  expectedDate: string;
  expectedTime: string | null;
  status: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  buildingName: string | null;
  unitNumber: string | null;
  residentFirstName: string | null;
  residentLastName: string | null;
  residentPhone: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Expected", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  approved: { label: "Approved", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  checked_in: { label: "Checked In", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  checked_out: { label: "Checked Out", color: "text-gray-600", bg: "bg-gray-50 border-gray-200" },
  denied: { label: "Denied", color: "text-red-700", bg: "bg-red-50 border-red-200" },
};

function PinLogin({ onAuth }: { onAuth: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/gate/auth", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) throw new Error("Incorrect PIN");
      onAuth();
    } catch {
      setError("Incorrect PIN. Try again.");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xs space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-primary">Jengo</h1>
          <p className="text-muted-foreground text-sm">Gate Security Terminal</p>
        </div>
        <Card>
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block text-center">Enter Gate PIN</label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  className="text-center text-2xl tracking-widest h-14"
                  autoFocus
                  data-testid="input-pin"
                />
              </div>
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
              <Button type="submit" disabled={loading || pin.length < 4} className="w-full h-12 text-base">
                {loading ? "Checking..." : "Enter"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground">
          Security staff only. Contact management for PIN.
        </p>
      </div>
    </div>
  );
}

function VisitorCard({ visitor, onUpdate }: { visitor: GateVisitor; onUpdate: (v: GateVisitor) => void }) {
  const [loading, setLoading] = useState<string | null>(null);
  const cfg = STATUS_CONFIG[visitor.status] ?? STATUS_CONFIG.pending;

  const action = async (endpoint: string, label: string) => {
    setLoading(label);
    try {
      const res = await fetch(`/api/gate/visitors/${visitor.id}/${endpoint}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) onUpdate(await res.json());
    } finally {
      setLoading(null);
    }
  };

  const residentName = visitor.residentFirstName
    ? `${visitor.residentFirstName} ${visitor.residentLastName}`
    : null;

  return (
    <Card className={`border ${cfg.bg}`} data-testid={`card-visitor-${visitor.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground text-lg leading-tight">{visitor.visitorName}</p>
            {visitor.visitorPhone && (
              <a href={`tel:${visitor.visitorPhone}`} className="text-sm text-primary">{visitor.visitorPhone}</a>
            )}
            {visitor.visitorIdNumber && (
              <p className="text-xs text-muted-foreground font-mono">ID: {visitor.visitorIdNumber}</p>
            )}
          </div>
          <span className={`text-xs px-2 py-1 rounded-full border font-medium flex-shrink-0 ${cfg.color} ${cfg.bg}`}>
            {cfg.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
          {visitor.buildingName && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Building className="w-3 h-3" />
              <span className="truncate">{visitor.buildingName}</span>
            </div>
          )}
          {visitor.unitNumber && (
            <div className="text-muted-foreground">
              Unit <span className="font-medium text-foreground">{visitor.unitNumber}</span>
            </div>
          )}
          {residentName && (
            <div className="col-span-2 text-muted-foreground">
              Visiting <span className="font-medium text-foreground">{residentName}</span>
              {visitor.residentPhone && (
                <a href={`tel:${visitor.residentPhone}`} className="ml-2 text-primary">{visitor.residentPhone}</a>
              )}
            </div>
          )}
          {visitor.purpose && (
            <div className="col-span-2 text-muted-foreground">
              Purpose: <span className="text-foreground">{visitor.purpose}</span>
            </div>
          )}
          {visitor.expectedTime && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Expected {visitor.expectedTime}</span>
            </div>
          )}
          {visitor.checkInTime && (
            <div className="text-green-600 text-xs">
              In: {new Date(visitor.checkInTime).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
          {visitor.checkOutTime && (
            <div className="text-gray-500 text-xs">
              Out: {new Date(visitor.checkOutTime).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {(visitor.status === "pending" || visitor.status === "approved") && (
            <>
              <Button
                className="flex-1 h-11 gap-2 bg-green-600 hover:bg-green-700 text-white"
                disabled={!!loading}
                onClick={() => action("checkin", "checkin")}
                data-testid={`button-checkin-${visitor.id}`}
              >
                <LogIn className="w-4 h-4" />
                {loading === "checkin" ? "..." : "Check In"}
              </Button>
              <Button
                variant="outline"
                className="h-11 px-3 border-red-300 text-red-600 hover:bg-red-50"
                disabled={!!loading}
                onClick={() => action("deny", "deny")}
                data-testid={`button-deny-${visitor.id}`}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </>
          )}
          {visitor.status === "checked_in" && (
            <Button
              className="flex-1 h-11 gap-2 bg-gray-600 hover:bg-gray-700 text-white"
              disabled={!!loading}
              onClick={() => action("checkout", "checkout")}
              data-testid={`button-checkout-${visitor.id}`}
            >
              <LogOut className="w-4 h-4" />
              {loading === "checkout" ? "..." : "Check Out"}
            </Button>
          )}
          {(visitor.status === "checked_out" || visitor.status === "denied") && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {visitor.status === "checked_out"
                ? <><CheckCircle className="w-4 h-4 text-gray-500" /> Departed</>
                : <><XCircle className="w-4 h-4 text-red-500" /> Denied</>
              }
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function GatePage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [visitors, setVisitors] = useState<GateVisitor[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Check gate session on mount
  useEffect(() => {
    fetch("/api/gate/me", { credentials: "include" })
      .then(r => setAuthed(r.ok))
      .catch(() => setAuthed(false));
  }, []);

  const loadVisitors = () => {
    setLoading(true);
    fetch("/api/gate/visitors", { credentials: "include" })
      .then(r => r.json())
      .then(setVisitors)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (authed) loadVisitors();
  }, [authed]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!authed) return;
    const id = setInterval(loadVisitors, 30_000);
    return () => clearInterval(id);
  }, [authed]);

  const updateVisitor = (updated: GateVisitor) => {
    setVisitors(prev => prev.map(v => v.id === updated.id ? { ...v, ...updated } : v));
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return visitors;
    const q = search.toLowerCase();
    return visitors.filter(v =>
      v.visitorName.toLowerCase().includes(q) ||
      v.unitNumber?.toLowerCase().includes(q) ||
      v.visitorPhone?.includes(q) ||
      v.purpose?.toLowerCase().includes(q)
    );
  }, [visitors, search]);

  // Group by status priority
  const active = filtered.filter(v => v.status === "pending" || v.status === "approved");
  const checkedIn = filtered.filter(v => v.status === "checked_in");
  const done = filtered.filter(v => v.status === "checked_out" || v.status === "denied");

  const handleLogout = async () => {
    await fetch("/api/gate/logout", { method: "POST", credentials: "include" });
    setAuthed(false);
    setVisitors([]);
  };

  if (authed === null) return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      <Shield className="w-6 h-6 animate-pulse" />
    </div>
  );

  if (!authed) return <PinLogin onAuth={() => setAuthed(true)} />;

  const today = new Date().toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="bg-sidebar border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="font-bold text-primary">Jengo Gate</span>
          </div>
          <p className="text-xs text-muted-foreground">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={loadVisitors} disabled={loading} data-testid="button-refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground gap-1 text-xs">
            <LogOut className="w-3.5 h-3.5" /> Lock
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
            <p className="text-xl font-bold text-amber-700">{active.length + checkedIn.length}</p>
            <p className="text-[10px] text-amber-600 font-medium">Expected / In</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-2">
            <p className="text-xl font-bold text-green-700">{checkedIn.length}</p>
            <p className="text-[10px] text-green-600 font-medium">Currently In</p>
          </div>
          <div className="bg-secondary rounded-lg p-2">
            <p className="text-xl font-bold">{visitors.length}</p>
            <p className="text-[10px] text-muted-foreground font-medium">Today Total</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search visitor, unit or purpose..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-11"
            data-testid="input-search"
          />
        </div>

        {/* Visitor groups */}
        {visitors.length === 0 && !loading ? (
          <div className="py-16 text-center text-muted-foreground">
            <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No visitors expected today</p>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Expected / Awaiting Entry ({active.length})</p>
                <div className="space-y-3">
                  {active.map(v => <VisitorCard key={v.id} visitor={v} onUpdate={updateVisitor} />)}
                </div>
              </section>
            )}
            {checkedIn.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-2 mt-4">Currently Inside ({checkedIn.length})</p>
                <div className="space-y-3">
                  {checkedIn.map(v => <VisitorCard key={v.id} visitor={v} onUpdate={updateVisitor} />)}
                </div>
              </section>
            )}
            {done.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4">Departed / Denied ({done.length})</p>
                <div className="space-y-2">
                  {done.map(v => <VisitorCard key={v.id} visitor={v} onUpdate={updateVisitor} />)}
                </div>
              </section>
            )}
            {filtered.length === 0 && search && (
              <div className="py-8 text-center text-muted-foreground text-sm">No visitors matching "{search}"</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
