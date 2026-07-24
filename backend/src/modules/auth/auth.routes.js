import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { ROLES } from "../../constants/roles.js";
import {
  bootstrapAdminController,
  createUserController,
  loginController,
  refreshController,
  logoutController,
  meController,
  registerController,
} from "./auth.controller.js";
import { loginSchema, bootstrapAdminSchema, createUserSchema, registerSchema } from "./auth.validation.js";
import rateLimit from "express-rate-limit";

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.post("/bootstrap-admin", authLimiter, validate(bootstrapAdminSchema), bootstrapAdminController);
router.post("/login", authLimiter, validate(loginSchema), loginController);
router.post("/register", authLimiter, validate(registerSchema), registerController);
router.post("/refresh", authLimiter, refreshController);
router.post("/logout", logoutController);

router.get("/me", requireAuth, meController);

// admin-only user creation
router.post("/users", requireAuth, requireRole(ROLES.ADMIN), validate(createUserSchema), createUserController);

export default router;
