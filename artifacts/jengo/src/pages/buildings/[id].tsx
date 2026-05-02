import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetBuilding, useListUnits, useListResidents, useListIssues,
  useCreateResident, useUpdateBuilding, useCreateUnit,
  useGetPaymentsSummary,
  getGetBuildingQueryKey, getListUnitsQueryKey, getListResidentsQueryKey,
  getListIssuesQueryKey, getGetPaymentsSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Building, Users, Phone, Home, UserPlus, Pencil, Plus, ChevronRight, TrendingUp, CheckCircle2 } from "lucide-react";

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

const NEIGHBOURHOODS = [
  { value: "kilimani", label: "Kilimani" },
  { value: "westlands", label: "Westlands" },
  { value: "lavington", label: "Lavington" },
  { value: "south_b", label: "South B" },
  { value: "other", label: "Other" },
];

function EditBuildingDialog({
  building,
  onClose,
}: {
  building: any;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const updateBuilding = useUpdateBuilding();
  const [form, setForm] = useState({
    name: building.name ?? "",
    address: building.address ?? "",
    neighbourhood: building.neighbourhood ?? "kilimani",
    caretakerName: building.caretakerName ?? "",
    caretakerPhone: building.caretakerPhone ?? "",
    managementCompany: building.managementCompany ?? "",
    serviceChargeAmount: building.serviceChargeAmount ? String(building.serviceChargeAmount) : "",
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateBuilding.mutate(
      {
        id: building.id,
        data: {
          name: form.name || undefined,
          address: form.address || undefined,
          caretakerName: form.caretakerName || undefined,
          caretakerPhone: form.caretakerPhone || undefined,
          serviceChargeAmount: form.serviceChargeAmount ? Number(form.serviceChargeAmount) : undefined,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetBuildingQueryKey(building.id) });
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Building</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block">Building Name</label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Address</label>
            <Input value={form.address} onChange={e => set("address", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Neighbourhood</label>
            <Select value={form.neighbourhood} onValueChange={v => set("neighbourhood", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {NEIGHBOURHOODS.map(n => (
                  <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Service Charge (KES/month)</label>
            <Input
              type="number"
              placeholder="8500"
              value={form.serviceChargeAmount}
              onChange={e => set("serviceChargeAmount", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Management Company</label>
            <Input value={form.managementCompany} onChange={e => set("managementCompany", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium mb-1 block">Caretaker Name</label>
              <Input placeholder="John Kamau" value={form.caretakerName} onChange={e => set("caretakerName", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Caretaker Phone</label>
              <Input placeholder="0712 345 678" value={form.caretakerPhone} onChange={e => set("caretakerPhone", e.target.value)} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={updateBuilding.isPending}>
            {updateBuilding.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddUnitDialog({
  buildingId,
  onClose,
}: {
  buildingId: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const createUnit = useCreateUnit();
  const [form, setForm] = useState({
    unitNumber: "",
    floor: "",
    bedrooms: "2",
    status: "vacant",
    monthlyRent: "",
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.unitNumber) return;
    createUnit.mutate(
      {
        buildingId,
        data: {
          unitNumber: form.unitNumber,
          floor: form.floor ? Number(form.floor) : undefined,
          bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
          status: form.status as any,
          monthlyRent: form.monthlyRent ? Number(form.monthlyRent) : undefined,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListUnitsQueryKey(buildingId) });
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Unit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block">Unit Number *</label>
            <Input placeholder="A101" value={form.unitNumber} onChange={e => set("unitNumber", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium mb-1 block">Floor</label>
              <Input type="number" min="0" placeholder="1" value={form.floor} onChange={e => set("floor", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Bedrooms</label>
              <Input type="number" min="0" placeholder="2" value={form.bedrooms} onChange={e => set("bedrooms", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Status</label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vacant">Vacant</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Monthly Rent (KES)</label>
            <Input
              type="number"
              placeholder="45000"
              value={form.monthlyRent}
              onChange={e => set("monthlyRent", e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={createUnit.isPending || !form.unitNumber}>
            {createUnit.isPending ? "Adding..." : "Add Unit"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListResidentsQueryKey({ buildingId }) });
          onClose();
        },
      }
    );
  };

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
                    Unit {u.unitNumber}{u.status === "occupied" ? " (occupied)" : ""}
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
            <input
              type="checkbox"
              checked={form.isOwner}
              onChange={e => set("isOwner", e.target.checked)}
              className="rounded"
            />
            Owner-occupier
          </label>
          <Button
            type="submit"
            className="w-full"
            disabled={createResident.isPending || !form.firstName || !form.lastName || !form.phone || !form.unitId}
          >
            {createResident.isPending ? "Adding..." : "Add Resident"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RentReviewDialog({
  building,
  units,
  onClose,
}: {
  building: any;
  units: any[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("");
  const [updateServiceCharge, setUpdateServiceCharge] = useState(false);
  const [step, setStep] = useState<"configure" | "preview" | "done">("configure");
  const [result, setResult] = useState<any>(null);

  const numValue = Number(value) || 0;
  const preview = units.map(u => {
    const oldRent = Number(u.monthlyRent ?? 0);
    const newRent = type === "percent"
      ? Math.round(oldRent * (1 + numValue / 100))
      : Math.round(oldRent + numValue);
    return { ...u, oldRent, newRent, diff: newRent - oldRent };
  });
  const totalBefore = preview.reduce((s, u) => s + u.oldRent, 0);
  const totalAfter = preview.reduce((s, u) => s + u.newRent, 0);

  const confirm = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/buildings/${building.id}/rent-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, value: numValue, updateServiceCharge }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? "Failed to apply rent review");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: getListUnitsQueryKey(building.id) });
      qc.invalidateQueries({ queryKey: getGetBuildingQueryKey(building.id) });
      setStep("done");
    },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Annual Rent Review — {building.name}
          </DialogTitle>
        </DialogHeader>

        {step === "configure" && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium mb-1 block">Review Type</label>
              <Select value={type} onValueChange={v => setType(v as "percent" | "fixed")}>
                <SelectTrigger data-testid="select-review-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentage increase (%)</SelectItem>
                  <SelectItem value="fixed">Fixed amount (KES)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">
                {type === "percent" ? "Percentage Increase" : "Fixed Increase (KES)"}
              </label>
              <Input
                type="number"
                min="0"
                step={type === "percent" ? "0.5" : "500"}
                placeholder={type === "percent" ? "e.g. 7.5" : "e.g. 2000"}
                value={value}
                onChange={e => setValue(e.target.value)}
                data-testid="input-review-value"
              />
              {type === "percent" && (
                <div className="flex gap-2 mt-2">
                  {[5, 7, 7.5, 10].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setValue(String(p))}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${value === String(p) ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground hover:border-primary/50"}`}
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={updateServiceCharge}
                onChange={e => setUpdateServiceCharge(e.target.checked)}
                className="rounded"
                data-testid="checkbox-update-service-charge"
              />
              Also update building service charge (use avg new rent)
            </label>
            <Button
              className="w-full"
              disabled={!numValue || numValue <= 0}
              onClick={() => setStep("preview")}
              data-testid="button-preview"
            >
              Preview Changes ({units.length} unit{units.length !== 1 ? "s" : ""})
            </Button>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4 overflow-y-auto flex-1 flex flex-col">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/40 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Monthly Before</p>
                <p className="font-semibold text-sm">KES {totalBefore.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                <p className="text-xs text-green-700 mb-1">Monthly After</p>
                <p className="font-semibold text-sm text-green-700">KES {totalAfter.toLocaleString()}</p>
                <p className="text-[11px] text-green-600">+KES {(totalAfter - totalBefore).toLocaleString()}/mo</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto max-h-52 border rounded-lg divide-y divide-border text-sm">
              {preview.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3" data-testid={`preview-unit-${u.id}`}>
                  <span className="font-medium text-foreground">Unit {u.unitNumber}</span>
                  <span className="text-muted-foreground text-xs">
                    {u.oldRent > 0 ? `KES ${u.oldRent.toLocaleString()}` : "—"}
                    {" "}→{" "}
                    <span className="text-green-700 font-semibold">KES {u.newRent.toLocaleString()}</span>
                    {u.oldRent > 0 && <span className="text-green-600 ml-1">(+{u.diff.toLocaleString()})</span>}
                  </span>
                </div>
              ))}
            </div>
            {confirm.error && (
              <p className="text-sm text-destructive">{(confirm.error as Error).message}</p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("configure")}>Back</Button>
              <Button
                className="flex-1"
                onClick={() => confirm.mutate()}
                disabled={confirm.isPending}
                data-testid="button-confirm-review"
              >
                {confirm.isPending ? "Applying..." : `Apply to ${units.length} Units`}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && result && (
          <div className="py-4 space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="font-semibold text-green-800">Rent Review Applied!</p>
              <p className="text-sm text-green-700 mt-1">{result.updated} units updated in {result.building}</p>
              <p className="text-xs text-green-600 mt-0.5">
                Monthly revenue: KES {Number(result.totalBefore).toLocaleString()} → KES {Number(result.totalAfter).toLocaleString()}
              </p>
              {type === "percent" && (
                <p className="text-xs text-green-600">({result.value}% increase)</p>
              )}
            </div>
            <Button className="w-full" onClick={onClose}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function BuildingDetail() {
  const [, params] = useRoute("/buildings/:id");
  const [, setLocation] = useLocation();
  const id = Number(params?.id);
  const [addingResident, setAddingResident] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState(false);
  const [addingUnit, setAddingUnit] = useState(false);
  const [rentReviewOpen, setRentReviewOpen] = useState(false);

  const { data: building, isLoading } = useGetBuilding(id, {
    query: { queryKey: getGetBuildingQueryKey(id), enabled: !!id },
  });
  const { data: units } = useListUnits(id, {
    query: { queryKey: getListUnitsQueryKey(id), enabled: !!id },
  });
  const { data: residents } = useListResidents(
    { buildingId: id },
    { query: { queryKey: getListResidentsQueryKey({ buildingId: id }), enabled: !!id } }
  );
  const { data: issues } = useListIssues(
    { buildingId: id },
    { query: { queryKey: getListIssuesQueryKey({ buildingId: id }), enabled: !!id } }
  );
  const { data: paymentSummary } = useGetPaymentsSummary(
    { buildingId: id },
    { query: { queryKey: getGetPaymentsSummaryQueryKey({ buildingId: id }), enabled: !!id } }
  );

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!building) return <div className="p-8 text-center text-muted-foreground">Building not found</div>;

  const occupiedUnits = units?.filter(u => u.status === "occupied").length ?? 0;
  const openIssues = issues?.filter(i => i.status === "open" || i.status === "in_progress").length ?? 0;
  const score = building.reputationScore ? Number(building.reputationScore) : null;
  const scoreColor =
    score !== null
      ? score >= 8
        ? "text-green-600"
        : score >= 6
          ? "text-amber-600"
          : "text-red-600"
      : "text-muted-foreground";

  return (
    <div className="space-y-6 max-w-4xl">
      <button
        onClick={() => setLocation("/buildings")}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
        data-testid="button-back"
      >
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
            onClick={() => setRentReviewOpen(true)}
            data-testid="button-rent-review"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Rent Review
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditingBuilding(true)} data-testid="button-edit-building">
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Button>
          {score !== null && (
            <div className="text-center p-4 bg-card border border-border rounded-xl">
              <p className="text-xs text-muted-foreground font-medium mb-1">Reputation Score</p>
              <p className={`text-4xl font-bold ${scoreColor}`}>{score.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">/10</p>
            </div>
          )}
        </div>
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
            <p className={`text-2xl font-bold mt-1 ${openIssues > 0 ? "text-red-600" : "text-foreground"}`}>
              {openIssues}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Financials */}
      {paymentSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-green-200 bg-green-50/40">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Collected</p>
              <p className="text-xl font-bold mt-1 text-green-700">
                KES {Number(paymentSummary.totalCollected ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-green-600 mt-0.5">{paymentSummary.paidCount ?? 0} paid</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/40">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Overdue</p>
              <p className="text-xl font-bold mt-1 text-red-700">
                KES {Number(paymentSummary.totalOverdue ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-red-600 mt-0.5">{paymentSummary.overdueCount ?? 0} overdue</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/40">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <p className="text-xl font-bold mt-1 text-amber-700">
                KES {Number(paymentSummary.totalOutstanding ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-amber-600 mt-0.5">{paymentSummary.pendingCount ?? 0} pending</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Collection Rate</p>
              <p className="text-xl font-bold mt-1 text-primary">
                {paymentSummary.collectionRate ?? 0}%
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">this month</p>
            </CardContent>
          </Card>
        </div>
      )}

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
              <span className="font-medium text-primary">
                KES {Number(building.serviceChargeAmount).toLocaleString()}/mo
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs: Units / Residents / Issues */}
      <Tabs defaultValue="units">
        <TabsList>
          <TabsTrigger value="units" data-testid="tab-units">
            Units ({units?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="residents" data-testid="tab-residents">
            Residents ({residents?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="issues" data-testid="tab-issues">
            Issues ({issues?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="units" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setAddingUnit(true)} data-testid="button-add-unit">
              <Plus className="w-3.5 h-3.5" /> Add Unit
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {!units?.length ? (
                <div className="p-8 text-center text-muted-foreground">No units listed</div>
              ) : (
                <div className="divide-y divide-border">
                  {units.map(unit => (
                    <div
                      key={unit.id}
                      className="flex items-center justify-between p-4 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => setLocation(`/buildings/${id}/units/${unit.id}`)}
                      data-testid={`row-unit-${unit.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-secondary rounded-md">
                          <Home className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">Unit {unit.unitNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {unit.floor != null ? `Floor ${unit.floor}` : ""}{unit.floor != null && unit.bedrooms != null ? " · " : ""}{unit.bedrooms != null ? `${unit.bedrooms} bed` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {unit.monthlyRent && (
                          <p className="text-sm font-medium">KES {Number(unit.monthlyRent).toLocaleString()}</p>
                        )}
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${STATUS_COLORS[unit.status] ?? "bg-gray-100 text-gray-600"}`}
                        >
                          {unit.status}
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
            <Button
              size="sm"
              className="gap-2"
              onClick={() => setAddingResident(true)}
              data-testid="button-add-resident"
            >
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
                    <div
                      key={resident.id}
                      className="flex items-center justify-between p-4"
                      data-testid={`row-resident-${resident.id}`}
                    >
                      <div>
                        <p className="font-semibold text-foreground">
                          {resident.firstName} {resident.lastName}
                        </p>
                        <div className="flex gap-3 text-sm text-muted-foreground mt-0.5">
                          {resident.email && <span>{resident.email}</span>}
                          {resident.phone && <span>{resident.phone}</span>}
                        </div>
                        {resident.isOwner && (
                          <span className="text-xs text-primary font-medium">Owner</span>
                        )}
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${RESIDENT_STATUS_COLORS[resident.status] ?? "bg-gray-100 text-gray-600"}`}
                      >
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
                    <div
                      key={issue.id}
                      className="flex items-center justify-between p-4 hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() => setLocation(`/issues/${issue.id}`)}
                      data-testid={`row-issue-${issue.id}`}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${ISSUE_STATUS_COLORS[issue.status]}`}>
                            {issue.status.replace("_", " ")}
                          </span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {issue.priority} · {issue.category}
                          </span>
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

      {editingBuilding && (
        <EditBuildingDialog building={building} onClose={() => setEditingBuilding(false)} />
      )}
      {addingUnit && (
        <AddUnitDialog buildingId={id} onClose={() => setAddingUnit(false)} />
      )}
      {addingResident && (
        <AddResidentDialog buildingId={id} units={units ?? []} onClose={() => setAddingResident(false)} />
      )}
      {rentReviewOpen && (
        <RentReviewDialog building={building} units={units ?? []} onClose={() => setRentReviewOpen(false)} />
      )}
    </div>
  );
}
