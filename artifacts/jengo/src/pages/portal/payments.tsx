import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, CheckCircle, AlertTriangle, Clock } from "lucide-react";

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

export default function PortalPayments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/payments", { credentials: "include" })
      .then(r => r.json())
      .then(setPayments)
      .finally(() => setLoading(false));
  }, []);

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
                <div key={payment.id} className="p-4 flex items-start justify-between gap-4" data-testid={`row-payment-${payment.id}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${STATUS_COLORS[payment.status]}`}>
                        {payment.status}
                      </span>
                      {payment.paymentMethod && (
                        <span className="text-xs text-muted-foreground">{METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}</span>
                      )}
                    </div>
                    <p className="font-medium text-sm">{payment.description}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>Due: {payment.dueDate}</span>
                      {payment.paidDate && <span>Paid: {payment.paidDate}</span>}
                      {payment.mpesaRef && <span className="font-mono">Ref: {payment.mpesaRef}</span>}
                    </div>
                    {payment.status === "overdue" && (
                      <p className="text-xs text-red-600 mt-1 font-medium">
                        Please pay via M-Pesa Paybill or contact your caretaker.
                      </p>
                    )}
                  </div>
                  <p className="font-bold text-sm whitespace-nowrap">KES {Number(payment.amount).toLocaleString()}</p>
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
            Pay via M-Pesa Paybill or contact your caretaker to record your payment.
          </p>
        </div>
      )}
    </div>
  );
}
