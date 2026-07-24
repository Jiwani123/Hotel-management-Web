import { beforeAll, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongod;
let app;
let adminToken;

const ADMIN_EMAIL = "admin@test.local";
const ADMIN_PASSWORD = "Password123!";

async function ensureAdminToken() {
  if (adminToken) return adminToken;

  const login = await request(app).post("/api/auth/login").send({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (login.status === 200 && login.body?.data?.accessToken) {
    adminToken = login.body.data.accessToken;
    return adminToken;
  }

  const bootstrap = await request(app)
    .post("/api/auth/bootstrap-admin")
    .send({
      name: "Hotel Manager",
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

  expect(bootstrap.status).toBe(201);

  const login2 = await request(app).post("/api/auth/login").send({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  expect(login2.status).toBe(200);
  expect(login2.body?.data?.accessToken).toBeTruthy();
  adminToken = login2.body.data.accessToken;
  return adminToken;
}

async function bootTestDb() {
  mongod = await MongoMemoryServer.create();

  process.env.NODE_ENV = "test";
  process.env.MONGO_URI = mongod.getUri();
  process.env.CORS_ORIGIN = "http://localhost:5173";

  // Auth secrets for tests
  process.env.JWT_ACCESS_SECRET = "test_access_secret";
  process.env.JWT_REFRESH_SECRET = "test_refresh_secret";
  process.env.JWT_ACCESS_EXPIRES_IN = "15m";
  process.env.JWT_REFRESH_EXPIRES_IN = "7d";

  const { connectDB } = await import("../config/db.js");
  await connectDB();

  const mod = await import("../app.js");
  app = mod.default;
}

beforeAll(async () => {
  await bootTestDb();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe("API smoke", () => {
  it("GET /api/health", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body?.ok).toBe(true);
  });

  it("Admin auth -> me -> create room -> public list", async () => {
    const token = await ensureAdminToken();

    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(me.status).toBe(200);
    expect(me.body?.data?.user?.role).toBe("ADMIN");

    const room = await request(app)
      .post("/api/rooms")
      .set("Authorization", `Bearer ${token}`)
      .send({
        roomNo: "T-101",
        type: "Test Suite",
        pricePerNight: 100,
        status: "AVAILABLE",
        features: ["WiFi"],
      });

    expect(room.status).toBe(201);

    const publicRooms = await request(app).get("/api/public/rooms");
    expect(publicRooms.status).toBe(200);
    expect(Array.isArray(publicRooms.body?.data?.items)).toBe(true);
  });

  it("Restaurant POS: create order -> take CASH payment -> order becomes PAID", async () => {
    const token = await ensureAdminToken();

    const menu = await request(app)
      .post("/api/menu")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Test Burger",
        category: "Test",
        price: 10,
        isAvailable: true,
      });

    expect(menu.status).toBe(201);
    expect(menu.body?.data?._id).toBeTruthy();
    const menuItemId = menu.body.data._id;

    const order = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        orderType: "DINE_IN",
        tableNo: "A1",
        items: [{ menuItemId, qty: 2 }],
      });

    expect(order.status).toBe(201);
    expect(order.body?.data?._id).toBeTruthy();
    expect(order.body?.data?.status).toBe("PLACED");
    expect(order.body?.data?.total).toBe(20);
    const orderId = order.body.data._id;

    const payment = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${token}`)
      .send({
        payableType: "RESTAURANT",
        refId: orderId,
        amount: 20,
        method: "CASH",
      });

    expect(payment.status).toBe(201);
    expect(payment.body?.data?._id).toBeTruthy();
    expect(payment.body?.data?.payableType).toBe("RESTAURANT");
    expect(String(payment.body?.data?.refId)).toBe(String(orderId));
    expect(payment.body?.data?.method).toBe("CASH");

    const paidOrder = await request(app)
      .get(`/api/orders/${orderId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(paidOrder.status).toBe(200);
    expect(paidOrder.body?.data?.status).toBe("PAID");
    expect(String(paidOrder.body?.data?.paymentId)).toBe(String(payment.body.data._id));
  });
});
