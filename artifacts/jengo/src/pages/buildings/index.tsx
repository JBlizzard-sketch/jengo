import { useState } from "react";
import {
  useListBuildings, useCreateBuilding,
  getListBuildingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building as BuildingIcon, MapPin, Users, Plus } from "lucide-react";
import { Link } from "wouter";

const NEIGHBOURHOODS = [
  { value: "kilimani", label: "Kilimani" },
  { value: "westlands", label: "Westlands" },
  { value: "lavington", label: "Lavington" },
  { value: "south_b", label: "South B" },
  { value: "other", label: "Other" },
];

function AddBuildingDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const createBuilding = useCreateBuilding();
  const [form, setForm] = useState({
    name: "",
    address: "",
    neighbourhood: "kilimani",
    totalUnits: "1",
    managementCompany: "",
    caretakerName: "",
    caretakerPhone: "",
    serviceChargeAmount: "",
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.address) return;
    createBuilding.mutate(
      {
        data: {
          name: form.name,
          address: form.address,
          neighbourhood: form.neighbourhood as any,
          totalUnits: Number(form.totalUnits) || 1,
          managementCompany: form.managementCompany || undefined,
          caretakerName: form.caretakerName || undefined,
          caretakerPhone: form.caretakerPhone || undefined,
          serviceChargeAmount: form.serviceChargeAmount ? Number(form.serviceChargeAmount) : undefined,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListBuildingsQueryKey() });
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Building</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block">Building Name *</label>
            <Input placeholder="Kilimani Heights" value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Address *</label>
            <Input placeholder="Kilimani Road, Nairobi" value={form.address} onChange={e => set("address", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
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
              <label className="text-xs font-medium mb-1 block">Total Units</label>
              <Input type="number" min="1" value={form.totalUnits} onChange={e => set("totalUnits", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Service Charge (KES/month)</label>
            <Input type="number" placeholder="8500" value={form.serviceChargeAmount} onChange={e => set("serviceChargeAmount", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Management Company</label>
            <Input placeholder="Apex Property Managers" value={form.managementCompany} onChange={e => set("managementCompany", e.target.value)} />
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
          <Button
            type="submit"
            className="w-full"
            disabled={createBuilding.isPending || !form.name || !form.address}
          >
            {createBuilding.isPending ? "Creating..." : "Create Building"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Buildings() {
  const { data: buildings, isLoading } = useListBuildings({
    query: { queryKey: getListBuildingsQueryKey() },
  });
  const [addingBuilding, setAddingBuilding] = useState(false);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading buildings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Buildings</h1>
          <p className="text-muted-foreground">Manage your properties across Nairobi.</p>
        </div>
        <Button className="gap-2" onClick={() => setAddingBuilding(true)} data-testid="button-add-building">
          <Plus className="w-4 h-4" /> Add Building
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {buildings?.map(building => (
          <Link key={building.id} href={`/buildings/${building.id}`}>
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-1">{building.name}</h3>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3 mr-1" />
                      {building.neighbourhood.replace("_", " ")}
                    </div>
                  </div>
                  <div className="p-2 bg-secondary rounded-md">
                    <BuildingIcon className="w-5 h-5 text-primary" />
                  </div>
                </div>

                {/* Occupancy bar */}
                {(building as any).occupancyRate !== undefined && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Occupancy</span>
                      <span className="font-medium text-foreground">
                        {(building as any).occupiedUnits ?? 0}/{building.totalUnits} units · {(building as any).occupancyRate ?? 0}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (building as any).occupancyRate >= 80 ? "bg-green-500" :
                          (building as any).occupancyRate >= 50 ? "bg-amber-400" : "bg-red-400"
                        }`}
                        style={{ width: `${(building as any).occupancyRate ?? 0}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-auto pt-4 border-t border-border flex justify-between items-center text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <Users className="w-4 h-4 mr-1" />
                    {building.totalUnits} Units
                  </div>
                  {building.reputationScore && (
                    <div className="font-medium text-primary">
                      Score: {building.reputationScore}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {addingBuilding && <AddBuildingDialog onClose={() => setAddingBuilding(false)} />}
    </div>
  );
}
