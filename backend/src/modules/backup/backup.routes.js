import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { ROLES } from "../../constants/roles.js";
import { exportBackup, restoreBackup } from "./backup.controller.js";

const router = Router();
router.use(requireAuth, requireRole(ROLES.ADMIN));

router.get("/export", exportBackup);
router.post("/restore", restoreBackup);

export default router;
