import { BadRequestError } from "../shared/errors.js";
import { env } from "../config/env.js";

export function validate(schema) {
  return (req, _res, next) => {
    const parsed = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!parsed.success) {
      const issues = parsed.error.issues ?? [];
      const first = issues[0];
      const rawFirstPath = first?.path?.length ? first.path.join(".") : "";
      const firstPath = rawFirstPath.replace(/^(body|query|params)\./, "");
      const firstMessage = first?.message ? String(first.message) : "Invalid request";
      const topMessage = firstPath ? `${firstPath}: ${firstMessage}` : firstMessage;

      if (env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error("Request validation failed", {
          method: req.method,
          url: req.originalUrl,
          issues: issues.map((i) => ({ path: i.path.join("."), message: i.message })),
          bodyType: typeof req.body,
        });
      }

      const flat = parsed.error.flatten();
      return next(
        new BadRequestError(
          topMessage,
          {
            ...flat,
            issues: issues.map((i) => ({ path: i.path, message: i.message })),
          }
        )
      );
    }

    req.validated = parsed.data;
    return next();
  };
}
