import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetBuilding, useListUnits, useListResidents, useListIssues, useCreateResident,
  getGetBuildingQueryKey, getListUnitsQueryKey, getListResidentsQueryKey, getListIssuesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Building, Users, Phone, Home, UserPlus } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  occupied: "bg-green-100 text-green-700",
  vacant: "bg-amber-100 text-amber-700",
  maintenance: "bg-red-100 text-red-700",
};

const ISSUE_STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-700",
  in_progress: "bg-amber-100 text-amber-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

const RESIDENT_STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  pending: "bg-amber-100 text-amber-700",
};

function AddResidentDialog({ buildingId, units, onClose }: { buildingId: number; units: any[]; onClose: () => void }) {
  const qc = useQueryClient();
  const createResident = useCreateResident();
  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", email: "",
    unitId: "", moveInDate: new Date().toISOString().split("T")[0], isOwner: false,
  });

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.phone || !form.unitId) return;
    createResident.mutate(
      {
        data: {
          buildingId,
          unitId: Number(form.unitId),
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          email: form.email || undefined,
          moveInDate: form.moveInDate || undefined,
          isOwner: form.isOwner,
        }
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListResidentsQueryKey({ buildingId }) });
          onClose();
        }
      }
    );
  };

  const occupiedUnitIds = new Set<number>();
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Resident</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium mb-1 block">First Name *</label>
              <Input placeholder="Jane" value={form.firstName} onChange={e => set("firstName", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Last Name *</label>
              <Input placeholder="Mwangi" value={form.lastName} onChange={e => set("lastName", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Phone *</label>
            <Input placeholder="0712 345 678" value={form.phone} onChange={e => set("phone", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Email</label>
            <Input type="email" placeholder="jane@email.com" value={form.email} onChange={e => set("email", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Unit *</label>
            <Select value={form.unitId} onValueChange={v => set("unitId", v)}>
              <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
              <SelectContent>
                {units.map(u => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    Unit {u.unitNumber} {u.status !== "occupied" ? "" : " (occupied)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Move-in Date</label>
            <Input type="date" value={form.moveInDate} onChange={e => set("moveInDate", e.target.value)} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" checked={form.isOwner} onChange={e => set("isOwner", e.target.checked)} className="rounded" />
            Owner-occupier
          </label>
          <Button type="submit" className="w-full" disabled={createResident.isPending || !form.firstName || !form.lastName || !form.phone || !form.unitId}>
            {createResident.isPending ? "Adding..." : "Add Resident"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function BuildingDetail() {
  const [, params] = useRoute("/buildings/:id");
  const [, setLocation] = useLocation();
  const id = Number(params?.id);
  const [addingResident, setAddingResident] = useState(false);

  const { data: building, isLoading } = useGetBuilding(id, { query: { queryKey: getGetBuildingQueryKey(id), enabled: !!id } });
  const { data: units } = useListUnits(id, { query: { queryKey: getListUnitsQueryKey(id), enabled: !!id } });
  const { data: residents } = useListResidents({ buildingId: id }, { query: { queryKey: getListResidentsQueryKey({ buildingId: id }), enabled: !!id } });
  const { data: issues } = useListIssues({ buildingId: id }, { query: { queryKey: getListIssuesQueryKey({ buildingId: id }), enabled: !!id } });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!building) return <div className="p-8 text-center text-muted-foreground">Building not found</div>;

  const occupiedUnits = units?.filter(u => u.status === "occupied").length ?? 0;
  const openIssues = issues?.filter(i => i.status === "open" || i.status === "in_progress").length ?? 0;
  const score = building.reputationScore ? Number(building.reputationScore) : null;
  const scoreColor = score !== null ? (score >= 8 ? "text-green-600" : score >= 6 ? "text-amber-600" : "text-red-600") : "text-muted-foreground";

  return (
    <div className="space-y-6 max-w-4xl">
      <button onClick={() => setLocation("/buildings")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm" data-testid="button-back">
        <ArrowLeft className="w-4 h-4" />
        Back to Buildings
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{building.name}</h1>
          <p className="text-muted-foreground mt-1">{building.address}</p>
          <span className="text-sm px-2 py-0.5 rounded bg-secondary text-secondary-foreground mt-2 inline-block capitalize">
            {building.neighbourhood.replace("_", " ")}
          </span>
        </div>
        {score !== null && (
          <div className="text-center p-4 bg-card border border-border rounded-xl">
            <p className="text-xs text-muted-foreground font-medium mb-1">Reputation Score</p>
            <p className={`text-4xl font-bold ${scoreColor}`}>{score.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">/10</p>
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Units</p>
            <p className="text-2xl font-bold mt-1">{building.totalUnits}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Occupied</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{occupiedUnits}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Residents</p>
            <p className="text-2xl font-bold mt-1">{residents?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Open Issues</p>
            <p className={`text-2xl font-bold mt-1 ${openIssues > 0 ? "text-red-600" : "text-foreground"}`}>{openIssues}</p>
          </CardContent>
        </Card>
      </div>

      {/* Management Info */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-6 text-sm">
          {building.managementCompany && (
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Management:</span>
              <span className="font-medium">{building.managementCompany}</span>
            </div>
          )}
          {building.caretakerName && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Caretaker:</span>
              <span className="font-medium">{building.caretakerName}</span>
            </div>
          )}
          {building.caretakerPhone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{building.caretakerPhone}</span>
            </div>
          )}
          {building.serviceChargeAmount && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Service Charge:</span>
              <span className="font-medium text-primary">KES {Number(building.serviceChargeAmount).toLocaleString()}/mo</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs: Units / Residents / Issues */}
      <Tabs defaultValue="units">
        <TabsList>
          <TabsTrigger value="units" data-testid="tab-units">Units ({units?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="residents" data-testid="tab-residents">Residents ({residents?.length ?? 0})</TabsTrigger>

          <TabsTrigger value="issues" data-testid="tab-issues">Issues ({issues?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="units" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {!units?.length ? (
                <div className="p-8 text-center text-muted-foreground">No units listed</div>
              ) : (
                <div className="divide-y divide-border">
                  {units.map(unit => (
                    <div key={unit.id} className="flex items-center justify-between p-4" data-testid={`row-unit-${unit.id}`}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-secondary rounded-md">
                          <Home className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">Unit {unit.unitNumber}</p>
                          <p className="text-sm text-muted-foreground">Floor {unit.floor} · {unit.bedrooms} bed</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {unit.monthlyRent && (
                          <p className="text-sm font-medium">KES {Number(unit.monthlyRent).toLocaleString()}</p>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${STATUS_COLORS[unit.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {unit.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="residents" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button size="sm" className="gap-2" onClick={() => setAddingResident(true)} data-testid="button-add-resident">
              <UserPlus className="w-4 h-4" /> Add Resident
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {!residents?.length ? (
                <div className="p-8 text-center text-muted-foreground">No residents registered</div>
              ) : (
                <div className="divide-y divide-border">
                  {residents.map(resident => (
                    <div key={resident.id} className="flex items-center justify-between p-4" data-testid={`row-resident-${resident.id}`}>
                      <div>
                        <p className="font-semibold text-foreground">{resident.firstName} {resident.lastName}</p>
                        <div className="flex gap-3 text-sm text-muted-foreground mt-0.5">
                          {resident.email && <span>{resident.email}</span>}
                          {resident.phone && <span>{resident.phone}</span>}
                        </div>
                        {resident.isOwner && (
                          <span className="text-xs text-primary font-medium">Owner</span>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${RESIDENT_STATUS_COLORS[resident.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {resident.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {!issues?.length ? (
                <div className="p-8 text-center text-muted-foreground">No issues for this building</div>
              ) : (
                <div className="divide-y divide-border">
                  {issues.map(issue => (
                    <div key={issue.id} className="flex items-center justify-between p-4 hover:bg-muted/40 cursor-pointer transition-colors" onClick={() => setLocation(`/issues/${issue.id}`)} data-testid={`row-issue-${issue.id}`}>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${ISSUE_STATUS_COLORS[issue.status]}`}>
                            {issue.status.replace("_", " ")}
                          </span>
                          <span className="text-xs text-muted-foreground capitalize">{issue.priority} · {issue.category}</span>
                        </div>
                        <p className="font-medium text-foreground">{issue.title}</p>
                      </div>
                      <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {addingResident && (
        <AddResidentDialog
          buildingId={id}
          units={units ?? []}
          onClose={() => setAddingResident(false)}
        />
      )}
    </div>
  );
}
