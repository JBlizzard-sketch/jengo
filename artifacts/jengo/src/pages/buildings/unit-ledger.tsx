import { useRoute, useLocation } from "wouter";
import {
  useGetBuilding, useListResidents, useListPayments, useListIssues, useUpdatePayment,
  getGetBuildingQueryKey, getListResidentsQueryKey, getListPaymentsQueryKey, getListIssuesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, User, Phone, Mail, TrendingUp, AlertTriangle, Clock, CreditCard, AlertCircle } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  paid: "bg-green-100 text-green-700 border-green-200",
  overdue: "bg-red-100 text-red-700 border-red-200",
  waived: "bg-gray-100 text-gray-500 border-gray-200",
};

const ISSUE_STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-700",
  in_progress: "bg-amber-100 text-amber-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

const UNIT_STATUS_COLORS: Record<string, string> = {
  occupied: "bg-green-100 text-green-700",
  vacant: "bg-amber-100 text-amber-700",
  maintenance: "bg-red-100 text-red-700",
};

export default function UnitLedger() {
  const [, params] = useRoute("/buildings/:buildingId/units/:unitId");
  const [, setLocation] = useLocation();
  const buildingId = Number(params?.buildingId);
  const unitId = Number(params?.unitId);
  const qc = useQueryClient();
  const updatePayment = useUpdatePayment();

  const { data: building } = useGetBuilding(buildingId, {
    query: { queryKey: getGetBuildingQueryKey(buildingId), enabled: !!buildingId },
  });

  const { data: unit, isLoading: unitLoading } = useQuery({
    queryKey: ["unit", unitId],
    queryFn: async () => {
      const res = await fetch(`/api/units/${unitId}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!unitId,
  });

  const { data: residents } = useListResidents(
    { buildingId, unitId },
    { query: { queryKey: getListResidentsQueryKey({ buildingId, unitId }), enabled: !!unitId } }
  );

  const { data: payments } = useListPayments(
    { unitId } as any,
    { query: { queryKey: getListPaymentsQueryKey({ unitId } as any), enabled: !!unitId } }
  );

  const { data: allIssues } = useListIssues(
    { buildingId },
    { query: { queryKey: getListIssuesQueryKey({ buildingId }), enabled: !!buildingId } }
  );

  if (unitLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!unit) return <div className="p-8 text-center text-muted-foreground">Unit not found</div>;

  const activeResident = residents?.find(r => r.status === "active") ?? residents?.[0];

  const totalCharged = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const collected = (payments ?? []).filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const overdue = (payments ?? []).filter(p => p.status === "overdue").reduce((s, p) => s + Number(p.amount), 0);
  const outstanding = (payments ?? []).filter(p => p.status !== "paid" && p.status !== "waived").reduce((s, p) => s + Number(p.amount), 0);
  const collectionRate = totalCharged > 0 ? Math.round((collected / totalCharged) * 100) : 0;

  const openIssues = (allIssues ?? []).filter(i => i.status === "open" || i.status === "in_progress");

  return (
    <div className="space-y-6 max-w-4xl">
      <button
        onClick={() => setLocation(`/buildings/${buildingId}`)}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
        data-testid="button-back"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {building?.name ?? "Building"}
      </button>

      {/* Unit header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <Home className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Unit {unit.unitNumber}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${UNIT_STATUS_COLORS[unit.status] ?? "bg-gray-100 text-gray-600"}`}>
                {unit.status}
              </span>
              {unit.floor != null && <span className="text-sm text-muted-foreground">Floor {unit.floor}</span>}
              {unit.bedrooms != null && <span className="text-sm text-muted-foreground">{unit.bedrooms} bedroom{unit.bedrooms !== 1 ? "s" : ""}</span>}
              {unit.monthlyRent && <span className="text-sm font-medium text-primary">KES {Number(unit.monthlyRent).toLocaleString()}/mo</span>}
            </div>
          </div>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p>{building?.name}</p>
          <p className="capitalize">{building?.neighbourhood?.replace("_", " ")}</p>
        </div>
      </div>

      {/* Resident card */}
      <Card className={activeResident ? "border-primary/20" : "border-amber-200 bg-amber-50/30"}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" />
            {activeResident ? "Current Resident" : "Vacant Unit"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeResident ? (
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Name</p>
                <p className="font-semibold">{activeResident.firstName} {activeResident.lastName}
                  {activeResident.isOwner && <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">Owner</span>}
                </p>
              </div>
              {activeResident.phone && (
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Phone</p>
                  <p className="flex items-center gap-1.5 font-medium"><Phone className="w-3.5 h-3.5 text-muted-foreground" />{activeResident.phone}</p>
                </div>
              )}
              {activeResident.email && (
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Email</p>
                  <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-muted-foreground" />{activeResident.email}</p>
                </div>
              )}
              {activeResident.moveInDate && (
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Since</p>
                  <p>{new Date(activeResident.moveInDate).toLocaleDateString("en-KE", { month: "long", year: "numeric" })}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Status</p>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${activeResident.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {activeResident.status}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-amber-700">No active resident assigned to this unit.</p>
          )}
        </CardContent>
      </Card>

      {/* Financial summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-green-200 bg-green-50/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <p className="text-xs text-muted-foreground">Collected</p>
            </div>
            <p className="text-xl font-bold text-green-700">KES {collected.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <p className="text-xs text-muted-foreground">Overdue</p>
            </div>
            <p className="text-xl font-bold text-red-700">KES {overdue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-600" />
              <p className="text-xs text-muted-foreground">Outstanding</p>
            </div>
            <p className="text-xl font-bold text-amber-700">KES {outstanding.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground">Collection Rate</p>
            </div>
            <p className={`text-xl font-bold ${collectionRate >= 80 ? "text-green-600" : collectionRate >= 50 ? "text-amber-600" : "text-red-600"}`}>
              {collectionRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Open issues */}
      {openIssues.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              Open Issues in Building ({openIssues.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {openIssues.slice(0, 5).map(issue => (
                <div
                  key={issue.id}
                  className="px-6 py-3 flex items-center justify-between hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => setLocation(`/issues/${issue.id}`)}
                  data-testid={`row-issue-${issue.id}`}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{issue.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{issue.category} · {issue.priority} priority</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${ISSUE_STATUS_COLORS[issue.status]}`}>
                    {issue.status.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment ledger */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!(payments ?? []).length ? (
            <div className="p-8 text-center text-muted-foreground">No payment records yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 font-medium text-muted-foreground">Description</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Month</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Due Date</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Paid</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...(payments ?? [])].sort((a, b) => (b.dueDate ?? "").localeCompare(a.dueDate ?? "")).map(p => (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors" data-testid={`row-payment-${p.id}`}>
                      <td className="p-4 font-medium">{p.description}</td>
                      <td className="p-4 text-muted-foreground">{p.month ?? "—"}</td>
                      <td className="p-4 text-muted-foreground">{p.dueDate ?? "—"}</td>
                      <td className="p-4 text-right font-semibold">KES {Number(p.amount).toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground">{p.paidDate ?? "—"}</td>
                      <td className="p-4 text-muted-foreground">{p.paymentMethod ?? "—"}{p.mpesaRef ? ` · ${p.mpesaRef}` : ""}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30">
                    <td colSpan={3} className="p-4 font-semibold">Total</td>
                    <td className="p-4 text-right font-bold">KES {totalCharged.toLocaleString()}</td>
                    <td colSpan={3} className="p-4 text-sm text-muted-foreground">
                      Collected: KES {collected.toLocaleString()} · Outstanding: KES {outstanding.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
