import {
  useGetDashboardSummary,
  useGetRecentActivity,
  useGetBuildingScores,
  useGetIssuesSummary,
  useGetPaymentsSummary,
  getGetDashboardSummaryQueryKey,
  getGetRecentActivityQueryKey,
  getGetBuildingScoresQueryKey,
  getGetIssuesSummaryQueryKey,
  getGetPaymentsSummaryQueryKey,
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Users, AlertCircle, CreditCard, Activity, PlusCircle, MessageSquare, Zap, UserPlus } from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const CATEGORY_COLORS: Record<string, string> = {
  noise: "#f97316",
  maintenance: "#eab308",
  security: "#ef4444",
  cleanliness: "#22c55e",
  utilities: "#3b82f6",
  parking: "#8b5cf6",
  other: "#6b7280",
};

const PIE_COLORS = ["#f97316", "#eab308", "#ef4444", "#22c55e", "#3b82f6", "#8b5cf6", "#6b7280"];

const QUICK_ACTIONS = [
  { label: "Log Issue", icon: PlusCircle, href: "/issues", color: "text-amber-600", bg: "bg-amber-50 hover:bg-amber-100 border-amber-200" },
  { label: "Pre-clear Visitor", icon: Users, href: "/visitors", color: "text-blue-600", bg: "bg-blue-50 hover:bg-blue-100 border-blue-200" },
  { label: "Generate Charges", icon: Zap, href: "/payments", color: "text-primary", bg: "bg-primary/5 hover:bg-primary/10 border-primary/20" },
  { label: "Add Resident", icon: UserPlus, href: "/residents", color: "text-green-600", bg: "bg-green-50 hover:bg-green-100 border-green-200" },
  { label: "New Announcement", icon: MessageSquare, href: "/announcements", color: "text-purple-600", bg: "bg-purple-50 hover:bg-purple-100 border-purple-200" },
  { label: "View Reports", icon: Building, href: "/reports", color: "text-gray-600", bg: "bg-gray-50 hover:bg-gray-100 border-gray-200" },
];

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });

  const { data: activities } = useGetRecentActivity({ limit: 5 }, {
    query: { queryKey: getGetRecentActivityQueryKey({ limit: 5 }) }
  });

  const { data: scores } = useGetBuildingScores({
    query: { queryKey: getGetBuildingScoresQueryKey() }
  });

  const { data: issuesSummary } = useGetIssuesSummary(undefined, {
    query: { queryKey: getGetIssuesSummaryQueryKey() }
  });

  const { data: paymentSummary } = useGetPaymentsSummary(undefined, {
    query: { queryKey: getGetPaymentsSummaryQueryKey() }
  });

  if (isLoadingSummary) {
    return <div className="p-8 text-center text-muted-foreground">Loading dashboard...</div>;
  }

  const categoryData = (issuesSummary?.byCategory ?? [])
    .map(c => ({ name: c.category, value: c.count }))
    .filter(c => c.value > 0);

  const collectionData = [
    { name: "Collected", value: paymentSummary?.totalCollected ?? 0, fill: "#22c55e" },
    { name: "Overdue", value: paymentSummary?.totalOverdue ?? 0, fill: "#ef4444" },
    { name: "Pending", value: (paymentSummary?.totalOutstanding ?? 0) - (paymentSummary?.totalOverdue ?? 0), fill: "#f59e0b" },
  ].filter(d => d.value > 0);

  const scoreBarData = (scores ?? []).map(s => ({
    name: s.buildingName.replace(" Apartments", "").replace(" Heights", "").replace(" Court", "").replace(" Gardens", ""),
    score: Number(s.reputationScore),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Platform-wide summary and metrics.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Buildings"
          value={summary?.totalBuildings ?? 0}
          icon={Building}
        />
        <MetricCard
          title="Open Issues"
          value={summary?.openIssues ?? 0}
          icon={AlertCircle}
          trend={summary?.issueResolutionRate ? `${summary.issueResolutionRate}% resolved` : undefined}
          trendColor="text-amber-600"
        />
        <MetricCard
          title="Collection Rate"
          value={`${summary?.collectionRateThisMonth ?? 0}%`}
          icon={CreditCard}
          trend={`${summary?.overduePayments ?? 0} overdue`}
          trendColor={(summary?.overduePayments ?? 0) > 0 ? "text-red-600" : "text-green-600"}
        />
        <MetricCard
          title="Total Residents"
          value={summary?.totalResidents ?? 0}
          icon={Users}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.href}
                onClick={() => setLocation(action.href)}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors cursor-pointer ${action.bg}`}
              >
                <action.icon className={`w-5 h-5 ${action.color}`} />
                <span className={`text-xs font-medium text-center leading-tight ${action.color}`}>{action.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Issues by category donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Issues by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <div className="flex flex-col items-center gap-3">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] ?? PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => [`${v} issues`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs w-full">
                  {categoryData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CATEGORY_COLORS[d.name] ?? PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="capitalize truncate text-muted-foreground">{d.name}</span>
                      <span className="font-semibold ml-auto">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No issues recorded</div>
            )}
          </CardContent>
        </Card>

        {/* Payment collection bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Payment Collection</CardTitle>
          </CardHeader>
          <CardContent>
            {collectionData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={collectionData} barCategoryGap="30%">
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                      axisLine={false}
                      tickLine={false}
                      width={36}
                    />
                    <Tooltip formatter={(v: any) => [`KES ${Number(v).toLocaleString()}`, ""]} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {collectionData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-2 text-center">
                  <span className="text-2xl font-bold text-primary">{paymentSummary?.collectionRate ?? 0}%</span>
                  <span className="text-xs text-muted-foreground ml-2">collection rate</span>
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No payment data</div>
            )}
          </CardContent>
        </Card>

        {/* Building scores bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Building Scores</CardTitle>
          </CardHeader>
          <CardContent>
            {scoreBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={scoreBarData} layout="vertical" barCategoryGap="25%">
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={70} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: any) => [`${v}/100`, "Score"]} />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]} fill="#c2410c" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No scores</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Building performance table + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Building Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scores?.map(score => {
                const s = Number(score.reputationScore);
                const color = s >= 8 ? "bg-green-500" : s >= 6 ? "bg-amber-400" : "bg-red-500";
                return (
                  <div key={score.buildingId} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">{score.buildingName}</h3>
                      <p className="text-xs text-muted-foreground capitalize">{score.neighbourhood}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-border rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${s}%` }} />
                      </div>
                      <span className="text-sm font-bold text-primary w-12 text-right">{s}/100</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities?.map(activity => (
                <div key={activity.id} className="flex gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    <Activity className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-tight">{activity.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{activity.buildingName} · {new Date(activity.timestamp).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, trend, trendColor }: { title: string; value: string | number; icon: any; trend?: string; trendColor?: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <h3 className="text-2xl font-bold">{value}</h3>
            {trend && <p className={`text-xs mt-1 ${trendColor ?? "text-muted-foreground"}`}>{trend}</p>}
          </div>
          <div className="p-3 bg-primary/10 rounded-full">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
