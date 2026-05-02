import { useState } from "react";
import {
  useListVisitors, useCreateVisitor, useUpdateVisitor, useGetTodayVisitors, useListBuildings,
  getListVisitorsQueryKey, getGetTodayVisitorsQueryKey, getListBuildingsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Users, CheckCircle, LogIn, LogOut, XCircle, Clock } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-blue-100 text-blue-700 border-blue-200",
  checked_in: "bg-green-100 text-green-700 border-green-200",
  checked_out: "bg-gray-100 text-gray-600 border-gray-200",
  denied: "bg-red-100 text-red-700 border-red-200",
};

const schema = z.object({
  buildingId: z.coerce.number().min(1, "Select a building"),
  visitorName: z.string().min(2),
  visitorPhone: z.string().optional(),
  visitorIdNumber: z.string().optional(),
  purpose: z.string().optional(),
  expectedDate: z.string().min(1, "Select a date"),
  expectedTime: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

function NewVisitorDialog() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const createVisitor = useCreateVisitor();
  const { data: buildings } = useListBuildings({ query: { queryKey: getListBuildingsQueryKey() } });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { visitorName: "", visitorPhone: "", purpose: "", expectedDate: new Date().toISOString().split("T")[0], buildingId: 0 },
  });

  const onSubmit = (data: FormData) => {
    createVisitor.mutate(
      { data: data as any },
      {
        onSuccess: (visitor) => {
          qc.invalidateQueries({ queryKey: getListVisitorsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetTodayVisitorsQueryKey({ buildingId: data.buildingId }) });
          setOpen(false);
          form.reset();
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-testid="button-new-visitor">
          <Plus className="w-4 h-4" />
          Pre-clear Visitor
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pre-clear Visitor</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="buildingId" render={({ field }) => (
              <FormItem>
                <FormLabel>Building</FormLabel>
                <Select onValueChange={v => field.onChange(Number(v))} value={field.value ? String(field.value) : ""}>
                  <FormControl>
                    <SelectTrigger data-testid="select-building"><SelectValue placeholder="Select building" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {buildings?.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="visitorName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Visitor Name</FormLabel>
                  <FormControl><Input placeholder="Full name" {...field} data-testid="input-visitor-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="visitorPhone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input placeholder="+254..." {...field} data-testid="input-visitor-phone" /></FormControl>
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="visitorIdNumber" render={({ field }) => (
              <FormItem>
                <FormLabel>ID Number (optional)</FormLabel>
                <FormControl><Input placeholder="National ID or passport" {...field} data-testid="input-visitor-id" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="purpose" render={({ field }) => (
              <FormItem>
                <FormLabel>Purpose of Visit</FormLabel>
                <FormControl><Input placeholder="Family visit, delivery, etc." {...field} data-testid="input-purpose" /></FormControl>
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="expectedDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Date</FormLabel>
                  <FormControl><Input type="date" {...field} data-testid="input-expected-date" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="expectedTime" render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Time</FormLabel>
                  <FormControl><Input type="time" {...field} data-testid="input-expected-time" /></FormControl>
                </FormItem>
              )} />
            </div>
            <Button type="submit" disabled={createVisitor.isPending} className="w-full" data-testid="button-submit">
              {createVisitor.isPending ? "Saving..." : "Pre-clear Visitor"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Visitors() {
  const [selectedBuilding, setSelectedBuilding] = useState<number>(1);
  const qc = useQueryClient();
  const { data: buildings } = useListBuildings({ query: { queryKey: getListBuildingsQueryKey() } });
  const { data: todaySummary } = useGetTodayVisitors(
    { buildingId: selectedBuilding },
    { query: { queryKey: getGetTodayVisitorsQueryKey({ buildingId: selectedBuilding }), enabled: !!selectedBuilding } }
  );
  const { data: allVisitors, isLoading } = useListVisitors(
    { buildingId: selectedBuilding },
    { query: { queryKey: getListVisitorsQueryKey({ buildingId: selectedBuilding }) } }
  );
  const updateVisitor = useUpdateVisitor();

  const handleStatusChange = (id: number, status: string) => {
    const updates: Record<string, unknown> = { status };
    if (status === "checked_in") updates.checkInTime = new Date().toISOString();
    if (status === "checked_out") updates.checkOutTime = new Date().toISOString();
    updateVisitor.mutate(
      { id, data: updates as any },
      { onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListVisitorsQueryKey({ buildingId: selectedBuilding }) });
        qc.invalidateQueries({ queryKey: getGetTodayVisitorsQueryKey({ buildingId: selectedBuilding }) });
      }}
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Visitors</h1>
          <p className="text-muted-foreground">Pre-clearance and gate access management</p>
        </div>
        <NewVisitorDialog />
      </div>

      {/* Building selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Building:</span>
        <Select value={String(selectedBuilding)} onValueChange={v => setSelectedBuilding(Number(v))}>
          <SelectTrigger className="w-52" data-testid="select-building">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {buildings?.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Today's summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Expected Today", value: todaySummary?.expected ?? 0, icon: Clock, color: "text-foreground" },
          { label: "Approved", value: todaySummary?.pending ?? 0, icon: CheckCircle, color: "text-blue-600" },
          { label: "Checked In", value: todaySummary?.checkedIn ?? 0, icon: LogIn, color: "text-green-600" },
          { label: "Checked Out", value: todaySummary?.checkedOut ?? 0, icon: LogOut, color: "text-gray-500" },
          { label: "Denied", value: todaySummary?.denied ?? 0, icon: XCircle, color: "text-red-600" },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <item.icon className={`w-5 h-5 ${item.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Visitor list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Visitors</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : !allVisitors?.length ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No visitors registered</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {allVisitors.map(visitor => (
                <div key={visitor.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-3" data-testid={`row-visitor-${visitor.id}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${STATUS_COLORS[visitor.status]}`}>
                        {visitor.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="font-semibold text-foreground">{visitor.visitorName}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-0.5">
                      {visitor.visitorPhone && <span>{visitor.visitorPhone}</span>}
                      {visitor.purpose && <span>{visitor.purpose}</span>}
                      <span>{visitor.expectedDate} {visitor.expectedTime && `at ${visitor.expectedTime}`}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {visitor.status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(visitor.id, "approved")} data-testid={`button-approve-${visitor.id}`}>
                        Approve
                      </Button>
                    )}
                    {(visitor.status === "approved" || visitor.status === "pending") && (
                      <Button size="sm" className="gap-1" onClick={() => handleStatusChange(visitor.id, "checked_in")} data-testid={`button-checkin-${visitor.id}`}>
                        <LogIn className="w-3 h-3" />
                        Check In
                      </Button>
                    )}
                    {visitor.status === "checked_in" && (
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(visitor.id, "checked_out")} data-testid={`button-checkout-${visitor.id}`}>
                        <LogOut className="w-3 h-3 mr-1" />
                        Check Out
                      </Button>
                    )}
                    {(visitor.status === "pending" || visitor.status === "approved") && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleStatusChange(visitor.id, "denied")} data-testid={`button-deny-${visitor.id}`}>
                        Deny
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
