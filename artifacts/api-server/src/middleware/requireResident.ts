import type { Request, Response, NextFunction } from "express";

export function requireResident(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.residentId) {
    res.status(401).json({ error: "Not authenticated. Please log in to the resident portal." });
    return;
  }
  next();
}
