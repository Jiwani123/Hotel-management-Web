import Room from "../../models/Room.js";
import Booking from "../../models/Booking.js";
import { BadRequestError } from "../../shared/errors.js";
import { escapeRegex } from "../../shared/search.js";

export async function createRoom(data) {
  return Room.create(data);
}

export async function listRooms({ page=1, limit=20, status, type, q } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ roomNo: rx }, { type: rx }, { status: rx }, { features: rx }];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Room.find(filter).sort("roomNo").skip(skip).limit(limit),
    Room.countDocuments(filter),
  ]);
  return { items, total, page, limit, pages: Math.ceil(total/limit) };
}

export async function getRoom(id) {
  return Room.findById(id);
}

export async function updateRoom(id, data) {
  return Room.findByIdAndUpdate(id, data, { new: true, runValidators: true });
}

export async function deleteRoom(id) {
  return Room.findByIdAndDelete(id);
}

// available if no booking overlaps and room not MAINTENANCE
export async function findAvailableRooms({ checkIn, checkOut }) {
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  if (!(inDate < outDate)) throw new BadRequestError("Invalid date range");

  const rooms = await Room.find({ status: { $ne: "MAINTENANCE" } });

  const bookings = await Booking.find({
    status: { $in: ["BOOKED","APPROVED","CHECKED_IN"] },
    $or: [
      { checkIn: { $lt: outDate }, checkOut: { $gt: inDate } }, // overlap
    ],
  }).select("roomId");

  const booked = new Set(bookings.map(b => b.roomId.toString()));
  return rooms.filter(r => !booked.has(r._id.toString()));
}
