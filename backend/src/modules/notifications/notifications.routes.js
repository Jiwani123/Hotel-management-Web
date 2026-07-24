import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validate } from "../../middleware/validate.js";
import { ROLES } from "../../constants/roles.js";
import { listSchema, idParamSchema, createSchema, markAllSchema } from "./notifications.validation.js";
import { create, list, read, readAll, remove } from "./notifications.controller.js";

const router = Router();
router.use(requireAuth);

router.get("/", validate(listSchema), list);
router.post("/", requireRole(ROLES.ADMIN), validate(createSchema), create);
router.patch("/read-all", validate(markAllSchema), readAll);
router.patch("/:id/read", validate(idParamSchema), read);
router.delete("/:id", validate(idParamSchema), remove);

export default router;
