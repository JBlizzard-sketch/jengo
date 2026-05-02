import { useState } from "react";
import { useLocation } from "wouter";
import { useResidentAuth } from "@/contexts/resident-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building } from "lucide-react";

export default function PortalLogin() {
  const { login } = useResidentAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, unitNumber);
      setLocation("/portal/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Building className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-primary">Jengo</h1>
          </div>
          <p className="text-muted-foreground">Resident Portal</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Sign in to your unit</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Email Address</label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  data-testid="input-email"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Unit Number</label>
                <Input
                  placeholder="e.g. A1, B2, 101"
                  value={unitNumber}
                  onChange={e => setUnitNumber(e.target.value)}
                  required
                  data-testid="input-unit"
                />
              </div>
              {error && (
                <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                  {error}
                </div>
              )}
              <Button type="submit" disabled={loading} className="w-full" data-testid="button-login">
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground text-center mt-4">
              Enter the email and unit number registered with your building management.
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Property manager?{" "}
          <a href="/" className="text-primary hover:underline">Go to management dashboard</a>
        </p>
      </div>
    </div>
  );
}
