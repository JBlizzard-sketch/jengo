import { pgTable, serial, integer, date, numeric, boolean, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { buildingsTable } from "./buildings";
import { unitsTable } from "./units";

export const waterReadingsTable = pgTable("water_readings", {
  id: serial("id").primaryKey(),
  buildingId: integer("building_id").references(() => buildingsTable.id).notNull(),
  unitId: integer("unit_id").references(() => unitsTable.id).notNull(),
  readingDate: date("reading_date").notNull(),
  previousReading: numeric("previous_reading", { precision: 10, scale: 2 }).notNull().default("0"),
  currentReading: numeric("current_reading", { precision: 10, scale: 2 }).notNull(),
  consumption: numeric("consumption", { precision: 10, scale: 2 }).notNull(),
  unitRate: numeric("unit_rate", { precision: 10, scale: 2 }).notNull().default("120"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  billed: boolean("billed").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWaterReadingSchema = createInsertSchema(waterReadingsTable).omit({ id: true, createdAt: true });
export type InsertWaterReading = z.infer<typeof insertWaterReadingSchema>;
export type WaterReading = typeof waterReadingsTable.$inferSelect;
