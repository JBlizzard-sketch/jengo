import { useState } from "react";
import {
  useListContractors, useCreateContractor, useListJobs, useCreateJob, useUpdateJob,
  useListBuildings,
  getListContractorsQueryKey, getListJobsQueryKey, getListBuildingsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Plus, Star, Wrench, ChevronRight } from "lucide-react";

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
  const { data: contractors, isLoading: loadingContractors } = useListContractors({ query: { queryKey: getListContractorsQueryKey() } });
  const { data: jobs, isLoading: loadingJobs } = useListJobs(undefined, { query: { queryKey: getListJobsQueryKey() } });
  const { data: buildings } = useListBuildings({ query: { queryKey: getListBuildingsQueryKey() } });
  const updateJob = useUpdateJob();

  const advanceJob = (job: any) => {
    const next = JOB_STATUS_NEXT[job.status];
    if (!next) return;
    updateJob.mutate(
      { id: job.id, data: { status: next as any, completedDate: next === "completed" ? new Date().toISOString().split("T")[0] : undefined } },
      { onSuccess: () => qc.invalidateQueries({ queryKey: getListJobsQueryKey() }) }
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

        <TabsContent value="jobs" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loadingJobs ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : !jobs?.length ? (
                <div className="p-12 text-center">
                  <Wrench className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No jobs commissioned yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {jobs.map(job => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-4 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => setLocation(`/contractors/jobs/${job.id}`)}
                      data-testid={`row-job-${job.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${JOB_STATUS_COLORS[job.status]}`}>
                            {job.status.replace("_", " ")}
                          </span>
                        </div>
                        <p className="font-medium text-foreground">{job.title}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                          {job.quotedAmount && <span>Quoted: KES {Number(job.quotedAmount).toLocaleString()}</span>}
                          {job.finalAmount && <span>Final: KES {Number(job.finalAmount).toLocaleString()}</span>}
                          {job.scheduledDate && <span>Scheduled: {job.scheduledDate}</span>}
                          {job.completedDate && <span>Completed: {job.completedDate}</span>}
                        </div>
                        {job.notes && <p className="text-xs text-muted-foreground mt-1 italic">{job.notes}</p>}
                      </div>
                      <div className="ml-4 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        {JOB_STATUS_NEXT[job.status] && (
                          <Button size="sm" variant="outline" onClick={() => advanceJob(job)} disabled={updateJob.isPending} data-testid={`button-advance-${job.id}`}>
                            Mark {JOB_STATUS_NEXT[job.status]?.replace("_", " ")}
                          </Button>
                        )}
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
