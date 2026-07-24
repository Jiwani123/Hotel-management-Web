import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validate } from "../../middleware/validate.js";
import { ROLES } from "../../constants/roles.js";
import { listSchema, idParamSchema, createSchema, updateSchema } from "./feedback.validation.js";
import { create, list, getById, update, remove } from "./feedback.controller.js";

const router = Router();
router.use(requireAuth);

router.get("/", requireRole(ROLES.ADMIN), validate(listSchema), list);
router.post("/", requireRole(ROLES.ADMIN, ROLES.RECEPTION, ROLES.CUSTOMER), validate(createSchema), create);
router.get("/:id", requireRole(ROLES.ADMIN), validate(idParamSchema), getById);
router.patch("/:id", requireRole(ROLES.ADMIN), validate(updateSchema), update);
router.delete("/:id", requireRole(ROLES.ADMIN), validate(idParamSchema), remove);

export default router;
