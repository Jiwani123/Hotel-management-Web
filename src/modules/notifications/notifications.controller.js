import { ok, created } from "../../shared/apiResponse.js";
import { createNotification, listNotifications, markRead, markAllRead, deleteNotification } from "./notifications.service.js";
import { ROLES } from "../../constants/roles.js";

export async function create(req, res, next) {
  try {
    const doc = await createNotification({ ...req.validated.body, createdBy: req.user.sub });
    return created(res, doc, "Notification created");
  } catch (e) { return next(e); }
}

export async function list(req, res, next) {
  try {
    const isAdmin = req.user.role === ROLES.ADMIN;
    const userId = isAdmin && req.validated.query.userId ? req.validated.query.userId : req.user.sub;
    const result = await listNotifications({ ...req.validated.query, userId });
    return ok(res, result, "Notifications");
  } catch (e) { return next(e); }
}

export async function read(req, res, next) {
  try {
    const isAdmin = req.user.role === ROLES.ADMIN;
    const doc = await markRead(req.validated.params.id, { userId: req.user.sub, isAdmin });
    return ok(res, doc, "Notification read");
  } catch (e) { return next(e); }
}

export async function readAll(req, res, next) {
  try {
    const result = await markAllRead({ userId: req.user.sub, type: req.validated.body?.type });
    return ok(res, result, "Notifications read");
  } catch (e) { return next(e); }
}

export async function remove(req, res, next) {
  try {
    const isAdmin = req.user.role === ROLES.ADMIN;
    const result = await deleteNotification(req.validated.params.id, { userId: req.user.sub, isAdmin });
    return ok(res, result, "Notification deleted");
  } catch (e) { return next(e); }
}
