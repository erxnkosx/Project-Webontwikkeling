import { Request, Response, NextFunction } from "express";

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.session.user) {
    return res.redirect("/login?auth=required");
  }
  next();
}

export function requireGuest(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }
  next();
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.session.user) {
    return res.redirect("/login?auth=required");

  }

  if (req.session.user.role !== "ADMIN") {
    return res.status(403).send("Geen toegang");
  }

  next();
}
