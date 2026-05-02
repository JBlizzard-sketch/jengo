import { pgTable, serial, text, integer, numeric, date, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { buildingsTable } from "./buildings";

export const expenseCategoryEnum = pgEnum("expense_category", [
  "utilities", "repairs", "security", "cleaning", "staff", "admin", "insurance", "other",
]);

export const expensePaymentMethodEnum = pgEnum("expense_payment_method", [
  "mpesa", "cash", "bank_transfer", "other",
]);

export const expensesTable = pgTable("expenses", {
  id: serial("id").primaryKey(),
  buildingId: integer("building_id").references(() => buildingsTable.id).notNull(),
  category: expenseCategoryEnum("category").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  date: date("date").notNull(),
  vendor: text("vendor"),
  receiptRef: text("receipt_ref"),
  paymentMethod: expensePaymentMethodEnum("payment_method"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertExpenseSchema = createInsertSchema(expensesTable).omit({ id: true, createdAt: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expensesTable.$inferSelect;
