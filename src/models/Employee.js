import mongoose from "mongoose";
import { STAFF_ROLES } from "../constants/roles.js";

const employeeSchema = new mongoose.Schema(
  {
    empNo: { type: String, required: true, unique: true, trim: true, maxlength: 30 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    role: { type: String, enum: STAFF_ROLES, required: true },
    phone: { type: String, trim: true, maxlength: 30 },
    address: { type: String, trim: true, maxlength: 200 },
    salary: { type: Number, min: 0, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Employee", employeeSchema);
