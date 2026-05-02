import { Router } from "express";
import { db } from "@workspace/db";
import { parkingSlotsTable, insertParkingSlotSchema } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

export const parkingRouter = Router();

// GET /api/parking?buildingId=
parkingRouter.get("/", async (req, res) => {
  const buildingId = Number(req.query.buildingId);
  const rows = buildingId
    ? await db.select().from(parkingSlotsTable).where(eq(parkingSlotsTable.buildingId, buildingId))
    : await db.select().from(parkingSlotsTable);
  res.json(rows);
});

// POST /api/parking
parkingRouter.post("/", async (req, res) => {
  const parsed = insertParkingSlotSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
  const [row] = await db.insert(parkingSlotsTable).values(parsed.data).returning();
  res.status(201).json(row);
});

// PATCH /api/parking/:id
parkingRouter.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const partial = insertParkingSlotSchema.partial().safeParse(req.body);
  if (!partial.success) return res.status(400).json({ error: "Invalid data" });
  const [row] = await db.update(parkingSlotsTable).set(partial.data).where(eq(parkingSlotsTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

// DELETE /api/parking/:id
parkingRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(parkingSlotsTable).where(eq(parkingSlotsTable.id, id));
  res.json({ ok: true });
});
