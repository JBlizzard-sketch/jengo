import { Router } from "express";
import { db } from "@workspace/db";
import { unitsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateUnitBody, UpdateUnitBody } from "@workspace/api-zod";

export const unitsRouter = Router();

unitsRouter.get("/buildings/:buildingId/units", async (req, res) => {
  const buildingId = Number(req.params.buildingId);
  const units = await db.select().from(unitsTable).where(eq(unitsTable.buildingId, buildingId)).orderBy(unitsTable.unitNumber);
  res.json(units.map(u => ({
    ...u,
    monthlyRent: u.monthlyRent ? Number(u.monthlyRent) : null,
  })));
});

unitsRouter.post("/buildings/:buildingId/units", async (req, res) => {
  const buildingId = Number(req.params.buildingId);
  const body = CreateUnitBody.parse(req.body);
  const [unit] = await db.insert(unitsTable).values({
    buildingId,
    unitNumber: body.unitNumber,
    floor: body.floor ?? null,
    bedrooms: body.bedrooms ?? null,
    status: (body.status ?? "vacant") as any,
    monthlyRent: body.monthlyRent?.toString() ?? null,
  }).returning();
  res.status(201).json({ ...unit, monthlyRent: unit.monthlyRent ? Number(unit.monthlyRent) : null });
});

unitsRouter.get("/units/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [unit] = await db.select().from(unitsTable).where(eq(unitsTable.id, id));
  if (!unit) return res.status(404).json({ message: "Not found" });
  res.json({ ...unit, monthlyRent: unit.monthlyRent ? Number(unit.monthlyRent) : null });
});

unitsRouter.patch("/units/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = UpdateUnitBody.parse(req.body);
  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.monthlyRent !== undefined) updates.monthlyRent = body.monthlyRent?.toString();
  const [unit] = await db.update(unitsTable).set(updates).where(eq(unitsTable.id, id)).returning();
  if (!unit) return res.status(404).json({ message: "Not found" });
  res.json({ ...unit, monthlyRent: unit.monthlyRent ? Number(unit.monthlyRent) : null });
});
