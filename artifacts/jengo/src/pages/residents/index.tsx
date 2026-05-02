import { useState } from "react";
import {
  useListResidents, useListBuildings, useUpdateResident,
  getListResidentsQueryKey, getListBuildingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Search, Filter, LogOut, Phone, Mail } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-500",
  pending: "bg-amber-100 text-amber-700",
};

function MoveOutDialog({
  resident,
  onClose,
}: {
  resident: any;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const updateResident = useUpdateResident();
  const [moveOutDate] = useState(new Date().toISOString().split("T")[0]);

  const confirm = () => {
    updateResident.mutate(
      { id: resident.id, data: { status: "inactive", moveOutDate } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListResidentsQueryKey() });
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirm Move-Out</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Mark <span className="font-semibold text-foreground">{resident.firstName} {resident.lastName}</span> as moved out?
            Their status will be set to <span className="font-medium">inactive</span> and they will no longer receive
            service charge notices.
          </p>
          <p className="text-xs text-muted-foreground">Move-out date: {moveOutDate}</p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={confirm}
              disabled={updateResident.isPending}
            >
              {updateResident.isPending ? "Saving..." : "Confirm Move-Out"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Residents() {
  const [search, setSearch] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [movingOut, setMovingOut] = useState<any>(null);

  const { data: residents, isLoading } = useListResidents(undefined, {
    query: { queryKey: getListResidentsQueryKey() },
  });
  const { data: buildings } = useListBuildings({
    query: { queryKey: getListBuildingsQueryKey() },
  });

  const buildingMap = Object.fromEntries((buildings ?? []).map(b => [b.id, b.name]));

  const filtered = (residents ?? []).filter(r => {
    if (buildingFilter !== "all" && String(r.buildingId) !== buildingFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const name = `${r.firstName} ${r.lastName}`.toLowerCase();
      if (!name.includes(q) && !r.phone?.includes(q) && !r.email?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const activeCount = (residents ?? []).filter(r => r.status === "active").length;
  const inactiveCount = (residents ?? []).filter(r => r.status === "inactive").length;
  const pendingCount = (residents ?? []).filter(r => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Residents</h1>
          <p className="text-muted-foreground">All residents across your portfolio</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-green-200 bg-green-50/40">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-green-700">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Moved Out</p>
              <p className="text-2xl font-bold text-muted-foreground">{inactiveCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search name, phone, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={buildingFilter} onValueChange={setBuildingFilter}>
          <SelectTrigger className="w-52" data-testid="select-building">
            <SelectValue placeholder="All Buildings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Buildings</SelectItem>
            {buildings?.map(b => (
              <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36" data-testid="select-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="inactive">Moved Out</SelectItem>
          </SelectContent>
        </Select>
        {(search || buildingFilter !== "all" || statusFilter !== "active") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(""); setBuildingFilter("all"); setStatusFilter("active"); }}
          >
            Clear
          </Button>
        )}
        <span className="text-sm text-muted-foreground ml-auto">
          {filtered.length} resident{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Residents list */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading residents...</div>
          ) : !filtered.length ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No residents match your filters</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(resident => (
                <div
                  key={resident.id}
                  className="flex items-center justify-between p-4"
                  data-testid={`row-resident-${resident.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-foreground">
                        {resident.firstName} {resident.lastName}
                      </p>
                      {resident.isOwner && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                          Owner
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${STATUS_COLORS[resident.status] ?? ""}`}
                      >
                        {resident.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground/70">
                        {buildingMap[resident.buildingId] ?? `Building ${resident.buildingId}`}
                      </span>
                      {resident.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {resident.phone}
                        </span>
                      )}
                      {resident.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {resident.email}
                        </span>
                      )}
                      {resident.moveInDate && (
                        <span className="text-xs">
                          Since {new Date(resident.moveInDate).toLocaleDateString("en-KE", { month: "short", year: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>
                  {resident.status === "active" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive gap-1.5 flex-shrink-0 ml-4"
                      onClick={() => setMovingOut(resident)}
                      data-testid={`button-moveout-${resident.id}`}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Move Out
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {movingOut && (
        <MoveOutDialog resident={movingOut} onClose={() => setMovingOut(null)} />
      )}
    </div>
  );
}
