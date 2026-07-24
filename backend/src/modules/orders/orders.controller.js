import { ok, created } from "../../shared/apiResponse.js";
import { ForbiddenError, NotFoundError } from "../../shared/errors.js";
import { createOrder, listOrders, getOrder, updateOrderStatus, deleteOrder } from "./orders.service.js";

export async function create(req,res,next){ try{
  if (req.user.role === "CUSTOMER" && req.validated.body.orderType !== "ROOM_SERVICE") {
    throw new ForbiddenError("Only ROOM_SERVICE orders are allowed");
  }
  const doc = await createOrder({ ...req.validated.body, createdBy: req.user.sub });
  return created(res, doc, "Order created");
}catch(e){ return next(e);} }

export async function list(req,res,next){ try{
  const isCustomer = req.user.role === "CUSTOMER";
  const result = await listOrders({
    ...req.validated.query,
    ...(isCustomer ? { createdBy: req.user.sub } : {}),
  });
  return ok(res, result, "Orders");
}catch(e){ return next(e);} }

export async function getById(req,res,next){ try{
  const doc = await getOrder(req.validated.params.id);
  if(!doc) throw new NotFoundError("Order not found");
  if (req.user.role === "CUSTOMER" && doc.createdBy?.toString() !== req.user.sub) {
    throw new ForbiddenError("Not allowed");
  }
  return ok(res, doc, "Order");
}catch(e){ return next(e);} }

export async function setStatus(req,res,next){ try{
  const doc = await updateOrderStatus(req.validated.params.id, req.validated.body.status);
  return ok(res, doc, "Order updated");
}catch(e){ return next(e);} }

export async function remove(req,res,next){ try{
  const doc = await deleteOrder(req.validated.params.id);
  if(!doc) throw new NotFoundError("Order not found");
  return ok(res, {deleted:true}, "Order deleted");
}catch(e){ return next(e);} }
