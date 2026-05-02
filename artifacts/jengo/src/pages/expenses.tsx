import { useState, useMemo } from "react";
import { useListBuildings, getListBuildingsQueryKey } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Receipt, Pencil, Trash2, Printer, TrendingDown } from "lucide-react";
import { printHtml, formatKES, today, loadSettings } from "@/lib/print-utils";

const CATEGORIES = [
  { value: "utilities", label: "Utilities" },
  { value: "repairs", label: "Repairs & Maintenance" },
  { value: "security", label: "Security" },
  { value: "cleaning", label: "Cleaning" },
  { value: "staff", label: "Staff & Wages" },
  { value: "admin", label: "Admin & Office" },
  { value: "insurance", label: "Insurance" },
  { value: "other", label: "Other" },
];

const PAYMENT_METHODS = [
  { value: "mpesa", label: "M-Pesa" },
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "other", label: "Other" },
];

const CATEGORY_COLORS: Record<string, string> = {
  utilities: "bg-blue-100 text-blue-700",
  repairs: "bg-orange-100 text-orange-700",
  security: "bg-purple-100 text-purple-700",
  cleaning: "bg-teal-100 text-teal-700",
  staff: "bg-amber-100 text-amber-700",
  admin: "bg-gray-100 text-gray-700",
  insurance: "bg-indigo-100 text-indigo-700",
  other: "bg-slate-100 text-slate-700",
};

const schema = z.object({
  buildingId: z.coerce.number().min(1, "Select a building"),
  category: z.enum(["utilities", "repairs", "security", "cleaning", "staff", "admin", "insurance", "other"]),
  description: z.string().min(2, "Description required"),
  amount: z.coerce.number().min(1, "Amount required"),
  date: z.string().min(1, "Date required"),
  vendor: z.string().optional(),
  receiptRef: z.string().optional(),
  paymentMethod: z.enum(["mpesa", "cash", "bank_transfer", "other"]).optional(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

function categoryLabel(cat: string) {
  return CATEGORIES.find(c => c.value === cat)?.label ?? cat;
}

function methodLabel(m: string | null | undefined) {
  if (!m) return "—";
  return PAYMENT_METHODS.find(p => p.value === m)?.label ?? m;
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function monthOptions() {
  const opts = [{ value: "all", label: "All Time" }];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-KE", { month: "long", year: "numeric" }),
    });
  }
  return opts;
}

function printExpenseReport(expenses: any[], buildingName: string, monthLabel: string) {
  const settings = loadSettings();
  const company = settings.companyName || "Jengo Property Management";
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const byCategory: Record<string, number> = {};
  expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] ?? 0) + Number(e.amount); });

  const catRows = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => `
      <tr>
        <td>${categoryLabel(cat)}</td>
        <td style="text-align:right">${expenses.filter(e => e.category === cat).length} items</td>
        <td style="text-align:right;font-weight:600">KES ${amt.toLocaleString()}</td>
        <td style="text-align:right;color:#6b7280">${((amt / total) * 100).toFixed(1)}%</td>
      </tr>`).join("");

  const expRows = expenses.map(e => `
    <tr>
      <td>${e.date}</td>
      <td>${e.description}${e.vendor ? `<br/><span style="font-size:11px;color:#888">${e.vendor}</span>` : ""}</td>
      <td><span style="font-size:11px;padding:2px 8px;border-radius:4px;background:#f3f4f6">${categoryLabel(e.category)}</span></td>
      <td style="text-align:right">${methodLabel(e.paymentMethod)}</td>
      <td style="text-align:right">${e.receiptRef ?? "—"}</td>
      <td style="text-align:right;font-weight:600">KES ${Number(e.amount).toLocaleString()}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Expense Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 32px; }
  .brand { font-size: 22px; font-weight: 700; color: #c2410c; }
  .sub { font-size: 11px; color: #888; margin-top: 2px; }
  h2 { font-size: 14px; font-weight: 700; color: #111; margin: 24px 0 10px; }
  .meta { display: flex; gap: 32px; margin: 16px 0; font-size: 12px; color: #555; }
  .meta b { color: #111; }
  .total-box { display: inline-block; background: #fff7ed; border: 2px solid #f97316; border-radius: 8px; padding: 12px 24px; margin: 16px 0; }
  .total-box .label { font-size: 11px; color: #888; }
  .total-box .value { font-size: 24px; font-weight: 700; color: #c2410c; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead th { background: #f9fafb; padding: 8px 10px; text-align: left; font-weight: 600; font-size: 11px; color: #6b7280; border-bottom: 2px solid #e5e7eb; text-transform: uppercase; letter-spacing: 0.4px; }
  tbody td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; }
  tfoot td { padding: 10px; font-weight: 700; border-top: 2px solid #e5e7eb; background: #f9fafb; }
  .footer { margin-top: 32px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="brand">${company}</div>
  <div class="sub">Expense Report</div>
  <div class="meta">
    <div><span class="label">Building: </span><b>${buildingName}</b></div>
    <div><span class="label">Period: </span><b>${monthLabel}</b></div>
    <div><span class="label">Generated: </span><b>${today()}</b></div>
    <div><span class="label">Total Items: </span><b>${expenses.length}</b></div>
  </div>
  <div class="total-box">
    <div class="label">Total Expenditure</div>
    <div class="value">KES ${total.toLocaleString()}</div>
  </div>

  <h2>By Category</h2>
  <table>
    <thead><tr><th>Category</th><th style="text-align:right">Items</th><th style="text-align:right">Amount</th><th style="text-align:right">Share</th></tr></thead>
    <tbody>${catRows}</tbody>
    <tfoot><tr><td>Total</td><td style="text-align:right">${expenses.length}</td><td style="text-align:right">KES ${total.toLocaleString()}</td><td></td></tr></tfoot>
  </table>

  <h2>All Expenses</h2>
  <table>
    <thead><tr><th>Date</th><th>Description / Vendor</th><th>Category</th><th style="text-align:right">Method</th><th style="text-align:right">Receipt</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>${expRows}</tbody>
    <tfoot><tr><td colspan="5">Total</td><td style="text-align:right">KES ${total.toLocaleString()}</td></tr></tfoot>
  </table>

  <div class="footer">Computer generated — ${company} &nbsp;|&nbsp; ${today()}</div>
</body>
</html>`;
  printHtml(html);
}

function ExpenseFormDialog({
  open,
  buildings,
  defaultBuildingId,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  buildings: any[];
  defaultBuildingId: number;
  editing?: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: editing
      ? { ...editing, amount: Number(editing.amount), buildingId: editing.buildingId }
      : {
          buildingId: defaultBuildingId,
          category: "repairs",
          description: "",
          amount: 0,
          date: new Date().toISOString().split("T")[0],
          vendor: "",
          receiptRef: "",
          paymentMethod: "mpesa",
          notes: "",
        },
  });

  const save = useMutation({
    mutationFn: async (data: FormData) => {
      const url = editing ? `/api/expenses/${editing.id}` : "/api/expenses";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, amount: String(data.amount) }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => { onSaved(); onClose(); },
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Expense" : "Add Expense"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(d => save.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="buildingId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Building</FormLabel>
                  <Select onValueChange={v => field.onChange(Number(v))} value={String(field.value)}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{buildings.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (KES)</FormLabel>
                  <FormControl><Input type="number" min="0" placeholder="0" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Input placeholder="e.g. Replace water pump, Security guard wages…" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="vendor" render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor / Payee</FormLabel>
                  <FormControl><Input placeholder="Company or person paid" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{PAYMENT_METHODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="receiptRef" render={({ field }) => (
              <FormItem>
                <FormLabel>Receipt / Reference No.</FormLabel>
                <FormControl><Input placeholder="M-Pesa code, receipt number…" {...field} /></FormControl>
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl><Textarea rows={2} placeholder="Additional details…" {...field} /></FormControl>
              </FormItem>
            )} />

            {save.error && <p className="text-sm text-destructive">{(save.error as Error).message}</p>}

            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : editing ? "Save Changes" : "Add Expense"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Expenses() {
  const qc = useQueryClient();
  const [selectedBuilding, setSelectedBuilding] = useState<number>(0);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const { data: buildings } = useListBuildings({ query: { queryKey: getListBuildingsQueryKey() } });

  const expenseKey = ["expenses", selectedBuilding, selectedMonth];
  const { data: expenses = [], isLoading } = useQuery<any[]>({
    queryKey: expenseKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBuilding) params.set("buildingId", String(selectedBuilding));
      if (selectedMonth) params.set("month", selectedMonth);
      const res = await fetch(`/api/expenses?${params}`);
      return res.json();
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: expenseKey }),
  });

  const total = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => { map[e.category] = (map[e.category] ?? 0) + Number(e.amount); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const buildingName = selectedBuilding
    ? (buildings?.find(b => b.id === selectedBuilding)?.name ?? "Building")
    : "All Buildings";

  const monthOpts = monthOptions();
  const monthLabel = monthOpts.find(o => o.value === selectedMonth)?.label ?? selectedMonth;

  const refresh = () => qc.invalidateQueries({ queryKey: expenseKey });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Expenses</h1>
          <p className="text-muted-foreground">Track building operating costs and expenditures</p>
        </div>
        <Button className="gap-2" onClick={() => setAddOpen(true)} data-testid="button-add-expense">
          <Plus className="w-4 h-4" />
          Add Expense
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Building:</span>
          <Select value={String(selectedBuilding)} onValueChange={v => setSelectedBuilding(Number(v))}>
            <SelectTrigger className="w-48" data-testid="select-building">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">All Buildings</SelectItem>
              {buildings?.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Period:</span>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-44" data-testid="select-month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOpts.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {expenses.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 ml-auto"
            onClick={() => printExpenseReport(expenses, buildingName, monthLabel)}
            data-testid="button-print-report"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="md:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Total Spent</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{formatKES(total)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{expenses.length} transaction{expenses.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        {byCategory.slice(0, 3).map(([cat, amt]) => (
          <Card key={cat}>
            <CardContent className="p-4">
              <span className={`inline-block text-xs px-2 py-0.5 rounded font-medium mb-2 ${CATEGORY_COLORS[cat]}`}>
                {categoryLabel(cat)}
              </span>
              <p className="text-xl font-bold text-foreground">{formatKES(amt)}</p>
              <p className="text-xs text-muted-foreground">{((amt / total) * 100).toFixed(1)}% of total</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Category breakdown bar */}
      {byCategory.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {byCategory.map(([cat, amt]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-xs w-36 text-muted-foreground flex-shrink-0">{categoryLabel(cat)}</span>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-primary/70 transition-all"
                    style={{ width: `${(amt / total) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-foreground w-28 text-right">{formatKES(amt)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Expense list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : expenses.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No expenses recorded for this period</p>
              <Button className="mt-4 gap-2" size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="w-3 h-3" /> Add First Expense
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {expenses.map(e => (
                <div key={e.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-2" data-testid={`row-expense-${e.id}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${CATEGORY_COLORS[e.category]}`}>
                        {categoryLabel(e.category)}
                      </span>
                      <span className="text-xs text-muted-foreground">{e.date}</span>
                      {e.paymentMethod && (
                        <span className="text-xs text-muted-foreground">· {methodLabel(e.paymentMethod)}</span>
                      )}
                    </div>
                    <p className="font-semibold text-foreground">{e.description}</p>
                    <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground mt-0.5">
                      {e.vendor && <span>{e.vendor}</span>}
                      {e.receiptRef && <span className="font-mono">Ref: {e.receiptRef}</span>}
                      {e.notes && <span className="italic">{e.notes}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-red-600">{formatKES(Number(e.amount))}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-8 h-8 text-muted-foreground hover:text-foreground"
                      onClick={() => setEditing(e)}
                      data-testid={`button-edit-${e.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-8 h-8 text-destructive hover:text-destructive"
                      onClick={() => { if (confirm("Delete this expense?")) deleteExpense.mutate(e.id); }}
                      data-testid={`button-delete-${e.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {addOpen && (
        <ExpenseFormDialog
          open
          buildings={buildings ?? []}
          defaultBuildingId={selectedBuilding || (buildings?.[0]?.id ?? 0)}
          onClose={() => setAddOpen(false)}
          onSaved={refresh}
        />
      )}
      {editing && (
        <ExpenseFormDialog
          open
          buildings={buildings ?? []}
          defaultBuildingId={editing.buildingId}
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
