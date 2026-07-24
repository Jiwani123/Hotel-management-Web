import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validate } from "../../middleware/validate.js";
import { ROLES } from "../../constants/roles.js";
import { listSchema, idParamSchema, createSchema, updateSchema } from "./employees.validation.js";
import { create, list, getById, update, remove } from "./employees.controller.js";

const router = Router();
router.use(requireAuth);

// Allow staff roles to view employees for assignment dropdowns; write operations remain admin-only.
router.get(
	"/",
	requireRole(ROLES.ADMIN, ROLES.RECEPTION, ROLES.RESTAURANT_STAFF, ROLES.HOUSEKEEPING),
	validate(listSchema),
	list
);
router.post("/", requireRole(ROLES.ADMIN), validate(createSchema), create);
router.get("/:id", requireRole(ROLES.ADMIN), validate(idParamSchema), getById);
router.patch("/:id", requireRole(ROLES.ADMIN), validate(updateSchema), update);
router.delete("/:id", requireRole(ROLES.ADMIN), validate(idParamSchema), remove);

export default router;
