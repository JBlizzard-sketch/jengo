import { useState } from "react";
import {
  useListPayments, useGetPaymentsSummary, useUpdatePayment, useListBuildings,
  getListPaymentsQueryKey, getGetPaymentsSummaryQueryKey, getListBuildingsQueryKey
} from "@workspace/api-client-react";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TrendingUp, AlertTriangle, CreditCard, CheckCircle, Filter, BadgeCheck, Zap } from "lucide-react";

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

export default function Payments() {
  const [selectedBuilding, setSelectedBuilding] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [recordingPayment, setRecordingPayment] = useState<any>(null);
  const [generatingCharges, setGeneratingCharges] = useState(false);
  const qc = useQueryClient();
  const updatePayment = useUpdatePayment();
  const { data: buildings } = useListBuildings({ query: { queryKey: getListBuildingsQueryKey() } });

  const params: Record<string, unknown> = {};
  if (selectedBuilding !== "all") params.buildingId = Number(selectedBuilding);
  if (statusFilter !== "all") params.status = statusFilter;

  const { data: payments, isLoading } = useListPayments(
    Object.keys(params).length ? params as any : undefined,
    { query: { queryKey: getListPaymentsQueryKey(Object.keys(params).length ? params as any : undefined) } }
  );
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
        <Button className="gap-2" onClick={() => setGeneratingCharges(true)} data-testid="button-generate-charges">
          <Zap className="w-4 h-4" />
          Generate Charges
        </Button>
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
                      <Button size="sm" variant="outline" onClick={() => setRecordingPayment(payment)} data-testid={`button-record-${payment.id}`}>
                        Record
                      </Button>
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
    </div>
  );
}
