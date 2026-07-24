import Booking from "../../models/Booking.js";
import Room from "../../models/Room.js";
import Notification from "../../models/Notification.js";
import { BadRequestError, NotFoundError } from "../../shared/errors.js";
import { parseDateInput, startOfLocalDay, startOfTodayLocal } from "../../shared/dates.js";
import { escapeRegex } from "../../shared/search.js";

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

export async function createBooking({ customerName, customerContact, roomId, checkIn, checkOut, createdBy }) {
  const room = await Room.findById(roomId);
  if (!room) throw new NotFoundError("Room not found");
  if (room.status === "MAINTENANCE") throw new BadRequestError("Room is under maintenance");

  const inDate = parseDateInput(checkIn);
  const outDate = parseDateInput(checkOut);
  if (!inDate) throw new BadRequestError("Invalid check-in date");
  if (!outDate) throw new BadRequestError("Invalid check-out date");

  const today = startOfTodayLocal();
  if (startOfLocalDay(inDate) < today) throw new BadRequestError("Check-in date must be today or later");
  if (!(outDate > inDate)) throw new BadRequestError("Check-out must be after check-in");

  const existing = await Booking.find({
    roomId,
    status: { $in: ["BOOKED", "APPROVED", "CHECKED_IN"] },
  });

  for (const b of existing) {
    if (overlaps(inDate, outDate, b.checkIn, b.checkOut)) {
      throw new BadRequestError("Room is already booked for this date range");
    }
  }

  const booking = await Booking.create({
    customerName,
    customerContact,
    roomId,
    checkIn: inDate,
    checkOut: outDate,
    createdBy,
  });

  await Notification.create({
    userId: createdBy,
    title: "Booking created",
    message: `Booking ${booking._id} created for room ${roomId}`,
    type: "BOOKING",
    meta: { bookingId: booking._id, roomId },
    createdBy,
  });

  return booking;
}

export async function listBookings({ page=1, limit=20, status, q, from, to, createdBy } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ customerName: rx }, { customerContact: rx }];
  }
  if (createdBy) filter.createdBy = createdBy;
  if (from || to) {
    filter.checkIn = {};
    if (from) filter.checkIn.$gte = new Date(from);
    if (to) filter.checkIn.$lte = new Date(to);
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Booking.find(filter).populate("roomId").sort("-createdAt").skip(skip).limit(limit),
    Booking.countDocuments(filter),
  ]);
  return { items, total, page, limit, pages: Math.ceil(total/limit) };
}

export async function getBooking(id) {
  return Booking.findById(id).populate("roomId");
}

export async function updateBooking(id, data) {
  // for safety, only allow updates if not checked out
  const booking = await Booking.findById(id);
  if (!booking) throw new NotFoundError("Booking not found");
  if (["CHECKED_OUT", "CANCELLED", "REJECTED"].includes(booking.status)) {
    throw new BadRequestError(`Cannot update ${booking.status} booking`);
  }

  // If changing dates/room, validate overlap
  const roomId = data.roomId ?? booking.roomId.toString();
  const checkIn = data.checkIn ? parseDateInput(data.checkIn) : booking.checkIn;
  const checkOut = data.checkOut ? parseDateInput(data.checkOut) : booking.checkOut;
  if (!checkIn) throw new BadRequestError("Invalid check-in date");
  if (!checkOut) throw new BadRequestError("Invalid check-out date");

  const today = startOfTodayLocal();
  if (startOfLocalDay(checkIn) < today) throw new BadRequestError("Check-in date must be today or later");
  if (!(checkIn < checkOut)) throw new BadRequestError("Check-out must be after check-in");

  const existing = await Booking.find({
    _id: { $ne: booking._id },
    roomId,
    status: { $in: ["BOOKED", "APPROVED", "CHECKED_IN"] },
  });

  for (const b of existing) {
    if (overlaps(checkIn, checkOut, b.checkIn, b.checkOut)) {
      throw new BadRequestError("Room is already booked for this date range");
    }
  }

  Object.assign(booking, {
    ...data,
    roomId,
    checkIn,
    checkOut,
  });

  await booking.save();
  return Booking.findById(booking._id).populate("roomId");
}

export async function cancelBooking(id) {
  const booking = await Booking.findById(id);
  if (!booking) throw new NotFoundError("Booking not found");
  if (["CHECKED_IN", "CHECKED_OUT"].includes(booking.status)) throw new BadRequestError(`Cannot cancel ${booking.status} booking`);
  if (["CANCELLED", "REJECTED"].includes(booking.status)) throw new BadRequestError(`Booking is already ${booking.status}`);
  booking.status = "CANCELLED";
  await booking.save();

  await Notification.create({
    userId: booking.createdBy,
    title: "Booking cancelled",
    message: `Booking ${booking._id} cancelled`,
    type: "BOOKING",
    meta: { bookingId: booking._id },
    createdBy: booking.createdBy,
  });

  return booking;
}

export async function checkInBooking(id) {
  const booking = await Booking.findById(id);
  if (!booking) throw new NotFoundError("Booking not found");
  if (booking.status !== "APPROVED") throw new BadRequestError("Only APPROVED bookings can be checked in");

  const room = await Room.findById(booking.roomId);
  if (!room) throw new NotFoundError("Room not found");
  if (room.status === "MAINTENANCE") throw new BadRequestError("Room under maintenance");

  booking.status = "CHECKED_IN";
  await booking.save();

  room.status = "OCCUPIED";
  await room.save();

  await Notification.create({
    userId: booking.createdBy,
    title: "Checked in",
    message: `Booking ${booking._id} checked in`,
    type: "BOOKING",
    meta: { bookingId: booking._id },
    createdBy: booking.createdBy,
  });

  return Booking.findById(id).populate("roomId");
}

export async function checkOutBooking(id) {
  const booking = await Booking.findById(id);
  if (!booking) throw new NotFoundError("Booking not found");
  if (booking.status !== "CHECKED_IN") throw new BadRequestError("Only CHECKED_IN bookings can be checked out");

  booking.status = "CHECKED_OUT";
  await booking.save();

  const room = await Room.findById(booking.roomId);
  if (room && room.status !== "MAINTENANCE") {
    room.status = "AVAILABLE";
    await room.save();
  }

  await Notification.create({
    userId: booking.createdBy,
    title: "Checked out",
    message: `Booking ${booking._id} checked out`,
    type: "BOOKING",
    meta: { bookingId: booking._id },
    createdBy: booking.createdBy,
  });

  return Booking.findById(id).populate("roomId");
}

export async function approveBooking(id, decidedBy) {
  const booking = await Booking.findById(id);
  if (!booking) throw new NotFoundError("Booking not found");
  if (booking.status !== "BOOKED") throw new BadRequestError("Only BOOKED (pending) bookings can be approved");

  booking.status = "APPROVED";
  await booking.save();

  await Notification.create({
    userId: booking.createdBy,
    title: "Booking approved",
    message: `Booking ${booking._id} approved`,
    type: "BOOKING",
    meta: { bookingId: booking._id },
    createdBy: decidedBy,
  });

  return Booking.findById(booking._id).populate("roomId");
}

export async function rejectBooking(id, decidedBy) {
  const booking = await Booking.findById(id);
  if (!booking) throw new NotFoundError("Booking not found");
  if (booking.status !== "BOOKED") throw new BadRequestError("Only BOOKED (pending) bookings can be rejected");

  booking.status = "REJECTED";
  await booking.save();

  await Notification.create({
    userId: booking.createdBy,
    title: "Booking rejected",
    message: `Booking ${booking._id} rejected`,
    type: "BOOKING",
    meta: { bookingId: booking._id },
    createdBy: decidedBy,
  });

  return Booking.findById(booking._id).populate("roomId");
}

export async function deleteBooking(id) {
  return Booking.findByIdAndDelete(id);
}
