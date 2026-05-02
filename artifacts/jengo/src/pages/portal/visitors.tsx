import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Plus, LogIn, LogOut, XCircle, CheckCircle, Clock } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-blue-100 text-blue-700 border-blue-200",
  checked_in: "bg-green-100 text-green-700 border-green-200",
  checked_out: "bg-gray-100 text-gray-600 border-gray-200",
  denied: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_ICONS: Record<string, any> = {
  pending: Clock,
  approved: CheckCircle,
  checked_in: LogIn,
  checked_out: LogOut,
  denied: XCircle,
};

function NewVisitorDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    visitorName: "", visitorPhone: "", visitorIdNumber: "",
    purpose: "", expectedDate: new Date().toISOString().split("T")[0], expectedTime: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/portal/visitors", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      setOpen(false);
      setForm({ visitorName: "", visitorPhone: "", visitorIdNumber: "", purpose: "", expectedDate: new Date().toISOString().split("T")[0], expectedTime: "" });
      onCreated();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-testid="button-new-visitor">
          <Plus className="w-4 h-4" />
          Pre-clear Visitor
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Pre-clear a Visitor</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Full Name</label>
              <Input placeholder="Visitor's name" value={form.visitorName} onChange={e => setForm(f => ({ ...f, visitorName: e.target.value }))} required data-testid="input-name" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Phone</label>
              <Input placeholder="+254..." value={form.visitorPhone} onChange={e => setForm(f => ({ ...f, visitorPhone: e.target.value }))} data-testid="input-phone" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">ID Number (optional)</label>
            <Input placeholder="National ID / Passport" value={form.visitorIdNumber} onChange={e => setForm(f => ({ ...f, visitorIdNumber: e.target.value }))} data-testid="input-id" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Purpose of Visit</label>
            <Input placeholder="Family visit, delivery, contractor..." value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} data-testid="input-purpose" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Expected Date</label>
              <Input type="date" value={form.expectedDate} onChange={e => setForm(f => ({ ...f, expectedDate: e.target.value }))} required data-testid="input-date" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Expected Time</label>
              <Input type="time" value={form.expectedTime} onChange={e => setForm(f => ({ ...f, expectedTime: e.target.value }))} data-testid="input-time" />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full" data-testid="button-submit">
            {loading ? "Saving..." : "Pre-clear Visitor"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PortalVisitors() {
  const [visitors, setVisitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadVisitors = () => {
    fetch("/api/portal/visitors", { credentials: "include" })
      .then(r => r.json())
      .then(setVisitors)
      .finally(() => setLoading(false));
  };

  useEffect(loadVisitors, []);

  const today = visitors.filter(v => v.expectedDate === new Date().toISOString().split("T")[0]);
  const upcoming = visitors.filter(v => v.expectedDate > new Date().toISOString().split("T")[0]);
  const past = visitors.filter(v => v.expectedDate < new Date().toISOString().split("T")[0]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Visitors</h1>
          <p className="text-muted-foreground text-sm">Pre-clear visitors before they arrive at the gate</p>
        </div>
        <NewVisitorDialog onCreated={loadVisitors} />
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
        Pre-cleared visitors will be admitted by security without waiting for your phone call. All visitors arriving without pre-clearance will need your confirmation at the gate.
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      ) : !visitors.length ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No visitors pre-cleared yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {today.length > 0 && <VisitorGroup label="Today" visitors={today} />}
          {upcoming.length > 0 && <VisitorGroup label="Upcoming" visitors={upcoming} />}
          {past.length > 0 && <VisitorGroup label="Past" visitors={past} />}
        </div>
      )}
    </div>
  );
}

function VisitorGroup({ label, visitors }: { label: string; visitors: any[] }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {visitors.map(visitor => {
              const Icon = STATUS_ICONS[visitor.status] ?? Clock;
              return (
                <div key={visitor.id} className="p-4 flex items-center gap-3" data-testid={`row-visitor-${visitor.id}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${STATUS_COLORS[visitor.status]}`}>
                        {visitor.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="font-semibold text-foreground">{visitor.visitorName}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-0.5">
                      {visitor.visitorPhone && <span>{visitor.visitorPhone}</span>}
                      {visitor.purpose && <span>{visitor.purpose}</span>}
                      <span>{visitor.expectedDate}{visitor.expectedTime && ` at ${visitor.expectedTime}`}</span>
                    </div>
                    {visitor.checkInTime && (
                      <p className="text-xs text-green-600 mt-0.5">Checked in: {new Date(visitor.checkInTime).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}</p>
                    )}
                    {visitor.checkOutTime && (
                      <p className="text-xs text-gray-500 mt-0.5">Checked out: {new Date(visitor.checkOutTime).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}</p>
                    )}
                  </div>
                  <Icon className={`w-5 h-5 flex-shrink-0 ${visitor.status === "checked_in" ? "text-green-600" : visitor.status === "denied" ? "text-red-600" : "text-muted-foreground"}`} />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
