import { pgTable, serial, text, integer, date, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { buildingsTable } from "./buildings";
import { unitsTable } from "./units";
import { residentsTable } from "./residents";

export const visitorStatusEnum = pgEnum("visitor_status", [
  "pending", "approved", "checked_in", "checked_out", "denied"
]);

export const visitorsTable = pgTable("visitors", {
  id: serial("id").primaryKey(),
  buildingId: integer("building_id").references(() => buildingsTable.id).notNull(),
  unitId: integer("unit_id").references(() => unitsTable.id),
  residentId: integer("resident_id").references(() => residentsTable.id),
  visitorName: text("visitor_name").notNull(),
  visitorPhone: text("visitor_phone"),
  visitorIdNumber: text("visitor_id_number"),
  purpose: text("purpose"),
  expectedDate: date("expected_date").notNull(),
  expectedTime: text("expected_time"),
  status: visitorStatusEnum("status").notNull().default("pending"),
  checkInTime: timestamp("check_in_time"),
  checkOutTime: timestamp("check_out_time"),
  securityNote: text("security_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVisitorSchema = createInsertSchema(visitorsTable).omit({ id: true, createdAt: true });
export type InsertVisitor = z.infer<typeof insertVisitorSchema>;
export type Visitor = typeof visitorsTable.$inferSelect;
