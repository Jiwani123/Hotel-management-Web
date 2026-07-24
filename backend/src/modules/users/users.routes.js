import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validate } from "../../middleware/validate.js";
import { ROLES } from "../../constants/roles.js";
import { listSchema, idParamSchema, updateSchema, updateMeSchema } from "./users.validation.js";
import { list, getById, me, update, updateSelf } from "./users.controller.js";

const router = Router();
router.use(requireAuth);

router.get("/me", me);
router.patch("/me", validate(updateMeSchema), updateSelf);

router.get("/", requireRole(ROLES.ADMIN), validate(listSchema), list);
router.get("/:id", requireRole(ROLES.ADMIN), validate(idParamSchema), getById);
router.patch("/:id", requireRole(ROLES.ADMIN), validate(updateSchema), update);

export default router;
