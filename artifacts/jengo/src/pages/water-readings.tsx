import { useState, useMemo, useEffect } from "react";
import { useListBuildings, getListBuildingsQueryKey } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Droplets, Plus, Printer, Pencil, Trash2, CheckCircle2, FlaskConical, AlertCircle } from "lucide-react";
import { formatKES, formatDate, printHtml, today, loadSettings } from "@/lib/print-utils";

/* ─── helpers ─────────────────────────────────────────────── */
function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1).toLocaleString("en-KE", { month: "long", year: "numeric" });
}

function months(n = 12): string[] {
  const list: string[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    list.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    d.setMonth(d.getMonth() - 1);
  }
  return list;
}

function fmt2(n: any) { return Number(n ?? 0).toFixed(2); }
function num(n: any) { return Number(n ?? 0); }

/* ─── print ────────────────────────────────────────────────── */
function printBillingSheet(readings: any[], buildingName: string, month: string, rate: number) {
  const settings = loadSettings();
  const company = settings.companyName || "Jengo Property Management";
  const totalConsumption = readings.reduce((s, r) => s + num(r.consumption), 0);
  const totalAmount = readings.reduce((s, r) => s + num(r.amount), 0);
  const billed = readings.filter(r => r.billed).length;

  const rows = readings
    .sort((a, b) => (a.unitNumber ?? "").localeCompare(b.unitNumber ?? "", undefined, { numeric: true }))
    .map(r => `
      <tr>
        <td style="font-weight:600">${r.unitNumber ?? r.unitId}</td>
        <td style="text-align:right">${fmt2(r.previousReading)}</td>
        <td style="text-align:right">${fmt2(r.currentReading)}</td>
        <td style="text-align:right;font-weight:600">${fmt2(r.consumption)}</td>
        <td style="text-align:right">KES ${num(r.unitRate).toLocaleString()}</td>
        <td style="text-align:right;font-weight:600;color:#b45309">KES ${num(r.amount).toLocaleString()}</td>
        <td style="text-align:center">${r.billed ? '<span style="color:#15803d;font-weight:600">Billed</span>' : '<span style="color:#9ca3af">Pending</span>'}</td>
      </tr>`).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Water Billing — ${buildingName} — ${monthLabel(month)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 32px; }
  .brand { font-size: 22px; font-weight: 700; color: #0369a1; }
  .sub { font-size: 11px; color: #888; margin-top: 2px; }
  .meta { display: flex; gap: 24px; margin: 14px 0 10px; font-size: 12px; color: #555; }
  .meta b { color: #111; }
  .summary { display: flex; gap: 16px; margin: 14px 0 20px; }
  .scard { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 10px 18px; }
  .scard .v { font-size: 18px; font-weight: 700; color: #0369a1; }
  .scard .l { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead th { background: #f0f9ff; padding: 7px 10px; text-align: left; font-weight: 600; font-size: 10px; color: #374151; border-bottom: 2px solid #bae6fd; text-transform: uppercase; letter-spacing: 0.4px; }
  tbody td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; }
  tfoot td { padding: 8px 10px; background: #f8fafc; font-weight: 700; border-top: 2px solid #bae6fd; }
  .footer { margin-top: 28px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="brand">${company}</div>
  <div class="sub">Water Billing Statement</div>
  <div class="meta">
    <div>Building: <b>${buildingName}</b></div>
    <div>Period: <b>${monthLabel(month)}</b></div>
    <div>Rate: <b>KES ${rate}/m³</b></div>
    <div>Generated: <b>${today()}</b></div>
  </div>
  <div class="summary">
    <div class="scard"><div class="l">Units</div><div class="v">${readings.length}</div></div>
    <div class="scard"><div class="l">Total Consumption</div><div class="v">${totalConsumption.toFixed(2)} m³</div></div>
    <div class="scard"><div class="l">Total Amount</div><div class="v">KES ${totalAmount.toLocaleString()}</div></div>
    <div class="scard"><div class="l">Billed</div><div class="v">${billed} / ${readings.length}</div></div>
  </div>
  <table>
    <thead><tr>
      <th>Unit</th>
      <th style="text-align:right">Prev Reading (m³)</th>
      <th style="text-align:right">Curr Reading (m³)</th>
      <th style="text-align:right">Consumption (m³)</th>
      <th style="text-align:right">Rate</th>
      <th style="text-align:right">Amount (KES)</th>
      <th style="text-align:center">Status</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr>
      <td colspan="3">TOTAL</td>
      <td style="text-align:right">${totalConsumption.toFixed(2)} m³</td>
      <td></td>
      <td style="text-align:right">KES ${totalAmount.toLocaleString()}</td>
      <td></td>
    </tr></tfoot>
  </table>
  <div class="footer">Computer generated — ${company} &nbsp;|&nbsp; ${today()}</div>
</body>
</html>`;
  printHtml(html);
}

/* ─── Bulk Entry Dialog ─────────────────────────────────────── */
interface BulkEntry { unitId: number; unitNumber: string; previousReading: string; currentReading: string; }

function BulkEntryDialog({
  buildingId, month, units, previousMap, onClose, onSaved,
}: {
  buildingId: number; month: string; units: any[]; previousMap: Record<number, number>;
  onClose: () => void; onSaved: () => void;
}) {
  const [rate, setRate] = useState("120");
  const [entries, setEntries] = useState<BulkEntry[]>(() =>
    units.map(u => ({
      unitId: u.id,
      unitNumber: u.unitNumber,
      previousReading: String(previousMap[u.id] ?? 0),
      currentReading: "",
    }))
  );
  const [error, setError] = useState("");

  const readingDate = useMemo(() => {
    const [y, m] = month.split("-");
    const last = new Date(Number(y), Number(m), 0);
    return last.toISOString().split("T")[0];
  }, [month]);

  const update = (idx: number, field: keyof BulkEntry, val: string) => {
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: val } : e));
  };

  const save = useMutation({
    mutationFn: async () => {
      const filled = entries.filter(e => e.currentReading.trim() !== "");
      if (filled.length === 0) throw new Error("Enter at least one current reading");
      for (const e of filled) {
        if (isNaN(Number(e.currentReading))) throw new Error(`Invalid reading for unit ${e.unitNumber}`);
      }
      const readings = filled.map(e => ({
        buildingId,
        unitId: e.unitId,
        readingDate,
        previousReading: e.previousReading,
        currentReading: e.currentReading,
        unitRate: rate,
      }));
      const res = await fetch("/api/water/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readings }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => { onSaved(); onClose(); },
    onError: (e: Error) => setError(e.message),
  });

  const filledCount = entries.filter(e => e.currentReading.trim() !== "").length;

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Meter Entry — {monthLabel(month)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
            <label className="text-sm font-medium text-blue-800 whitespace-nowrap">Rate (KES/m³):</label>
            <Input
              type="number"
              value={rate}
              onChange={e => setRate(e.target.value)}
              className="w-28"
              min="0"
            />
            <p className="text-xs text-blue-700">Applied to all units. Leave blank rows for units without sub-meters.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="pb-2 text-left font-medium w-24">Unit</th>
                  <th className="pb-2 text-right font-medium">Prev Reading (m³)</th>
                  <th className="pb-2 text-right font-medium">Curr Reading (m³)</th>
                  <th className="pb-2 text-right font-medium">Consumption</th>
                  <th className="pb-2 text-right font-medium pr-2">Amount (KES)</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, idx) => {
                  const prev = Number(e.previousReading || 0);
                  const curr = Number(e.currentReading || 0);
                  const consumption = e.currentReading ? Math.max(0, curr - prev) : null;
                  const amount = consumption != null ? consumption * Number(rate || 0) : null;
                  const negative = e.currentReading && curr < prev;
                  return (
                    <tr key={e.unitId} className={`border-b border-border/50 ${negative ? "bg-red-50" : ""}`}>
                      <td className="py-2 font-semibold">{e.unitNumber}</td>
                      <td className="py-2">
                        <Input
                          type="number"
                          value={e.previousReading}
                          onChange={ev => update(idx, "previousReading", ev.target.value)}
                          className="w-28 text-right h-8 ml-auto"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="py-2">
                        <Input
                          type="number"
                          value={e.currentReading}
                          onChange={ev => update(idx, "currentReading", ev.target.value)}
                          placeholder="Enter reading"
                          className={`w-28 text-right h-8 ml-auto ${negative ? "border-red-400" : ""}`}
                          min="0"
                          step="0.01"
                          data-testid={`input-reading-${e.unitId}`}
                        />
                      </td>
                      <td className="py-2 text-right">
                        {consumption != null ? (
                          <span className={negative ? "text-red-600 font-medium" : "text-foreground"}>
                            {negative ? "⚠ " : ""}{consumption.toFixed(2)} m³
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2 text-right pr-2">
                        {amount != null && !negative ? (
                          <span className="font-semibold text-amber-700">{formatKES(amount)}</span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {error && (
            <div className="flex gap-2 items-center text-sm text-destructive bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <p className="text-sm text-muted-foreground">{filledCount} of {entries.length} units filled</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending || filledCount === 0}>
                {save.isPending ? "Saving…" : `Save ${filledCount} Reading${filledCount !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Edit Dialog ───────────────────────────────────────────── */
function EditDialog({ reading, onClose, onSaved }: { reading: any; onClose: () => void; onSaved: () => void }) {
  const [curr, setCurr] = useState(reading.currentReading);
  const [prev, setPrev] = useState(reading.previousReading);
  const [rate, setRate] = useState(reading.unitRate);
  const [notes, setNotes] = useState(reading.notes ?? "");
  const [error, setError] = useState("");

  const consumption = Math.max(0, Number(curr) - Number(prev));
  const amount = consumption * Number(rate);

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/water/${reading.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentReading: curr, previousReading: prev, unitRate: rate, notes }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => { onSaved(); onClose(); },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Reading — Unit {reading.unitNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Previous (m³)</label>
              <Input type="number" value={prev} onChange={e => setPrev(e.target.value)} step="0.01" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Current (m³)</label>
              <Input type="number" value={curr} onChange={e => setCurr(e.target.value)} step="0.01" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Rate (KES/m³)</label>
            <Input type="number" value={rate} onChange={e => setRate(e.target.value)} step="1" />
          </div>
          <div className="p-3 bg-blue-50 rounded-lg text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Consumption:</span><span className="font-medium">{consumption.toFixed(2)} m³</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Amount:</span><span className="font-semibold text-amber-700">{formatKES(amount)}</span></div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes…" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */
export default function WaterReadings() {
  const qc = useQueryClient();
  const [selectedBuilding, setSelectedBuilding] = useState<number>(0);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editReading, setEditReading] = useState<any | null>(null);

  const { data: buildings } = useListBuildings({ query: { queryKey: getListBuildingsQueryKey() } });

  // Fetch units for the selected building
  const { data: units = [] } = useQuery<any[]>({
    queryKey: ["water-units", selectedBuilding],
    enabled: selectedBuilding > 0,
    queryFn: async () => {
      const res = await fetch(`/api/buildings/${selectedBuilding}/units`);
      return res.json();
    },
  });

  // Fetch previous readings (to auto-fill "previous" in bulk entry)
  const { data: previousReadings = [] } = useQuery<any[]>({
    queryKey: ["water-previous", selectedBuilding, selectedMonth],
    enabled: selectedBuilding > 0,
    queryFn: async () => {
      const res = await fetch(`/api/water/previous?buildingId=${selectedBuilding}&before=${selectedMonth}`);
      return res.json();
    },
  });

  const previousMap = useMemo(() => {
    const m: Record<number, number> = {};
    for (const r of previousReadings) m[r.unitId] = Number(r.currentReading);
    return m;
  }, [previousReadings]);

  // Fetch readings for selected building + month
  const readingsKey = ["water-readings", selectedBuilding, selectedMonth];
  const { data: readings = [], isLoading } = useQuery<any[]>({
    queryKey: readingsKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBuilding) params.set("buildingId", String(selectedBuilding));
      params.set("month", selectedMonth);
      const res = await fetch(`/api/water?${params}`);
      return res.json();
    },
  });

  const deleteReading = useMutation({
    mutationFn: async (id: number) => { await fetch(`/api/water/${id}`, { method: "DELETE" }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: readingsKey }),
  });

  const markBilled = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/water/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billed: true }),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: readingsKey }),
  });

  const markAllBilled = useMutation({
    mutationFn: async () => {
      const unbilled = readings.filter(r => !r.billed);
      await Promise.all(unbilled.map(r =>
        fetch(`/api/water/${r.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ billed: true }),
        })
      ));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: readingsKey }),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: readingsKey });
    qc.invalidateQueries({ queryKey: ["water-previous", selectedBuilding, selectedMonth] });
  };

  const stats = useMemo(() => ({
    units: readings.length,
    totalConsumption: readings.reduce((s, r) => s + num(r.consumption), 0),
    totalAmount: readings.reduce((s, r) => s + num(r.amount), 0),
    billed: readings.filter(r => r.billed).length,
    unbilled: readings.filter(r => !r.billed).length,
  }), [readings]);

  const buildingName = buildings?.find(b => b.id === selectedBuilding)?.name ?? "All Buildings";
  const defaultRate = readings[0] ? Number(readings[0].unitRate) : 120;

  const sorted = [...readings].sort((a, b) =>
    (a.unitNumber ?? "").localeCompare(b.unitNumber ?? "", undefined, { numeric: true })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Water Meters</h1>
          <p className="text-muted-foreground">Monthly sub-meter readings and water billing</p>
        </div>
        {selectedBuilding > 0 && (
          <Button className="gap-2" onClick={() => setBulkOpen(true)} data-testid="button-bulk-entry">
            <Plus className="w-4 h-4" />
            Enter Readings
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Building:</span>
          <Select value={String(selectedBuilding)} onValueChange={v => setSelectedBuilding(Number(v))}>
            <SelectTrigger className="w-48" data-testid="select-building"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Select Building</SelectItem>
              {buildings?.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Month:</span>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-44" data-testid="select-month"><SelectValue /></SelectTrigger>
            <SelectContent>
              {months().map(m => <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {readings.length > 0 && (
          <div className="ml-auto flex gap-2">
            {stats.unbilled > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => markAllBilled.mutate()}
                disabled={markAllBilled.isPending}
                data-testid="button-mark-all-billed"
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark All Billed
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => printBillingSheet(readings, buildingName, selectedMonth, defaultRate)}
              data-testid="button-print"
            >
              <Printer className="w-4 h-4" />
              Print Bill
            </Button>
          </div>
        )}
      </div>

      {/* Summary cards */}
      {readings.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Units Metered", value: stats.units, sub: `of ${units.length || stats.units} in building`, color: "text-foreground" },
            { label: "Total Consumption", value: `${stats.totalConsumption.toFixed(1)} m³`, sub: "cubic metres this month", color: "text-blue-700" },
            { label: "Total Amount", value: formatKES(stats.totalAmount), sub: "water charges due", color: "text-amber-700" },
            { label: "Billing Status", value: `${stats.billed} / ${stats.units}`, sub: `${stats.unbilled} pending`, color: stats.unbilled > 0 ? "text-red-600" : "text-green-700" },
          ].map(item => (
            <Card key={item.label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{item.label}</p>
                <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Readings table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between py-3">
          <CardTitle className="text-base">
            {selectedBuilding > 0 ? buildingName : "Select a building"} — {monthLabel(selectedMonth)}
          </CardTitle>
          {readings.length > 0 && (
            <span className="text-xs text-muted-foreground">{readings.length} readings</span>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {!selectedBuilding ? (
            <div className="p-12 text-center">
              <Droplets className="w-10 h-10 text-muted-foreground mx-auto mb-3 text-blue-400" />
              <p className="text-muted-foreground font-medium">Select a building to view readings</p>
              <p className="text-sm text-muted-foreground mt-1">Choose a building above to view or enter water meter readings</p>
            </div>
          ) : isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : readings.length === 0 ? (
            <div className="p-12 text-center">
              <FlaskConical className="w-10 h-10 text-blue-300 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No readings for {monthLabel(selectedMonth)}</p>
              <p className="text-sm text-muted-foreground mt-1">Enter meter readings to start billing for this month</p>
              <Button className="mt-4 gap-2" size="sm" onClick={() => setBulkOpen(true)}>
                <Plus className="w-3 h-3" /> Enter Readings
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-2.5 text-left font-medium text-xs text-muted-foreground uppercase tracking-wide">Unit</th>
                    <th className="px-4 py-2.5 text-right font-medium text-xs text-muted-foreground uppercase tracking-wide">Prev (m³)</th>
                    <th className="px-4 py-2.5 text-right font-medium text-xs text-muted-foreground uppercase tracking-wide">Curr (m³)</th>
                    <th className="px-4 py-2.5 text-right font-medium text-xs text-muted-foreground uppercase tracking-wide">Consumed</th>
                    <th className="px-4 py-2.5 text-right font-medium text-xs text-muted-foreground uppercase tracking-wide">Rate/m³</th>
                    <th className="px-4 py-2.5 text-right font-medium text-xs text-muted-foreground uppercase tracking-wide">Amount</th>
                    <th className="px-4 py-2.5 text-center font-medium text-xs text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="px-4 py-2.5 text-right font-medium text-xs text-muted-foreground uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(r => (
                    <tr
                      key={r.id}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                      data-testid={`row-reading-${r.id}`}
                    >
                      <td className="px-4 py-3 font-semibold">{r.unitNumber ?? r.unitId}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{fmt2(r.previousReading)}</td>
                      <td className="px-4 py-3 text-right font-medium">{fmt2(r.currentReading)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-medium text-blue-700">{fmt2(r.consumption)} m³</span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        KES {num(r.unitRate).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-amber-700">
                        {formatKES(num(r.amount))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.billed ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium border border-green-300">Billed</span>
                        ) : (
                          <button
                            onClick={() => markBilled.mutate(r.id)}
                            className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-300 font-medium hover:bg-amber-100 transition-colors"
                            data-testid={`button-bill-${r.id}`}
                          >
                            Pending
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-7 h-7"
                            onClick={() => setEditReading(r)}
                            data-testid={`button-edit-${r.id}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-7 h-7 text-destructive hover:text-destructive"
                            onClick={() => { if (confirm(`Delete reading for unit ${r.unitNumber}?`)) deleteReading.mutate(r.id); }}
                            data-testid={`button-delete-${r.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50/50 border-t-2 border-blue-200">
                    <td className="px-4 py-3 font-bold text-sm" colSpan={3}>TOTAL</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-700">{stats.totalConsumption.toFixed(2)} m³</td>
                    <td></td>
                    <td className="px-4 py-3 text-right font-bold text-amber-700 text-base">{formatKES(stats.totalAmount)}</td>
                    <td></td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {bulkOpen && selectedBuilding > 0 && (
        <BulkEntryDialog
          buildingId={selectedBuilding}
          month={selectedMonth}
          units={units}
          previousMap={previousMap}
          onClose={() => setBulkOpen(false)}
          onSaved={refresh}
        />
      )}
      {editReading && (
        <EditDialog
          reading={editReading}
          onClose={() => setEditReading(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
