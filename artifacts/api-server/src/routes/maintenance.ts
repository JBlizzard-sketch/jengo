import { Router } from "express";
import { db } from "@workspace/db";
import { maintenanceScheduleTable, insertMaintenanceScheduleSchema } from "@workspace/db/schema";
import { eq, and, lte, desc } from "drizzle-orm";
import { z } from "zod";

export const maintenanceRouter = Router();

function addFrequencyDays(date: Date, frequency: string): Date {
  const d = new Date(date);
  switch (frequency) {
    case "weekly":    d.setDate(d.getDate() + 7); break;
    case "monthly":   d.setMonth(d.getMonth() + 1); break;
    case "quarterly": d.setMonth(d.getMonth() + 3); break;
    case "biannual":  d.setMonth(d.getMonth() + 6); break;
    case "annual":    d.setFullYear(d.getFullYear() + 1); break;
    default: break;
  }
  return d;
}

// GET /api/maintenance?buildingId=&status=
maintenanceRouter.get("/", async (req, res) => {
  const buildingId = Number(req.query.buildingId);
  const status = req.query.status as string | undefined;

  // Auto-mark overdue tasks first
  const today = new Date().toISOString().split("T")[0];
  await db
    .update(maintenanceScheduleTable)
    .set({ status: "overdue" })
    .where(
      and(
        lte(maintenanceScheduleTable.nextDueDate, today),
        eq(maintenanceScheduleTable.status, "pending")
      )
    );

  const conditions = [];
  if (buildingId) conditions.push(eq(maintenanceScheduleTable.buildingId, buildingId));
  if (status && status !== "all") conditions.push(eq(maintenanceScheduleTable.status, status as any));

  const rows = await db
    .select()
    .from(maintenanceScheduleTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(maintenanceScheduleTable.nextDueDate);

  res.json(rows);
});

// POST /api/maintenance
maintenanceRouter.post("/", async (req, res) => {
  const parsed = insertMaintenanceScheduleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
  const [row] = await db.insert(maintenanceScheduleTable).values(parsed.data).returning();
  res.status(201).json(row);
});

// POST /api/maintenance/:id/complete — mark done, compute next due date
maintenanceRouter.post("/:id/complete", async (req, res) => {
  const id = Number(req.params.id);
  const { completionNotes, completionDate } = req.body;
  const [existing] = await db.select().from(maintenanceScheduleTable).where(eq(maintenanceScheduleTable.id, id));
  if (!existing) return res.status(404).json({ error: "Not found" });

  const doneDate = completionDate ?? new Date().toISOString().split("T")[0];
  let nextDue: string | null = null;
  if (existing.frequency !== "one_time") {
    nextDue = addFrequencyDays(new Date(doneDate), existing.frequency).toISOString().split("T")[0];
  }

  const [row] = await db
    .update(maintenanceScheduleTable)
    .set({
      status: "done",
      lastDoneDate: doneDate,
      nextDueDate: nextDue ?? existing.nextDueDate,
      completionNotes: completionNotes ?? null,
    })
    .where(eq(maintenanceScheduleTable.id, id))
    .returning();

  // If recurring, create the next pending task
  if (nextDue && existing.frequency !== "one_time") {
    await db.insert(maintenanceScheduleTable).values({
      buildingId: existing.buildingId,
      title: existing.title,
      description: existing.description,
      category: existing.category,
      frequency: existing.frequency,
      nextDueDate: nextDue,
      assignedTo: existing.assignedTo,
      status: "pending",
    });
  }

  res.json(row);
});

// PATCH /api/maintenance/:id
maintenanceRouter.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const partial = insertMaintenanceScheduleSchema.partial().safeParse(req.body);
  if (!partial.success) return res.status(400).json({ error: "Invalid data" });
  const [row] = await db
    .update(maintenanceScheduleTable)
    .set(partial.data)
    .where(eq(maintenanceScheduleTable.id, id))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

// DELETE /api/maintenance/:id
maintenanceRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(maintenanceScheduleTable).where(eq(maintenanceScheduleTable.id, id));
  res.json({ ok: true });
});
