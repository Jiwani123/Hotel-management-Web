import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import User from "../models/User.js";
import { UnauthorizedError } from "../shared/errors.js";

export async function requireAuth(req, _res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) return next(new UnauthorizedError("Missing access token"));

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (payload.tokenType && payload.tokenType !== "access") {
      return next(new UnauthorizedError("Invalid access token"));
    }

    const user = await User.findById(payload.sub).select("_id name email role isActive");
    if (!user || !user.isActive) {
      return next(new UnauthorizedError("Account disabled"));
    }

    req.user = {
      sub: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name,
    };
    return next();
  } catch {
    return next(new UnauthorizedError("Invalid or expired access token"));
  }
}
