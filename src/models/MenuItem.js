import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    price: { type: Number, required: true, min: 0 },
    isAvailable: { type: Boolean, default: true },
    isVeg: { type: Boolean, default: undefined },
    images: [{ type: String, trim: true, maxlength: 500 }],
  },
  { timestamps: true }
);

export default mongoose.model("MenuItem", menuItemSchema);
