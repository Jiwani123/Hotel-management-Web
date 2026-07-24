function sanitizeObject(obj) {
  if (!obj || typeof obj !== "object") return;

  for (const key of Object.keys(obj)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete obj[key];
      continue;
    }

    const value = obj[key];
    if (Array.isArray(value)) {
      value.forEach((item) => sanitizeObject(item));
    } else if (value && typeof value === "object") {
      sanitizeObject(value);
    }
  }
}

export function sanitizeRequest(req, _res, next) {
  sanitizeObject(req.body);
  sanitizeObject(req.params);
  sanitizeObject(req.query);
  next();
}
