import mongoose from "mongoose";
import { ROOM_STATUS, ROOM_STATUS_VALUES } from "../constants/room.js";

const roomSchema = new mongoose.Schema(
  {
    roomNo: { type: String, required: true, unique: true, trim: true, maxlength: 20 },
    type: { type: String, required: true, trim: true, maxlength: 50 },
    pricePerNight: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ROOM_STATUS_VALUES, default: ROOM_STATUS.AVAILABLE },
    features: [{ type: String, trim: true, maxlength: 50 }],
    images: [{ type: String, trim: true, maxlength: 500 }],
  },
  { timestamps: true }
);

export default mongoose.model("Room", roomSchema);
