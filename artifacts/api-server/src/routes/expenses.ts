import { Router } from "express";
import { db } from "@workspace/db";
import { expensesTable, insertExpenseSchema } from "@workspace/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { z } from "zod";

export const expensesRouter = Router();

// GET /api/expenses?buildingId=&month=
expensesRouter.get("/", async (req, res) => {
  const buildingId = Number(req.query.buildingId);
  const month = req.query.month as string | undefined;

  const conditions = [];
  if (buildingId) conditions.push(eq(expensesTable.buildingId, buildingId));
  if (month && month !== "all") {
    const [y, m] = month.split("-").map(Number);
    const start = `${y}-${String(m).padStart(2, "0")}-01`;
    const end = new Date(y, m, 0).toISOString().split("T")[0];
    conditions.push(gte(expensesTable.date, start));
    conditions.push(lte(expensesTable.date, end));
  }

  const rows = await db
    .select()
    .from(expensesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(expensesTable.date));

  res.json(rows);
});

// POST /api/expenses
expensesRouter.post("/", async (req, res) => {
  const parsed = insertExpenseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
  const [row] = await db.insert(expensesTable).values(parsed.data).returning();
  res.status(201).json(row);
});

// PATCH /api/expenses/:id
expensesRouter.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const partial = insertExpenseSchema.partial().safeParse(req.body);
  if (!partial.success) return res.status(400).json({ error: "Invalid data" });
  const [row] = await db.update(expensesTable).set(partial.data).where(eq(expensesTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

// DELETE /api/expenses/:id
expensesRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(expensesTable).where(eq(expensesTable.id, id));
  res.json({ ok: true });
});
