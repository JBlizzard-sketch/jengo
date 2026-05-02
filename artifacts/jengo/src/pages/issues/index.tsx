import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  useListIssues, useGetIssuesSummary,
  getListIssuesQueryKey, getGetIssuesSummaryQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Plus, ChevronRight, Filter, Clock, ArrowUpDown } from "lucide-react";

function issueAgeLabel(createdAt: string): string {
  const hours = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  if (hours < 1) return "<1h";
  if (hours < 24) return `${Math.floor(hours)}h`;
  return `${Math.floor(hours / 24)}d`;
}

function isSLABreached(issue: { status: string; createdAt: string }): boolean {
  if (issue.status === "resolved" || issue.status === "closed") return false;
  const hours = (Date.now() - new Date(issue.createdAt).getTime()) / 3600000;
  return hours >= 48;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-700 border-red-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  resolved: "bg-green-100 text-green-700 border-green-200",
  closed: "bg-gray-100 text-gray-600 border-gray-200",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-blue-50 text-blue-600 border-blue-200",
  medium: "bg-amber-50 text-amber-600 border-amber-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  urgent: "bg-red-100 text-red-700 border-red-200",
};

const CATEGORY_LABELS: Record<string, string> = {
  noise: "Noise", maintenance: "Maintenance", parking: "Parking",
  visitor: "Visitor", utility: "Utility", security: "Security", other: "Other",
};

export default function Issues() {
  const [status, setStatus] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [sortOldest, setSortOldest] = useState(false);

  const params: Record<string, string> = {};
  if (status !== "all") params.status = status;
  if (category !== "all") params.category = category;
  if (priority !== "all") params.priority = priority;

  const { data: rawIssues, isLoading } = useListIssues(
    Object.keys(params).length ? params : undefined,
    { query: { queryKey: getListIssuesQueryKey(Object.keys(params).length ? params : undefined) } }
  );
  const { data: summary } = useGetIssuesSummary(
    undefined,
    { query: { queryKey: getGetIssuesSummaryQueryKey(undefined) } }
  );

  const issues = useMemo(() => {
    if (!rawIssues) return [];
    const sorted = [...rawIssues].sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortOldest ? diff : -diff;
    });
    return sorted;
  }, [rawIssues, sortOldest]);

  const slaBreachCount = useMemo(() => (rawIssues ?? []).filter(isSLABreached).length, [rawIssues]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Issues</h1>
          <p className="text-muted-foreground">Track and resolve resident complaints</p>
        </div>
        <Link href="/issues/new">
          <Button data-testid="button-new-issue" className="gap-2">
            <Plus className="w-4 h-4" />
            New Issue
          </Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Open", value: summary?.totalOpen ?? 0, color: "text-red-600" },
          { label: "In Progress", value: summary?.totalInProgress ?? 0, color: "text-amber-600" },
          { label: "Resolved", value: summary?.totalResolved ?? 0, color: "text-green-600" },
          { label: "Avg. Resolution", value: summary?.avgResolutionHours ? `${summary.avgResolutionHours}h` : "—", color: "text-primary" },
          { label: "SLA Breaches", value: slaBreachCount, color: slaBreachCount > 0 ? "text-red-700" : "text-muted-foreground" },
        ].map(item => (
          <Card key={item.label} className={item.label === "SLA Breaches" && slaBreachCount > 0 ? "border-red-200 bg-red-50/40" : ""}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className={`text-2xl font-bold mt-1 ${item.color}`}>{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36" data-testid="select-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-36" data-testid="select-category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-36" data-testid="select-priority">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
        {(status !== "all" || category !== "all" || priority !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setStatus("all"); setCategory("all"); setPriority("all"); }}>
            Clear
          </Button>
        )}
        <Button
          variant={sortOldest ? "secondary" : "ghost"}
          size="sm"
          className="gap-1 ml-auto"
          onClick={() => setSortOldest(v => !v)}
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          {sortOldest ? "Oldest first" : "Newest first"}
        </Button>
      </div>

      {/* Issues list */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading issues...</div>
          ) : !issues?.length ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No issues found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {issues.map(issue => (
                <Link key={issue.id} href={`/issues/${issue.id}`}>
                  <div className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors cursor-pointer" data-testid={`row-issue-${issue.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${STATUS_COLORS[issue.status]}`}>
                          {issue.status.replace("_", " ")}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${PRIORITY_COLORS[issue.priority]}`}>
                          {issue.priority}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded border bg-secondary text-secondary-foreground">
                          {CATEGORY_LABELS[issue.category]}
                        </span>
                      </div>
                      <p className="font-medium text-foreground truncate">{issue.title}</p>
                      {issue.assignedTo && (
                        <p className="text-xs text-muted-foreground mt-0.5">Assigned to: {issue.assignedTo}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      {isSLABreached(issue) && (
                        <span className="text-xs px-2 py-0.5 rounded border font-medium bg-red-100 text-red-700 border-red-200 flex items-center gap-1">
                          <Clock className="w-3 h-3" />SLA
                        </span>
                      )}
                      <p className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                        <Clock className="w-3 h-3" />{issueAgeLabel(issue.createdAt)}
                      </p>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
