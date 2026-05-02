import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreditCard, CheckCircle, AlertTriangle, Clock, Smartphone, FileText } from "lucide-react";
import { loadSettings } from "@/lib/print-utils";

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

async function printPortalStatement(payments: any[]) {
  const settings = loadSettings();
  const meRes = await fetch("/api/portal/home", { credentials: "include" });
  const home = meRes.ok ? await meRes.json() : null;
  const residentName = home?.resident?.name ?? "Resident";
  const unitNumber = home?.unit?.unitNumber ?? "";
  const buildingName = home?.building?.name ?? "";
  const monthlyRent = home?.unit?.monthlyRent ? `KES ${Number(home.unit.monthlyRent).toLocaleString()}/mo` : "";

  const paid = payments.filter(p => p.status === "paid");
  const overdue = payments.filter(p => p.status === "overdue");
  const pending = payments.filter(p => p.status === "pending");
  const totalPaid = paid.reduce((s, p) => s + Number(p.amount), 0);
  const totalOwing = [...overdue, ...pending].reduce((s, p) => s + Number(p.amount), 0);

  const rows = payments.map(p => `
    <tr>
      <td>${p.description ?? ""}</td>
      <td>${p.month ?? "—"}</td>
      <td>${p.dueDate ?? "—"}</td>
      <td style="text-align:right">KES ${Number(p.amount).toLocaleString()}</td>
      <td><span class="badge ${p.status}">${p.status}</span></td>
      <td>${p.paidDate ?? "—"}</td>
      <td>${p.paymentMethod ?? "—"}${p.mpesaRef ? ` · ${p.mpesaRef}` : ""}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>My Payment Statement</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 32px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #d97706; padding-bottom: 16px; }
  .brand { font-size: 22px; font-weight: 800; color: #d97706; }
  .brand-sub { font-size: 11px; color: #666; }
  .title { font-size: 18px; font-weight: 700; margin-bottom: 16px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
  .meta-box { background: #f8f8f8; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 14px; }
  .meta-box label { font-size: 10px; color: #666; text-transform: uppercase; display: block; margin-bottom: 4px; }
  .meta-box span { font-size: 13px; font-weight: 600; }
  .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
  .sc { border-radius: 6px; padding: 12px; text-align: center; }
  .sc.g { background: #f0fdf4; border: 1px solid #bbf7d0; }
  .sc.r { background: #fef2f2; border: 1px solid #fecaca; }
  .sc.a { background: #fffbeb; border: 1px solid #fde68a; }
  .sc .v { font-size: 15px; font-weight: 700; }
  .sc .l { font-size: 10px; color: #666; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f3f4f6; text-align: left; padding: 7px 8px; font-weight: 600; border-bottom: 1px solid #e5e7eb; }
  td { padding: 7px 8px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  .badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; }
  .badge.paid { background: #dcfce7; color: #15803d; }
  .badge.overdue { background: #fee2e2; color: #b91c1c; }
  .badge.pending { background: #fef9c3; color: #854d0e; }
  .badge.waived { background: #f3f4f6; color: #6b7280; }
  .footer { margin-top: 28px; border-top: 1px solid #e5e7eb; padding-top: 14px; font-size: 10px; color: #9ca3af; text-align: center; }
  .print-btn { position: fixed; top: 16px; right: 16px; background: #d97706; color: #fff; border: none; padding: 8px 18px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; }
  @media print { .print-btn { display: none; } }
</style></head><body>
<button class="print-btn" onclick="window.print()">🖨 Print</button>
<div class="header">
  <div><div class="brand">${settings.companyName || "Jengo"}</div><div class="brand-sub">Property Management</div>${settings.companyPhone ? `<div class="brand-sub">${settings.companyPhone}</div>` : ""}</div>
  <div style="text-align:right"><div style="font-size:11px;color:#666">Statement Date</div><div style="font-weight:700">${new Date().toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}</div></div>
</div>
<div class="title">Resident Payment Statement</div>
<div class="meta">
  <div class="meta-box"><label>Resident</label><span>${residentName}</span></div>
  <div class="meta-box"><label>Unit</label><span>${unitNumber}${buildingName ? ` · ${buildingName}` : ""}</span></div>
  <div class="meta-box"><label>Monthly Rent</label><span>${monthlyRent || "—"}</span></div>
  <div class="meta-box"><label>Records</label><span>${payments.length} entries</span></div>
</div>
<div class="summary">
  <div class="sc g"><div class="v" style="color:#15803d">KES ${totalPaid.toLocaleString()}</div><div class="l">${paid.length} Paid</div></div>
  <div class="sc r"><div class="v" style="color:#b91c1c">${overdue.length} Overdue</div><div class="l">KES ${overdue.reduce((s, p) => s + Number(p.amount), 0).toLocaleString()}</div></div>
  <div class="sc a"><div class="v" style="color:#92400e">${pending.length} Pending</div><div class="l">KES ${pending.reduce((s, p) => s + Number(p.amount), 0).toLocaleString()}</div></div>
</div>
<table>
  <thead><tr><th>Description</th><th>Month</th><th>Due Date</th><th style="text-align:right">Amount</th><th>Status</th><th>Paid Date</th><th>Method / Ref</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr style="background:#f3f4f6;font-weight:700"><td colspan="3">Total</td><td style="text-align:right">KES ${payments.reduce((s, p) => s + Number(p.amount), 0).toLocaleString()}</td><td colspan="3" style="font-size:10px">Paid: KES ${totalPaid.toLocaleString()} · Outstanding: KES ${totalOwing.toLocaleString()}</td></tr></tfoot>
</table>
${totalOwing > 0 ? `<div style="margin-top:16px;padding:10px 14px;background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;font-size:11px;color:#92400e"><strong>Total Outstanding: KES ${totalOwing.toLocaleString()}</strong>${settings.mpesaPaybill ? ` — Pay via M-Pesa Paybill ${settings.mpesaPaybill}` : ""}</div>` : ""}
<div class="footer">${settings.companyName || "Jengo"} · Generated ${new Date().toLocaleString("en-KE")}</div>
</body></html>`;

  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Payments</h1>
          <p className="text-muted-foreground text-sm">Service charge history for your unit</p>
        </div>
        {payments.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 flex-shrink-0"
            onClick={() => printPortalStatement(payments)}
            data-testid="button-print-statement"
          >
            <FileText className="w-4 h-4" />
            Print Statement
          </Button>
        )}
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
