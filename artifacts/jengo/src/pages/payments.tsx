import { useState } from "react";
import {
  useListPayments, useGetPaymentsSummary, useUpdatePayment, useListBuildings,
  getListPaymentsQueryKey, getGetPaymentsSummaryQueryKey, getListBuildingsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TrendingUp, AlertTriangle, CreditCard, CheckCircle, Filter } from "lucide-react";

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

export default function Payments() {
  const [selectedBuilding, setSelectedBuilding] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [recordingPayment, setRecordingPayment] = useState<any>(null);
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
      <div>
        <h1 className="text-3xl font-bold text-foreground">Service Charges</h1>
        <p className="text-muted-foreground">Track and record payment collections</p>
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
                  <div className="flex items-center gap-4 ml-4">
                    <p className="font-semibold text-foreground">KES {Number(payment.amount).toLocaleString()}</p>
                    {(payment.status === "pending" || payment.status === "overdue") && (
                      <Button size="sm" onClick={() => setRecordingPayment(payment)} data-testid={`button-record-${payment.id}`}>
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
    </div>
  );
}
