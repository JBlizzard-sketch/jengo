import { Router } from "express";
import { db } from "@workspace/db";
import { residentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateResidentBody, UpdateResidentBody, ListResidentsQueryParams } from "@workspace/api-zod";

export const residentsRouter = Router();

function toDateString(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

residentsRouter.get("/", async (req, res) => {
  const query = ListResidentsQueryParams.parse(req.query);
  const conditions = [];
  if (query.buildingId) conditions.push(eq(residentsTable.buildingId, query.buildingId));
  if (query.unitId) conditions.push(eq(residentsTable.unitId, query.unitId));
  const residents = conditions.length > 0
    ? await db.select().from(residentsTable).where(and(...conditions)).orderBy(residentsTable.lastName)
    : await db.select().from(residentsTable).orderBy(residentsTable.lastName);
  return res.json(residents);
});

residentsRouter.post("/", async (req, res) => {
  const body = CreateResidentBody.parse(req.body);
  const [resident] = await db.insert(residentsTable).values({
    unitId: body.unitId,
    buildingId: body.buildingId,
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email ?? null,
    phone: body.phone,
    moveInDate: toDateString(body.moveInDate),
    leaseEndDate: toDateString((body as any).leaseEndDate),
    isOwner: body.isOwner ?? false,
    status: "active",
  }).returning();
  return res.status(201).json(resident);
});

residentsRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [resident] = await db.select().from(residentsTable).where(eq(residentsTable.id, id));
  if (!resident) return res.status(404).json({ message: "Not found" });
  return res.json(resident);
});

residentsRouter.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = UpdateResidentBody.parse(req.body);
  const updates: Record<string, unknown> = {};
  if (body.email !== undefined) updates.email = body.email;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.status !== undefined) updates.status = body.status;
  if ((body as any).leaseEndDate !== undefined) updates.leaseEndDate = toDateString((body as any).leaseEndDate);
  if ((body as any).moveOutDate !== undefined) updates.moveOutDate = toDateString((body as any).moveOutDate);
  const [resident] = await db.update(residentsTable).set(updates).where(eq(residentsTable.id, id)).returning();
  if (!resident) return res.status(404).json({ message: "Not found" });
  return res.json(resident);
});
