import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetResident, useUpdateResident, useListPayments, useListBuildings, useListUnits, useListIssues,
  useUpdatePayment,
  getGetResidentQueryKey, getListPaymentsQueryKey, getListBuildingsQueryKey, getListUnitsQueryKey, getListIssuesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Phone, Mail, Home, Building, Calendar, CreditCard, AlertCircle, LogOut, Edit2, Check, X, ChevronRight, CalendarClock, RotateCcw, FileText
} from "lucide-react";
import { printHtml, formatKES, formatDate, today, loadSettings } from "@/lib/print-utils";
import { Link } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  inactive: "bg-gray-100 text-gray-500",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  overdue: "bg-red-100 text-red-700",
  waived: "bg-gray-100 text-gray-500",
};

const ISSUE_STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-700",
  in_progress: "bg-amber-100 text-amber-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function EditableField({
  label, value, icon, onSave, type = "text"
}: { label: string; value: string; icon: React.ReactNode; onSave: (v: string) => Promise<void>; type?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setEditing(false);
  };

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {editing ? (
        <div className="flex items-center gap-2">
          <Input type={type} value={draft} onChange={e => setDraft(e.target.value)} className="h-8 text-sm" autoFocus />
          <Button size="sm" className="h-8 px-2" onClick={save} disabled={saving}><Check className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => { setDraft(value); setEditing(false); }}><X className="w-3.5 h-3.5" /></Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 group">
          <span className="flex items-center gap-1.5 text-sm font-medium">{icon}{value || <span className="text-muted-foreground italic">Not set</span>}</span>
          <button onClick={() => { setDraft(value); setEditing(true); }} className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Edit2 className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function ResidentDetail() {
  const [, params] = useRoute("/residents/:id");
  const [, setLocation] = useLocation();
  const id = Number(params?.id);
  const qc = useQueryClient();

  const { data: resident, isLoading } = useGetResident(id, {
    query: { queryKey: getGetResidentQueryKey(id), enabled: !!id },
  });
  const { data: buildings } = useListBuildings({ query: { queryKey: getListBuildingsQueryKey() } });
  const { data: units } = useListUnits(resident?.buildingId ?? 0, {
    query: { queryKey: getListUnitsQueryKey(resident?.buildingId ?? 0), enabled: !!resident?.buildingId },
  });
  const { data: payments } = useListPayments(
    { unitId: resident?.unitId } as any,
    { query: { queryKey: getListPaymentsQueryKey({ unitId: resident?.unitId } as any), enabled: !!resident?.unitId } }
  );
  const { data: issues } = useListIssues(
    { buildingId: String(resident?.buildingId) } as any,
    { query: { queryKey: getListIssuesQueryKey({ buildingId: String(resident?.buildingId) } as any), enabled: !!resident?.buildingId } }
  );

  const updateResident = useUpdateResident();
  const updatePayment = useUpdatePayment();
  const [recordingPaymentId, setRecordingPaymentId] = useState<number | null>(null);
  const [mpesaRef, setMpesaRef] = useState("");

  const handleRecordPayment = (paymentId: number) => {
    updatePayment.mutate(
      { id: paymentId, data: { status: "paid", paidDate: new Date().toISOString().split("T")[0], mpesaRef: mpesaRef || undefined } as any },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListPaymentsQueryKey({ residentId: id } as any) });
          setRecordingPaymentId(null);
          setMpesaRef("");
        },
      }
    );
  };

  const handleWaivePayment = (paymentId: number) => {
    updatePayment.mutate(
      { id: paymentId, data: { status: "waived" } as any },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListPaymentsQueryKey({ residentId: id } as any) });
        },
      }
    );
  };

  const patch = (updates: Record<string, unknown>) =>
    new Promise<void>((resolve, reject) => {
      updateResident.mutate(
        { id, data: updates as any },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getGetResidentQueryKey(id) });
            resolve();
          },
          onError: reject,
        }
      );
    });

  const handleMoveOut = () => {
    patch({ status: "inactive", moveOutDate: new Date().toISOString().split("T")[0] } as any).then(() => {
      qc.invalidateQueries({ queryKey: getGetResidentQueryKey(id) });
    });
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading resident...</div>;
  if (!resident) return <div className="p-8 text-center text-muted-foreground">Resident not found</div>;

  const building = buildings?.find(b => b.id === resident.buildingId);
  const unit = units?.find(u => u.id === resident.unitId);

  const totalPaid = (payments ?? []).filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const totalOverdue = (payments ?? []).filter(p => p.status === "overdue").reduce((s, p) => s + Number(p.amount), 0);
  const openIssues = (issues ?? []).filter(i => i.status === "open" || i.status === "in_progress");

  const printDemandLetter = () => {
    const s = loadSettings();
    const overdueList = (payments ?? []).filter(p => p.status === "overdue");
    const pendingList = (payments ?? []).filter(p => p.status === "pending");
    const allDue = [...overdueList, ...pendingList];
    const totalDue = allDue.reduce((sum, p) => sum + Number(p.amount), 0);
    const rows = allDue.map(p => `<tr>
      <td>${p.description ?? "—"}</td>
      <td>${p.month ?? "—"}</td>
      <td>${formatDate(p.dueDate)}</td>
      <td style="text-align:right;font-weight:600;">${formatKES(p.amount)}</td>
      <td><span class="badge ${p.status === "overdue" ? "badge-red" : "badge-amber"}">${p.status}</span></td>
    </tr>`).join("");
    const phone = resident.phone?.replace(/\D/g,"").slice(-9) ?? "";
    const html = `
      <div class="header">
        <div>
          <div class="brand">Jengo</div>
          <div style="font-size:12px;color:#666;">${s.companyName}</div>
          <div style="font-size:12px;color:#666;">${s.companyAddress}</div>
          <div style="font-size:12px;color:#666;">${s.companyPhone} · ${s.companyEmail}</div>
        </div>
        <div class="meta">
          <div>Date: ${today()}</div>
          <div>Ref: DMD-${String(resident.id).padStart(4,"0")}-${Date.now().toString(36).toUpperCase().slice(-4)}</div>
        </div>
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-size:12px;color:#666;">To:</div>
        <div style="font-weight:600;">${resident.firstName} ${resident.lastName}</div>
        <div style="font-size:12px;color:#666;">Unit ${unit?.unitNumber ?? "—"}, ${building?.name ?? "—"}</div>
        ${resident.phone ? `<div style="font-size:12px;color:#666;">${resident.phone}</div>` : ""}
      </div>

      <div style="text-align:center;margin-bottom:20px;">
        <h1 style="font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:1px;border:2px solid #b91c1c;color:#b91c1c;display:inline-block;padding:6px 24px;border-radius:4px;">
          NOTICE OF OUTSTANDING SERVICE CHARGES
        </h1>
      </div>

      <div class="letter-body">
        <p>Dear <strong>${resident.firstName} ${resident.lastName}</strong>,</p>
      </div>
      <div class="letter-body">
        <p>We refer to your tenancy / occupation of <strong>Unit ${unit?.unitNumber ?? "—"}</strong> at <strong>${building?.name ?? "—"}</strong>. Our records indicate that the following service charges remain outstanding as of <strong>${today()}</strong>:</p>
      </div>

      <table style="margin-bottom:16px;">
        <thead><tr>
          <th>Description</th><th>Period</th><th>Due Date</th>
          <th style="text-align:right;">Amount</th><th>Status</th>
        </tr></thead>
        <tbody>${rows || "<tr><td colspan='5' style='text-align:center;'>No overdue charges found</td></tr>"}</tbody>
        <tfoot><tr>
          <td colspan="3" style="font-weight:700;">TOTAL AMOUNT DUE</td>
          <td style="text-align:right;font-size:16px;color:#b91c1c;">${formatKES(totalDue)}</td>
          <td></td>
        </tr></tfoot>
      </table>

      <div class="letter-body">
        <p>You are hereby requested to <strong>settle the full outstanding balance of ${formatKES(totalDue)} within seven (7) days</strong> of the date of this notice.</p>
      </div>

      <div class="box" style="margin-bottom:16px;">
        <h3>Payment Instructions</h3>
        <p style="margin-top:6px;">Pay via <strong>M-Pesa</strong>:</p>
        <p class="indent">Paybill Number: <strong>${s.mpesaPaybill}</strong></p>
        <p class="indent">Account Number: <strong>${s.mpesaAccountPrefix}${phone}</strong></p>
        <p style="margin-top:6px;font-size:12px;color:#666;">Alternatively, contact our office to arrange payment by bank transfer or cash.</p>
      </div>

      <div class="letter-body">
        <p>Failure to settle this amount within the stipulated period may result in further action in accordance with the terms of your tenancy agreement and applicable Kenyan law, including but not limited to referral for legal recovery proceedings under the <em>Landlord and Tenant (Shops, Hotels and Catering Establishments) Act (Cap 301)</em>.</p>
      </div>

      <div class="letter-body">
        <p>If you have already made this payment, please disregard this notice and provide your M-Pesa confirmation to our office at your earliest convenience.</p>
      </div>

      <div style="margin-top:32px;">
        <p>Yours faithfully,</p>
        <div style="margin-top:40px;border-top:1px solid #000;width:200px;padding-top:6px;">
          <p style="font-weight:600;">${s.companyName}</p>
          <p style="font-size:12px;color:#666;">Property Management</p>
        </div>
      </div>

      <div class="footer">
        <p>This notice was generated on ${today()} by ${s.companyName}. ${s.companyPhone} · ${s.companyEmail}</p>
      </div>`;
    printHtml(html, `Demand Letter — ${resident.firstName} ${resident.lastName}`);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Button variant="ghost" size="sm" onClick={() => setLocation("/residents")} className="gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Residents
        </Button>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0">
              {initials(resident.firstName, resident.lastName)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {resident.firstName} {resident.lastName}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${STATUS_COLORS[resident.status] ?? ""}`}>
                  {resident.status}
                </span>
                {resident.isOwner && (
                  <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">Owner-occupier</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {totalOverdue > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-red-700 border-red-300 hover:bg-red-50"
                onClick={printDemandLetter}
                data-testid="button-demand-letter"
              >
                <FileText className="w-4 h-4" />
                Demand Letter
              </Button>
            )}
            {resident.status === "active" && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
                onClick={handleMoveOut}
                disabled={updateResident.isPending}
              >
                <LogOut className="w-4 h-4" />
                Move Out
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
            <p className="text-xl font-bold text-green-600">KES {totalPaid.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className={totalOverdue > 0 ? "border-red-200 bg-red-50/40" : ""}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Overdue</p>
            <p className={`text-xl font-bold ${totalOverdue > 0 ? "text-red-600" : "text-muted-foreground"}`}>
              KES {totalOverdue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className={openIssues.length > 0 ? "border-amber-200 bg-amber-50/30" : ""}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Open Issues</p>
            <p className={`text-xl font-bold ${openIssues.length > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
              {openIssues.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Building className="w-4 h-4" />Unit & Building</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-2 text-sm">
            {unit && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Unit</span>
                <Link href={`/buildings/${resident.buildingId}/units/${resident.unitId}`}>
                  <span className="font-medium text-primary hover:underline cursor-pointer flex items-center gap-1">
                    Unit {unit.unitNumber} <ChevronRight className="w-3 h-3" />
                  </span>
                </Link>
              </div>
            )}
            {building && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Building</span>
                <Link href={`/buildings/${building.id}`}>
                  <span className="font-medium text-primary hover:underline cursor-pointer flex items-center gap-1">
                    {building.name} <ChevronRight className="w-3 h-3" />
                  </span>
                </Link>
              </div>
            )}
            {unit?.monthlyRent && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Monthly Rent</span>
                <span className="font-medium">KES {Number(unit.monthlyRent).toLocaleString()}</span>
              </div>
            )}
            {resident.moveInDate && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Move-in</span>
                <span className="font-medium">{new Date(resident.moveInDate).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1"><CalendarClock className="w-3 h-3" />Lease End</span>
              {(resident as any).leaseEndDate ? (() => {
                const days = Math.round((new Date((resident as any).leaseEndDate).getTime() - Date.now()) / 86400000);
                const expired = days < 0;
                const urgent = days <= 30;
                return (
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${expired ? "bg-red-100 text-red-700" : urgent ? "bg-amber-100 text-amber-700" : "bg-green-50 text-green-700"}`}>
                      {expired ? `Expired ${Math.abs(days)}d ago` : days === 0 ? "Today!" : `${days}d left`}
                    </span>
                    <span className="font-medium text-sm">{new Date((resident as any).leaseEndDate).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                );
              })() : (
                <span className="text-muted-foreground text-sm italic">Not set</span>
              )}
            </div>
            {resident.status === "active" && (
              <div className="flex gap-2 pt-1">
                <EditableField
                  label="Update Lease End Date"
                  value={(resident as any).leaseEndDate ?? ""}
                  type="date"
                  icon={<CalendarClock className="w-3.5 h-3.5 text-muted-foreground" />}
                  onSave={v => patch({ leaseEndDate: v || null })}
                />
              </div>
            )}
            {resident.status === "active" && (resident as any).leaseEndDate && (
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-2 text-primary border-primary/30 hover:bg-primary/5 mt-1"
                onClick={() => {
                  const current = new Date((resident as any).leaseEndDate);
                  const renewed = new Date(current);
                  renewed.setFullYear(renewed.getFullYear() + 1);
                  patch({ leaseEndDate: renewed.toISOString().slice(0, 10) });
                }}
                disabled={updateResident.isPending}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Renew Lease (+1 Year)
              </Button>
            )}
            {(resident as any).moveOutDate && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Move-out</span>
                <span className="font-medium text-muted-foreground">{new Date((resident as any).moveOutDate).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Contact Details</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-4">
            <EditableField
              label="Phone"
              value={resident.phone ?? ""}
              icon={<Phone className="w-3.5 h-3.5 text-muted-foreground" />}
              onSave={v => patch({ phone: v })}
            />
            <EditableField
              label="Email"
              value={resident.email ?? ""}
              type="email"
              icon={<Mail className="w-3.5 h-3.5 text-muted-foreground" />}
              onSave={v => patch({ email: v })}
            />
          </CardContent>
        </Card>
      </div>

      {/* Payment history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Payment History
            <span className="ml-auto text-xs font-normal text-muted-foreground">{(payments ?? []).length} records</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!(payments ?? []).length ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No payment records</div>
          ) : (
            <div className="divide-y divide-border">
              {(payments ?? []).slice(0, 12).map(p => (
                <div key={p.id}>
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{p.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Due {p.dueDate}
                        {p.paidDate && ` · Paid ${p.paidDate}`}
                        {p.mpesaRef && ` · ${p.mpesaRef}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${PAYMENT_STATUS_COLORS[p.status] ?? ""}`}>
                        {p.status}
                      </span>
                      <span className="text-sm font-semibold">KES {Number(p.amount).toLocaleString()}</span>
                      {(p.status === "pending" || p.status === "overdue") && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs px-2 text-green-700 border-green-200 hover:bg-green-50"
                            onClick={() => { setRecordingPaymentId(p.id); setMpesaRef(""); }}
                          >
                            Record
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs px-2 text-muted-foreground"
                            onClick={() => handleWaivePayment(p.id)}
                            disabled={updatePayment.isPending}
                          >
                            Waive
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  {recordingPaymentId === p.id && (
                    <div className="px-4 pb-3 flex items-center gap-2">
                      <Input
                        placeholder="M-Pesa ref (optional)"
                        value={mpesaRef}
                        onChange={e => setMpesaRef(e.target.value)}
                        className="h-7 text-xs flex-1"
                      />
                      <Button
                        size="sm"
                        className="h-7 text-xs px-3"
                        onClick={() => handleRecordPayment(p.id)}
                        disabled={updatePayment.isPending}
                      >
                        {updatePayment.isPending ? "Saving..." : "Confirm"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs px-2"
                        onClick={() => { setRecordingPaymentId(null); setMpesaRef(""); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              {(payments ?? []).length > 12 && (
                <div className="p-3 text-center text-xs text-muted-foreground">
                  + {(payments ?? []).length - 12} more — view in Unit Ledger
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Building issues */}
      {openIssues.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Open Issues in Building
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {openIssues.slice(0, 5).map(issue => (
              <Link key={issue.id} href={`/issues/${issue.id}`}>
                <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer border-b border-border last:border-0">
                  <div>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ISSUE_STATUS_COLORS[issue.status] ?? ""}`}>
                      {issue.status.replace("_", " ")}
                    </span>
                    <p className="text-sm font-medium mt-0.5">{issue.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{issue.category} · {issue.priority}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-4" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
