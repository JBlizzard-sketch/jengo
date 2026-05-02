import { useResidentAuth } from "@/contexts/resident-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { AlertCircle, CreditCard, Megaphone, Users, Phone, Building, Home, ChevronRight, Pin } from "lucide-react";
import { useEffect, useState } from "react";

interface PortalHome {
  resident: { name: string; email: string | null; isOwner: boolean | null };
  unit: { unitNumber: string; floor: number; bedrooms: number; monthlyRent: string | null };
  building: { name: string; neighbourhood: string; caretakerName: string | null; caretakerPhone: string | null };
  stats: { openIssues: number; overduePayments: number; pendingPayments: number };
  recentIssues: any[];
  recentPayments: any[];
  announcements: any[];
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-700",
  in_progress: "bg-amber-100 text-amber-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  overdue: "bg-red-100 text-red-700",
  waived: "bg-gray-100 text-gray-600",
};

export default function PortalDashboard() {
  const { resident } = useResidentAuth();
  const [data, setData] = useState<PortalHome | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/home", { credentials: "include" })
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading your home...</div>;
  if (!data) return <div className="p-8 text-center text-muted-foreground">Could not load data</div>;

  const firstName = resident?.name.split(" ")[0];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Hello, {firstName}!</h1>
        <p className="text-muted-foreground">{data.building.name} · Unit {data.unit.unitNumber}</p>
      </div>

      {/* Alert banners */}
      {data.stats.overduePayments > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-700">Overdue payment</p>
            <p className="text-sm text-red-600">You have {data.stats.overduePayments} overdue service charge(s). Please pay as soon as possible.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className={data.stats.openIssues > 0 ? "border-amber-200" : ""}>
          <CardContent className="p-4 text-center">
            <AlertCircle className={`w-5 h-5 mx-auto mb-1 ${data.stats.openIssues > 0 ? "text-amber-600" : "text-muted-foreground"}`} />
            <p className={`text-2xl font-bold ${data.stats.openIssues > 0 ? "text-amber-600" : ""}`}>{data.stats.openIssues}</p>
            <p className="text-xs text-muted-foreground">Open Issues</p>
          </CardContent>
        </Card>
        <Card className={data.stats.overduePayments > 0 ? "border-red-200" : ""}>
          <CardContent className="p-4 text-center">
            <CreditCard className={`w-5 h-5 mx-auto mb-1 ${data.stats.overduePayments > 0 ? "text-red-600" : "text-muted-foreground"}`} />
            <p className={`text-2xl font-bold ${data.stats.overduePayments > 0 ? "text-red-600" : ""}`}>{data.stats.overduePayments}</p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{data.stats.pendingPayments}</p>
            <p className="text-xs text-muted-foreground">Pending Bills</p>
          </CardContent>
        </Card>
      </div>

      {/* Unit + Building info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Home className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Your Unit</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unit</span>
                <span className="font-medium">{data.unit.unitNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Floor</span>
                <span className="font-medium">{data.unit.floor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bedrooms</span>
                <span className="font-medium">{data.unit.bedrooms}</span>
              </div>
              {data.unit.monthlyRent && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Rent</span>
                  <span className="font-medium text-primary">KES {Number(data.unit.monthlyRent).toLocaleString()}</span>
                </div>
              )}
              {data.resident.isOwner && (
                <span className="text-xs text-primary font-medium">Owner-occupier</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Building className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Building Contacts</span>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-medium">{data.building.name}</p>
              <p className="text-muted-foreground capitalize">{data.building.neighbourhood.replace("_", " ")}</p>
              {data.building.caretakerName && (
                <div>
                  <p className="text-muted-foreground text-xs">Caretaker</p>
                  <p className="font-medium">{data.building.caretakerName}</p>
                  {data.building.caretakerPhone && (
                    <a href={`tel:${data.building.caretakerPhone}`} className="flex items-center gap-1 text-primary text-xs hover:underline">
                      <Phone className="w-3 h-3" />{data.building.caretakerPhone}
                    </a>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent announcements */}
      {data.announcements.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="w-4 h-4" />
              Recent Notices
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.announcements.map(ann => (
              <div key={ann.id} className="p-4 border-b border-border last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  {ann.isPinned && <Pin className="w-3 h-3 text-primary" />}
                  <span className="text-xs text-muted-foreground capitalize">{ann.category}</span>
                </div>
                <p className="font-medium text-sm">{ann.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ann.content}</p>
              </div>
            ))}
            <div className="p-3">
              <Link href="/portal/announcements">
                <Button variant="ghost" size="sm" className="w-full gap-1 text-muted-foreground">
                  View all notices <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent issues */}
      {data.recentIssues.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              My Issues
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentIssues.map(issue => (
              <div key={issue.id} className="flex items-center justify-between p-4 border-b border-border last:border-0">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[issue.status]}`}>
                      {issue.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{issue.title}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
            <div className="p-3">
              <Link href="/portal/issues">
                <Button variant="ghost" size="sm" className="w-full gap-1 text-muted-foreground">
                  View all issues <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent payments */}
      {data.recentPayments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Recent Payments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentPayments.map(payment => (
              <div key={payment.id} className="flex items-center justify-between p-4 border-b border-border last:border-0">
                <div>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PAYMENT_STATUS_COLORS[payment.status]}`}>
                    {payment.status}
                  </span>
                  <p className="text-sm font-medium mt-0.5">{payment.description}</p>
                  <p className="text-xs text-muted-foreground">Due: {payment.dueDate}</p>
                </div>
                <p className="font-semibold text-sm">KES {Number(payment.amount).toLocaleString()}</p>
              </div>
            ))}
            <div className="p-3">
              <Link href="/portal/payments">
                <Button variant="ghost" size="sm" className="w-full gap-1 text-muted-foreground">
                  View all payments <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
