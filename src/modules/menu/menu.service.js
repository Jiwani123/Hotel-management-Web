import MenuItem from "../../models/MenuItem.js";
import { escapeRegex } from "../../shared/search.js";

export async function createItem(data){ return MenuItem.create(data); }

export async function listItems({ page=1, limit=20, category, q, isAvailable, isVeg } = {}) {
  const filter = {};
  if (category) filter.category = category;
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: rx }, { category: rx }];
  }
  if (typeof isAvailable === "boolean") filter.isAvailable = isAvailable;
  if (typeof isVeg === "boolean") filter.isVeg = isVeg;

  const skip = (page-1)*limit;
  const [items,total] = await Promise.all([
    MenuItem.find(filter).sort("category").skip(skip).limit(limit),
    MenuItem.countDocuments(filter),
  ]);
  return { items, total, page, limit, pages: Math.ceil(total/limit) };
}

export async function getItem(id){ return MenuItem.findById(id); }
export async function updateItem(id,data){ return MenuItem.findByIdAndUpdate(id,data,{new:true,runValidators:true}); }
export async function deleteItem(id){ return MenuItem.findByIdAndDelete(id); }
