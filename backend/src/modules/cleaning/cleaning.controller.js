import { ok, created } from "../../shared/apiResponse.js";
import { NotFoundError } from "../../shared/errors.js";
import { createTask, listTasks, getTask, updateTask, deleteTask } from "./cleaning.service.js";

export async function create(req,res,next){ try{
  const doc = await createTask({ ...req.validated.body, createdBy: req.user.sub });
  return created(res, doc, "Task created");
}catch(e){ return next(e);} }

export async function list(req,res,next){ try{
  const result = await listTasks(req.validated.query);
  return ok(res, result, "Cleaning tasks");
}catch(e){ return next(e);} }

export async function getById(req,res,next){ try{
  const doc = await getTask(req.validated.params.id);
  if(!doc) throw new NotFoundError("Task not found");
  return ok(res, doc, "Cleaning task");
}catch(e){ return next(e);} }

export async function update(req,res,next){ try{
  const doc = await updateTask(req.validated.params.id, req.validated.body);
  if(!doc) throw new NotFoundError("Task not found");
  return ok(res, doc, "Task updated");
}catch(e){ return next(e);} }

export async function remove(req,res,next){ try{
  const doc = await deleteTask(req.validated.params.id);
  if(!doc) throw new NotFoundError("Task not found");
  return ok(res, {deleted:true}, "Task deleted");
}catch(e){ return next(e);} }
