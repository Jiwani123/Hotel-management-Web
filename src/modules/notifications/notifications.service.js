import Notification from "../../models/Notification.js";
import { ForbiddenError, NotFoundError } from "../../shared/errors.js";

export async function createNotification(data) {
  return Notification.create(data);
}

export async function listNotifications({ page = 1, limit = 20, userId, type, isRead } = {}) {
  const filter = {};
  if (userId) filter.userId = userId;
  if (type) filter.type = type;
  if (typeof isRead === "boolean") filter.readAt = isRead ? { $ne: null } : null;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Notification.find(filter).sort("-createdAt").skip(skip).limit(limit),
    Notification.countDocuments(filter),
  ]);

  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function markRead(id, { userId, isAdmin }) {
  const doc = await Notification.findById(id);
  if (!doc) throw new NotFoundError("Notification not found");
  if (!isAdmin && doc.userId.toString() !== userId) throw new ForbiddenError("Not allowed");

  if (!doc.readAt) doc.readAt = new Date();
  await doc.save();
  return doc;
}

export async function markAllRead({ userId, type }) {
  const filter = { userId, readAt: null };
  if (type) filter.type = type;

  const res = await Notification.updateMany(filter, { $set: { readAt: new Date() } });
  return { updated: res.modifiedCount };
}

export async function deleteNotification(id, { userId, isAdmin }) {
  const doc = await Notification.findById(id);
  if (!doc) throw new NotFoundError("Notification not found");
  if (!isAdmin && doc.userId.toString() !== userId) throw new ForbiddenError("Not allowed");

  await doc.deleteOne();
  return { deleted: true };
}
