import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    customerName: { type: String, trim: true, maxlength: 120 },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

feedbackSchema.index({ rating: 1, createdAt: -1 });

export default mongoose.model("Feedback", feedbackSchema);
