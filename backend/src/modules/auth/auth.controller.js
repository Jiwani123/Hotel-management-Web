import { ok, created } from "../../shared/apiResponse.js";
import { bootstrapAdmin, createUser, login, refresh, registerCustomer } from "./auth.service.js";
import { env } from "../../config/env.js";

function setRefreshCookie(res, token) {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    path: "/api/auth/refresh",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export async function bootstrapAdminController(req, res, next) {
  try {
    const { name, email, password } = req.validated.body;
    const user = await bootstrapAdmin({ name, email, password });
    return created(res, { user }, "Admin bootstrapped");
  } catch (e) {
    return next(e);
  }
}

export async function createUserController(req, res, next) {
  try {
    const { name, email, password, role } = req.validated.body;
    const user = await createUser({ name, email, password, role });
    return created(res, { user }, "User created");
  } catch (e) {
    return next(e);
  }
}

export async function registerController(req, res, next) {
  try {
    const { name, email, password } = req.validated.body;
    const user = await registerCustomer({ name, email, password });
    return created(res, { user }, "Registered");
  } catch (e) {
    return next(e);
  }
}

export async function loginController(req, res, next) {
  try {
    const { email, password } = req.validated.body;
    const { user, accessToken, refreshToken } = await login({ email, password });
    setRefreshCookie(res, refreshToken);
    return ok(res, { user: { id: user._id, name: user.name, email: user.email, role: user.role }, accessToken }, "Logged in");
  } catch (e) {
    return next(e);
  }
}

export async function refreshController(req, res, next) {
  try {
    const token = req.cookies.refreshToken;
    const { user, accessToken, refreshToken } = await refresh(token);
    setRefreshCookie(res, refreshToken);
    return ok(res, { user: { id: user._id, name: user.name, email: user.email, role: user.role }, accessToken }, "Refreshed");
  } catch (e) {
    return next(e);
  }
}

export async function logoutController(req, res) {
  res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
  return ok(res, null, "Logged out");
}

export async function meController(req, res) {
  return ok(res, { user: req.user }, "Me");
}
