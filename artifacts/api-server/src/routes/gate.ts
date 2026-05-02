import "../types/session";
import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { visitorsTable, unitsTable, residentsTable, buildingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

export const gateRouter = Router();

const GATE_PIN = process.env.GATE_PIN ?? "1234";

function requireGate(req: Request, res: Response, next: () => void): void {
  if (!req.session?.gateAuthenticated) {
    res.status(401).json({ error: "Gate PIN required" });
    return;
  }
  next();
}

// POST /api/gate/auth — guard logs in with PIN
gateRouter.post("/auth", (req: Request, res: Response): void => {
  const { pin } = z.object({ pin: z.string() }).parse(req.body);
  if (pin !== GATE_PIN) {
    res.status(401).json({ error: "Incorrect PIN" });
    return;
  }
  req.session.gateAuthenticated = true;
  res.json({ ok: true });
});

// POST /api/gate/logout
gateRouter.post("/logout", (req: Request, res: Response): void => {
  req.session.gateAuthenticated = false;
  res.json({ ok: true });
});

// GET /api/gate/me — check if gate session active
gateRouter.get("/me", (req: Request, res: Response): void => {
  if (!req.session?.gateAuthenticated) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({ ok: true });
});

// GET /api/gate/visitors — today's expected visitors across all buildings with enriched info
gateRouter.get("/visitors", requireGate, async (req: Request, res: Response): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];

  const visitors = await db.select({
    id: visitorsTable.id,
    visitorName: visitorsTable.visitorName,
    visitorPhone: visitorsTable.visitorPhone,
    visitorIdNumber: visitorsTable.visitorIdNumber,
    purpose: visitorsTable.purpose,
    expectedDate: visitorsTable.expectedDate,
    expectedTime: visitorsTable.expectedTime,
    status: visitorsTable.status,
    checkInTime: visitorsTable.checkInTime,
    checkOutTime: visitorsTable.checkOutTime,
    securityNote: visitorsTable.securityNote,
    buildingName: buildingsTable.name,
    buildingId: visitorsTable.buildingId,
    unitNumber: unitsTable.unitNumber,
    residentFirstName: residentsTable.firstName,
    residentLastName: residentsTable.lastName,
    residentPhone: residentsTable.phone,
  })
    .from(visitorsTable)
    .leftJoin(buildingsTable, eq(visitorsTable.buildingId, buildingsTable.id))
    .leftJoin(unitsTable, eq(visitorsTable.unitId, unitsTable.id))
    .leftJoin(residentsTable, eq(visitorsTable.residentId, residentsTable.id))
    .where(eq(visitorsTable.expectedDate, today))
    .orderBy(visitorsTable.expectedTime);

  res.json(visitors);
});

// PATCH /api/gate/visitors/:id/checkin
gateRouter.patch("/visitors/:id/checkin", requireGate, async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  const [visitor] = await db.update(visitorsTable)
    .set({ status: "checked_in", checkInTime: new Date() })
    .where(eq(visitorsTable.id, id))
    .returning();
  if (!visitor) { res.status(404).json({ error: "Visitor not found" }); return; }
  res.json(visitor);
});

// PATCH /api/gate/visitors/:id/checkout
gateRouter.patch("/visitors/:id/checkout", requireGate, async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  const [visitor] = await db.update(visitorsTable)
    .set({ status: "checked_out", checkOutTime: new Date() })
    .where(eq(visitorsTable.id, id))
    .returning();
  if (!visitor) { res.status(404).json({ error: "Visitor not found" }); return; }
  res.json(visitor);
});

// PATCH /api/gate/visitors/:id/deny
gateRouter.patch("/visitors/:id/deny", requireGate, async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  const { note } = z.object({ note: z.string().optional() }).parse(req.body);
  const [visitor] = await db.update(visitorsTable)
    .set({ status: "denied", securityNote: note ?? null })
    .where(eq(visitorsTable.id, id))
    .returning();
  if (!visitor) { res.status(404).json({ error: "Visitor not found" }); return; }
  res.json(visitor);
});
