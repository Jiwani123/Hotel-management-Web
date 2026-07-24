import { ok } from "../../shared/apiResponse.js";
import { BadRequestError } from "../../shared/errors.js";
import fs from "fs/promises";
import { env } from "../../config/env.js";
import { cloudinary, cloudinaryEnabled } from "../../config/cloudinary.js";

export async function uploadImagesController(req, res, next) {
  try {
    const files = req.files ?? [];
    if (!Array.isArray(files) || files.length === 0) {
      throw new BadRequestError("No images provided");
    }

    const items = [];
    let cloudinaryCount = 0;
    let localCount = 0;

    for (const f of files) {
      if (cloudinaryEnabled) {
        try {
          const result = await cloudinary.uploader.upload(f.path, {
            folder: env.CLOUDINARY_FOLDER,
            resource_type: "image",
            timeout: 20000,
          });

          try {
            await fs.unlink(f.path);
          } catch {
            // ignore cleanup errors
          }

          cloudinaryCount += 1;
          items.push({
            url: result.secure_url,
            publicId: result.public_id,
            filename: f.filename,
            mimetype: f.mimetype,
            size: f.size,
          });
          continue;
        } catch (cloudErr) {
          // Cloudinary failed for this file — fall back to local for this file only
          console.warn(
            "Cloudinary upload failed for file, falling back to local storage:",
            f?.filename,
            cloudErr?.message ?? cloudErr
          );
        }
      }

      localCount += 1;
      items.push({
        url: `/uploads/images/${f.filename}`,
        filename: f.filename,
        mimetype: f.mimetype,
        size: f.size,
      });
    }

    const msg = cloudinaryCount > 0 && localCount > 0 ? "Uploaded (partial Cloudinary)" : "Uploaded";
    return ok(res, { items }, msg);
  } catch (e) {
    return next(e);
  }
}
