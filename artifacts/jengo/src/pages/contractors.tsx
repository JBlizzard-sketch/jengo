import { useState } from "react";
import {
  useListContractors, useCreateContractor, useListJobs, useCreateJob, useUpdateJob,
  useListBuildings,
  getListContractorsQueryKey, getListJobsQueryKey, getListBuildingsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Plus, Star, Wrench, ChevronRight, Printer, CheckCircle2, ClipboardCheck } from "lucide-react";
import { printHtml, formatDate, today, loadSettings } from "@/lib/print-utils";

const JOB_STATUS_COLORS: Record<string, string> = {
  quoted: "bg-gray-100 text-gray-600",
  approved: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  disputed: "bg-red-100 text-red-700",
};

const JOB_STATUS_NEXT: Record<string, string | null> = {
  quoted: "approved",
  approved: "in_progress",
  in_progress: "completed",
  completed: null,
  disputed: null,
};

const TRADE_LABELS: Record<string, string> = {
  plumbing: "Plumbing", electrical: "Electrical", carpentry: "Carpentry",
  painting: "Painting", cleaning: "Cleaning", security: "Security",
  landscaping: "Landscaping", general: "General", other: "Other",
};

const contractorSchema = z.object({
  name: z.string().min(2),
  company: z.string().optional(),
  trade: z.enum(["plumbing", "electrical", "carpentry", "painting", "cleaning", "security", "landscaping", "general", "other"]),
  phone: z.string().min(10),
  email: z.string().email().optional().or(z.literal("")),
});
type ContractorFormData = z.infer<typeof contractorSchema>;

const jobSchema = z.object({
  buildingId: z.coerce.number().min(1),
  contractorId: z.coerce.number().min(1),
  title: z.string().min(3),
  description: z.string().optional(),
  quotedAmount: z.coerce.number().positive().optional(),
  scheduledDate: z.string().optional(),
});
type JobFormData = z.infer<typeof jobSchema>;

function AddContractorDialog() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const createContractor = useCreateContractor();

  const form = useForm<ContractorFormData>({
    resolver: zodResolver(contractorSchema),
    defaultValues: { name: "", phone: "", trade: "general" },
  });

  const onSubmit = (data: ContractorFormData) => {
    createContractor.mutate(
      { data: { ...data, email: data.email || undefined } as any },
      { onSuccess: () => { qc.invalidateQueries({ queryKey: getListContractorsQueryKey() }); setOpen(false); form.reset(); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" data-testid="button-add-contractor">
          <Plus className="w-4 h-4" />
          Add Contractor
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Contractor</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} data-testid="input-name" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="company" render={({ field }) => (
                <FormItem><FormLabel>Company</FormLabel><FormControl><Input {...field} data-testid="input-company" /></FormControl></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="trade" render={({ field }) => (
              <FormItem>
                <FormLabel>Trade</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger data-testid="select-trade"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {Object.entries(TRADE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} data-testid="input-phone" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} data-testid="input-email" /></FormControl></FormItem>
              )} />
            </div>
            <Button type="submit" disabled={createContractor.isPending} className="w-full" data-testid="button-submit">
              {createContractor.isPending ? "Adding..." : "Add Contractor"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function printJobCard(job: any, contractor: any, building: any) {
  const s = loadSettings();
  const html = `
    <div class="header">
      <div>
        <div class="brand">${s.companyName}</div>
        <div style="font-size:12px;color:#666">${s.companyAddress} · ${s.companyPhone}</div>
        <h1 style="margin-top:8px">Work Order / Job Card</h1>
        <p style="color:#666;font-size:12px">Ref: JOB-${String(job.id).padStart(4,"0")}</p>
      </div>
      <div class="meta">
        <div style="font-size:11px;color:#888">Date Issued</div>
        <div style="font-size:12px;font-weight:600">${today()}</div>
        <div class="stamp" style="margin-top:8px;text-transform:uppercase">${job.status.replace("_"," ")}</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="box">
        <div class="label">Contractor</div>
        <div class="value">${contractor?.name ?? "—"}</div>
        ${contractor?.company ? `<div style="font-size:12px;color:#666;margin-top:2px">${contractor.company}</div>` : ""}
        ${contractor?.phone ? `<div style="font-size:12px;color:#666">${contractor.phone}</div>` : ""}
        <div style="font-size:11px;margin-top:4px;text-transform:capitalize;color:#555">${contractor?.trade ?? ""}</div>
      </div>
      <div class="box">
        <div class="label">Site / Building</div>
        <div class="value">${building?.name ?? "—"}</div>
        ${building?.address ? `<div style="font-size:12px;color:#666;margin-top:2px">${building.address}</div>` : ""}
      </div>
    </div>

    <div class="box section">
      <div class="label">Job Description</div>
      <div class="value" style="margin-top:6px">${job.title}</div>
      ${job.description ? `<p style="font-size:12px;color:#555;margin-top:8px">${job.description}</p>` : ""}
    </div>

    <div class="summary-grid">
      <div class="summary-box">
        <div class="label">Quoted Amount</div>
        <div class="value-lg">${job.quotedAmount ? `KES ${Number(job.quotedAmount).toLocaleString()}` : "TBD"}</div>
      </div>
      <div class="summary-box">
        <div class="label">Scheduled Date</div>
        <div class="value-lg">${job.scheduledDate ? formatDate(job.scheduledDate) : "—"}</div>
      </div>
      <div class="summary-box">
        <div class="label">Final Amount</div>
        <div class="value-lg" style="color:#15803d">${job.finalAmount ? `KES ${Number(job.finalAmount).toLocaleString()}` : "—"}</div>
      </div>
      <div class="summary-box">
        <div class="label">Completed Date</div>
        <div class="value-lg">${job.completedDate ? formatDate(job.completedDate) : "—"}</div>
      </div>
    </div>

    ${job.notes ? `
    <div class="box section">
      <div class="label">Completion Notes</div>
      <p style="font-size:13px;color:#444;margin-top:6px">${job.notes}</p>
    </div>` : ""}

    <div style="margin-top:48px;display:grid;grid-template-columns:1fr 1fr;gap:48px">
      <div>
        <div style="border-top:1px solid #000;padding-top:6px;margin-top:40px">
          <p style="font-weight:600">Authorised by (Client)</p>
          <p style="font-size:12px;color:#666">${s.companyName}</p>
          <p style="font-size:11px;color:#888;margin-top:4px">Date: _______________</p>
        </div>
      </div>
      <div>
        <div style="border-top:1px solid #000;padding-top:6px;margin-top:40px">
          <p style="font-weight:600">Contractor Signature</p>
          <p style="font-size:12px;color:#666">${contractor?.name ?? ""}</p>
          <p style="font-size:11px;color:#888;margin-top:4px">Date: _______________</p>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>Generated ${today()} by ${s.companyName} · Jengo Building Management Platform</p>
    </div>
  `;
  printHtml(html, `Job Card — ${job.title}`);
}

function CompleteJobDialog({
  job,
  onClose,
  onSuccess,
}: {
  job: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const qc = useQueryClient();
  const updateJob = useUpdateJob();
  const [finalAmount, setFinalAmount] = useState(job.quotedAmount ? String(Number(job.quotedAmount)) : "");
  const [notes, setNotes] = useState(job.notes ?? "");
  const [done, setDone] = useState(false);

  const submit = () => {
    updateJob.mutate(
      {
        id: job.id,
        data: {
          status: "completed",
          completedDate: new Date().toISOString().split("T")[0],
          finalAmount: finalAmount ? Number(finalAmount) : undefined,
          notes: notes || undefined,
        } as any,
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListJobsQueryKey() });
          setDone(true);
          onSuccess();
        },
      }
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-green-600" />
            Complete Job
          </DialogTitle>
        </DialogHeader>
        {!done ? (
          <div className="space-y-4">
            <div className="p-3 bg-muted/40 rounded text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{job.title}</p>
              {job.quotedAmount && <p className="text-xs mt-0.5">Quoted: KES {Number(job.quotedAmount).toLocaleString()}</p>}
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Final Amount (KES)</label>
              <Input
                type="number"
                min="0"
                placeholder={job.quotedAmount ? String(Number(job.quotedAmount)) : "e.g. 15000"}
                value={finalAmount}
                onChange={e => setFinalAmount(e.target.value)}
                data-testid="input-final-amount"
              />
              {finalAmount && job.quotedAmount && Number(finalAmount) !== Number(job.quotedAmount) && (
                <p className={`text-xs mt-1 font-medium ${Number(finalAmount) > Number(job.quotedAmount) ? "text-red-600" : "text-green-600"}`}>
                  {Number(finalAmount) > Number(job.quotedAmount) ? "+" : ""}
                  KES {(Number(finalAmount) - Number(job.quotedAmount)).toLocaleString()} vs quoted
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Completion Notes (optional)</label>
              <Textarea
                placeholder="Work completed, materials used, observations..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="text-sm resize-none"
                data-testid="textarea-completion-notes"
              />
            </div>
            {updateJob.error && (
              <p className="text-sm text-destructive">{(updateJob.error as Error).message}</p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button className="flex-1 gap-1 bg-green-600 hover:bg-green-700" onClick={submit} disabled={updateJob.isPending} data-testid="button-confirm-complete">
                <CheckCircle2 className="w-4 h-4" />
                {updateJob.isPending ? "Saving..." : "Mark Complete"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-2 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
            <p className="font-semibold text-green-800">Job Completed</p>
            <Button className="w-full" onClick={onClose}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RateContractorDialog({
  contractor,
  onClose,
}: {
  contractor: any;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [rating, setRating] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [done, setDone] = useState(false);

  const rateContractor = useMutation({
    mutationFn: async (r: number) => {
      const res = await fetch(`/api/contractors/${contractor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: r }),
      });
      if (!res.ok) throw new Error("Failed to save rating");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getListContractorsQueryKey() });
      setDone(true);
    },
  });

  const submit = () => {
    if (!rating) return;
    rateContractor.mutate(rating);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xs text-center">
        <DialogHeader>
          <DialogTitle>Rate Contractor</DialogTitle>
        </DialogHeader>
        {!done ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">{contractor.name}</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  className="focus:outline-none"
                  data-testid={`star-${n}`}
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${n <= (hover || rating) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-muted-foreground">
                {rating === 1 ? "Poor" : rating === 2 ? "Fair" : rating === 3 ? "Good" : rating === 4 ? "Very Good" : "Excellent"}
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>Skip</Button>
              <Button className="flex-1" onClick={submit} disabled={!rating || updateContractor.isPending} data-testid="button-submit-rating">
                Submit Rating
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-3">
            <p className="font-semibold text-green-700">Rating saved ✓</p>
            <Button className="w-full" onClick={onClose}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CommissionJobDialog({ contractors, buildings }: { contractors: any[]; buildings: any[] }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const createJob = useCreateJob();

  const form = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: { title: "", buildingId: 0, contractorId: 0 },
  });

  const onSubmit = (data: JobFormData) => {
    createJob.mutate(
      { data: data as any },
      { onSuccess: () => { qc.invalidateQueries({ queryKey: getListJobsQueryKey() }); setOpen(false); form.reset(); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-testid="button-commission-job">
          <Plus className="w-4 h-4" />
          Commission Job
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Commission Job</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="buildingId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Building</FormLabel>
                  <Select onValueChange={v => field.onChange(Number(v))} value={field.value ? String(field.value) : ""}>
                    <FormControl><SelectTrigger data-testid="select-building"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                    <SelectContent>{buildings.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="contractorId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contractor</FormLabel>
                  <Select onValueChange={v => field.onChange(Number(v))} value={field.value ? String(field.value) : ""}>
                    <FormControl><SelectTrigger data-testid="select-contractor"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                    <SelectContent>{contractors.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Job Title</FormLabel><FormControl><Input {...field} data-testid="input-title" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} rows={3} data-testid="input-description" /></FormControl></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="quotedAmount" render={({ field }) => (
                <FormItem><FormLabel>Quoted Amount (KES)</FormLabel><FormControl><Input type="number" {...field} data-testid="input-amount" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="scheduledDate" render={({ field }) => (
                <FormItem><FormLabel>Scheduled Date</FormLabel><FormControl><Input type="date" {...field} data-testid="input-date" /></FormControl></FormItem>
              )} />
            </div>
            <Button type="submit" disabled={createJob.isPending} className="w-full" data-testid="button-submit">
              {createJob.isPending ? "Creating..." : "Commission Job"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Contractors() {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [jobStatusFilter, setJobStatusFilter] = useState("all");
  const [jobBuildingFilter, setJobBuildingFilter] = useState("all");
  const [completingJob, setCompletingJob] = useState<any | null>(null);
  const [ratingContractor, setRatingContractor] = useState<any | null>(null);
  const { data: contractors, isLoading: loadingContractors } = useListContractors({ query: { queryKey: getListContractorsQueryKey() } });
  const jobParams: Record<string, unknown> = {};
  if (jobStatusFilter !== "all") jobParams.status = jobStatusFilter;
  if (jobBuildingFilter !== "all") jobParams.buildingId = Number(jobBuildingFilter);
  const { data: jobs, isLoading: loadingJobs } = useListJobs(
    Object.keys(jobParams).length ? jobParams as any : undefined,
    { query: { queryKey: getListJobsQueryKey(Object.keys(jobParams).length ? jobParams as any : undefined) } }
  );
  const { data: buildings } = useListBuildings({ query: { queryKey: getListBuildingsQueryKey() } });
  const updateJob = useUpdateJob();

  const contractorMap = Object.fromEntries((contractors ?? []).map(c => [c.id, c]));
  const buildingMap = Object.fromEntries((buildings ?? []).map(b => [b.id, b]));

  const advanceJob = (job: any) => {
    const next = JOB_STATUS_NEXT[job.status];
    if (!next) return;
    if (next === "completed") {
      setCompletingJob(job);
      return;
    }
    updateJob.mutate(
      { id: job.id, data: { status: next as any } },
      { onSuccess: () => qc.invalidateQueries({ queryKey: getListJobsQueryKey(Object.keys(jobParams).length ? jobParams as any : undefined) }) }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contractors</h1>
          <p className="text-muted-foreground">Manage contractors and commissioned jobs</p>
        </div>
        <div className="flex gap-2">
          <AddContractorDialog />
          <CommissionJobDialog contractors={contractors ?? []} buildings={buildings ?? []} />
        </div>
      </div>

      <Tabs defaultValue="jobs">
        <TabsList>
          <TabsTrigger value="jobs" data-testid="tab-jobs">Jobs ({jobs?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="contractors" data-testid="tab-contractors">Contractors ({contractors?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="mt-4 space-y-3">
          {/* Job filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={jobStatusFilter} onValueChange={setJobStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-job-status"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.keys(JOB_STATUS_COLORS).map(s => (
                  <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={jobBuildingFilter} onValueChange={setJobBuildingFilter}>
              <SelectTrigger className="w-52" data-testid="select-job-building"><SelectValue placeholder="All Buildings" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Buildings</SelectItem>
                {buildings?.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {(jobStatusFilter !== "all" || jobBuildingFilter !== "all") && (
              <Button variant="ghost" size="sm" onClick={() => { setJobStatusFilter("all"); setJobBuildingFilter("all"); }}>Clear</Button>
            )}
          </div>
          <Card>
            <CardContent className="p-0">
              {loadingJobs ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : !jobs?.length ? (
                <div className="p-12 text-center">
                  <Wrench className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No jobs found</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {jobs.map(job => {
                    const contractor = contractorMap[job.contractorId];
                    const building = buildingMap[job.buildingId];
                    const nextStatus = JOB_STATUS_NEXT[job.status];
                    return (
                    <div
                      key={job.id}
                      className="flex items-start justify-between p-4 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => setLocation(`/contractors/jobs/${job.id}`)}
                      data-testid={`row-job-${job.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${JOB_STATUS_COLORS[job.status]}`}>
                            {job.status.replace("_", " ")}
                          </span>
                          {contractor && (
                            <span className="text-xs text-muted-foreground">{contractor.name}</span>
                          )}
                          {building && (
                            <span className="text-xs text-muted-foreground">· {building.name}</span>
                          )}
                        </div>
                        <p className="font-medium text-foreground">{job.title}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-0.5">
                          {job.quotedAmount && <span>Quoted: KES {Number(job.quotedAmount).toLocaleString()}</span>}
                          {job.finalAmount && <span className="text-green-700 font-medium">Final: KES {Number(job.finalAmount).toLocaleString()}</span>}
                          {job.scheduledDate && <span>Scheduled: {formatDate(job.scheduledDate)}</span>}
                          {job.completedDate && <span>Completed: {formatDate(job.completedDate)}</span>}
                        </div>
                        {job.notes && <p className="text-xs text-muted-foreground mt-1 italic truncate">{job.notes}</p>}
                      </div>
                      <div className="ml-3 flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-muted-foreground hover:text-foreground h-7 px-2"
                          onClick={() => printJobCard(job, contractor, building)}
                          title="Print Job Card"
                          data-testid={`button-print-${job.id}`}
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </Button>
                        {job.status === "completed" && contractor && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 text-amber-600 hover:text-amber-700 h-7 px-2"
                            onClick={() => setRatingContractor(contractor)}
                            title="Rate Contractor"
                            data-testid={`button-rate-${job.id}`}
                          >
                            <Star className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {nextStatus && (
                          <Button
                            size="sm"
                            variant="outline"
                            className={nextStatus === "completed" ? "gap-1 text-green-700 border-green-200 hover:bg-green-50 h-7" : "h-7"}
                            onClick={() => advanceJob(job)}
                            disabled={updateJob.isPending}
                            data-testid={`button-advance-${job.id}`}
                          >
                            {nextStatus === "completed" && <ClipboardCheck className="w-3.5 h-3.5" />}
                            {nextStatus === "completed" ? "Complete" : `Mark ${nextStatus.replace("_", " ")}`}
                          </Button>
                        )}
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {completingJob && (
            <CompleteJobDialog
              job={completingJob}
              onClose={() => setCompletingJob(null)}
              onSuccess={() => {
                const c = contractorMap[completingJob.contractorId];
                setCompletingJob(null);
                if (c) setRatingContractor(c);
              }}
            />
          )}
          {ratingContractor && (
            <RateContractorDialog
              contractor={ratingContractor}
              onClose={() => setRatingContractor(null)}
            />
          )}
        </TabsContent>

        <TabsContent value="contractors" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingContractors ? (
              <div className="col-span-3 p-8 text-center text-muted-foreground">Loading...</div>
            ) : contractors?.map(c => (
              <Card key={c.id} data-testid={`card-contractor-${c.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{c.name}</p>
                      {c.company && <p className="text-sm text-muted-foreground">{c.company}</p>}
                      <span className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground mt-1 inline-block">
                        {TRADE_LABELS[c.trade] ?? c.trade}
                      </span>
                    </div>
                    {c.rating && (
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="text-sm font-medium">{Number(c.rating).toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                    <p>{c.phone}</p>
                    {c.email && <p>{c.email}</p>}
                    {c.totalJobs !== undefined && <p>{c.totalJobs} total jobs</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
