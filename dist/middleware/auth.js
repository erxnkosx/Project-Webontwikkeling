"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireGuest = requireGuest;
exports.requireAdmin = requireAdmin;
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.redirect("/login?auth=required");
    }
    next();
}
function requireGuest(req, res, next) {
    if (req.session.user) {
        return res.redirect("/dashboard");
    }
    next();
}
function requireAdmin(req, res, next) {
    if (!req.session.user) {
        return res.redirect("/login?auth=required");
    }
    if (req.session.user.role !== "ADMIN") {
        return res.status(403).send("Geen toegang");
    }
    next();
}
