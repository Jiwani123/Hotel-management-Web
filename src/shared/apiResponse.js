export function ok(res, data = null, message = "Success") {
  return res.status(200).json({ success: true, message, data });
}

export function created(res, data = null, message = "Created") {
  return res.status(201).json({ success: true, message, data });
}

export function fail(res, statusCode, message, details = null) {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
  });
}
