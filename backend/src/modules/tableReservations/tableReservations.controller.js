import { ok, created } from "../../shared/apiResponse.js";
import { ForbiddenError, NotFoundError } from "../../shared/errors.js";
import { createReservation, listReservations, getReservation, updateReservation, deleteReservation, approveReservation, rejectReservation } from "./tableReservations.service.js";

export async function create(req,res,next){ try{
  const doc = await createReservation({ ...req.validated.body, createdBy: req.user.sub });
  return created(res, doc, "Reservation created");
}catch(e){ return next(e);} }

export async function list(req,res,next){ try{
  const isCustomer = req.user.role === "CUSTOMER";
  const result = await listReservations({
    ...req.validated.query,
    ...(isCustomer ? { createdBy: req.user.sub } : {}),
  });
  return ok(res, result, "Reservations");
}catch(e){ return next(e);} }

export async function getById(req,res,next){ try{
  const doc = await getReservation(req.validated.params.id);
  if(!doc) throw new NotFoundError("Reservation not found");
  if (req.user.role === "CUSTOMER" && doc.createdBy?.toString() !== req.user.sub) {
    throw new ForbiddenError("Not allowed");
  }
  return ok(res, doc, "Reservation");
}catch(e){ return next(e);} }

export async function update(req,res,next){ try{
  const existing = await getReservation(req.validated.params.id);
  if (!existing) throw new NotFoundError("Reservation not found");
  if (req.user.role === "CUSTOMER") {
    if (existing.createdBy?.toString() !== req.user.sub)
      throw new ForbiddenError("Not allowed");
    if (existing.status !== "BOOKED")
      throw new ForbiddenError("Reservation can only be edited while it is BOOKED (not yet approved)");
    // customers can only change dateTime, partySize, customerName, phone — not status
    delete req.validated.body.status;
  }
  const doc = await updateReservation(req.validated.params.id, req.validated.body);
  if(!doc) throw new NotFoundError("Reservation not found");
  return ok(res, doc, "Reservation updated");
}catch(e){ return next(e);} }

export async function remove(req,res,next){ try{
  const existing = await getReservation(req.validated.params.id);
  if (!existing) throw new NotFoundError("Reservation not found");
  if (req.user.role === "CUSTOMER") {
    if (existing.createdBy?.toString() !== req.user.sub)
      throw new ForbiddenError("Not allowed");
    if (existing.status !== "BOOKED")
      throw new ForbiddenError("Reservation can only be cancelled while it is BOOKED (not yet approved)");
  }
  await deleteReservation(req.validated.params.id);
  return ok(res, {deleted:true}, "Reservation deleted");
}catch(e){ return next(e);} }

export async function approve(req,res,next){ try{
  const doc = await approveReservation(req.validated.params.id, req.user.sub);
  return ok(res, doc, "Reservation approved");
}catch(e){ return next(e);} }

export async function reject(req,res,next){ try{
  const doc = await rejectReservation(req.validated.params.id, req.user.sub);
  return ok(res, doc, "Reservation rejected");
}catch(e){ return next(e);} }
