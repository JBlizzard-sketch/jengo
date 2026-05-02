import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreditCard, CheckCircle, AlertTriangle, Clock, Smartphone } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-100 text-green-700 border-green-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  overdue: "bg-red-100 text-red-700 border-red-200",
  waived: "bg-gray-100 text-gray-500 border-gray-200",
};

const METHOD_LABELS: Record<string, string> = {
  mpesa: "M-Pesa",
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  other: "Other",
};

function MpesaDialog({
  payment,
  open,
  onClose,
  onSubmitted,
}: {
  payment: any;
  open: boolean;
  onClose: () => void;
  onSubmitted: (updated: any) => void;
}) {
  const [ref, setRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/portal/payments/${payment.id}/submit-mpesa`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mpesaRef: ref.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed");
      }
      const updated = await res.json();
      onSubmitted(updated);
      onClose();
      setRef("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-green-600" />
            Submit M-Pesa Reference
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-secondary rounded-lg text-sm">
            <p className="font-medium">{payment?.description}</p>
            <p className="text-muted-foreground">KES {payment ? Number(payment.amount).toLocaleString() : ""}</p>
          </div>
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 space-y-1">
            <p className="font-semibold">How to pay:</p>
            <p>1. M-Pesa → Lipa na M-Pesa → Paybill</p>
            <p>2. Enter the Paybill number given by management</p>
            <p>3. Enter your unit number as Account</p>
            <p>4. Enter the amount and complete</p>
            <p>5. Copy the confirmation code (e.g. QGH7X4P2KL)</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">M-Pesa Confirmation Code</label>
              <Input
                placeholder="e.g. QGH7X4P2KL"
                value={ref}
                onChange={e => setRef(e.target.value.toUpperCase())}
                required
                className="font-mono tracking-wider"
                data-testid="input-mpesa-ref"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading || !ref.trim()} className="w-full" data-testid="button-submit-mpesa">
              {loading ? "Submitting..." : "Submit for Verification"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center">
            Management will verify your payment and update the status.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PortalPayments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mpesaTarget, setMpesaTarget] = useState<any | null>(null);

  const load = () => {
    fetch("/api/portal/payments", { credentials: "include" })
      .then(r => r.json())
      .then(setPayments)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmitted = (updated: any) => {
    setPayments(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const paid = payments.filter(p => p.status === "paid");
  const overdue = payments.filter(p => p.status === "overdue");
  const pending = payments.filter(p => p.status === "pending");
  const totalPaid = paid.reduce((s, p) => s + Number(p.amount), 0);
  const totalOwing = [...overdue, ...pending].reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">My Payments</h1>
        <p className="text-muted-foreground text-sm">Service charge history for your unit</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-green-200 bg-green-50/40">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-700">KES {totalPaid.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{paid.length} paid</p>
          </CardContent>
        </Card>
        <Card className={overdue.length ? "border-red-200 bg-red-50/40" : ""}>
          <CardContent className="p-4 text-center">
            <AlertTriangle className={`w-5 h-5 mx-auto mb-1 ${overdue.length ? "text-red-600" : "text-muted-foreground"}`} />
            <p className={`text-lg font-bold ${overdue.length ? "text-red-700" : ""}`}>{overdue.length}</p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card className={pending.length ? "border-amber-200 bg-amber-50/40" : ""}>
          <CardContent className="p-4 text-center">
            <Clock className={`w-5 h-5 mx-auto mb-1 ${pending.length ? "text-amber-600" : "text-muted-foreground"}`} />
            <p className={`text-lg font-bold ${pending.length ? "text-amber-700" : ""}`}>{pending.length}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment list */}
      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      ) : !payments.length ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No payment records found</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {payments.map(payment => (
                <div key={payment.id} className="p-4" data-testid={`row-payment-${payment.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${STATUS_COLORS[payment.status]}`}>
                          {payment.mpesaRef && payment.status === "pending" ? "pending verification" : payment.status}
                        </span>
                        {payment.paymentMethod && (
                          <span className="text-xs text-muted-foreground">{METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}</span>
                        )}
                      </div>
                      <p className="font-medium text-sm">{payment.description}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>Due: {payment.dueDate}</span>
                        {payment.paidDate && <span>Paid: {payment.paidDate}</span>}
                        {payment.mpesaRef && (
                          <span className="font-mono text-green-700 bg-green-50 px-1 rounded">
                            Ref: {payment.mpesaRef}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-sm">KES {Number(payment.amount).toLocaleString()}</p>
                      {(payment.status === "overdue" || (payment.status === "pending" && !payment.mpesaRef)) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 h-7 text-xs gap-1 border-green-300 text-green-700 hover:bg-green-50"
                          onClick={() => setMpesaTarget(payment)}
                          data-testid={`button-pay-${payment.id}`}
                        >
                          <Smartphone className="w-3 h-3" />
                          M-Pesa
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {totalOwing > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="font-semibold text-amber-800">Total owing: KES {totalOwing.toLocaleString()}</p>
          <p className="text-sm text-amber-700 mt-1">
            Click the M-Pesa button on any payment to submit your confirmation code.
          </p>
        </div>
      )}

      {mpesaTarget && (
        <MpesaDialog
          payment={mpesaTarget}
          open={!!mpesaTarget}
          onClose={() => setMpesaTarget(null)}
          onSubmitted={handleSubmitted}
        />
      )}
    </div>
  );
}
