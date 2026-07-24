import { env } from "../config/env.js";
import { fail } from "../shared/apiResponse.js";
import { AppError } from "../shared/errors.js";

export function errorHandler(err, req, res, next) {
  const status = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || "Internal Server Error";
  const details = err.details || null;

  if (env.NODE_ENV !== "production") {
    // Avoid noisy stack traces for expected operational errors (e.g. 401/400 during auth).
    if (status >= 500) {
      // eslint-disable-next-line no-console
      console.error(err);
    } else {
      // eslint-disable-next-line no-console
      console.warn(`${status} ${err?.name ?? "Error"}: ${message}`);
    }
  }

  return fail(res, status, message, details);
}
