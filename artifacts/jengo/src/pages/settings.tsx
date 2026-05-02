import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building, Phone, Mail, MapPin, Save, CheckCircle } from "lucide-react";

const STORAGE_KEY = "jengo_settings";

interface Settings {
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  companyAddress: string;
  mpesaPaybill: string;
  mpesaAccountPrefix: string;
  defaultGraceDays: string;
  lateFeePercent: string;
}

const DEFAULTS: Settings = {
  companyName: "Jengo Property Management",
  companyPhone: "+254 700 000 000",
  companyEmail: "info@jengo.co.ke",
  companyAddress: "Kilimani, Nairobi",
  mpesaPaybill: "247247",
  mpesaAccountPrefix: "SRVCHRG",
  defaultGraceDays: "5",
  lateFeePercent: "5",
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export default function Settings() {
  const [form, setForm] = useState<Settings>(load);
  const [saved, setSaved] = useState(false);

  const set = (k: keyof Settings, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Platform configuration for your property management company</p>
        </div>
        <Button type="submit" className="gap-2" data-testid="button-save">
          {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>

      {/* Company profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building className="w-4 h-4" />
            Company Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Company Name</label>
            <Input
              value={form.companyName}
              onChange={e => set("companyName", e.target.value)}
              placeholder="e.g. Acacia Property Management"
              data-testid="input-company-name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> Phone
              </label>
              <Input
                value={form.companyPhone}
                onChange={e => set("companyPhone", e.target.value)}
                placeholder="+254 700 000 000"
                data-testid="input-company-phone"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> Email
              </label>
              <Input
                type="email"
                value={form.companyEmail}
                onChange={e => set("companyEmail", e.target.value)}
                placeholder="info@yourcompany.co.ke"
                data-testid="input-company-email"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Office Address
            </label>
            <Input
              value={form.companyAddress}
              onChange={e => set("companyAddress", e.target.value)}
              placeholder="e.g. Kilimani, Nairobi"
              data-testid="input-company-address"
            />
          </div>
        </CardContent>
      </Card>

      {/* M-Pesa */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">M-Pesa Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Paybill Number</label>
              <Input
                value={form.mpesaPaybill}
                onChange={e => set("mpesaPaybill", e.target.value)}
                placeholder="247247"
                data-testid="input-mpesa-paybill"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Account Prefix</label>
              <Input
                value={form.mpesaAccountPrefix}
                onChange={e => set("mpesaAccountPrefix", e.target.value)}
                placeholder="e.g. SRVCHRG"
                data-testid="input-mpesa-account-prefix"
              />
              <p className="text-xs text-muted-foreground mt-1">Residents enter: {form.mpesaAccountPrefix}-[Unit]</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment policy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Grace Period (days)</label>
              <Input
                type="number"
                min="0"
                max="30"
                value={form.defaultGraceDays}
                onChange={e => set("defaultGraceDays", e.target.value)}
                placeholder="5"
                data-testid="input-grace-days"
              />
              <p className="text-xs text-muted-foreground mt-1">Days after due date before marking overdue</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Late Fee (%)</label>
              <Input
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={form.lateFeePercent}
                onChange={e => set("lateFeePercent", e.target.value)}
                placeholder="5"
                data-testid="input-late-fee"
              />
              <p className="text-xs text-muted-foreground mt-1">Applied to overdue balances</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info bar */}
      <div className="p-4 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground">
        Settings are saved locally in this browser. Contact your Jengo administrator to sync settings across devices.
      </div>
    </form>
  );
}
