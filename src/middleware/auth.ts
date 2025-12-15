import { Request, Response, NextFunction } from "express";

/**
 * Alleen toegankelijk als gebruiker is ingelogd
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.session.user) {
    return res.status(401).render("login", {
      error: "Gelieve eerst in te loggen"
    });
  }
  next();
}


/**
 * Alleen toegankelijk als gebruiker NIET is ingelogd
 */
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

/**
 * Alleen toegankelijk voor ADMIN
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.session.user) {
    return res.status(401).render("login", {
      error: "Gelieve eerst in te loggen",
    });
  }

  if (req.session.user.role !== "ADMIN") {
    return res.status(403).send("Geen toegang");
  }

  next();
}
