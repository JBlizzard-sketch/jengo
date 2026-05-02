import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserCircle, Phone, Mail, Home, Calendar, CheckCircle, AlertCircle } from "lucide-react";
import { loadSettings } from "@/lib/print-utils";

interface ProfileData {
  resident: { name: string; phone: string | null; email: string | null; isOwner: boolean | null };
  unit: { unitNumber: string; floor: number; bedrooms: number; monthlyRent: string | null; leaseEndDate: string | null };
  building: { name: string; neighbourhood: string };
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });
}

export default function PortalProfile() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/portal/home", { credentials: "include" })
      .then(r => r.json())
      .then((d: ProfileData) => {
        setData(d);
        setPhone(d.resident.phone ?? "");
        setEmail(d.resident.email ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    setSaved(false);
    try {
      const body: Record<string, string> = {};
      if (phone.trim()) body.phone = phone.trim();
      if (email.trim()) body.email = email.trim();
      const res = await fetch("/api/portal/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to save");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const printStatement = async () => {
    if (!data) return;
    const settings = loadSettings();
    const payments = await fetch("/api/portal/payments", { credentials: "include" }).then(r => r.json());
    const paid = payments.filter((p: any) => p.status === "paid");
    const overdue = payments.filter((p: any) => p.status === "overdue");
    const pending = payments.filter((p: any) => p.status === "pending");
    const totalPaid = paid.reduce((s: number, p: any) => s + Number(p.amount), 0);
    const totalOwing = [...overdue, ...pending].reduce((s: number, p: any) => s + Number(p.amount), 0);

    const rows = payments.map((p: any) => `
      <tr>
        <td>${p.description ?? ""}</td>
        <td>${p.month ?? "—"}</td>
        <td>${p.dueDate ?? "—"}</td>
        <td style="text-align:right">KES ${Number(p.amount).toLocaleString()}</td>
        <td><span class="badge ${p.status}">${p.status}</span></td>
        <td>${p.paidDate ?? "—"}</td>
        <td>${p.paymentMethod ?? "—"}${p.mpesaRef ? ` · ${p.mpesaRef}` : ""}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Resident Payment Statement</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: #fff; padding: 32px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #d97706; padding-bottom: 16px; }
  .brand { font-size: 22px; font-weight: 800; color: #d97706; }
  .brand-sub { font-size: 11px; color: #666; }
  .title { font-size: 18px; font-weight: 700; color: #1a1a1a; margin-bottom: 16px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
  .meta-box { background: #f8f8f8; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 14px; }
  .meta-box label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px; }
  .meta-box span { font-size: 13px; font-weight: 600; }
  .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
  .summary-card { border-radius: 6px; padding: 12px; text-align: center; }
  .summary-card.green { background: #f0fdf4; border: 1px solid #bbf7d0; }
  .summary-card.red { background: #fef2f2; border: 1px solid #fecaca; }
  .summary-card.gray { background: #f9fafb; border: 1px solid #e5e7eb; }
  .summary-card .val { font-size: 15px; font-weight: 700; }
  .summary-card .lbl { font-size: 10px; color: #666; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f3f4f6; text-align: left; padding: 7px 8px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb; }
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
  <div>
    <div class="brand">${settings.companyName || "Jengo"}</div>
    <div class="brand-sub">Property Management</div>
    ${settings.companyPhone ? `<div class="brand-sub">${settings.companyPhone}</div>` : ""}
    ${settings.companyEmail ? `<div class="brand-sub">${settings.companyEmail}</div>` : ""}
  </div>
  <div style="text-align:right">
    <div style="font-size:11px;color:#666">Statement Date</div>
    <div style="font-weight:700">${new Date().toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}</div>
  </div>
</div>
<div class="title">Resident Payment Statement</div>
<div class="meta">
  <div class="meta-box"><label>Resident</label><span>${data.resident.name}</span></div>
  <div class="meta-box"><label>Unit</label><span>${data.unit.unitNumber} · ${data.building.name}</span></div>
  <div class="meta-box"><label>Monthly Rent</label><span>KES ${data.unit.monthlyRent ? Number(data.unit.monthlyRent).toLocaleString() : "—"}/mo</span></div>
  <div class="meta-box"><label>Records</label><span>${payments.length} entries</span></div>
</div>
<div class="summary">
  <div class="summary-card green"><div class="val" style="color:#15803d">KES ${totalPaid.toLocaleString()}</div><div class="lbl">${paid.length} Paid</div></div>
  <div class="summary-card red"><div class="val" style="color:#b91c1c">KES ${overdue.reduce((s: number, p: any) => s + Number(p.amount), 0).toLocaleString()}</div><div class="lbl">${overdue.length} Overdue</div></div>
  <div class="summary-card gray"><div class="val">KES ${pending.reduce((s: number, p: any) => s + Number(p.amount), 0).toLocaleString()}</div><div class="lbl">${pending.length} Pending</div></div>
</div>
<table>
  <thead><tr><th>Description</th><th>Month</th><th>Due Date</th><th style="text-align:right">Amount</th><th>Status</th><th>Paid Date</th><th>Method / Ref</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr style="background:#f3f4f6;font-weight:700"><td colspan="3">Total</td><td style="text-align:right">KES ${payments.reduce((s: number, p: any) => s + Number(p.amount), 0).toLocaleString()}</td><td colspan="3" style="color:#374151;font-size:10px">Collected: KES ${totalPaid.toLocaleString()} · Outstanding: KES ${totalOwing.toLocaleString()}</td></tr></tfoot>
</table>
${totalOwing > 0 ? `<div style="margin-top:16px;padding:10px 14px;background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;font-size:11px;color:#92400e"><strong>Balance Due: KES ${totalOwing.toLocaleString()}</strong>${settings.mpesaPaybill ? ` — Pay via M-Pesa Paybill ${settings.mpesaPaybill}` : ""}</div>` : ""}
<div class="footer">${settings.companyName || "Jengo"} · ${settings.companyAddress || ""} · Generated ${new Date().toLocaleString("en-KE")}</div>
</body></html>`;

    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading profile...</div>;
  if (!data) return <div className="p-8 text-center text-muted-foreground">Could not load profile</div>;

  const leaseEnd = data.unit.leaseEndDate;
  const leaseInfo = leaseEnd ? { days: daysUntil(leaseEnd), formatted: formatDate(leaseEnd) } : null;

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-muted-foreground text-sm">View and update your contact details</p>
      </div>

      {/* Identity card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <UserCircle className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">{data.resident.name}</p>
              <p className="text-sm text-muted-foreground">
                Unit {data.unit.unitNumber} · {data.building.name}
                {data.resident.isOwner && " · Owner-occupier"}
              </p>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">
                {data.unit.bedrooms} bedrooms · Floor {data.unit.floor}
                {data.unit.monthlyRent ? ` · KES ${Number(data.unit.monthlyRent).toLocaleString()}/mo` : ""}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lease info */}
      {leaseInfo && (
        <Card className={
          leaseInfo.days <= 0 ? "border-red-200 bg-red-50/40"
          : leaseInfo.days <= 60 ? "border-amber-200 bg-amber-50/40"
          : "border-green-200 bg-green-50/40"
        }>
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className={`w-5 h-5 flex-shrink-0 ${leaseInfo.days <= 0 ? "text-red-600" : leaseInfo.days <= 60 ? "text-amber-600" : "text-green-600"}`} />
            <div>
              <p className="font-semibold text-sm">
                {leaseInfo.days <= 0
                  ? "Lease has expired"
                  : `Lease expires in ${leaseInfo.days} days`}
              </p>
              <p className="text-xs text-muted-foreground">{leaseInfo.formatted}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit contact info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                Phone Number
              </label>
              <Input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+254 7XX XXX XXX"
                data-testid="input-phone"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                Email Address
              </label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                data-testid="input-email"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={saving} data-testid="button-save-profile">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              {saved && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Saved
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Statement download */}
      <Card>
        <CardContent className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Home className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Payment Statement</p>
              <p className="text-xs text-muted-foreground">Download a printable record of all your payments</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={printStatement} data-testid="button-print-statement">
            Print Statement
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
