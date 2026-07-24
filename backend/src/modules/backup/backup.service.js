import User from "../../models/User.js";
import Employee from "../../models/Employee.js";
import Room from "../../models/Room.js";
import Booking from "../../models/Booking.js";
import Payment from "../../models/Payment.js";
import Feedback from "../../models/Feedback.js";
import CleaningTask from "../../models/CleaningTask.js";
import MenuItem from "../../models/MenuItem.js";
import Order from "../../models/Order.js";
import TableReservation from "../../models/TableReservation.js";
import Notification from "../../models/Notification.js";
import { BadRequestError } from "../../shared/errors.js";

const COLLECTIONS = {
  users: User,
  employees: Employee,
  rooms: Room,
  bookings: Booking,
  payments: Payment,
  feedback: Feedback,
  cleaningTasks: CleaningTask,
  menuItems: MenuItem,
  orders: Order,
  tableReservations: TableReservation,
  notifications: Notification,
};

export async function exportData() {
  const data = {};
  const counts = {};

  for (const [key, Model] of Object.entries(COLLECTIONS)) {
    const items = await Model.find({}).lean();
    data[key] = items;
    counts[key] = items.length;
  }

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      counts,
    },
    data,
  };
}

export async function restoreData(payload) {
  if (!payload?.data || typeof payload.data !== "object") {
    throw new BadRequestError("Invalid backup payload");
  }

  const results = {};

  for (const [key, items] of Object.entries(payload.data)) {
    const Model = COLLECTIONS[key];
    if (!Model || !Array.isArray(items) || items.length === 0) {
      results[key] = { upserted: 0 };
      continue;
    }

    const ops = items
      .filter((item) => item && item._id)
      .map((item) => ({
        updateOne: {
          filter: { _id: item._id },
          update: { $set: item },
          upsert: true,
        },
      }));

    if (ops.length === 0) {
      results[key] = { upserted: 0 };
      continue;
    }

    const res = await Model.bulkWrite(ops, { ordered: false });
    results[key] = { upserted: res.upsertedCount + res.modifiedCount };
  }

  return results;
}
