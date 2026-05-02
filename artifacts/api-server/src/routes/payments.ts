import { Router } from "express";
import { db } from "@workspace/db";
import { paymentsTable } from "@workspace/db";
import { eq, and, sum, count } from "drizzle-orm";
import {
  CreatePaymentBody, UpdatePaymentBody,
  ListPaymentsQueryParams, GetPaymentsSummaryQueryParams,
} from "@workspace/api-zod";

export const paymentsRouter = Router();

paymentsRouter.get("/summary", async (req, res) => {
  const query = GetPaymentsSummaryQueryParams.parse(req.query);
  const conditions = query.buildingId ? [eq(paymentsTable.buildingId, query.buildingId)] : [];
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const allPayments = where
    ? await db.select().from(paymentsTable).where(where)
    : await db.select().from(paymentsTable);

  const collected = allPayments.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const overdue = allPayments.filter(p => p.status === "overdue").reduce((s, p) => s + Number(p.amount), 0);
  const pending = allPayments.filter(p => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0);
  const total = collected + overdue + pending;

  res.json({
    totalCollected: collected,
    totalOutstanding: pending + overdue,
    totalOverdue: overdue,
    collectionRate: total > 0 ? Math.round((collected / total) * 100) : 0,
    overdueCount: allPayments.filter(p => p.status === "overdue").length,
    paidCount: allPayments.filter(p => p.status === "paid").length,
    pendingCount: allPayments.filter(p => p.status === "pending").length,
  });
});

paymentsRouter.get("/", async (req, res) => {
  const query = ListPaymentsQueryParams.parse(req.query);
  const conditions = [];
  if (query.buildingId) conditions.push(eq(paymentsTable.buildingId, query.buildingId));
  if (query.unitId) conditions.push(eq(paymentsTable.unitId, query.unitId));
  if (query.status) conditions.push(eq(paymentsTable.status, query.status as any));
  const payments = conditions.length > 0
    ? await db.select().from(paymentsTable).where(and(...conditions)).orderBy(paymentsTable.dueDate)
    : await db.select().from(paymentsTable).orderBy(paymentsTable.dueDate);
  res.json(payments.map(p => ({ ...p, amount: Number(p.amount), currency: p.currency ?? "KES" })));
});

paymentsRouter.post("/", async (req, res) => {
  const body = CreatePaymentBody.parse(req.body);
  const [payment] = await db.insert(paymentsTable).values({
    buildingId: body.buildingId,
    unitId: body.unitId,
    residentId: body.residentId ?? null,
    description: body.description,
    amount: body.amount.toString(),
    dueDate: body.dueDate,
    month: body.month ?? null,
    status: "pending",
  }).returning();
  res.status(201).json({ ...payment, amount: Number(payment.amount), currency: payment.currency ?? "KES" });
});

paymentsRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, id));
  if (!payment) return res.status(404).json({ message: "Not found" });
  res.json({ ...payment, amount: Number(payment.amount), currency: payment.currency ?? "KES" });
});

paymentsRouter.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = UpdatePaymentBody.parse(req.body);
  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.paidDate !== undefined) updates.paidDate = body.paidDate;
  if (body.paymentMethod !== undefined) updates.paymentMethod = body.paymentMethod;
  if (body.mpesaRef !== undefined) updates.mpesaRef = body.mpesaRef;
  const [payment] = await db.update(paymentsTable).set(updates).where(eq(paymentsTable.id, id)).returning();
  if (!payment) return res.status(404).json({ message: "Not found" });
  res.json({ ...payment, amount: Number(payment.amount), currency: payment.currency ?? "KES" });
});
