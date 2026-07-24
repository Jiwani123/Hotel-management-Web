import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", required: true },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderType: { type: String, enum: ["DINE_IN", "ROOM_SERVICE"], required: true },
    items: { type: [orderItemSchema], required: true, validate: v => v.length > 0 },
    status: { type: String, enum: ["PLACED", "PREPARING", "SERVED", "PAID", "CANCELLED"], default: "PLACED" },
    tableNo: { type: String, trim: true, maxlength: 20, default: "" },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", default: null },
    total: { type: Number, required: true, min: 0 },
    paymentOption: { type: String, enum: ["PAY_ON_PICKUP", "CARD"], default: null },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
