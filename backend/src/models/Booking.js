import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true, maxlength: 120 },
    customerContact: { type: String, required: true, trim: true, maxlength: 60 },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    // BOOKED = pending (awaiting admin decision)
    status: { type: String, enum: ["BOOKED", "APPROVED", "REJECTED", "CANCELLED", "CHECKED_IN", "CHECKED_OUT"], default: "BOOKED" },
    paymentOption: { type: String, enum: ["PAY_ON_PICKUP", "CARD"], default: null },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

bookingSchema.index({ roomId: 1, checkIn: 1, checkOut: 1 });

export default mongoose.model("Booking", bookingSchema);
