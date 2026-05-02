import { 
  useGetDashboardSummary, 
  useGetRecentActivity, 
  useGetBuildingScores,
  getGetDashboardSummaryQueryKey,
  getGetRecentActivityQueryKey,
  getGetBuildingScoresQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Users, AlertCircle, CreditCard, Activity } from "lucide-react";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });
  
  const { data: activities, isLoading: isLoadingActivity } = useGetRecentActivity({ limit: 5 }, {
    query: { queryKey: getGetRecentActivityQueryKey({ limit: 5 }) }
  });

  const { data: scores, isLoading: isLoadingScores } = useGetBuildingScores({
    query: { queryKey: getGetBuildingScoresQueryKey() }
  });

  if (isLoadingSummary || isLoadingActivity || isLoadingScores) {
    return <div className="p-8 text-center text-muted-foreground">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Platform-wide summary and metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Total Buildings" 
          value={summary?.totalBuildings || 0} 
          icon={Building} 
        />
        <MetricCard 
          title="Open Issues" 
          value={summary?.openIssues || 0} 
          icon={AlertCircle} 
          trend={summary?.issueResolutionRate ? `${summary.issueResolutionRate}% resolved` : undefined}
        />
        <MetricCard 
          title="Collection Rate" 
          value={`${summary?.collectionRateThisMonth || 0}%`} 
          icon={CreditCard} 
          trend={`${summary?.overduePayments || 0} overdue payments`}
        />
        <MetricCard 
          title="Total Residents" 
          value={summary?.totalResidents || 0} 
          icon={Users} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Building Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scores?.map(score => (
                <div key={score.buildingId} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                  <div>
                    <h3 className="font-semibold text-foreground">{score.buildingName}</h3>
                    <p className="text-sm text-muted-foreground">{score.neighbourhood}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">{score.reputationScore}/100</div>
                    <p className="text-xs text-muted-foreground">Score</p>
                  </div>
                </div>
              ))}
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
                  <div className="mt-1">
                    <Activity className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.buildingName} • {new Date(activity.timestamp).toLocaleDateString()}</p>
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

function MetricCard({ title, value, icon: Icon, trend }: { title: string, value: string | number, icon: any, trend?: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <h3 className="text-2xl font-bold">{value}</h3>
            {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
          </div>
          <div className="p-3 bg-primary/10 rounded-full">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
