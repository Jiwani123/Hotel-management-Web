import Employee from "../../models/Employee.js";
import { escapeRegex } from "../../shared/search.js";

export async function createEmployee(data) {
  return Employee.create(data);
}

export async function listEmployees({ page = 1, limit = 20, q, role, isActive, select } = {}) {
  const filter = {};
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: rx }, { empNo: rx }];
  }
  if (role) filter.role = role;
  if (typeof isActive === "boolean") filter.isActive = isActive;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Employee.find(filter).select(select).sort("-createdAt").skip(skip).limit(limit),
    Employee.countDocuments(filter),
  ]);

  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getEmployee(id) {
  const doc = await Employee.findById(id);
  return doc;
}

export async function updateEmployee(id, data) {
  return Employee.findByIdAndUpdate(id, data, { new: true, runValidators: true });
}

export async function deleteEmployee(id) {
  return Employee.findByIdAndDelete(id);
}
