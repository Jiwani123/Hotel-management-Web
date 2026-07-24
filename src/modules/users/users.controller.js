import { ok } from "../../shared/apiResponse.js";
import { listUsers, getUser, getMe, updateUser, updateMe } from "./users.service.js";

export async function list(req, res, next) {
  try {
    const result = await listUsers(req.validated.query);
    return ok(res, result, "Users");
  } catch (e) { return next(e); }
}

export async function getById(req, res, next) {
  try {
    const doc = await getUser(req.validated.params.id);
    return ok(res, doc, "User");
  } catch (e) { return next(e); }
}

export async function me(req, res, next) {
  try {
    const doc = await getMe(req.user.sub);
    return ok(res, doc, "Me");
  } catch (e) { return next(e); }
}

export async function update(req, res, next) {
  try {
    const doc = await updateUser(req.validated.params.id, req.validated.body);
    return ok(res, doc, "User updated");
  } catch (e) { return next(e); }
}

export async function updateSelf(req, res, next) {
  try {
    const doc = await updateMe(req.user.sub, req.validated.body);
    return ok(res, doc, "Profile updated");
  } catch (e) { return next(e); }
}
