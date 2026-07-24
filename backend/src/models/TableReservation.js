import mongoose from "mongoose";

const tableReservationSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 40 },
    dateTime: { type: Date, required: true },
    partySize: { type: Number, required: true, min: 1, max: 50 },
    // BOOKED = pending (awaiting admin decision)
    status: { type: String, enum: ["BOOKED", "APPROVED", "REJECTED", "CANCELLED", "ARRIVED"], default: "BOOKED" },
    paymentOption: { type: String, enum: ["PAY_ON_PICKUP", "CARD"], default: null },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("TableReservation", tableReservationSchema);
