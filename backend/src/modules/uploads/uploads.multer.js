import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { BadRequestError } from "../../shared/errors.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// backend/uploads/images
const imagesDir = path.join(__dirname, "..", "..", "..", "uploads", "images");
fs.mkdirSync(imagesDir, { recursive: true });

const allowedExt = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, imagesDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = allowedExt.has(ext) ? ext : ".bin";
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
    cb(null, name);
  },
});

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!file.mimetype?.startsWith("image/") || !allowedExt.has(ext)) {
    cb(new BadRequestError("Only image files are allowed"));
    return;
  }
  cb(null, true);
}

export const uploadImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10,
  },
}).array("images", 10);
