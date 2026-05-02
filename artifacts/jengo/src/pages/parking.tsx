import { useState, useMemo } from "react";
import { useListBuildings, useListUnits, getListBuildingsQueryKey, getListUnitsQueryKey } from "@workspace/api-client-react";
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
import { Plus, Car, Pencil, Trash2, Printer, Grid3X3, List, ParkingCircle } from "lucide-react";
import { printHtml, formatKES, today, loadSettings } from "@/lib/print-utils";

const TYPES = [
  { value: "covered", label: "Covered" },
  { value: "open", label: "Open Air" },
  { value: "basement", label: "Basement" },
  { value: "other", label: "Other" },
];

const STATUSES = [
  { value: "free", label: "Free" },
  { value: "occupied", label: "Occupied" },
  { value: "reserved", label: "Reserved" },
  { value: "maintenance", label: "Maintenance" },
];

const STATUS_COLORS: Record<string, string> = {
  free: "bg-green-100 border-green-300 text-green-700",
  occupied: "bg-blue-100 border-blue-300 text-blue-700",
  reserved: "bg-amber-100 border-amber-300 text-amber-700",
  maintenance: "bg-red-100 border-red-300 text-red-700",
};

const STATUS_GRID: Record<string, string> = {
  free: "bg-green-200 border-green-400 hover:bg-green-300",
  occupied: "bg-blue-200 border-blue-400 hover:bg-blue-300",
  reserved: "bg-amber-200 border-amber-400 hover:bg-amber-300",
  maintenance: "bg-red-200 border-red-400 hover:bg-red-300",
};

const schema = z.object({
  buildingId: z.coerce.number().min(1, "Select a building"),
  slotNumber: z.string().min(1, "Slot number required"),
  type: z.enum(["covered", "open", "basement", "other"]),
  status: z.enum(["free", "occupied", "reserved", "maintenance"]),
  unitId: z.coerce.number().optional().nullable(),
  vehicleReg: z.string().optional(),
  monthlyRate: z.coerce.number().optional().nullable(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

function printAllocationList(slots: any[], units: any[], buildingName: string) {
  const settings = loadSettings();
  const company = settings.companyName || "Jengo Property Management";
  const unitMap = Object.fromEntries(units.map(u => [u.id, u.unitNumber ?? u.name ?? `Unit ${u.id}`]));

  const occupied = slots.filter(s => s.status === "occupied" || s.status === "reserved");
  const free = slots.filter(s => s.status === "free");
  const maint = slots.filter(s => s.status === "maintenance");

  const rows = slots
    .slice()
    .sort((a, b) => a.slotNumber.localeCompare(b.slotNumber, undefined, { numeric: true }))
    .map(s => `
      <tr>
        <td style="font-weight:700">${s.slotNumber}</td>
        <td>${s.type.charAt(0).toUpperCase() + s.type.slice(1)}</td>
        <td><span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:${
          s.status === "free" ? "#dcfce7" : s.status === "occupied" ? "#dbeafe" : s.status === "reserved" ? "#fef9c3" : "#fee2e2"
        };color:${
          s.status === "free" ? "#15803d" : s.status === "occupied" ? "#1d4ed8" : s.status === "reserved" ? "#a16207" : "#b91c1c"
        }">${s.status.toUpperCase()}</span></td>
        <td>${s.unitId ? (unitMap[s.unitId] ?? "—") : "—"}</td>
        <td>${s.vehicleReg ?? "—"}</td>
        <td style="text-align:right">${s.monthlyRate ? `KES ${Number(s.monthlyRate).toLocaleString()}` : "—"}</td>
        <td>${s.notes ?? ""}</td>
      </tr>`).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Parking Allocation — ${buildingName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 32px; }
  .brand { font-size: 22px; font-weight: 700; color: #c2410c; }
  .sub { font-size: 11px; color: #888; margin-top: 2px; }
  .meta { display: flex; gap: 24px; margin: 16px 0 10px; font-size: 12px; color: #555; }
  .meta b { color: #111; }
  .summary { display: flex; gap: 16px; margin: 12px 0 20px; }
  .chip { padding: 6px 16px; border-radius: 6px; font-size: 12px; font-weight: 600; }
  h2 { font-size: 14px; font-weight: 700; margin: 20px 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead th { background: #f9fafb; padding: 7px 10px; text-align: left; font-weight: 600; font-size: 10px; color: #6b7280; border-bottom: 2px solid #e5e7eb; text-transform: uppercase; letter-spacing: 0.4px; }
  tbody td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; }
  .footer { margin-top: 28px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="brand">${company}</div>
  <div class="sub">Parking Allocation List</div>
  <div class="meta">
    <div>Building: <b>${buildingName}</b></div>
    <div>Total Slots: <b>${slots.length}</b></div>
    <div>Generated: <b>${today()}</b></div>
  </div>
  <div class="summary">
    <span class="chip" style="background:#dcfce7;color:#15803d">Free: ${free.length}</span>
    <span class="chip" style="background:#dbeafe;color:#1d4ed8">Occupied: ${occupied.length}</span>
    <span class="chip" style="background:#fee2e2;color:#b91c1c">Maintenance: ${maint.length}</span>
  </div>
  <table>
    <thead><tr>
      <th>Slot</th><th>Type</th><th>Status</th><th>Unit</th><th>Vehicle Reg</th><th style="text-align:right">Monthly Rate</th><th>Notes</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Computer generated — ${company} &nbsp;|&nbsp; ${today()}</div>
</body>
</html>`;
  printHtml(html);
}

function SlotFormDialog({
  open,
  buildings,
  defaultBuildingId,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  buildings: any[];
  defaultBuildingId: number;
  editing?: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: editing
      ? { ...editing, monthlyRate: editing.monthlyRate ? Number(editing.monthlyRate) : null }
      : { buildingId: defaultBuildingId, slotNumber: "", type: "open", status: "free", unitId: null, vehicleReg: "", monthlyRate: null, notes: "" },
  });

  const watchBuilding = Number(form.watch("buildingId"));
  const { data: filteredUnits = [] } = useListUnits(watchBuilding, {
    query: { queryKey: getListUnitsQueryKey(watchBuilding), enabled: !!watchBuilding },
  });

  const save = useMutation({
    mutationFn: async (data: FormData) => {
      const url = editing ? `/api/parking/${editing.id}` : "/api/parking";
      const method = editing ? "PATCH" : "POST";
      const payload = {
        ...data,
        unitId: data.unitId || null,
        monthlyRate: data.monthlyRate ? String(data.monthlyRate) : null,
      };
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => { onSaved(); onClose(); },
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Parking Slot" : "Add Parking Slot"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(d => save.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="buildingId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Building</FormLabel>
                  <Select onValueChange={v => { field.onChange(Number(v)); form.setValue("unitId", null); }} value={String(field.value)}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{buildings.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="slotNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Slot Number</FormLabel>
                  <FormControl><Input placeholder="e.g. A1, B03, P12" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="unitId" render={({ field }) => (
              <FormItem>
                <FormLabel>Assigned to Unit (optional)</FormLabel>
                <Select
                  onValueChange={v => field.onChange(v === "none" ? null : Number(v))}
                  value={field.value ? String(field.value) : "none"}
                >
                  <FormControl><SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {filteredUnits.map(u => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.unitNumber ?? u.name ?? `Unit ${u.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="vehicleReg" render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Reg. (optional)</FormLabel>
                  <FormControl><Input placeholder="KCA 123A" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="monthlyRate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Rate (KES)</FormLabel>
                  <FormControl><Input type="number" min="0" placeholder="0" value={field.value ?? ""} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} /></FormControl>
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl><Textarea rows={2} placeholder="Any additional info…" {...field} /></FormControl>
              </FormItem>
            )} />

            {save.error && <p className="text-sm text-destructive">{(save.error as Error).message}</p>}
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : editing ? "Save Changes" : "Add Slot"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Parking() {
  const qc = useQueryClient();
  const [selectedBuilding, setSelectedBuilding] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const { data: buildings } = useListBuildings({ query: { queryKey: getListBuildingsQueryKey() } });
  const { data: units = [] } = useListUnits(selectedBuilding, {
    query: { queryKey: getListUnitsQueryKey(selectedBuilding), enabled: !!selectedBuilding },
  });

  const parkingKey = ["parking", selectedBuilding];
  const { data: slots = [], isLoading } = useQuery<any[]>({
    queryKey: parkingKey,
    queryFn: async () => {
      const params = selectedBuilding ? `?buildingId=${selectedBuilding}` : "";
      const res = await fetch(`/api/parking${params}`);
      return res.json();
    },
  });

  const deleteSlot = useMutation({
    mutationFn: async (id: number) => { await fetch(`/api/parking/${id}`, { method: "DELETE" }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: parkingKey }),
  });

  const unitMap = useMemo(() => Object.fromEntries(units.map(u => [u.id, u.unitNumber ?? u.name ?? `Unit ${u.id}`])), [units]);
  const buildingName = selectedBuilding ? (buildings?.find(b => b.id === selectedBuilding)?.name ?? "Building") : "All Buildings";

  const stats = useMemo(() => ({
    total: slots.length,
    free: slots.filter(s => s.status === "free").length,
    occupied: slots.filter(s => s.status === "occupied").length,
    reserved: slots.filter(s => s.status === "reserved").length,
    maintenance: slots.filter(s => s.status === "maintenance").length,
  }), [slots]);

  const sorted = [...slots].sort((a, b) => a.slotNumber.localeCompare(b.slotNumber, undefined, { numeric: true }));
  const refresh = () => qc.invalidateQueries({ queryKey: parkingKey });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Parking</h1>
          <p className="text-muted-foreground">Slot allocation and vehicle management</p>
        </div>
        <Button className="gap-2" onClick={() => setAddOpen(true)} data-testid="button-add-slot">
          <Plus className="w-4 h-4" />
          Add Slot
        </Button>
      </div>

      {/* Filters + view toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Building:</span>
          <Select value={String(selectedBuilding)} onValueChange={v => setSelectedBuilding(Number(v))}>
            <SelectTrigger className="w-48" data-testid="select-building">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">All Buildings</SelectItem>
              {buildings?.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {slots.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => printAllocationList(slots, units as any[], buildingName)}
              data-testid="button-print"
            >
              <Printer className="w-4 h-4" />
              Print List
            </Button>
          )}
          <div className="flex rounded-md border border-border overflow-hidden">
            <button
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="w-3.5 h-3.5" /> Grid
            </button>
            <button
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
              onClick={() => setViewMode("list")}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Slots", value: stats.total, color: "text-foreground", bg: "" },
          { label: "Free", value: stats.free, color: "text-green-700", bg: "bg-green-50" },
          { label: "Occupied", value: stats.occupied, color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Reserved", value: stats.reserved, color: "text-amber-700", bg: "bg-amber-50" },
        ].map(item => (
          <Card key={item.label} className={item.bg}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{item.label}</p>
              <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
              {stats.total > 0 && item.label !== "Total Slots" && (
                <p className="text-xs text-muted-foreground mt-0.5">{((item.value / stats.total) * 100).toFixed(0)}% of total</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Legend */}
      {slots.length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs">
          {STATUSES.map(s => (
            <span key={s.value} className={`flex items-center gap-1.5 px-2.5 py-1 rounded border ${STATUS_COLORS[s.value]}`}>
              <span className={`w-2.5 h-2.5 rounded-sm border ${STATUS_GRID[s.value]}`} />
              {s.label}
            </span>
          ))}
        </div>
      )}

      {/* Slot display */}
      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground">Loading…</div>
      ) : slots.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ParkingCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No parking slots configured</p>
            <p className="text-sm text-muted-foreground mt-1">Add slots to start tracking parking allocation</p>
            <Button className="mt-4 gap-2" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="w-3 h-3" /> Add First Slot
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Slot Map — {buildingName}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {sorted.map(slot => (
                <button
                  key={slot.id}
                  onClick={() => setEditing(slot)}
                  className={`relative w-20 h-20 rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${STATUS_GRID[slot.status]}`}
                  data-testid={`slot-${slot.id}`}
                  title={`${slot.slotNumber} — ${slot.status}${slot.unitId ? ` · ${unitMap[slot.unitId]}` : ""}${slot.vehicleReg ? ` · ${slot.vehicleReg}` : ""}`}
                >
                  <Car className="w-5 h-5 opacity-60" />
                  <span className="text-xs font-bold leading-none">{slot.slotNumber}</span>
                  {slot.unitId && (
                    <span className="text-[10px] leading-none opacity-75">{unitMap[slot.unitId]}</span>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Slots — {buildingName}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {sorted.map(slot => (
                <div key={slot.id} className="flex items-center justify-between p-4 gap-3" data-testid={`row-slot-${slot.id}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center ${STATUS_GRID[slot.status]}`}>
                      <Car className="w-4 h-4 opacity-70" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{slot.slotNumber}</span>
                        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${STATUS_COLORS[slot.status]}`}>
                          {STATUSES.find(s => s.value === slot.status)?.label}
                        </span>
                        <span className="text-xs text-muted-foreground">{TYPES.find(t => t.value === slot.type)?.label}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground mt-0.5">
                        {slot.unitId && <span>Unit: {unitMap[slot.unitId]}</span>}
                        {slot.vehicleReg && <span className="font-mono">{slot.vehicleReg}</span>}
                        {slot.monthlyRate && <span>{formatKES(Number(slot.monthlyRate))}/mo</span>}
                        {slot.notes && <span className="italic">{slot.notes}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => setEditing(slot)} data-testid={`button-edit-${slot.id}`}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-8 h-8 text-destructive hover:text-destructive"
                      onClick={() => { if (confirm(`Delete slot ${slot.slotNumber}?`)) deleteSlot.mutate(slot.id); }}
                      data-testid={`button-delete-${slot.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {addOpen && (
        <SlotFormDialog
          open
          buildings={buildings ?? []}
          defaultBuildingId={selectedBuilding || (buildings?.[0]?.id ?? 0)}
          onClose={() => setAddOpen(false)}
          onSaved={refresh}
        />
      )}
      {editing && (
        <SlotFormDialog
          open
          buildings={buildings ?? []}
          defaultBuildingId={editing.buildingId}
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
