import { useState, useMemo } from "react";
import { useListBuildings, useListResidents, getListBuildingsQueryKey, getListResidentsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { BarChart2, Download, TrendingUp, AlertTriangle, Clock, AlertCircle, CheckCircle, CalendarClock, Search } from "lucide-react";
import { useLocation } from "wouter";

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

const ISSUE_CATEGORY_COLORS: Record<string, string> = {
  noise: "#f97316",
  maintenance: "#eab308",
  security: "#ef4444",
  cleanliness: "#22c55e",
  utilities: "#3b82f6",
  parking: "#8b5cf6",
  other: "#6b7280",
};
const PIE_COLORS = ["#f97316", "#eab308", "#ef4444", "#22c55e", "#3b82f6", "#8b5cf6", "#6b7280"];

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

function exportLeaseCSV(rows: any[], buildingMap: Record<number, string>) {
  const header = ["Resident", "Phone", "Building", "Lease End Date", "Days Remaining", "Status"];
  const data = rows.map(r => {
    const days = (r as any).leaseEndDate ? Math.round((new Date((r as any).leaseEndDate).getTime() - Date.now()) / 86400000) : null;
    return [
      `${r.firstName} ${r.lastName}`,
      r.phone ?? "",
      buildingMap[r.buildingId] ?? "",
      (r as any).leaseEndDate ?? "",
      days !== null ? String(days) : "No date set",
      days === null ? "No date" : days < 0 ? "Expired" : days <= 30 ? "Expiring soon" : days <= 60 ? "Expiring" : "Active",
    ];
  });
  const csv = [header, ...data].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `jengo-leases-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [leaseSearch, setLeaseSearch] = useState("");
  const [leaseFilter, setLeaseFilter] = useState("all");
  const [, setLocation] = useLocation();

  const { data: allResidents } = useListResidents(undefined, {
    query: { queryKey: getListResidentsQueryKey() }
  });
  const { data: allBuildings } = useListBuildings({ query: { queryKey: getListBuildingsQueryKey() } });
  const buildingMap: Record<number, string> = Object.fromEntries((allBuildings ?? []).map(b => [b.id, b.name]));

  const leaseRows = useMemo(() => {
    const active = (allResidents ?? []).filter(r => r.status === "active");
    const filtered = active.filter(r => {
      const led = (r as any).leaseEndDate;
      if (leaseFilter === "no_date") return !led;
      if (!led) return false;
      const days = Math.round((new Date(led).getTime() - Date.now()) / 86400000);
      if (leaseFilter === "expired") return days < 0;
      if (leaseFilter === "30") return days >= 0 && days <= 30;
      if (leaseFilter === "60") return days >= 0 && days <= 60;
      if (leaseFilter === "90") return days >= 0 && days <= 90;
      return true;
    }).filter(r => {
      if (!leaseSearch.trim()) return true;
      const q = leaseSearch.toLowerCase();
      return `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) || r.phone?.includes(q);
    });
    return filtered.sort((a, b) => {
      const da = (a as any).leaseEndDate;
      const db = (b as any).leaseEndDate;
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return new Date(da).getTime() - new Date(db).getTime();
    });
  }, [allResidents, leaseFilter, leaseSearch]);

  const leaseSummary = useMemo(() => {
    const active = (allResidents ?? []).filter(r => r.status === "active");
    const withDate = active.filter(r => (r as any).leaseEndDate);
    const expired = withDate.filter(r => Math.round((new Date((r as any).leaseEndDate).getTime() - Date.now()) / 86400000) < 0);
    const exp30 = withDate.filter(r => { const d = Math.round((new Date((r as any).leaseEndDate).getTime() - Date.now()) / 86400000); return d >= 0 && d <= 30; });
    const exp60 = withDate.filter(r => { const d = Math.round((new Date((r as any).leaseEndDate).getTime() - Date.now()) / 86400000); return d >= 0 && d <= 60; });
    return { total: active.length, withDate: withDate.length, expired: expired.length, exp30: exp30.length, exp60: exp60.length };
  }, [allResidents]);

  const { data: report, isLoading } = useQuery({
    queryKey: ["payments-report", month],
    queryFn: async () => {
      const url = month === "all" ? "/api/payments/report" : `/api/payments/report?month=${month}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load report");
      return res.json();
    },
  });

  const { data: issuesReport, isLoading: isLoadingIssues } = useQuery({
    queryKey: ["issues-report"],
    queryFn: async () => {
      const res = await fetch("/api/issues/report");
      if (!res.ok) throw new Error("Failed to load issues report");
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

  const issuesByBuilding: any[] = (issuesReport?.byBuilding ?? []).map((b: any) => ({
    name: b.buildingName.replace(" Apartments", "").replace(" Heights", "").replace(" Court", "").replace(" Gardens", ""),
    Open: b.open,
    "In Progress": b.inProgress,
    Resolved: b.resolved + b.closed,
  }));

  const categoryPieData: any[] = (issuesReport?.byCategory ?? []).map((c: any) => ({
    name: c.category,
    value: c.count,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">Platform analytics and monthly summaries</p>
        </div>
      </div>

      <Tabs defaultValue="collections">
        <TabsList>
          <TabsTrigger value="collections" data-testid="tab-collections">Collections</TabsTrigger>
          <TabsTrigger value="issues" data-testid="tab-issues">Issues</TabsTrigger>
          <TabsTrigger value="leases" data-testid="tab-leases">
            Leases
            {leaseSummary.expired + leaseSummary.exp30 > 0 && (
              <span className="ml-1.5 text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                {leaseSummary.expired + leaseSummary.exp30}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── Collections Tab ─── */}
        <TabsContent value="collections" className="mt-4 space-y-6">
          <div className="flex flex-wrap gap-3 items-center justify-between">
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
              Export CSV
            </Button>
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

          {/* Bar chart — collection rate per building */}
          {rows.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Collection Rate by Building</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={rows.map(r => ({
                    name: r.buildingName.replace(" Apartments", "").replace(" Heights", "").replace(" Court", "").replace(" Gardens", ""),
                    "Rate (%)": r.collectionRate,
                  }))} barCategoryGap="30%">
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: any) => `${v}%`} />
                    <Bar dataKey="Rate (%)" radius={[4, 4, 0, 0]}>
                      {rows.map((r, i) => (
                        <Cell key={i} fill={r.collectionRate >= 80 ? "#22c55e" : r.collectionRate >= 50 ? "#f59e0b" : "#ef4444"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

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
        </TabsContent>

        {/* ─── Leases Tab ─── */}
        <TabsContent value="leases" className="mt-4 space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-red-200 bg-red-50/40">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <p className="text-sm text-muted-foreground">Expired</p>
                </div>
                <p className="text-2xl font-bold text-red-700">{leaseSummary.expired}</p>
                <p className="text-xs text-red-600 mt-0.5">past end date</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50/40">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarClock className="w-4 h-4 text-amber-600" />
                  <p className="text-sm text-muted-foreground">In 30 days</p>
                </div>
                <p className="text-2xl font-bold text-amber-700">{leaseSummary.exp30}</p>
                <p className="text-xs text-amber-600 mt-0.5">need renewal soon</p>
              </CardContent>
            </Card>
            <Card className="border-yellow-200 bg-yellow-50/40">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarClock className="w-4 h-4 text-yellow-600" />
                  <p className="text-sm text-muted-foreground">In 60 days</p>
                </div>
                <p className="text-2xl font-bold text-yellow-700">{leaseSummary.exp60}</p>
                <p className="text-xs text-yellow-600 mt-0.5">plan ahead</p>
              </CardContent>
            </Card>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <p className="text-sm text-muted-foreground">Tracked</p>
                </div>
                <p className="text-2xl font-bold text-primary">{leaseSummary.withDate}/{leaseSummary.total}</p>
                <p className="text-xs text-muted-foreground mt-0.5">active residents</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters + Export */}
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search resident..."
                  value={leaseSearch}
                  onChange={e => setLeaseSearch(e.target.value)}
                  className="pl-8 w-48 h-9"
                  data-testid="input-lease-search"
                />
              </div>
              <Select value={leaseFilter} onValueChange={setLeaseFilter}>
                <SelectTrigger className="w-48" data-testid="select-lease-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All with lease dates</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="30">Expiring in 30 days</SelectItem>
                  <SelectItem value="60">Expiring in 60 days</SelectItem>
                  <SelectItem value="90">Expiring in 90 days</SelectItem>
                  <SelectItem value="no_date">No date set</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">{leaseRows.length} resident{leaseRows.length !== 1 ? "s" : ""}</span>
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => exportLeaseCSV(leaseRows, buildingMap)}
              disabled={leaseRows.length === 0}
              data-testid="button-export-leases"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>

          {/* Lease table */}
          <Card>
            <CardContent className="p-0">
              {leaseRows.length === 0 ? (
                <div className="p-12 text-center">
                  <CalendarClock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {leaseFilter === "no_date"
                      ? "All active residents have lease dates set"
                      : "No residents match this filter"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left p-4 font-medium text-muted-foreground">Resident</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Building</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Phone</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Lease End Date</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {leaseRows.map(r => {
                        const led = (r as any).leaseEndDate;
                        const days = led ? Math.round((new Date(led).getTime() - Date.now()) / 86400000) : null;
                        const expired = days !== null && days < 0;
                        const urgent = days !== null && days >= 0 && days <= 30;
                        const soon = days !== null && days > 30 && days <= 60;
                        return (
                          <tr
                            key={r.id}
                            className="hover:bg-muted/20 transition-colors cursor-pointer"
                            onClick={() => setLocation(`/residents/${r.id}`)}
                            data-testid={`row-lease-${r.id}`}
                          >
                            <td className="p-4">
                              <p className="font-medium text-foreground">{r.firstName} {r.lastName}</p>
                              {r.isOwner && <span className="text-[10px] text-primary bg-primary/10 px-1 rounded">Owner</span>}
                            </td>
                            <td className="p-4 text-muted-foreground">{buildingMap[r.buildingId] ?? `Bldg ${r.buildingId}`}</td>
                            <td className="p-4 text-muted-foreground">{r.phone}</td>
                            <td className="p-4">
                              {led
                                ? new Date(led).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })
                                : <span className="italic text-muted-foreground">Not set</span>}
                            </td>
                            <td className="p-4 text-right">
                              {days === null ? (
                                <span className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">No date</span>
                              ) : expired ? (
                                <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-medium">Expired {Math.abs(days)}d ago</span>
                              ) : urgent ? (
                                <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">{days}d left</span>
                              ) : soon ? (
                                <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 font-medium">{days}d left</span>
                              ) : (
                                <span className="text-xs px-2 py-0.5 rounded bg-green-50 text-green-700">{days}d left</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Issues Tab ─── */}
        <TabsContent value="issues" className="mt-4 space-y-6">
          {isLoadingIssues ? (
            <div className="p-8 text-center text-muted-foreground">Loading issues report...</div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-red-200 bg-red-50/40">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <p className="text-sm text-muted-foreground">Open</p>
                    </div>
                    <p className="text-2xl font-bold text-red-700">{issuesReport?.totals?.open ?? 0}</p>
                    <p className="text-xs text-red-600 mt-0.5">needs attention</p>
                  </CardContent>
                </Card>
                <Card className="border-amber-200 bg-amber-50/40">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <p className="text-sm text-muted-foreground">In Progress</p>
                    </div>
                    <p className="text-2xl font-bold text-amber-700">{issuesReport?.totals?.inProgress ?? 0}</p>
                    <p className="text-xs text-amber-600 mt-0.5">being worked on</p>
                  </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50/40">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <p className="text-sm text-muted-foreground">Resolved</p>
                    </div>
                    <p className="text-2xl font-bold text-green-700">{issuesReport?.totals?.resolved ?? 0}</p>
                    <p className="text-xs text-green-600 mt-0.5">completed</p>
                  </CardContent>
                </Card>
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart2 className="w-4 h-4 text-primary" />
                      <p className="text-sm text-muted-foreground">Total Issues</p>
                    </div>
                    <p className="text-2xl font-bold text-primary">{issuesReport?.totals?.total ?? 0}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Stacked bar — issues by building */}
              {issuesByBuilding.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Issues by Building</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={issuesByBuilding} barCategoryGap="30%">
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Open" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="In Progress" stackId="a" fill="#f59e0b" />
                        <Bar dataKey="Resolved" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Two-column: per-building table + category donut */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Resolution Rate by Building</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left p-4 font-medium text-muted-foreground">Building</th>
                          <th className="text-right p-4 font-medium text-muted-foreground">Total</th>
                          <th className="text-right p-4 font-medium text-muted-foreground">Open</th>
                          <th className="text-right p-4 font-medium text-muted-foreground">Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(issuesReport?.byBuilding ?? []).map((b: any) => (
                          <tr key={b.buildingId} className="hover:bg-muted/20">
                            <td className="p-4">
                              <p className="font-medium text-foreground">{b.buildingName}</p>
                              <p className="text-xs text-muted-foreground capitalize">{b.neighbourhood?.replace("_", " ")}</p>
                            </td>
                            <td className="p-4 text-right text-muted-foreground">{b.total}</td>
                            <td className="p-4 text-right">
                              {b.open > 0 ? <span className="text-red-600 font-medium">{b.open}</span> : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="p-4 text-right">
                              <span className={`font-bold ${b.resolutionRate >= 70 ? "text-green-600" : b.resolutionRate >= 40 ? "text-amber-600" : "text-red-600"}`}>
                                {b.resolutionRate}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Issues by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {categoryPieData.length > 0 ? (
                      <div className="flex flex-col items-center gap-3">
                        <ResponsiveContainer width="100%" height={180}>
                          <PieChart>
                            <Pie data={categoryPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                              {categoryPieData.map((_, i) => (
                                <Cell key={i} fill={ISSUE_CATEGORY_COLORS[_.name] ?? PIE_COLORS[i % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {categoryPieData.map((c, i) => (
                            <div key={c.name} className="flex items-center gap-1 text-xs">
                              <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ background: ISSUE_CATEGORY_COLORS[c.name] ?? PIE_COLORS[i % PIE_COLORS.length] }} />
                              <span className="capitalize text-muted-foreground">{c.name}</span>
                              <span className="font-medium">({c.value})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">No issue data</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
