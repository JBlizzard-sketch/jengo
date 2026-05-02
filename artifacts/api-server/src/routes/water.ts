import { Router } from "express";
import { db } from "@workspace/db";
import { waterReadingsTable } from "@workspace/db/schema";
import { unitsTable } from "@workspace/db/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

export const waterRouter = Router();

// GET /api/water?buildingId=&month=YYYY-MM
waterRouter.get("/", async (req, res) => {
  const buildingId = Number(req.query.buildingId) || undefined;
  const month = req.query.month as string | undefined; // e.g. "2025-05"

  const conditions: any[] = [];
  if (buildingId) conditions.push(eq(waterReadingsTable.buildingId, buildingId));
  if (month) {
    const start = `${month}-01`;
    const end = `${month}-31`;
    conditions.push(gte(waterReadingsTable.readingDate, start));
    conditions.push(lte(waterReadingsTable.readingDate, end));
  }

  const rows = await db
    .select({
      id: waterReadingsTable.id,
      buildingId: waterReadingsTable.buildingId,
      unitId: waterReadingsTable.unitId,
      unitNumber: unitsTable.unitNumber,
      floor: unitsTable.floor,
      readingDate: waterReadingsTable.readingDate,
      previousReading: waterReadingsTable.previousReading,
      currentReading: waterReadingsTable.currentReading,
      consumption: waterReadingsTable.consumption,
      unitRate: waterReadingsTable.unitRate,
      amount: waterReadingsTable.amount,
      billed: waterReadingsTable.billed,
      notes: waterReadingsTable.notes,
      createdAt: waterReadingsTable.createdAt,
    })
    .from(waterReadingsTable)
    .leftJoin(unitsTable, eq(waterReadingsTable.unitId, unitsTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(unitsTable.unitNumber);

  res.json(rows);
});

// GET /api/water/previous?buildingId=&before=YYYY-MM — latest reading per unit for auto-fill
waterRouter.get("/previous", async (req, res) => {
  const buildingId = Number(req.query.buildingId);
  const before = req.query.before as string | undefined; // e.g. "2025-05"

  if (!buildingId) return res.status(400).json({ error: "buildingId required" });

  // Get latest reading per unit for this building, optionally before a given month
  const beforeDate = before ? `${before}-01` : new Date().toISOString().split("T")[0];

  const rows = await db
    .select({
      unitId: waterReadingsTable.unitId,
      currentReading: waterReadingsTable.currentReading,
      readingDate: waterReadingsTable.readingDate,
    })
    .from(waterReadingsTable)
    .where(
      and(
        eq(waterReadingsTable.buildingId, buildingId),
        lte(waterReadingsTable.readingDate, beforeDate)
      )
    )
    .orderBy(desc(waterReadingsTable.readingDate));

  // Deduplicate — keep latest per unit
  const map: Record<number, (typeof rows)[0]> = {};
  for (const row of rows) {
    if (!map[row.unitId]) map[row.unitId] = row;
  }

  res.json(Object.values(map));
});

// POST /api/water — single reading
waterRouter.post("/", async (req, res) => {
  const { buildingId, unitId, readingDate, previousReading, currentReading, unitRate, notes } = req.body;
  if (!buildingId || !unitId || !readingDate || currentReading == null) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const prev = Number(previousReading ?? 0);
  const curr = Number(currentReading);
  const rate = Number(unitRate ?? 120);
  const consumption = Math.max(0, curr - prev);
  const amount = consumption * rate;

  const [row] = await db.insert(waterReadingsTable).values({
    buildingId: Number(buildingId),
    unitId: Number(unitId),
    readingDate,
    previousReading: String(prev),
    currentReading: String(curr),
    consumption: String(consumption),
    unitRate: String(rate),
    amount: String(amount),
    notes: notes ?? null,
    billed: false,
  }).returning();

  res.status(201).json(row);
});

// POST /api/water/bulk — record multiple readings at once
waterRouter.post("/bulk", async (req, res) => {
  const { readings } = req.body as { readings: any[] };
  if (!Array.isArray(readings) || readings.length === 0) {
    return res.status(400).json({ error: "readings array required" });
  }

  const values = readings.map(r => {
    const prev = Number(r.previousReading ?? 0);
    const curr = Number(r.currentReading);
    const rate = Number(r.unitRate ?? 120);
    const consumption = Math.max(0, curr - prev);
    return {
      buildingId: Number(r.buildingId),
      unitId: Number(r.unitId),
      readingDate: r.readingDate,
      previousReading: String(prev),
      currentReading: String(curr),
      consumption: String(consumption),
      unitRate: String(rate),
      amount: String(consumption * rate),
      notes: r.notes ?? null,
      billed: false,
    };
  });

  const rows = await db.insert(waterReadingsTable).values(values).returning();
  res.status(201).json(rows);
});

// PATCH /api/water/:id
waterRouter.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { currentReading, previousReading, unitRate, readingDate, notes, billed } = req.body;

  const updates: any = {};
  if (readingDate !== undefined) updates.readingDate = readingDate;
  if (notes !== undefined) updates.notes = notes;
  if (billed !== undefined) updates.billed = billed;

  if (currentReading !== undefined || previousReading !== undefined) {
    const [existing] = await db.select().from(waterReadingsTable).where(eq(waterReadingsTable.id, id));
    const prev = Number(previousReading ?? existing?.previousReading ?? 0);
    const curr = Number(currentReading ?? existing?.currentReading ?? 0);
    const rate = Number(unitRate ?? existing?.unitRate ?? 120);
    const consumption = Math.max(0, curr - prev);
    updates.previousReading = String(prev);
    updates.currentReading = String(curr);
    updates.consumption = String(consumption);
    updates.unitRate = String(rate);
    updates.amount = String(consumption * rate);
  }

  const [row] = await db
    .update(waterReadingsTable)
    .set(updates)
    .where(eq(waterReadingsTable.id, id))
    .returning();

  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

// DELETE /api/water/:id
waterRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(waterReadingsTable).where(eq(waterReadingsTable.id, id));
  res.json({ ok: true });
});
