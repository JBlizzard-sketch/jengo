import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, MessageSquare, Send, AlertCircle, Loader2 } from "lucide-react";
import { useResidentAuth } from "@/contexts/resident-auth";

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

function CommentBubble({ comment, myName }: { comment: any; myName: string }) {
  const isMe = comment.authorRole === "resident";
  const initials = comment.authorName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className={`flex gap-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
        isMe ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
      }`}>
        {initials}
      </div>
      <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div className={`flex items-center gap-2 text-xs text-muted-foreground ${isMe ? "flex-row-reverse" : ""}`}>
          <span className="font-medium">{isMe ? "You" : comment.authorName}</span>
          <span className="capitalize px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary/60">
            {comment.authorRole === "management" ? "Management" : "Resident"}
          </span>
        </div>
        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isMe
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-card border border-border rounded-tl-sm"
        }`}>
          {comment.content}
        </div>
        <span className="text-[10px] text-muted-foreground">
          {new Date(comment.createdAt).toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

export default function PortalIssueDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { resident } = useResidentAuth();
  const [data, setData] = useState<{ issue: any; comments: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadData = () => {
    fetch(`/api/portal/issues/${params.id}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setLoading(false); });
  };

  useEffect(() => { loadData(); }, [params.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.comments.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/portal/issues/${params.id}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      const comment = await res.json();
      setData(prev => prev ? { ...prev, comments: [...prev.comments, comment] } : prev);
      setContent("");
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (!data) return (
    <div className="space-y-4 max-w-2xl">
      <Button variant="ghost" onClick={() => setLocation("/portal/issues")} className="gap-2">
        <ArrowLeft className="w-4 h-4" /> Back
      </Button>
      <div className="p-8 text-center text-muted-foreground">Issue not found.</div>
    </div>
  );

  const { issue, comments } = data;

  return (
    <div className="max-w-2xl flex flex-col h-full" style={{ maxHeight: "calc(100vh - 6rem)" }}>
      {/* Back + header */}
      <div className="mb-4 flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/portal/issues")} className="gap-2 mb-3 -ml-2">
          <ArrowLeft className="w-4 h-4" /> All Issues
        </Button>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2 mb-2">
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
            <h2 className="font-semibold text-base">{issue.title}</h2>
            {issue.description && (
              <p className="text-sm text-muted-foreground mt-1">{issue.description}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
              <span>Reported {new Date(issue.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</span>
              {issue.assignedTo && <span>Assigned: {issue.assignedTo}</span>}
              {issue.resolutionNote && (
                <span className="text-green-600 font-medium">✓ {issue.resolutionNote}</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Thread */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {comments.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs">Add a note below — management will respond here.</p>
          </div>
        ) : (
          comments.map(c => (
            <CommentBubble key={c.id} comment={c} myName={resident?.name ?? "You"} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      {issue.status !== "closed" && (
        <div className="flex-shrink-0">
          <form onSubmit={handleSend} className="flex gap-2 items-end">
            <Textarea
              placeholder="Add a note or update for management..."
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={2}
              className="resize-none flex-1"
              onKeyDown={e => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend(e as any);
              }}
              data-testid="input-comment"
            />
            <Button type="submit" disabled={sending || !content.trim()} size="icon" className="h-10 w-10 flex-shrink-0" data-testid="button-send">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
          <p className="text-[10px] text-muted-foreground mt-1">Ctrl+Enter to send</p>
        </div>
      )}
    </div>
  );
}
