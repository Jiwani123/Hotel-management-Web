import { ok, created } from "../../shared/apiResponse.js";
import { NotFoundError } from "../../shared/errors.js";
import { createFeedback, listFeedback, getFeedback, updateFeedback, deleteFeedback } from "./feedback.service.js";

export async function create(req,res,next){ try{
  const doc = await createFeedback(req.validated.body);
  return created(res, doc, "Feedback created");
}catch(e){ return next(e);} }

export async function list(req,res,next){ try{
  const result = await listFeedback(req.validated.query);
  return ok(res, result, "Feedback");
}catch(e){ return next(e);} }

export async function getById(req,res,next){ try{
  const doc = await getFeedback(req.validated.params.id);
  if(!doc) throw new NotFoundError("Feedback not found");
  return ok(res, doc, "Feedback");
}catch(e){ return next(e);} }

export async function update(req,res,next){ try{
  const doc = await updateFeedback(req.validated.params.id, req.validated.body);
  if(!doc) throw new NotFoundError("Feedback not found");
  return ok(res, doc, "Feedback updated");
}catch(e){ return next(e);} }

export async function remove(req,res,next){ try{
  const doc = await deleteFeedback(req.validated.params.id);
  if(!doc) throw new NotFoundError("Feedback not found");
  return ok(res, {deleted:true}, "Feedback deleted");
}catch(e){ return next(e);} }
