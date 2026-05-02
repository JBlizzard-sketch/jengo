import { useState, useMemo } from "react";
import { useListBuildings, getListBuildingsQueryKey } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, CalendarCheck, Pencil, Trash2, Printer, CheckCircle2,
  AlertTriangle, Clock, Wrench, Flame, Zap, Droplets, ShieldCheck, Trees, Wind,
} from "lucide-react";
import { printHtml, formatDate, today, loadSettings } from "@/lib/print-utils";

const CATEGORIES = [
  { value: "electrical",  label: "Electrical",    icon: Zap },
  { value: "plumbing",    label: "Plumbing",      icon: Droplets },
  { value: "fire_safety", label: "Fire Safety",   icon: Flame },
  { value: "hvac",        label: "HVAC",          icon: Wind },
  { value: "cleaning",    label: "Cleaning",      icon: CalendarCheck },
  { value: "structural",  label: "Structural",    icon: Wrench },
  { value: "security",    label: "Security",      icon: ShieldCheck },
  { value: "landscaping", label: "Landscaping",   icon: Trees },
  { value: "other",       label: "Other",         icon: Wrench },
];

const FREQUENCIES = [
  { value: "weekly",    label: "Weekly" },
  { value: "monthly",   label: "Monthly" },
  { value: "quarterly", label: "Quarterly (every 3 months)" },
  { value: "biannual",  label: "Bi-annual (every 6 months)" },
  { value: "annual",    label: "Annual" },
  { value: "one_time",  label: "One-time" },
];

const STATUS_STYLES: Record<string, { chip: string; row: string }> = {
  pending:  { chip: "bg-amber-100 text-amber-700 border-amber-300",  row: "" },
  overdue:  { chip: "bg-red-100 text-red-700 border-red-300",        row: "bg-red-50/40" },
  done:     { chip: "bg-green-100 text-green-700 border-green-300",  row: "opacity-60" },
};

const CAT_COLORS: Record<string, string> = {
  electrical: "text-yellow-600", plumbing: "text-blue-600", fire_safety: "text-red-600",
  hvac: "text-sky-600", cleaning: "text-teal-600", structural: "text-gray-600",
  security: "text-purple-600", landscaping: "text-green-600", other: "text-slate-500",
};

const TEMPLATES = [
  { title: "Generator Service",         category: "electrical",  frequency: "monthly",   description: "Check fuel level, oil, and run test" },
  { title: "Water Tank Cleaning",       category: "plumbing",    frequency: "quarterly", description: "Drain, scrub, and disinfect water storage tanks" },
  { title: "Fire Extinguisher Check",   category: "fire_safety", frequency: "annual",    description: "Inspect pressure, pin, and expiry date on all extinguishers" },
  { title: "Pest Control",              category: "cleaning",    frequency: "quarterly", description: "Treat common areas, basement, and refuse area" },
  { title: "Lift / Elevator Service",   category: "structural",  frequency: "monthly",   description: "Licensed engineer inspection and lubrication" },
  { title: "Roof Inspection",           category: "structural",  frequency: "biannual",  description: "Check for leaks, gutters, and drain condition" },
  { title: "CCTV & Intercom Check",     category: "security",    frequency: "quarterly", description: "Test all cameras, recording, and intercom units" },
  { title: "Lawn & Garden Maintenance", category: "landscaping", frequency: "monthly",   description: "Mow, trim, and weed common green areas" },
  { title: "Common Area Deep Clean",    category: "cleaning",    frequency: "monthly",   description: "Staircases, corridors, lobby — mop and disinfect" },
  { title: "Electrical Panel Inspection", category: "electrical", frequency: "annual",   description: "Check all breakers, earthing, and cable condition" },
];

const schema = z.object({
  buildingId: z.coerce.number().min(1, "Select a building"),
  title: z.string().min(2, "Title required"),
  description: z.string().optional(),
  category: z.enum(["electrical","plumbing","fire_safety","hvac","cleaning","structural","security","landscaping","other"]),
  frequency: z.enum(["weekly","monthly","quarterly","biannual","annual","one_time"]),
  nextDueDate: z.string().min(1, "Due date required"),
  assignedTo: z.string().optional(),
  status: z.enum(["pending","overdue","done"]).optional(),
});
type FormData = z.infer<typeof schema>;

const completeSchema = z.object({
  completionDate: z.string().min(1, "Date required"),
  completionNotes: z.string().optional(),
});
type CompleteData = z.infer<typeof completeSchema>;

function catLabel(cat: string) { return CATEGORIES.find(c => c.value === cat)?.label ?? cat; }
function freqLabel(freq: string) { return FREQUENCIES.find(f => f.value === freq)?.label ?? freq; }

function daysUntil(dateStr: string): number {
  const due = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 86400000);
}

function dueBadge(task: any) {
  if (task.status === "done") return null;
  const days = daysUntil(task.nextDueDate);
  if (days < 0) return <span className="text-xs text-red-600 font-medium">{Math.abs(days)}d overdue</span>;
  if (days === 0) return <span className="text-xs text-red-600 font-medium">Due today</span>;
  if (days <= 7) return <span className="text-xs text-amber-600 font-medium">Due in {days}d</span>;
  return <span className="text-xs text-muted-foreground">{formatDate(task.nextDueDate)}</span>;
}

function printSchedule(tasks: any[], buildingName: string) {
  const settings = loadSettings();
  const company = settings.companyName || "Jengo Property Management";

  const pending = tasks.filter(t => t.status === "pending");
  const overdue = tasks.filter(t => t.status === "overdue");
  const done = tasks.filter(t => t.status === "done");

  const rows = tasks
    .filter(t => t.status !== "done")
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
    .map(t => {
      const days = daysUntil(t.nextDueDate);
      const color = days < 0 ? "#b91c1c" : days <= 7 ? "#b45309" : "#374151";
      return `
        <tr>
          <td style="font-weight:600">${t.title}</td>
          <td>${catLabel(t.category)}</td>
          <td>${freqLabel(t.frequency)}</td>
          <td style="text-align:center;color:${color};font-weight:600">${t.nextDueDate}</td>
          <td>${t.assignedTo ?? "—"}</td>
          <td style="text-align:center">${t.lastDoneDate ?? "Never"}</td>
        </tr>`;
    }).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Maintenance Schedule — ${buildingName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 32px; }
  .brand { font-size: 22px; font-weight: 700; color: #c2410c; }
  .sub { font-size: 11px; color: #888; margin-top: 2px; }
  .meta { display: flex; gap: 24px; margin: 14px 0 10px; font-size: 12px; color: #555; }
  .meta b { color: #111; }
  .chips { display: flex; gap: 12px; margin: 10px 0 20px; }
  .chip { padding: 5px 14px; border-radius: 6px; font-size: 11px; font-weight: 600; }
  h2 { font-size: 13px; font-weight: 700; margin: 18px 0 8px; color: #374151; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead th { background: #f9fafb; padding: 7px 10px; text-align: left; font-weight: 600; font-size: 10px; color: #6b7280; border-bottom: 2px solid #e5e7eb; text-transform: uppercase; letter-spacing: 0.4px; }
  tbody td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; }
  .footer { margin-top: 28px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="brand">${company}</div>
  <div class="sub">Preventive Maintenance Schedule</div>
  <div class="meta">
    <div>Building: <b>${buildingName}</b></div>
    <div>Generated: <b>${today()}</b></div>
    <div>Total Tasks: <b>${tasks.length}</b></div>
  </div>
  <div class="chips">
    <span class="chip" style="background:#fee2e2;color:#b91c1c">Overdue: ${overdue.length}</span>
    <span class="chip" style="background:#fef9c3;color:#a16207">Pending: ${pending.length}</span>
    <span class="chip" style="background:#dcfce7;color:#15803d">Done: ${done.length}</span>
  </div>
  <h2>Upcoming &amp; Overdue Tasks</h2>
  <table>
    <thead><tr>
      <th>Task</th><th>Category</th><th>Frequency</th><th style="text-align:center">Next Due</th><th>Assigned To</th><th style="text-align:center">Last Done</th>
    </tr></thead>
    <tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:16px;color:#888">All tasks completed</td></tr>'}</tbody>
  </table>
  <div class="footer">Computer generated — ${company} &nbsp;|&nbsp; ${today()}</div>
</body>
</html>`;
  printHtml(html);
}

function CompleteDialog({ task, onClose, onSaved }: { task: any; onClose: () => void; onSaved: () => void }) {
  const form = useForm<CompleteData>({
    resolver: zodResolver(completeSchema),
    defaultValues: { completionDate: new Date().toISOString().split("T")[0], completionNotes: "" },
  });

  const complete = useMutation({
    mutationFn: async (data: CompleteData) => {
      const res = await fetch(`/api/maintenance/${task.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to complete");
      return res.json();
    },
    onSuccess: () => { onSaved(); onClose(); },
  });

  const freq = FREQUENCIES.find(f => f.value === task.frequency);

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark Complete — {task.title}</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground mb-4">
          Frequency: <span className="font-medium text-foreground">{freq?.label}</span>
          {task.frequency !== "one_time" && (
            <span> — a new task will be scheduled automatically.</span>
          )}
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(d => complete.mutate(d))} className="space-y-4">
            <FormField control={form.control} name="completionDate" render={({ field }) => (
              <FormItem>
                <FormLabel>Completion Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="completionNotes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl><Textarea rows={3} placeholder="Work done, observations, parts replaced…" {...field} /></FormControl>
              </FormItem>
            )} />
            {complete.error && <p className="text-sm text-destructive">{(complete.error as Error).message}</p>}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={complete.isPending} className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {complete.isPending ? "Saving…" : "Mark Complete"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function TaskFormDialog({
  open, buildings, defaultBuildingId, editing, onClose, onSaved,
}: {
  open: boolean; buildings: any[]; defaultBuildingId: number; editing?: any; onClose: () => void; onSaved: () => void;
}) {
  const [template, setTemplate] = useState<string>("");

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: editing
      ? { ...editing }
      : { buildingId: defaultBuildingId, title: "", description: "", category: "other", frequency: "monthly", nextDueDate: "", assignedTo: "", status: "pending" },
  });

  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    form.setValue("title", tpl.title);
    form.setValue("category", tpl.category as any);
    form.setValue("frequency", tpl.frequency as any);
    form.setValue("description", tpl.description);
    setTemplate(tpl.title);
  };

  const save = useMutation({
    mutationFn: async (data: FormData) => {
      const url = editing ? `/api/maintenance/${editing.id}` : "/api/maintenance";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => { onSaved(); onClose(); },
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Task" : "Add Maintenance Task"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(d => save.mutate(d))} className="space-y-4">

            {!editing && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Quick Templates</p>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATES.map(t => (
                    <button
                      key={t.title}
                      type="button"
                      onClick={() => applyTemplate(t)}
                      className={`text-xs px-2.5 py-1 rounded border transition-colors ${template === t.title ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <FormField control={form.control} name="buildingId" render={({ field }) => (
              <FormItem>
                <FormLabel>Building</FormLabel>
                <Select onValueChange={v => field.onChange(Number(v))} value={String(field.value)}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>{buildings.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Task Title</FormLabel>
                <FormControl><Input placeholder="e.g. Generator Service, Water Tank Cleaning…" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="frequency" render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="nextDueDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Next Due Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="assignedTo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned To (optional)</FormLabel>
                  <FormControl><Input placeholder="Contractor or company" {...field} /></FormControl>
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description (optional)</FormLabel>
                <FormControl><Textarea rows={2} placeholder="What needs to be done…" {...field} /></FormControl>
              </FormItem>
            )} />

            {save.error && <p className="text-sm text-destructive">{(save.error as Error).message}</p>}
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : editing ? "Save Changes" : "Add Task"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function MaintenanceSchedule() {
  const qc = useQueryClient();
  const [selectedBuilding, setSelectedBuilding] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [completing, setCompleting] = useState<any | null>(null);

  const { data: buildings } = useListBuildings({ query: { queryKey: getListBuildingsQueryKey() } });

  const mainKey = ["maintenance", selectedBuilding, statusFilter];
  const { data: tasks = [], isLoading } = useQuery<any[]>({
    queryKey: mainKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBuilding) params.set("buildingId", String(selectedBuilding));
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/maintenance?${params}`);
      return res.json();
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: number) => { await fetch(`/api/maintenance/${id}`, { method: "DELETE" }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: mainKey }),
  });

  const stats = useMemo(() => ({
    total: tasks.length,
    overdue: tasks.filter(t => t.status === "overdue").length,
    pending: tasks.filter(t => t.status === "pending").length,
    done: tasks.filter(t => t.status === "done").length,
    dueSoon: tasks.filter(t => t.status === "pending" && daysUntil(t.nextDueDate) <= 7).length,
  }), [tasks]);

  const buildingName = selectedBuilding
    ? (buildings?.find(b => b.id === selectedBuilding)?.name ?? "Building")
    : "All Buildings";

  const refresh = () => qc.invalidateQueries({ queryKey: mainKey });

  const CatIcon = ({ cat }: { cat: string }) => {
    const C = CATEGORIES.find(c => c.value === cat)?.icon ?? Wrench;
    return <C className={`w-4 h-4 ${CAT_COLORS[cat] ?? "text-muted-foreground"}`} />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Maintenance Schedule</h1>
          <p className="text-muted-foreground">Preventive maintenance tasks and service reminders</p>
        </div>
        <Button className="gap-2" onClick={() => setAddOpen(true)} data-testid="button-add-task">
          <Plus className="w-4 h-4" />
          Add Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Building:</span>
          <Select value={String(selectedBuilding)} onValueChange={v => setSelectedBuilding(Number(v))}>
            <SelectTrigger className="w-48" data-testid="select-building"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">All Buildings</SelectItem>
              {buildings?.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36" data-testid="select-status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {tasks.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 ml-auto"
            onClick={() => printSchedule(tasks, buildingName)}
            data-testid="button-print"
          >
            <Printer className="w-4 h-4" />
            Print Schedule
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Tasks",   value: stats.total,   color: "text-foreground",   bg: "" },
          { label: "Overdue",       value: stats.overdue, color: "text-red-700",       bg: "bg-red-50",   icon: AlertTriangle },
          { label: "Due This Week", value: stats.dueSoon, color: "text-amber-700",     bg: "bg-amber-50", icon: Clock },
          { label: "Completed",     value: stats.done,    color: "text-green-700",     bg: "bg-green-50", icon: CheckCircle2 },
        ].map(item => (
          <Card key={item.label} className={item.bg}>
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 mb-1">
                {item.icon && <item.icon className={`w-3.5 h-3.5 ${item.color}`} />}
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{item.label}</p>
              </div>
              <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Task list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tasks — {buildingName}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : tasks.length === 0 ? (
            <div className="p-12 text-center">
              <CalendarCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No maintenance tasks</p>
              <p className="text-sm text-muted-foreground mt-1">Add tasks to track your preventive maintenance schedule</p>
              <Button className="mt-4 gap-2" size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="w-3 h-3" /> Add First Task
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {tasks.map(task => (
                <div
                  key={task.id}
                  className={`flex flex-col md:flex-row md:items-center justify-between p-4 gap-3 ${STATUS_STYLES[task.status]?.row ?? ""}`}
                  data-testid={`row-task-${task.id}`}
                >
                  <div className="flex gap-3 flex-1">
                    <div className="mt-0.5 flex-shrink-0">
                      <CatIcon cat={task.category} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center flex-wrap gap-2 mb-0.5">
                        <span className="font-semibold text-foreground">{task.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${STATUS_STYLES[task.status]?.chip}`}>
                          {task.status}
                        </span>
                        {dueBadge(task)}
                      </div>
                      <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        <span>{catLabel(task.category)}</span>
                        <span>{freqLabel(task.frequency)}</span>
                        {task.assignedTo && <span>→ {task.assignedTo}</span>}
                        {task.lastDoneDate && <span className="text-green-700">Last done: {task.lastDoneDate}</span>}
                        {task.description && <span className="italic hidden md:inline">{task.description}</span>}
                      </div>
                      {task.completionNotes && task.status === "done" && (
                        <p className="text-xs text-muted-foreground mt-0.5 italic">"{task.completionNotes}"</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {task.status !== "done" && (
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setCompleting(task)}
                        data-testid={`button-complete-${task.id}`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Done
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-8 h-8"
                      onClick={() => setEditing(task)}
                      data-testid={`button-edit-${task.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-8 h-8 text-destructive hover:text-destructive"
                      onClick={() => { if (confirm(`Delete "${task.title}"?`)) deleteTask.mutate(task.id); }}
                      data-testid={`button-delete-${task.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {addOpen && (
        <TaskFormDialog
          open
          buildings={buildings ?? []}
          defaultBuildingId={selectedBuilding || (buildings?.[0]?.id ?? 0)}
          onClose={() => setAddOpen(false)}
          onSaved={refresh}
        />
      )}
      {editing && (
        <TaskFormDialog
          open
          buildings={buildings ?? []}
          defaultBuildingId={editing.buildingId}
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
      {completing && (
        <CompleteDialog
          task={completing}
          onClose={() => setCompleting(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
