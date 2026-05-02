import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface ResidentSession {
  id: number;
  name: string;
  email: string | null;
  unitNumber: string;
  buildingId: number;
  unitId: number;
  isOwner: boolean | null;
}

interface ResidentAuthCtx {
  resident: ResidentSession | null;
  isLoading: boolean;
  login: (email: string, unitNumber: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<ResidentAuthCtx | null>(null);

export function ResidentAuthProvider({ children }: { children: ReactNode }) {
  const [resident, setResident] = useState<ResidentSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => setResident(data))
      .catch(() => setResident(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, unitNumber: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, unitNumber }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Login failed");
    }
    const data = await res.json();
    setResident(data);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setResident(null);
  };

  return <Ctx.Provider value={{ resident, isLoading, login, logout }}>{children}</Ctx.Provider>;
}

export function useResidentAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useResidentAuth must be used inside ResidentAuthProvider");
  return ctx;
}
