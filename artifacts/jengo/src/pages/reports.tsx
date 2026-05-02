import { useState } from "react";
import { useListBuildings, getListBuildingsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { BarChart2, Download, TrendingUp, AlertTriangle, Clock } from "lucide-react";

function generateMonthOptions() {
  const options: { value: string; label: string }[] = [{ value: "all", label: "All Time" }];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = d.toISOString().slice(0, 7);
    const label = d.toLocaleString("en-KE", { month: "long", year: "numeric" });
    options.push({ value, label });
  }
  return options;
}

const MONTHS = generateMonthOptions();

function exportReportCSV(rows: any[], month: string) {
  const header = ["Building", "Neighbourhood", "Total Charged (KES)", "Collected (KES)", "Overdue (KES)", "Outstanding (KES)", "Collection Rate", "Paid", "Overdue Count", "Pending"];
  const data = rows.map(r => [
    r.buildingName,
    r.neighbourhood.replace("_", " "),
    r.total.toFixed(2),
    r.collected.toFixed(2),
    r.overdue.toFixed(2),
    (r.overdue + r.pending).toFixed(2),
    `${r.collectionRate}%`,
    r.paidCount,
    r.overdueCount,
    r.pendingCount,
  ]);
  const totals = rows.reduce((acc, r) => ({
    total: acc.total + r.total,
    collected: acc.collected + r.collected,
    overdue: acc.overdue + r.overdue,
    pending: acc.pending + r.pending,
    paidCount: acc.paidCount + r.paidCount,
    overdueCount: acc.overdueCount + r.overdueCount,
    pendingCount: acc.pendingCount + r.pendingCount,
  }), { total: 0, collected: 0, overdue: 0, pending: 0, paidCount: 0, overdueCount: 0, pendingCount: 0 });
  const totalRate = totals.total > 0 ? Math.round((totals.collected / totals.total) * 100) : 0;
  data.push(["TOTAL", "", totals.total.toFixed(2), totals.collected.toFixed(2), totals.overdue.toFixed(2), (totals.overdue + totals.pending).toFixed(2), `${totalRate}%`, totals.paidCount, totals.overdueCount, totals.pendingCount]);
  const csv = [header, ...data].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `jengo-report-${month === "all" ? "all-time" : month}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const { data: report, isLoading } = useQuery({
    queryKey: ["payments-report", month],
    queryFn: async () => {
      const url = month === "all" ? "/api/payments/report" : `/api/payments/report?month=${month}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load report");
      return res.json();
    },
  });

  const rows: any[] = report?.buildings ?? [];
  const totals = rows.reduce((acc, r) => ({
    total: acc.total + r.total,
    collected: acc.collected + r.collected,
    overdue: acc.overdue + r.overdue,
    pending: acc.pending + r.pending,
    paidCount: acc.paidCount + r.paidCount,
    overdueCount: acc.overdueCount + r.overdueCount,
    pendingCount: acc.pendingCount + r.pendingCount,
  }), { total: 0, collected: 0, overdue: 0, pending: 0, paidCount: 0, overdueCount: 0, pendingCount: 0 });
  const totalRate = totals.total > 0 ? Math.round((totals.collected / totals.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Collection Reports</h1>
          <p className="text-muted-foreground">Monthly service charge summary across all buildings</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-52" data-testid="select-month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="gap-2"
            disabled={!rows.length}
            onClick={() => exportReportCSV(rows, month)}
            data-testid="button-export-csv"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Platform totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-green-200 bg-green-50/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <p className="text-sm text-muted-foreground">Collected</p>
            </div>
            <p className="text-2xl font-bold text-green-700">KES {totals.collected.toLocaleString()}</p>
            <p className="text-xs text-green-600 mt-0.5">{totals.paidCount} payments</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <p className="text-sm text-muted-foreground">Overdue</p>
            </div>
            <p className="text-2xl font-bold text-red-700">KES {totals.overdue.toLocaleString()}</p>
            <p className="text-xs text-red-600 mt-0.5">{totals.overdueCount} overdue</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-600" />
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
            <p className="text-2xl font-bold text-amber-700">KES {totals.pending.toLocaleString()}</p>
            <p className="text-xs text-amber-600 mt-0.5">{totals.pendingCount} pending</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart2 className="w-4 h-4 text-primary" />
              <p className="text-sm text-muted-foreground">Collection Rate</p>
            </div>
            <p className="text-2xl font-bold text-primary">{totalRate}%</p>
            <p className="text-xs text-muted-foreground mt-0.5">platform-wide</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-building table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Building Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading report...</div>
          ) : !rows.length ? (
            <div className="p-12 text-center">
              <BarChart2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No payment data for this period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 font-medium text-muted-foreground">Building</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">Total Charged</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">Collected</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">Overdue</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">Pending</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row: any) => {
                    const rate = row.collectionRate;
                    const rateColor = rate >= 80 ? "text-green-600" : rate >= 50 ? "text-amber-600" : "text-red-600";
                    return (
                      <tr key={row.buildingId} className="hover:bg-muted/20 transition-colors" data-testid={`row-building-${row.buildingId}`}>
                        <td className="p-4">
                          <p className="font-medium text-foreground">{row.buildingName}</p>
                          <p className="text-xs text-muted-foreground capitalize">{row.neighbourhood.replace("_", " ")}</p>
                        </td>
                        <td className="p-4 text-right font-medium">
                          KES {row.total.toLocaleString()}
                          <p className="text-xs text-muted-foreground">{row.paidCount + row.overdueCount + row.pendingCount} charges</p>
                        </td>
                        <td className="p-4 text-right text-green-700 font-medium">
                          KES {row.collected.toLocaleString()}
                          <p className="text-xs text-green-600">{row.paidCount} paid</p>
                        </td>
                        <td className="p-4 text-right text-red-700 font-medium">
                          {row.overdue > 0 ? `KES ${row.overdue.toLocaleString()}` : "—"}
                          {row.overdueCount > 0 && <p className="text-xs text-red-600">{row.overdueCount} overdue</p>}
                        </td>
                        <td className="p-4 text-right text-amber-700 font-medium">
                          {row.pending > 0 ? `KES ${row.pending.toLocaleString()}` : "—"}
                          {row.pendingCount > 0 && <p className="text-xs text-amber-600">{row.pendingCount} pending</p>}
                        </td>
                        <td className="p-4 text-right">
                          <span className={`text-lg font-bold ${rateColor}`}>{rate}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30">
                    <td className="p-4 font-semibold text-foreground">Platform Total</td>
                    <td className="p-4 text-right font-semibold">KES {totals.total.toLocaleString()}</td>
                    <td className="p-4 text-right font-semibold text-green-700">KES {totals.collected.toLocaleString()}</td>
                    <td className="p-4 text-right font-semibold text-red-700">{totals.overdue > 0 ? `KES ${totals.overdue.toLocaleString()}` : "—"}</td>
                    <td className="p-4 text-right font-semibold text-amber-700">{totals.pending > 0 ? `KES ${totals.pending.toLocaleString()}` : "—"}</td>
                    <td className="p-4 text-right">
                      <span className={`text-lg font-bold ${totalRate >= 80 ? "text-green-600" : totalRate >= 50 ? "text-amber-600" : "text-red-600"}`}>
                        {totalRate}%
                      </span>
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
