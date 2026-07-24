import { ok, created } from "../../shared/apiResponse.js";
import { NotFoundError } from "../../shared/errors.js";
import { createItem, listItems, getItem, updateItem, deleteItem } from "./menu.service.js";

export async function create(req,res,next){ try{
  const doc = await createItem(req.validated.body);
  return created(res, doc, "Menu item created");
}catch(e){ return next(e);} }

export async function list(req,res,next){ try{
  const result = await listItems(req.validated.query);
  return ok(res, result, "Menu items");
}catch(e){ return next(e);} }

export async function getById(req,res,next){ try{
  const doc = await getItem(req.validated.params.id);
  if(!doc) throw new NotFoundError("Menu item not found");
  return ok(res, doc, "Menu item");
}catch(e){ return next(e);} }

export async function update(req,res,next){ try{
  const doc = await updateItem(req.validated.params.id, req.validated.body);
  if(!doc) throw new NotFoundError("Menu item not found");
  return ok(res, doc, "Menu item updated");
}catch(e){ return next(e);} }

export async function remove(req,res,next){ try{
  const doc = await deleteItem(req.validated.params.id);
  if(!doc) throw new NotFoundError("Menu item not found");
  return ok(res, {deleted:true}, "Menu item deleted");
}catch(e){ return next(e);} }
