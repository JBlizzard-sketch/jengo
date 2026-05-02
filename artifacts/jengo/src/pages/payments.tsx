import { useState } from "react";
import {
  useListPayments, useGetPaymentsSummary, useUpdatePayment, useListBuildings, useListResidents,
  getListPaymentsQueryKey, getGetPaymentsSummaryQueryKey, getListBuildingsQueryKey, getListResidentsQueryKey,
} from "@workspace/api-client-react";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TrendingUp, AlertTriangle, CreditCard, CheckCircle, Filter, BadgeCheck, Zap, Download, AlertOctagon, Search, Upload, X, CheckCircle2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  paid: "bg-green-100 text-green-700 border-green-200",
  overdue: "bg-red-100 text-red-700 border-red-200",
  waived: "bg-gray-100 text-gray-500 border-gray-200",
};

const METHOD_LABELS: Record<string, string> = {
  mpesa: "M-Pesa",
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  other: "Other",
};

function RecordPaymentDialog({ payment, onClose }: { payment: any; onClose: () => void }) {
  const qc = useQueryClient();
  const updatePayment = useUpdatePayment();
  const [method, setMethod] = useState("mpesa");
  const [mpesaRef, setMpesaRef] = useState("");
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split("T")[0]);

  const handleSubmit = () => {
    updatePayment.mutate(
      {
        id: payment.id,
        data: {
          status: "paid",
          paymentMethod: method as any,
          paidDate,
          mpesaRef: method === "mpesa" ? mpesaRef : undefined,
        }
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetPaymentsSummaryQueryKey() });
          onClose();
        }
      }
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-secondary rounded-lg">
            <p className="font-medium">{payment.description}</p>
            <p className="text-sm text-muted-foreground">Amount: KES {Number(payment.amount).toLocaleString()}</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Payment Method</label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger data-testid="select-method"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mpesa">M-Pesa</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {method === "mpesa" && (
            <div>
              <label className="text-sm font-medium mb-1 block">M-Pesa Reference</label>
              <Input placeholder="e.g. QHJ8KL2P9X" value={mpesaRef} onChange={e => setMpesaRef(e.target.value)} data-testid="input-mpesa-ref" />
            </div>
          )}
          <div>
            <label className="text-sm font-medium mb-1 block">Payment Date</label>
            <Input type="date" value={paidDate} onChange={e => setPaidDate(e.target.value)} data-testid="input-paid-date" />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={updatePayment.isPending} data-testid="button-confirm-payment">
            {updatePayment.isPending ? "Saving..." : "Confirm Payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GenerateChargesDialog({ buildings, onClose }: { buildings: any[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [buildingId, setBuildingId] = useState("");
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(28);
    return d.toISOString().split("T")[0];
  });
  const [overrideAmount, setOverrideAmount] = useState("");
  const [result, setResult] = useState<any>(null);

  const generate = useMutation({
    mutationFn: async () => {
      const body: any = { buildingId: Number(buildingId), month, dueDate };
      if (overrideAmount) body.overrideAmount = Number(overrideAmount);
      const res = await fetch("/api/payments/bulk-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? "Failed to generate charges");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetPaymentsSummaryQueryKey() });
    },
  });

  const selectedBuilding = buildings.find(b => String(b.id) === buildingId);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Generate Monthly Charges
          </DialogTitle>
        </DialogHeader>
        {result ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="font-semibold text-green-800">Charges Generated!</p>
              <p className="text-sm text-green-700 mt-1">{result.created} records for {result.building}</p>
              <p className="text-xs text-green-600 mt-0.5">Total: KES {Number(result.totalAmount).toLocaleString()}</p>
            </div>
            <Button className="w-full" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium mb-1 block">Building *</label>
              <Select value={buildingId} onValueChange={setBuildingId}>
                <SelectTrigger data-testid="select-building"><SelectValue placeholder="Select building" /></SelectTrigger>
                <SelectContent>
                  {buildings.map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name} — KES {Number(b.serviceChargeAmount ?? 0).toLocaleString()}/mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Month *</label>
              <Input type="month" value={month} onChange={e => setMonth(e.target.value)} data-testid="input-month" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Due Date *</label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} data-testid="input-due-date" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">
                Override Amount (KES)
                {selectedBuilding?.serviceChargeAmount && (
                  <span className="text-muted-foreground font-normal ml-1">
                    — default: {Number(selectedBuilding.serviceChargeAmount).toLocaleString()}
                  </span>
                )}
              </label>
              <Input
                type="number"
                placeholder={selectedBuilding?.serviceChargeAmount ? String(Number(selectedBuilding.serviceChargeAmount)) : "Use building default"}
                value={overrideAmount}
                onChange={e => setOverrideAmount(e.target.value)}
                data-testid="input-override-amount"
              />
            </div>
            {generate.error && (
              <p className="text-sm text-destructive">{(generate.error as Error).message}</p>
            )}
            <Button
              className="w-full"
              onClick={() => generate.mutate()}
              disabled={!buildingId || !month || !dueDate || generate.isPending}
              data-testid="button-generate"
            >
              {generate.isPending ? "Generating..." : "Generate Charges"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function parseCsvRows(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map(line => {
    const vals = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,)|(?<=,)$)/g) ?? [];
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (vals[i] ?? "").replace(/^"|"$/g, "").trim(); });
    return row;
  });
}

function CsvImportDialog({ payments, residents, onClose }: { payments: any[]; residents: any[]; onClose: () => void }) {
  const qc = useQueryClient();
  const updatePayment = useUpdatePayment();
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [rows, setRows] = useState<Array<{ phone: string; ref: string; date: string; amount?: string }>>([]);
  const [matches, setMatches] = useState<Array<{ row: any; payment: any | null; resident: any | null; reason?: string }>>([]);
  const [processing, setProcessing] = useState(false);
  const [doneCount, setDoneCount] = useState(0);

  const phoneMap = Object.fromEntries(residents.map(r => [r.phone?.replace(/\s/g, ""), r]));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCsvRows(text);
      const normalised = parsed.map(r => ({
        phone: (r.phone ?? r.resident_phone ?? "").replace(/\s/g, ""),
        ref: r.mpesa_ref ?? r.reference ?? r.ref ?? r.mpesa ?? "",
        date: r.date ?? r.paid_date ?? r.payment_date ?? new Date().toISOString().split("T")[0],
        amount: r.amount ?? "",
      }));
      setRows(normalised);
      const matched = normalised.map(row => {
        const resident = phoneMap[row.phone] ?? null;
        if (!resident) return { row, payment: null, resident: null, reason: "No resident with this phone" };
        const pending = payments.find(p =>
          p.residentId === resident.id && (p.status === "pending" || p.status === "overdue")
        ) ?? null;
        if (!pending) return { row, payment: null, resident, reason: "No outstanding payment for this resident" };
        return { row, payment: pending, resident, reason: undefined };
      });
      setMatches(matched);
      setStep("preview");
    };
    reader.readAsText(file);
  };

  const handleConfirm = async () => {
    setProcessing(true);
    let count = 0;
    for (const m of matches) {
      if (!m.payment) continue;
      await new Promise<void>((resolve) => {
        updatePayment.mutate(
          { id: m.payment.id, data: { status: "paid", paymentMethod: "mpesa", paidDate: m.row.date, mpesaRef: m.row.ref || undefined } },
          { onSuccess: () => { count++; resolve(); }, onError: () => resolve() }
        );
      });
    }
    setDoneCount(count);
    qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetPaymentsSummaryQueryKey() });
    setStep("done");
    setProcessing(false);
  };

  const matchedCount = matches.filter(m => m.payment).length;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import M-Pesa Payments (CSV)
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-dashed border-border p-6 text-center space-y-2">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium">Upload your M-Pesa statement CSV</p>
              <p className="text-xs text-muted-foreground">Required columns: <code className="bg-secondary px-1 rounded">phone</code>, <code className="bg-secondary px-1 rounded">mpesa_ref</code>, <code className="bg-secondary px-1 rounded">date</code></p>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFile}
                className="text-sm text-muted-foreground file:mr-3 file:text-xs file:font-medium file:border file:rounded file:px-2 file:py-1 file:border-input file:bg-background hover:file:bg-muted cursor-pointer"
                data-testid="input-csv-file"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              CSV example header: <span className="font-mono">phone,mpesa_ref,date</span> — each row matches a resident by phone and marks their oldest pending/overdue payment as paid.
            </p>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex gap-3 text-sm">
              <span className="flex items-center gap-1 text-green-700"><CheckCircle2 className="w-3.5 h-3.5" />{matchedCount} will be marked paid</span>
              <span className="flex items-center gap-1 text-muted-foreground"><X className="w-3.5 h-3.5" />{matches.length - matchedCount} unmatched</span>
            </div>
            <div className="max-h-64 overflow-y-auto border rounded-lg divide-y divide-border text-sm">
              {matches.map((m, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 ${m.payment ? "bg-green-50/40" : "bg-red-50/40"}`} data-testid={`csv-row-${i}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{m.resident ? `${m.resident.firstName} ${m.resident.lastName}` : m.row.phone}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.reason ?? `Ref: ${m.row.ref} · ${m.row.date}`}</p>
                  </div>
                  {m.payment
                    ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    : <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                  }
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("upload")} className="flex-1">Back</Button>
              <Button onClick={handleConfirm} disabled={processing || matchedCount === 0} className="flex-1" data-testid="button-confirm-import">
                {processing ? "Importing…" : `Mark ${matchedCount} as Paid`}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
            <p className="font-semibold text-foreground">Import complete</p>
            <p className="text-sm text-muted-foreground">{doneCount} payment{doneCount !== 1 ? "s" : ""} marked as paid via M-Pesa.</p>
            <Button onClick={onClose} className="w-full">Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function exportCSV(payments: any[], buildings: any[]) {
  const buildingMap = Object.fromEntries((buildings ?? []).map(b => [b.id, b.name]));
  const rows = [
    ["Month", "Description", "Amount (KES)", "Status", "Due Date", "Paid Date", "Payment Method", "M-Pesa Ref", "Building"],
    ...(payments ?? []).map(p => [
      p.month ?? "",
      p.description ?? "",
      Number(p.amount).toFixed(2),
      p.status,
      p.dueDate ?? "",
      p.paidDate ?? "",
      p.paymentMethod ?? "",
      p.mpesaRef ?? "",
      buildingMap[p.buildingId] ?? String(p.buildingId),
    ]),
  ];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `jengo-payments-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Payments() {
  const [selectedBuilding, setSelectedBuilding] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [residentSearch, setResidentSearch] = useState("");
  const [recordingPayment, setRecordingPayment] = useState<any>(null);
  const [generatingCharges, setGeneratingCharges] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const qc = useQueryClient();
  const updatePayment = useUpdatePayment();
  const { data: buildings } = useListBuildings({ query: { queryKey: getListBuildingsQueryKey() } });
  const { data: residents } = useListResidents(undefined, { query: { queryKey: getListResidentsQueryKey() } });
  const residentMap = Object.fromEntries((residents ?? []).map(r => [r.id, `${r.firstName} ${r.lastName}`]));

  const params: Record<string, unknown> = {};
  if (selectedBuilding !== "all") params.buildingId = Number(selectedBuilding);
  if (statusFilter !== "all") params.status = statusFilter;

  const { data: rawPayments, isLoading } = useListPayments(
    Object.keys(params).length ? params as any : undefined,
    { query: { queryKey: getListPaymentsQueryKey(Object.keys(params).length ? params as any : undefined) } }
  );

  const payments = residentSearch.trim()
    ? (rawPayments ?? []).filter(p => {
        const name = p.residentId ? (residentMap[p.residentId] ?? "").toLowerCase() : "";
        return name.includes(residentSearch.toLowerCase());
      })
    : rawPayments;
  const { data: summary } = useGetPaymentsSummary(
    selectedBuilding !== "all" ? { buildingId: Number(selectedBuilding) } : undefined,
    { query: { queryKey: getGetPaymentsSummaryQueryKey(selectedBuilding !== "all" ? { buildingId: Number(selectedBuilding) } : undefined) } }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Service Charges</h1>
          <p className="text-muted-foreground">Track and record payment collections</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => exportCSV(payments ?? [], buildings ?? [])}
            disabled={!payments?.length}
            data-testid="button-export-csv"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setImportingCsv(true)}
            data-testid="button-import-csv"
          >
            <Upload className="w-4 h-4" />
            Import M-Pesa
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-red-200 text-red-700 hover:bg-red-50"
            onClick={async () => {
              const res = await fetch("/api/payments/mark-overdue", { method: "POST" });
              const data = await res.json();
              qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
              qc.invalidateQueries({ queryKey: getGetPaymentsSummaryQueryKey() });
              alert(`Marked ${data.marked} payment${data.marked !== 1 ? "s" : ""} as overdue.`);
            }}
            data-testid="button-mark-overdue"
          >
            <AlertOctagon className="w-4 h-4" />
            Mark Overdue
          </Button>
          <Button className="gap-2" onClick={() => setGeneratingCharges(true)} data-testid="button-generate-charges">
            <Zap className="w-4 h-4" />
            Generate Charges
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <p className="text-sm text-muted-foreground">Collected</p>
            </div>
            <p className="text-2xl font-bold text-green-700">KES {(summary?.totalCollected ?? 0).toLocaleString()}</p>
            <p className="text-xs text-green-600 mt-0.5">{summary?.paidCount ?? 0} payments</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <p className="text-sm text-muted-foreground">Overdue</p>
            </div>
            <p className="text-2xl font-bold text-red-700">KES {(summary?.totalOverdue ?? 0).toLocaleString()}</p>
            <p className="text-xs text-red-600 mt-0.5">{summary?.overdueCount ?? 0} overdue</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-amber-600" />
              <p className="text-sm text-muted-foreground">Outstanding</p>
            </div>
            <p className="text-2xl font-bold text-amber-700">KES {(summary?.totalOutstanding ?? 0).toLocaleString()}</p>
            <p className="text-xs text-amber-600 mt-0.5">{summary?.pendingCount ?? 0} pending</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-primary" />
              <p className="text-sm text-muted-foreground">Collection Rate</p>
            </div>
            <p className="text-2xl font-bold text-primary">{summary?.collectionRate ?? 0}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search resident..."
            value={residentSearch}
            onChange={e => setResidentSearch(e.target.value)}
            className="pl-8 w-44 h-9"
            data-testid="input-resident-search"
          />
        </div>
        <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
          <SelectTrigger className="w-52" data-testid="select-building">
            <SelectValue placeholder="All Buildings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Buildings</SelectItem>
            {buildings?.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36" data-testid="select-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="waived">Waived</SelectItem>
          </SelectContent>
        </Select>
        {(residentSearch || selectedBuilding !== "all" || statusFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setResidentSearch(""); setSelectedBuilding("all"); setStatusFilter("all"); }}>
            Clear
          </Button>
        )}
        <span className="text-sm text-muted-foreground ml-auto">
          {(payments ?? []).length} record{(payments ?? []).length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Payment list */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : !payments?.length ? (
            <div className="p-12 text-center">
              <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No payments found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {payments.map(payment => (
                <div key={payment.id} className="flex items-center justify-between p-4" data-testid={`row-payment-${payment.id}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${STATUS_COLORS[payment.status]}`}>
                        {payment.status}
                      </span>
                      {payment.residentId && residentMap[payment.residentId] && (
                        <span className="text-xs font-medium text-foreground/80">{residentMap[payment.residentId]}</span>
                      )}
                      {payment.paymentMethod && (
                        <span className="text-xs text-muted-foreground">{METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}</span>
                      )}
                      {payment.mpesaRef && (
                        <span className="text-xs font-mono text-muted-foreground">Ref: {payment.mpesaRef}</span>
                      )}
                    </div>
                    <p className="font-medium text-foreground">{payment.description}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>Due: {payment.dueDate}</span>
                      {payment.paidDate && <span>Paid: {payment.paidDate}</span>}
                      {payment.month && <span>{payment.month}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <p className="font-semibold text-foreground">KES {Number(payment.amount).toLocaleString()}</p>
                    {payment.mpesaRef && payment.status !== "paid" && payment.status !== "waived" && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white gap-1"
                        onClick={() => {
                          updatePayment.mutate(
                            { id: payment.id, data: { status: "paid", paymentMethod: "mpesa", paidDate: new Date().toISOString().split("T")[0], mpesaRef: payment.mpesaRef ?? undefined } },
                            { onSuccess: () => { qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() }); qc.invalidateQueries({ queryKey: getGetPaymentsSummaryQueryKey() }); } }
                          );
                        }}
                        data-testid={`button-verify-${payment.id}`}
                      >
                        <BadgeCheck className="w-3.5 h-3.5" /> Verify
                      </Button>
                    )}
                    {!payment.mpesaRef && (payment.status === "pending" || payment.status === "overdue") && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setRecordingPayment(payment)} data-testid={`button-record-${payment.id}`}>
                          Record
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-amber-600 text-xs"
                          onClick={() => {
                            updatePayment.mutate(
                              { id: payment.id, data: { status: "waived" } },
                              { onSuccess: () => { qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() }); qc.invalidateQueries({ queryKey: getGetPaymentsSummaryQueryKey() }); } }
                            );
                          }}
                          data-testid={`button-waive-${payment.id}`}
                        >
                          Waive
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {recordingPayment && (
        <RecordPaymentDialog payment={recordingPayment} onClose={() => setRecordingPayment(null)} />
      )}
      {generatingCharges && buildings && (
        <GenerateChargesDialog buildings={buildings} onClose={() => setGeneratingCharges(false)} />
      )}
      {importingCsv && (
        <CsvImportDialog
          payments={rawPayments ?? []}
          residents={residents ?? []}
          onClose={() => setImportingCsv(false)}
        />
      )}
    </div>
  );
}
