import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetJob, useGetContractor, useUpdateJob, useListBuildings,
  getGetJobQueryKey, getListBuildingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Wrench, Building, User, Calendar, DollarSign, CheckCircle, ChevronRight, Star } from "lucide-react";

const JOB_STATUS_COLORS: Record<string, string> = {
  quoted: "bg-gray-100 text-gray-700 border-gray-200",
  approved: "bg-blue-100 text-blue-700 border-blue-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  disputed: "bg-red-100 text-red-700 border-red-200",
};

const JOB_STATUS_NEXT: Record<string, string | null> = {
  quoted: "approved",
  approved: "in_progress",
  in_progress: "completed",
  completed: null,
  disputed: null,
};

const STATUS_STEPS = ["quoted", "approved", "in_progress", "completed"];

export default function JobDetail() {
  const [, params] = useRoute("/contractors/jobs/:id");
  const [, setLocation] = useLocation();
  const id = Number(params?.id);
  const qc = useQueryClient();

  const { data: job, isLoading } = useGetJob(id, {
    query: { queryKey: getGetJobQueryKey(id), enabled: !!id },
  });
  const { data: contractor } = useGetContractor(job?.contractorId ?? 0, {
    query: { queryKey: ["contractor", job?.contractorId], enabled: !!job?.contractorId },
  });
  const { data: buildings } = useListBuildings({
    query: { queryKey: getListBuildingsQueryKey() },
  });
  const updateJob = useUpdateJob();

  const [notes, setNotes] = useState<string | null>(null);
  const [finalAmount, setFinalAmount] = useState<string>("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [editingFinal, setEditingFinal] = useState(false);
  const [starRating, setStarRating] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [savingRating, setSavingRating] = useState(false);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading job...</div>;
  if (!job) return <div className="p-8 text-center text-muted-foreground">Job not found</div>;

  const buildingName = buildings?.find(b => b.id === job.buildingId)?.name ?? `Building #${job.buildingId}`;
  const nextStatus = JOB_STATUS_NEXT[job.status];
  const currentStep = STATUS_STEPS.indexOf(job.status);

  const advance = () => {
    if (!nextStatus) return;
    updateJob.mutate(
      {
        id: job.id,
        data: {
          status: nextStatus as any,
          completedDate: nextStatus === "completed" ? new Date().toISOString().split("T")[0] : undefined,
        }
      },
      { onSuccess: () => qc.invalidateQueries({ queryKey: getGetJobQueryKey(id) }) }
    );
  };

  const saveNotes = () => {
    updateJob.mutate(
      { id: job.id, data: { notes: notes ?? job.notes ?? undefined } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetJobQueryKey(id) });
          setEditingNotes(false);
        }
      }
    );
  };

  const saveFinalAmount = () => {
    const amt = parseFloat(finalAmount);
    if (isNaN(amt)) return;
    updateJob.mutate(
      { id: job.id, data: { finalAmount: amt } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetJobQueryKey(id) });
          setEditingFinal(false);
        }
      }
    );
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/contractors")} className="gap-1">
          <ArrowLeft className="w-4 h-4" />
          Contractors
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-100 rounded-xl">
            <Wrench className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{job.title}</h1>
            <span className={`text-xs px-2 py-0.5 rounded border font-medium mt-1 inline-block ${JOB_STATUS_COLORS[job.status]}`}>
              {job.status.replace("_", " ")}
            </span>
          </div>
        </div>
        {nextStatus && (
          <Button onClick={advance} disabled={updateJob.isPending} className="gap-2 shrink-0">
            <CheckCircle className="w-4 h-4" />
            Mark {nextStatus.replace("_", " ")}
          </Button>
        )}
      </div>

      {/* Progress stepper */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-0">
            {STATUS_STEPS.map((step, i) => {
              const done = i < currentStep;
              const active = i === currentStep;
              const future = i > currentStep;
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                      done ? "bg-green-500 border-green-500 text-white" :
                      active ? "bg-primary border-primary text-white" :
                      "bg-white border-gray-300 text-gray-400"
                    }`}>
                      {done ? "✓" : i + 1}
                    </div>
                    <span className={`text-xs mt-1 capitalize ${active ? "text-primary font-medium" : future ? "text-muted-foreground" : "text-green-600"}`}>
                      {step.replace("_", " ")}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 -mt-4 ${i < currentStep ? "bg-green-400" : "bg-gray-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Building className="w-4 h-4" />Building</CardTitle></CardHeader>
          <CardContent className="pt-0"><p className="font-medium">{buildingName}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><User className="w-4 h-4" />Contractor</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <p className="font-medium">{contractor?.name ?? `#${job.contractorId}`}</p>
            {contractor?.company && <p className="text-sm text-muted-foreground">{contractor.company}</p>}
            {contractor?.phone && <p className="text-sm text-muted-foreground">{contractor.phone}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4" />Dates</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(job.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
            {job.scheduledDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scheduled</span>
                <span>{job.scheduledDate}</span>
              </div>
            )}
            {job.completedDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed</span>
                <span className="text-green-600 font-medium">{job.completedDate}</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2"><DollarSign className="w-4 h-4" />Amounts</span>
              {job.status !== "completed" && !editingFinal && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => { setFinalAmount(String(job.finalAmount ?? "")); setEditingFinal(true); }}>
                  Set Final
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {job.quotedAmount != null && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Quoted</span>
                <span>KES {Number(job.quotedAmount).toLocaleString()}</span>
              </div>
            )}
            {editingFinal ? (
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Final amount"
                  value={finalAmount}
                  onChange={e => setFinalAmount(e.target.value)}
                  className="h-7 text-sm"
                />
                <Button size="sm" className="h-7 px-2" onClick={saveFinalAmount} disabled={updateJob.isPending}>Save</Button>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingFinal(false)}>✕</Button>
              </div>
            ) : job.finalAmount != null ? (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Final</span>
                <span className="font-semibold text-green-600">KES {Number(job.finalAmount).toLocaleString()}</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Final amount not set</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {job.description && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Description</CardTitle></CardHeader>
          <CardContent className="pt-0"><p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.description}</p></CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            Completion Notes
            {!editingNotes && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => { setNotes(job.notes ?? ""); setEditingNotes(true); }}>
                {job.notes ? "Edit" : "Add Notes"}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {editingNotes ? (
            <div className="space-y-2">
              <Textarea
                value={notes ?? ""}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add notes about the work completed, materials used, issues encountered..."
                rows={4}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveNotes} disabled={updateJob.isPending}>Save Notes</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingNotes(false)}>Cancel</Button>
              </div>
            </div>
          ) : job.notes ? (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">No notes yet</p>
          )}
        </CardContent>
      </Card>

      {/* Contractor rating — only shown on completed jobs */}
      {job.status === "completed" && job.contractorId && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              Rate Contractor
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {ratingSubmitted ? (
              <p className="text-sm text-green-700 font-medium flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                Rating saved — {starRating} star{starRating !== 1 ? "s" : ""}. Thank you!
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">How would you rate the quality of work on this job?</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onMouseEnter={() => setHoverStar(n)}
                      onMouseLeave={() => setHoverStar(0)}
                      onClick={() => setStarRating(n)}
                      className="p-0.5 transition-transform hover:scale-110"
                      data-testid={`star-${n}`}
                    >
                      <Star
                        className={`w-7 h-7 transition-colors ${n <= (hoverStar || starRating) ? "text-amber-400 fill-amber-400" : "text-gray-300"}`}
                      />
                    </button>
                  ))}
                  {starRating > 0 && (
                    <span className="ml-2 text-sm text-muted-foreground">
                      {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][starRating]}
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  disabled={starRating === 0 || savingRating}
                  onClick={async () => {
                    setSavingRating(true);
                    try {
                      await fetch(`/api/contractors/${job.contractorId}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ rating: starRating }),
                      });
                      setRatingSubmitted(true);
                    } finally {
                      setSavingRating(false);
                    }
                  }}
                  data-testid="button-submit-rating"
                >
                  {savingRating ? "Saving..." : "Submit Rating"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Linked issue */}
      {job.issueId && (
        <Card>
          <CardContent className="p-4">
            <a href={`/issues/${job.issueId}`} className="flex items-center justify-between hover:opacity-80">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 rounded"><Wrench className="w-3.5 h-3.5 text-amber-600" /></div>
                <span className="text-sm font-medium">Linked Issue #{job.issueId}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
