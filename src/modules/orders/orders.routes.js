import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validate } from "../../middleware/validate.js";
import { ROLES } from "../../constants/roles.js";
import { listSchema, idParamSchema, createSchema, updateStatusSchema } from "./orders.validation.js";
import { create, list, getById, setStatus, remove } from "./orders.controller.js";

const router = Router();
router.use(requireAuth);

router.get(
	"/",
	requireRole(ROLES.ADMIN, ROLES.RESTAURANT_STAFF, ROLES.RECEPTION, ROLES.CUSTOMER),
	validate(listSchema),
	list
);
router.post("/", requireRole(ROLES.ADMIN, ROLES.RESTAURANT_STAFF, ROLES.CUSTOMER), validate(createSchema), create);
router.get(
	"/:id",
	requireRole(ROLES.ADMIN, ROLES.RESTAURANT_STAFF, ROLES.RECEPTION, ROLES.CUSTOMER),
	validate(idParamSchema),
	getById
);
router.patch("/:id/status", requireRole(ROLES.ADMIN, ROLES.RESTAURANT_STAFF), validate(updateStatusSchema), setStatus);
router.delete("/:id", requireRole(ROLES.ADMIN), validate(idParamSchema), remove);

export default router;
