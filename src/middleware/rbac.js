import { ForbiddenError } from "../shared/errors.js";

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user?.role) return next(new ForbiddenError("Missing role"));
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError("Insufficient permissions"));
    }
    return next();
  };
}
