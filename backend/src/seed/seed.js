import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import User from "../models/User.js";
import Room from "../models/Room.js";
import MenuItem from "../models/MenuItem.js";
import Employee from "../models/Employee.js";
import { ROLES } from "../constants/roles.js";

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || "Hotel Manager";

  if (!email || !password) {
    logger.info("Seed admin skipped (missing SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD)");
    return;
  }

  const exists = await User.findOne({ email });
  if (exists) {
    logger.info("Seed admin already exists");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({ name, email, passwordHash, role: ROLES.ADMIN });
  logger.info("Seed admin created");
}

async function seedRooms() {
  const count = await Room.countDocuments();
  if (count > 0) return;

  await Room.insertMany([
    { roomNo: "V-101", type: "Ocean Suite", pricePerNight: 320, status: "AVAILABLE", features: ["Sea view", "Balcony"] },
    { roomNo: "V-102", type: "Garden Villa", pricePerNight: 260, status: "AVAILABLE", features: ["Private garden"] },
    { roomNo: "V-201", type: "Family Suite", pricePerNight: 290, status: "AVAILABLE", features: ["2 Bedrooms"] },
  ]);
  logger.info("Seed rooms created");
}

async function seedMenu() {
  const count = await MenuItem.countDocuments();
  if (count > 0) return;

  await MenuItem.insertMany([
    { name: "Coconut Curry", category: "Signature", price: 18, isAvailable: true },
    { name: "Grilled Reef Fish", category: "Main", price: 24, isAvailable: true },
    { name: "Tropical Fruit Plate", category: "Dessert", price: 9, isAvailable: true },
  ]);
  logger.info("Seed menu items created");
}

async function seedEmployees() {
  const count = await Employee.countDocuments();
  if (count > 0) return;

  await Employee.insertMany([
    { empNo: "EMP-001", name: "Front Desk", role: ROLES.RECEPTION, phone: "000-000-0000", address: "Reception" },
    { empNo: "EMP-002", name: "Housekeeping", role: ROLES.HOUSEKEEPING, phone: "000-000-0001", address: "Housekeeping" },
    { empNo: "EMP-003", name: "Restaurant Lead", role: ROLES.RESTAURANT_STAFF, phone: "000-000-0002", address: "Restaurant" },
  ]);
  logger.info("Seed employees created");
}

async function main() {
  if (!env.MONGO_URI) throw new Error("MONGO_URI is missing in .env");
  await mongoose.connect(env.MONGO_URI);

  await seedAdmin();
  await seedRooms();
  await seedMenu();
  await seedEmployees();

  await mongoose.disconnect();
  logger.info("Seed complete");
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});
