import mongoose from "mongoose";

const cleaningTaskSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
    scheduledAt: { type: Date, required: true },
    status: { type: String, enum: ["PENDING", "DONE"], default: "PENDING" },
    notes: { type: String, trim: true, maxlength: 500, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("CleaningTask", cleaningTaskSchema);
