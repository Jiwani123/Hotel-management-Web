import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validate } from "../../middleware/validate.js";
import { ROLES } from "../../constants/roles.js";
import { listSchema, idParamSchema, createSchema, updateSchema, statusSchema } from "./bookings.validation.js";
import { create, list, getById, update, cancel, checkIn, checkOut, approve, reject, remove } from "./bookings.controller.js";

const router = Router();
router.use(requireAuth);

router.get("/", requireRole(ROLES.ADMIN, ROLES.RECEPTION, ROLES.CUSTOMER), validate(listSchema), list);
router.post("/", requireRole(ROLES.ADMIN, ROLES.RECEPTION, ROLES.CUSTOMER), validate(createSchema), create);

router.get("/:id", requireRole(ROLES.ADMIN, ROLES.RECEPTION, ROLES.CUSTOMER), validate(idParamSchema), getById);
router.patch("/:id", requireRole(ROLES.ADMIN, ROLES.RECEPTION, ROLES.CUSTOMER), validate(updateSchema), update);

router.post("/:id/approve", requireRole(ROLES.ADMIN, ROLES.RECEPTION), validate(statusSchema), approve);
router.post("/:id/reject", requireRole(ROLES.ADMIN, ROLES.RECEPTION), validate(statusSchema), reject);

router.post("/:id/cancel", requireRole(ROLES.ADMIN, ROLES.RECEPTION, ROLES.CUSTOMER), validate(statusSchema), cancel);
router.post("/:id/check-in", requireRole(ROLES.ADMIN, ROLES.RECEPTION), validate(statusSchema), checkIn);
router.post("/:id/check-out", requireRole(ROLES.ADMIN, ROLES.RECEPTION), validate(statusSchema), checkOut);

router.delete("/:id", requireRole(ROLES.ADMIN, ROLES.CUSTOMER), validate(idParamSchema), remove);

export default router;
