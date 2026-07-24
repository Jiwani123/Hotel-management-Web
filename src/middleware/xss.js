import xss from "xss";

const DEFAULT_SKIP_KEYS = [
  "password",
  "confirm",
  "refreshToken",
  "accessToken",
  "token",
];

function shouldSkipKey(key) {
  if (!key) return false;
  const s = String(key).toLowerCase();
  if (DEFAULT_SKIP_KEYS.includes(s)) return true;
  if (s.includes("password")) return true;
  if (s.includes("token")) return true;
  return false;
}

function sanitizeString(value) {
  return xss(value, {
    whiteList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: ["script"],
  });
}

function sanitizeAny(input, keyHint) {
  if (input == null) return input;

  if (typeof input === "string") {
    if (shouldSkipKey(keyHint)) return input;
    return sanitizeString(input);
  }

  if (Array.isArray(input)) {
    for (let i = 0; i < input.length; i += 1) {
      input[i] = sanitizeAny(input[i], keyHint);
    }
    return input;
  }

  if (typeof input === "object") {
    for (const [key, val] of Object.entries(input)) {
      if (shouldSkipKey(key)) continue;
      input[key] = sanitizeAny(val, key);
    }
    return input;
  }

  return input;
}

export function xssSanitizeRequest(req, _res, next) {
  // Mutate nested values but never overwrite req.query/req.params objects themselves.
  sanitizeAny(req.body);
  sanitizeAny(req.query);
  sanitizeAny(req.params);
  next();
}
