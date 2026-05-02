import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertCircle, Plus, ChevronRight, MessageSquare } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-700",
  in_progress: "bg-amber-100 text-amber-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-blue-50 text-blue-600",
  medium: "bg-amber-50 text-amber-600",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

function NewIssueDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", category: "maintenance", priority: "medium",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/portal/issues", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to submit issue");
      setOpen(false);
      setForm({ title: "", description: "", category: "maintenance", priority: "medium" });
      onCreated();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-testid="button-new-issue">
          <Plus className="w-4 h-4" />
          Report Issue
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Report an Issue</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Title</label>
            <Input
              placeholder="Brief description of the problem"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
              data-testid="input-title"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger data-testid="select-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["noise", "maintenance", "parking", "visitor", "utility", "security", "other"].map(c => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Priority</label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger data-testid="select-priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["low", "medium", "high", "urgent"].map(p => (
                    <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Details</label>
            <Textarea
              placeholder="Describe the issue in detail..."
              rows={4}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              data-testid="input-description"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full" data-testid="button-submit">
            {loading ? "Submitting..." : "Submit Issue"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PortalIssues() {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  const loadIssues = () => {
    fetch("/api/portal/issues", { credentials: "include" })
      .then(r => r.json())
      .then(setIssues)
      .finally(() => setLoading(false));
  };

  useEffect(loadIssues, []);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Issues</h1>
          <p className="text-muted-foreground text-sm">Tap an issue to view updates and send a message</p>
        </div>
        <NewIssueDialog onCreated={loadIssues} />
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      ) : !issues.length ? (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No issues reported yet</p>
            <p className="text-sm text-muted-foreground mt-1">Report noise, maintenance, parking, or other problems.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {issues.map(issue => (
            <button
              key={issue.id}
              className="w-full text-left"
              onClick={() => setLocation(`/portal/issues/${issue.id}`)}
              data-testid={`card-issue-${issue.id}`}
            >
              <Card className="hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-2 mb-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[issue.status]}`}>
                          {issue.status.replace("_", " ")}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${PRIORITY_COLORS[issue.priority]}`}>
                          {issue.priority}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground capitalize">
                          {issue.category}
                        </span>
                      </div>
                      <p className="font-medium text-foreground">{issue.title}</p>
                      {issue.description && (
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{issue.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span>{new Date(issue.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</span>
                        {issue.resolutionNote && (
                          <span className="text-green-600 font-medium">✓ Resolved</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 text-muted-foreground">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
