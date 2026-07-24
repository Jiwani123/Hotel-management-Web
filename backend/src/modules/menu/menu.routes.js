import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validate } from "../../middleware/validate.js";
import { ROLES } from "../../constants/roles.js";
import { listSchema, idParamSchema, createSchema, updateSchema } from "./menu.validation.js";
import { create, list, getById, update, remove } from "./menu.controller.js";

const router = Router();
router.use(requireAuth);

router.get("/", requireRole(ROLES.ADMIN, ROLES.RESTAURANT_STAFF, ROLES.RECEPTION), validate(listSchema), list);
router.post("/", requireRole(ROLES.ADMIN, ROLES.RESTAURANT_STAFF), validate(createSchema), create);
router.get("/:id", requireRole(ROLES.ADMIN, ROLES.RESTAURANT_STAFF), validate(idParamSchema), getById);
router.patch("/:id", requireRole(ROLES.ADMIN, ROLES.RESTAURANT_STAFF), validate(updateSchema), update);
router.delete("/:id", requireRole(ROLES.ADMIN), validate(idParamSchema), remove);

export default router;
