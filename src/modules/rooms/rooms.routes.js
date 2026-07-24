import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validate } from "../../middleware/validate.js";
import { ROLES } from "../../constants/roles.js";
import { listSchema, idParamSchema, createSchema, updateSchema, availabilitySchema } from "./rooms.validation.js";
import { create, list, getById, update, remove, availability } from "./rooms.controller.js";

const router = Router();
router.use(requireAuth);

// reception + admin can view
router.get("/", requireRole(ROLES.ADMIN, ROLES.RECEPTION, ROLES.HOUSEKEEPING), validate(listSchema), list);
router.get("/availability", requireRole(ROLES.ADMIN, ROLES.RECEPTION), validate(availabilitySchema), availability);
router.get("/:id", requireRole(ROLES.ADMIN, ROLES.RECEPTION, ROLES.HOUSEKEEPING), validate(idParamSchema), getById);

// admin manage rooms
router.post("/", requireRole(ROLES.ADMIN), validate(createSchema), create);
router.patch("/:id", requireRole(ROLES.ADMIN), validate(updateSchema), update);
router.delete("/:id", requireRole(ROLES.ADMIN), validate(idParamSchema), remove);

export default router;
