import { fail } from "../shared/apiResponse.js";

export function notFound(req, res) {
  return fail(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
}
