import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetIssue, useUpdateIssue, useListIssueComments, useAddIssueComment, useListContractors,
  getGetIssueQueryKey, getListIssueCommentsQueryKey, getListContractorsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle, Clock, Wrench, Paperclip, MessageSquare } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-700 border-red-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  resolved: "bg-green-100 text-green-700 border-green-200",
  closed: "bg-gray-100 text-gray-600 border-gray-200",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-blue-50 text-blue-600",
  medium: "bg-amber-50 text-amber-600",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const ROLE_COLORS: Record<string, string> = {
  resident: "bg-blue-100 text-blue-700",
  management: "bg-primary/10 text-primary",
  caretaker: "bg-green-100 text-green-700",
  security: "bg-gray-100 text-gray-700",
};

export default function IssueDetail() {
  const [, params] = useRoute("/issues/:id");
  const [, setLocation] = useLocation();
  const id = Number(params?.id);
  const qc = useQueryClient();

  const { data: issue, isLoading } = useGetIssue(id, { query: { queryKey: getGetIssueQueryKey(id), enabled: !!id } });
  const { data: comments } = useListIssueComments(id, { query: { queryKey: getListIssueCommentsQueryKey(id), enabled: !!id } });
  const { data: contractors } = useListContractors({ query: { queryKey: getListContractorsQueryKey() } });
  const updateIssue = useUpdateIssue();
  const addComment = useAddIssueComment();

  const [commentText, setCommentText] = useState("");
  const [authorName, setAuthorName] = useState("Management");
  const [authorRole, setAuthorRole] = useState<string>("management");
  const [resolutionNote, setResolutionNote] = useState("");

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!issue) return <div className="p-8 text-center text-muted-foreground">Issue not found</div>;

  const handleStatusChange = (newStatus: string) => {
    updateIssue.mutate(
      { id, data: { status: newStatus as any, resolutionNote: newStatus === "resolved" ? resolutionNote : undefined } },
      { onSuccess: () => qc.invalidateQueries({ queryKey: getGetIssueQueryKey(id) }) }
    );
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    addComment.mutate(
      { id, data: { authorName, authorRole: authorRole as any, content: commentText } },
      {
        onSuccess: () => {
          setCommentText("");
          qc.invalidateQueries({ queryKey: getListIssueCommentsQueryKey(id) });
        }
      }
    );
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <button onClick={() => setLocation("/issues")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm" data-testid="button-back">
        <ArrowLeft className="w-4 h-4" />
        Back to Issues
      </button>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-2 mb-2">
            <span className={`text-xs px-2 py-0.5 rounded border font-medium ${STATUS_COLORS[issue.status]}`}>
              {issue.status.replace("_", " ")}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${PRIORITY_COLORS[issue.priority]}`}>
              {issue.priority} priority
            </span>
            <span className="text-xs px-2 py-0.5 rounded border bg-secondary text-secondary-foreground capitalize">
              {issue.category}
            </span>
          </div>
          <CardTitle className="text-xl">{issue.title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Reported {new Date(issue.createdAt).toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {issue.description && (
            <p className="text-foreground leading-relaxed">{issue.description}</p>
          )}
          {issue.evidenceUrl && (
            <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
              <Paperclip className="w-4 h-4 text-muted-foreground" />
              <a href={issue.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline">
                View Evidence ({issue.evidenceType})
              </a>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Wrench className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Assigned to:</span>
            <Select
              value={issue.assignedTo ?? "__none__"}
              onValueChange={val => {
                updateIssue.mutate(
                  { id, data: { assignedTo: val === "__none__" ? "" : val } },
                  { onSuccess: () => qc.invalidateQueries({ queryKey: getGetIssueQueryKey(id) }) }
                );
              }}
            >
              <SelectTrigger className="h-7 text-sm w-52 border-dashed" data-testid="select-contractor">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Unassigned</SelectItem>
                {contractors?.map(c => (
                  <SelectItem key={c.id} value={c.name}>{c.name}{c.specialty ? ` — ${c.specialty}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {issue.resolutionNote && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-700 mb-1">Resolution Note</p>
              <p className="text-sm text-green-600">{issue.resolutionNote}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status update */}
      {issue.status !== "closed" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Update Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {issue.status !== "resolved" && (
              <Textarea
                placeholder="Resolution note (optional)"
                value={resolutionNote}
                onChange={e => setResolutionNote(e.target.value)}
                data-testid="input-resolution-note"
              />
            )}
            <div className="flex flex-wrap gap-2">
              {issue.status === "open" && (
                <Button size="sm" variant="outline" onClick={() => handleStatusChange("in_progress")} disabled={updateIssue.isPending} data-testid="button-mark-in-progress">
                  Mark In Progress
                </Button>
              )}
              {(issue.status === "open" || issue.status === "in_progress") && (
                <Button size="sm" className="gap-1" onClick={() => handleStatusChange("resolved")} disabled={updateIssue.isPending} data-testid="button-mark-resolved">
                  <CheckCircle className="w-4 h-4" />
                  Mark Resolved
                </Button>
              )}
              {issue.status === "resolved" && (
                <Button size="sm" variant="outline" onClick={() => handleStatusChange("closed")} disabled={updateIssue.isPending} data-testid="button-close-issue">
                  Close Issue
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Comments ({comments?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {comments?.map(comment => (
            <div key={comment.id} className="flex gap-3" data-testid={`comment-${comment.id}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{comment.authorName}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${ROLE_COLORS[comment.authorRole]}`}>
                    {comment.authorRole}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-sm text-foreground leading-relaxed bg-secondary/50 rounded-lg p-3">{comment.content}</p>
              </div>
            </div>
          ))}

          <div className="border-t pt-4 space-y-3">
            <div className="flex gap-2">
              <input
                className="border rounded-md px-3 py-1.5 text-sm flex-1 bg-background"
                placeholder="Your name"
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
                data-testid="input-author-name"
              />
              <Select value={authorRole} onValueChange={setAuthorRole}>
                <SelectTrigger className="w-36" data-testid="select-author-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="management">Management</SelectItem>
                  <SelectItem value="caretaker">Caretaker</SelectItem>
                  <SelectItem value="resident">Resident</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="Add a comment..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              data-testid="input-comment"
            />
            <Button size="sm" onClick={handleAddComment} disabled={addComment.isPending || !commentText.trim()} data-testid="button-add-comment">
              Add Comment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
