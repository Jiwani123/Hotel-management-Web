import Feedback from "../../models/Feedback.js";
import mongoose from "mongoose";
import { escapeRegex } from "../../shared/search.js";

export async function createFeedback(data) {
  return Feedback.create(data);
}

export async function listFeedback({ page=1, limit=20, rating, from, to, q } = {}) {
  const filter = {};
  if (rating) filter.rating = rating;
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    const or = [
      { customerName: rx },
      { comment: rx },
    ];
    if (mongoose.isValidObjectId(q)) or.push({ bookingId: q });
    filter.$or = or;
  }
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Feedback.find(filter).sort("-createdAt").skip(skip).limit(limit),
    Feedback.countDocuments(filter),
  ]);
  return { items, total, page, limit, pages: Math.ceil(total/limit) };
}

export async function getFeedback(id) {
  return Feedback.findById(id);
}

export async function updateFeedback(id, data) {
  return Feedback.findByIdAndUpdate(id, data, { new: true, runValidators: true });
}

export async function deleteFeedback(id) {
  return Feedback.findByIdAndDelete(id);
}
