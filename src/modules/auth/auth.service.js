import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../../models/User.js";
import { env } from "../../config/env.js";
import { BadRequestError, UnauthorizedError, ForbiddenError } from "../../shared/errors.js";
import { ROLES } from "../../constants/roles.js";

function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, email: user.email, name: user.name, tokenType: "access" },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), tokenType: "refresh" },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
  );
}

export async function bootstrapAdmin({ name, email, password }) {
  const count = await User.countDocuments();
  if (count > 0) throw new ForbiddenError("Bootstrap already completed");

  const exists = await User.findOne({ email });
  if (exists) throw new BadRequestError("Email already exists");

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash, role: ROLES.ADMIN });

  return user;
}

export async function createUser({ name, email, password, role }) {
  const exists = await User.findOne({ email });
  if (exists) throw new BadRequestError("Email already exists");
  const passwordHash = await bcrypt.hash(password, 12);
  return User.create({ name, email, passwordHash, role });
}

export async function registerCustomer({ name, email, password }) {
  const exists = await User.findOne({ email });
  if (exists) throw new BadRequestError("Email already exists");
  const passwordHash = await bcrypt.hash(password, 12);
  return User.create({ name, email, passwordHash, role: ROLES.CUSTOMER });
}

export async function login({ email, password }) {
  const user = await User.findOne({ email, isActive: true });
  if (!user) throw new UnauthorizedError("Invalid credentials");

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new UnauthorizedError("Invalid credentials");

  user.lastLogin = new Date();
  await user.save();

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  return { user, accessToken, refreshToken };
}

export async function refresh(refreshToken) {
  if (!refreshToken) throw new UnauthorizedError("Missing refresh token");

  let payload;
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
  } catch {
    throw new UnauthorizedError("Invalid refresh token");
  }

  if (payload.tokenType !== "refresh") throw new UnauthorizedError("Invalid refresh token");

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw new UnauthorizedError("Invalid refresh token");

  const accessToken = signAccessToken(user);
  const newRefresh = signRefreshToken(user);

  return { user, accessToken, refreshToken: newRefresh };
}
