import "express-session";

declare module "express-session" {
  interface SessionData {
    residentId?: number;
    residentEmail?: string;
    residentName?: string;
    buildingId?: number;
    unitId?: number;
  }
}
