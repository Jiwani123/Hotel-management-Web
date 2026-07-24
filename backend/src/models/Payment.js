import mongoose from "mongoose";
import { PAYABLE_TYPE_VALUES, PAYMENT_METHOD_VALUES } from "../constants/payment.js";

const paymentSchema = new mongoose.Schema(
  {
    payableType: { type: String, enum: PAYABLE_TYPE_VALUES, required: true },
    refId: { type: mongoose.Schema.Types.ObjectId, required: true },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: PAYMENT_METHOD_VALUES, required: true },
    provider: { type: String, enum: ["MANUAL", "STRIPE"], default: "MANUAL" },
    providerRef: { type: String, trim: true },
    currency: { type: String, default: "lkr", lowercase: true, trim: true },
    paidAt: { type: Date, default: Date.now },
    receiptNo: { type: String, required: true, unique: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

paymentSchema.index({ paidAt: 1, payableType: 1 });
paymentSchema.index({ provider: 1, providerRef: 1 }, { unique: true, sparse: true });

export default mongoose.model("Payment", paymentSchema);
