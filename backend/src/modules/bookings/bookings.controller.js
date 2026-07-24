import { ok, created } from "../../shared/apiResponse.js";
import { ForbiddenError, NotFoundError } from "../../shared/errors.js";
import {
  createBooking,
  listBookings,
  getBooking,
  updateBooking,
  cancelBooking,
  checkInBooking,
  checkOutBooking,
  approveBooking,
  rejectBooking,
  deleteBooking,
} from "./bookings.service.js";

export async function create(req,res,next){ try{
  const body = req.validated.body;
  const doc = await createBooking({ ...body, createdBy: req.user.sub });
  return created(res, doc, "Booking created");
}catch(e){ return next(e);} }

export async function list(req,res,next){ try{
  const isCustomer = req.user.role === "CUSTOMER";
  const result = await listBookings({
    ...req.validated.query,
    ...(isCustomer ? { createdBy: req.user.sub } : {}),
  });
  return ok(res, result, "Bookings");
}catch(e){ return next(e);} }

export async function getById(req,res,next){ try{
  const doc = await getBooking(req.validated.params.id);
  if(!doc) throw new NotFoundError("Booking not found");
  if (req.user.role === "CUSTOMER" && doc.createdBy?.toString() !== req.user.sub) {
    throw new ForbiddenError("Not allowed");
  }
  return ok(res, doc, "Booking");
}catch(e){ return next(e);} }

export async function update(req,res,next){ try{
  const existing = await getBooking(req.validated.params.id);
  if (!existing) throw new NotFoundError("Booking not found");

  if (req.user.role === "CUSTOMER") {
    if (existing.createdBy?.toString() !== req.user.sub) throw new ForbiddenError("Not allowed");
    if (existing.status !== "BOOKED") throw new ForbiddenError("Booking can only be edited while it is BOOKED (pending)");
    // customers can update details/dates only — not room or status
    delete req.validated.body.status;
    delete req.validated.body.roomId;
  }

  const doc = await updateBooking(req.validated.params.id, req.validated.body);
  return ok(res, doc, "Booking updated");
}catch(e){ return next(e);} }

export async function cancel(req,res,next){ try{
  const existing = await getBooking(req.validated.params.id);
  if (!existing) throw new NotFoundError("Booking not found");
  if (req.user.role === "CUSTOMER" && existing.createdBy?.toString() !== req.user.sub) {
    throw new ForbiddenError("Not allowed");
  }
  const doc = await cancelBooking(req.validated.params.id);
  return ok(res, doc, "Booking cancelled");
}catch(e){ return next(e);} }

export async function approve(req,res,next){ try{
  const doc = await approveBooking(req.validated.params.id, req.user.sub);
  return ok(res, doc, "Booking approved");
}catch(e){ return next(e);} }

export async function reject(req,res,next){ try{
  const doc = await rejectBooking(req.validated.params.id, req.user.sub);
  return ok(res, doc, "Booking rejected");
}catch(e){ return next(e);} }

export async function checkIn(req,res,next){ try{
  const doc = await checkInBooking(req.validated.params.id);
  return ok(res, doc, "Checked in");
}catch(e){ return next(e);} }

export async function checkOut(req,res,next){ try{
  const doc = await checkOutBooking(req.validated.params.id);
  return ok(res, doc, "Checked out");
}catch(e){ return next(e);} }

export async function remove(req,res,next){ try{
  const existing = await getBooking(req.validated.params.id);
  if(!existing) throw new NotFoundError("Booking not found");
  if (req.user.role === "CUSTOMER") {
    if (existing.createdBy?.toString() !== req.user.sub) throw new ForbiddenError("Not allowed");
    if (existing.status !== "BOOKED") throw new ForbiddenError("Booking can only be deleted while it is BOOKED (pending)");
  }
  const doc = await deleteBooking(req.validated.params.id);
  if(!doc) throw new NotFoundError("Booking not found");
  return ok(res, {deleted:true}, "Booking deleted");
}catch(e){ return next(e);} }
