import { ok, created } from "../../shared/apiResponse.js";
import { NotFoundError } from "../../shared/errors.js";
import { createRoom, listRooms, getRoom, updateRoom, deleteRoom, findAvailableRooms } from "./rooms.service.js";

export async function create(req,res,next){ try{
  const doc = await createRoom(req.validated.body);
  return created(res, doc, "Room created");
}catch(e){ return next(e);} }

export async function list(req,res,next){ try{
  const result = await listRooms(req.validated.query);
  return ok(res, result, "Rooms");
}catch(e){ return next(e);} }

export async function getById(req,res,next){ try{
  const doc = await getRoom(req.validated.params.id);
  if(!doc) throw new NotFoundError("Room not found");
  return ok(res, doc, "Room");
}catch(e){ return next(e);} }

export async function update(req,res,next){ try{
  const doc = await updateRoom(req.validated.params.id, req.validated.body);
  if(!doc) throw new NotFoundError("Room not found");
  return ok(res, doc, "Room updated");
}catch(e){ return next(e);} }

export async function remove(req,res,next){ try{
  const doc = await deleteRoom(req.validated.params.id);
  if(!doc) throw new NotFoundError("Room not found");
  return ok(res, {deleted:true}, "Room deleted");
}catch(e){ return next(e);} }

export async function availability(req,res,next){ try{
  const rooms = await findAvailableRooms(req.validated.query);
  return ok(res, rooms, "Available rooms");
}catch(e){ return next(e);} }
