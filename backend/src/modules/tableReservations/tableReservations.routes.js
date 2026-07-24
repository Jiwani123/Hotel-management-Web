import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validate } from "../../middleware/validate.js";
import { ROLES } from "../../constants/roles.js";
import { listSchema, idParamSchema, createSchema, updateSchema } from "./tableReservations.validation.js";
import { create, list, getById, update, approve, reject, remove } from "./tableReservations.controller.js";

const router = Router();
router.use(requireAuth);

router.get("/", requireRole(ROLES.ADMIN, ROLES.RESTAURANT_STAFF, ROLES.CUSTOMER), validate(listSchema), list);
router.post("/", requireRole(ROLES.ADMIN, ROLES.RESTAURANT_STAFF, ROLES.CUSTOMER), validate(createSchema), create);
router.get("/:id", requireRole(ROLES.ADMIN, ROLES.RESTAURANT_STAFF, ROLES.CUSTOMER), validate(idParamSchema), getById);
router.patch("/:id", requireRole(ROLES.ADMIN, ROLES.RESTAURANT_STAFF, ROLES.CUSTOMER), validate(updateSchema), update);
router.post("/:id/approve", requireRole(ROLES.ADMIN, ROLES.RESTAURANT_STAFF), validate(idParamSchema), approve);
router.post("/:id/reject", requireRole(ROLES.ADMIN, ROLES.RESTAURANT_STAFF), validate(idParamSchema), reject);
router.delete("/:id", requireRole(ROLES.ADMIN, ROLES.CUSTOMER), validate(idParamSchema), remove);

export default router;
