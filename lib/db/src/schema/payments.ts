import { pgTable, serial, text, integer, numeric, date, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { buildingsTable } from "./buildings";
import { unitsTable } from "./units";
import { residentsTable } from "./residents";

export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "overdue", "waived"]);
export const paymentMethodEnum = pgEnum("payment_method", ["mpesa", "bank_transfer", "cash", "other"]);

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  buildingId: integer("building_id").references(() => buildingsTable.id).notNull(),
  unitId: integer("unit_id").references(() => unitsTable.id).notNull(),
  residentId: integer("resident_id").references(() => residentsTable.id),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("KES"),
  dueDate: date("due_date").notNull(),
  paidDate: date("paid_date"),
  status: paymentStatusEnum("status").notNull().default("pending"),
  paymentMethod: paymentMethodEnum("payment_method"),
  mpesaRef: text("mpesa_ref"),
  month: text("month"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
