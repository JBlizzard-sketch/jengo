import { pgTable, serial, text, integer, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { buildingsTable } from "./buildings";

export const unitStatusEnum = pgEnum("unit_status", ["occupied", "vacant", "maintenance"]);

export const unitsTable = pgTable("units", {
  id: serial("id").primaryKey(),
  buildingId: integer("building_id").references(() => buildingsTable.id).notNull(),
  unitNumber: text("unit_number").notNull(),
  floor: integer("floor"),
  bedrooms: integer("bedrooms"),
  status: unitStatusEnum("status").notNull().default("vacant"),
  monthlyRent: numeric("monthly_rent", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUnitSchema = createInsertSchema(unitsTable).omit({ id: true, createdAt: true });
export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type Unit = typeof unitsTable.$inferSelect;
