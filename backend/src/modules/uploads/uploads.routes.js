import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { ROLES } from "../../constants/roles.js";
import { uploadImages } from "./uploads.multer.js";
import { uploadImagesController } from "./uploads.controller.js";
import { BadRequestError } from "../../shared/errors.js";

const router = Router();
router.use(requireAuth);

// Admin-only upload endpoint (keeps media management controlled)
router.post(
  "/images",
  requireRole(ROLES.ADMIN),
  (req, res, next) => {
    uploadImages(req, res, (err) => {
      if (!err) return next();
      if (err instanceof multer.MulterError) {
        return next(new BadRequestError(err.message));
      }
      return next(err);
    });
  },
  uploadImagesController
);

export default router;
