import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Megaphone, Pin } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-gray-100 text-gray-600",
  maintenance: "bg-amber-100 text-amber-700",
  utility: "bg-blue-100 text-blue-700",
  emergency: "bg-red-100 text-red-700",
  event: "bg-purple-100 text-purple-700",
  agm: "bg-green-100 text-green-700",
};

export default function PortalAnnouncements() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/announcements", { credentials: "include" })
      .then(r => r.json())
      .then(setAnnouncements)
      .finally(() => setLoading(false));
  }, []);

  const pinned = announcements.filter(a => a.isPinned);
  const recent = announcements.filter(a => !a.isPinned);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Building Notices</h1>
        <p className="text-muted-foreground text-sm">Official announcements from your building management</p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      ) : !announcements.length ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Megaphone className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No announcements yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Pin className="w-3 h-3" /> Pinned Notices
              </p>
              {pinned.map(ann => <AnnouncementCard key={ann.id} ann={ann} />)}
            </div>
          )}
          {recent.length > 0 && (
            <div className="space-y-3">
              {pinned.length > 0 && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">All Notices</p>}
              {recent.map(ann => <AnnouncementCard key={ann.id} ann={ann} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AnnouncementCard({ ann }: { ann: any }) {
  return (
    <Card className={ann.isPinned ? "border-primary/30 bg-primary/5" : ""} data-testid={`card-announcement-${ann.id}`}>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${CATEGORY_COLORS[ann.category] ?? "bg-gray-100 text-gray-600"}`}>
            {ann.category}
          </span>
          {ann.isPinned && (
            <span className="text-xs flex items-center gap-1 text-primary font-medium">
              <Pin className="w-3 h-3" /> Pinned
            </span>
          )}
        </div>
        <h3 className="font-semibold text-foreground mb-1">{ann.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{ann.content}</p>
        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
          {ann.authorName && <span>{ann.authorName}</span>}
          <span>{new Date(ann.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}</span>
        </div>
      </CardContent>
    </Card>
  );
}
