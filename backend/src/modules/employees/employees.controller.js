import { ok, created } from "../../shared/apiResponse.js";
import { NotFoundError } from "../../shared/errors.js";
import { createEmployee, listEmployees, getEmployee, updateEmployee, deleteEmployee } from "./employees.service.js";

export async function create(req, res, next) {
  try {
    const doc = await createEmployee(req.validated.body);
    return created(res, doc, "Employee created");
  } catch (e) { return next(e); }
}

export async function list(req, res, next) {
  try {
    const { page, limit, q, role, isActive } = req.validated.query;
    const isAdmin = req.user?.role === "ADMIN";
    const select = isAdmin ? undefined : "empNo name role phone isActive";
    const result = await listEmployees({ page, limit, q, role, isActive, select });
    return ok(res, result, "Employees");
  } catch (e) { return next(e); }
}

export async function getById(req, res, next) {
  try {
    const doc = await getEmployee(req.validated.params.id);
    if (!doc) throw new NotFoundError("Employee not found");
    return ok(res, doc, "Employee");
  } catch (e) { return next(e); }
}

export async function update(req, res, next) {
  try {
    const doc = await updateEmployee(req.validated.params.id, req.validated.body);
    if (!doc) throw new NotFoundError("Employee not found");
    return ok(res, doc, "Employee updated");
  } catch (e) { return next(e); }
}

export async function remove(req, res, next) {
  try {
    const doc = await deleteEmployee(req.validated.params.id);
    if (!doc) throw new NotFoundError("Employee not found");
    return ok(res, { deleted: true }, "Employee deleted");
  } catch (e) { return next(e); }
}
