import bcrypt from "bcrypt";
import User from "../../models/User.js";
import { BadRequestError, NotFoundError } from "../../shared/errors.js";
import { escapeRegex } from "../../shared/search.js";

export async function listUsers({ page = 1, limit = 20, q, role, isActive } = {}) {
  const filter = {};
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: rx }, { email: rx }];
  }
  if (role) filter.role = role;
  if (typeof isActive === "boolean") filter.isActive = isActive;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    User.find(filter).select("-passwordHash").sort("-createdAt").skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getUser(id) {
  const user = await User.findById(id).select("-passwordHash");
  if (!user) throw new NotFoundError("User not found");
  return user;
}

export async function getMe(userId) {
  const user = await User.findById(userId).select("-passwordHash");
  if (!user) throw new NotFoundError("User not found");
  return user;
}

export async function updateUser(id, data) {
  const patch = { ...data };

  if (patch.email) {
    const exists = await User.findOne({ email: patch.email, _id: { $ne: id } });
    if (exists) throw new BadRequestError("Email already exists");
  }

  if (patch.password) {
    patch.passwordHash = await bcrypt.hash(patch.password, 12);
    delete patch.password;
  }

  const user = await User.findByIdAndUpdate(id, patch, { new: true, runValidators: true }).select("-passwordHash");
  if (!user) throw new NotFoundError("User not found");
  return user;
}

export async function updateMe(userId, data) {
  const patch = { ...data };

  if (patch.email) {
    const exists = await User.findOne({ email: patch.email, _id: { $ne: userId } });
    if (exists) throw new BadRequestError("Email already exists");
  }

  if (patch.password) {
    patch.passwordHash = await bcrypt.hash(patch.password, 12);
    delete patch.password;
  }

  const user = await User.findByIdAndUpdate(userId, patch, { new: true, runValidators: true }).select("-passwordHash");
  if (!user) throw new NotFoundError("User not found");
  return user;
}
