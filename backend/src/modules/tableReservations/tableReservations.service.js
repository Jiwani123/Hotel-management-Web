import TableReservation from "../../models/TableReservation.js";
import Notification from "../../models/Notification.js";
import { BadRequestError, NotFoundError } from "../../shared/errors.js";
import mongoose from "mongoose";
import { parseDateInput } from "../../shared/dates.js";
import { escapeRegex } from "../../shared/search.js";

export async function createReservation(data){
  const dt = parseDateInput(data.dateTime);
  if (!dt) throw new BadRequestError("Invalid reservation date/time");
  if (dt.getTime() < Date.now()) throw new BadRequestError("Reservation date/time must be in the future");

  const patch = { ...data, dateTime: dt };
  const reservation = await TableReservation.create(patch);

  await Notification.create({
    userId: reservation.createdBy,
    title: "Table reservation created",
    message: `Reservation ${reservation._id} scheduled`,
    type: "TASK",
    meta: { reservationId: reservation._id, dateTime: reservation.dateTime },
    createdBy: reservation.createdBy,
  });

  return reservation;
}

export async function listReservations({ page=1, limit=20, status, from, to, createdBy, q } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (createdBy) filter.createdBy = createdBy;
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    const or = [
      { customerName: rx },
      { phone: rx },
    ];
    if (mongoose.isValidObjectId(q)) or.push({ _id: q });
    filter.$or = or;
  }
  if (from || to) {
    filter.dateTime = {};
    if (from) filter.dateTime.$gte = new Date(from);
    if (to) filter.dateTime.$lte = new Date(to);
  }

  const skip = (page-1)*limit;
  const [items,total] = await Promise.all([
    TableReservation.find(filter).sort("dateTime").skip(skip).limit(limit),
    TableReservation.countDocuments(filter),
  ]);
  return { items, total, page, limit, pages: Math.ceil(total/limit) };
}

export async function getReservation(id){ return TableReservation.findById(id); }

export async function updateReservation(id,data){
  const patch = { ...data };
  if (patch.dateTime) {
    const dt = parseDateInput(patch.dateTime);
    if (!dt) throw new BadRequestError("Invalid reservation date/time");
    if (dt.getTime() < Date.now()) throw new BadRequestError("Reservation date/time must be in the future");
    patch.dateTime = dt;
  }
  return TableReservation.findByIdAndUpdate(id, patch, { new:true, runValidators:true });
}

export async function deleteReservation(id){ return TableReservation.findByIdAndDelete(id); }

export async function approveReservation(id, decidedBy) {
  const resv = await TableReservation.findById(id);
  if (!resv) throw new NotFoundError("Reservation not found");
  if (resv.status !== "BOOKED") throw new BadRequestError("Only BOOKED (pending) reservations can be approved");

  resv.status = "APPROVED";
  await resv.save();

  await Notification.create({
    userId: resv.createdBy,
    title: "Reservation approved",
    message: `Reservation ${resv._id} approved`,
    type: "TASK",
    meta: { reservationId: resv._id, dateTime: resv.dateTime },
    createdBy: decidedBy,
  });

  return resv;
}

export async function rejectReservation(id, decidedBy) {
  const resv = await TableReservation.findById(id);
  if (!resv) throw new NotFoundError("Reservation not found");
  if (resv.status !== "BOOKED") throw new BadRequestError("Only BOOKED (pending) reservations can be rejected");

  resv.status = "REJECTED";
  await resv.save();

  await Notification.create({
    userId: resv.createdBy,
    title: "Reservation rejected",
    message: `Reservation ${resv._id} rejected`,
    type: "TASK",
    meta: { reservationId: resv._id, dateTime: resv.dateTime },
    createdBy: decidedBy,
  });

  return resv;
}
