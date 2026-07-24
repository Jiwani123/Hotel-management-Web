import { NotFoundError } from "./errors.js";

export function makeCrudService(Model, { populate = "" } = {}) {
  return {
    async create(data) {
      const doc = await Model.create(data);
      return populate ? doc.populate(populate) : doc;
    },
    async list({ filter = {}, sort = "-createdAt", page = 1, limit = 20 } = {}) {
      const skip = (page - 1) * limit;
      const [items, total] = await Promise.all([
        Model.find(filter).sort(sort).skip(skip).limit(limit).populate(populate),
        Model.countDocuments(filter),
      ]);
      return { items, total, page, limit, pages: Math.ceil(total / limit) };
    },
    async getById(id) {
      const doc = await Model.findById(id).populate(populate);
      if (!doc) throw new NotFoundError("Resource not found");
      return doc;
    },
    async update(id, data) {
      const doc = await Model.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(populate);
      if (!doc) throw new NotFoundError("Resource not found");
      return doc;
    },
    async remove(id) {
      const doc = await Model.findByIdAndDelete(id);
      if (!doc) throw new NotFoundError("Resource not found");
      return { deleted: true };
    },
  };
}
