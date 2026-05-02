import { pgTable, serial, text, integer, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { buildingsTable } from "./buildings";
import { unitsTable } from "./units";

export const parkingTypeEnum = pgEnum("parking_type", [
  "covered", "open", "basement", "other",
]);

export const parkingStatusEnum = pgEnum("parking_status", [
  "free", "occupied", "reserved", "maintenance",
]);

export const parkingSlotsTable = pgTable("parking_slots", {
  id: serial("id").primaryKey(),
  buildingId: integer("building_id").references(() => buildingsTable.id).notNull(),
  slotNumber: text("slot_number").notNull(),
  type: parkingTypeEnum("type").notNull().default("open"),
  status: parkingStatusEnum("status").notNull().default("free"),
  unitId: integer("unit_id").references(() => unitsTable.id),
  vehicleReg: text("vehicle_reg"),
  monthlyRate: numeric("monthly_rate", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertParkingSlotSchema = createInsertSchema(parkingSlotsTable).omit({ id: true, createdAt: true });
export type InsertParkingSlot = z.infer<typeof insertParkingSlotSchema>;
export type ParkingSlot = typeof parkingSlotsTable.$inferSelect;
