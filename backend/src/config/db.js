import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "./logger.js";

export async function connectDB() {
  mongoose.set("strictQuery", true);

  async function connectInMemory(reason) {
    try {
      const { MongoMemoryServer } = await import("mongodb-memory-server");

      // On some Windows machines, newer MongoDB binaries can fail to start
      // (CPU instruction set / OS compatibility). Allow pinning a known-good version.
      // Default to an older, widely compatible version on Windows.
      const binaryVersion =
        process.env.MONGOMS_VERSION || (process.platform === "win32" ? "4.4.29" : undefined);

      const server = await MongoMemoryServer.create({
        instance: { dbName: "hotelMGMT" },
        ...(binaryVersion ? { binary: { version: binaryVersion } } : {}),
      });
      const uri = server.getUri();
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10_000,
        connectTimeoutMS: 10_000,
      });
      logger.warn("MongoDB connected using in-memory server (development only)", {
        reason,
        ...(binaryVersion ? { binaryVersion } : {}),
      });
      return;
    } catch (e) {
      logger.error("Failed to start in-memory MongoDB", {
        message: e?.message,
        name: e?.name,
      });
      throw e;
    }
  }

  if (!env.MONGO_URI) {
    if (env.NODE_ENV !== "production") {
      await connectInMemory("MONGO_URI missing");
      return;
    }
    throw new Error("MONGO_URI is missing in .env");
  }

  try {
    await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 10_000,
      connectTimeoutMS: 10_000,
    });
    logger.info("MongoDB connected");
  } catch (error) {
    const msg = String(error?.message ?? "");
    const isDns = msg.includes("ENOTFOUND") || msg.includes("querySrv") || error?.code === "ENOTFOUND";
    if (env.NODE_ENV !== "production" && isDns) {
      await connectInMemory("DNS/Atlas connection failed");
      return;
    }
    logger.error(
      "MongoDB connection failed. If you're using Atlas, check Network Access (IP whitelist) and that your network allows outbound TCP 27017.",
      {
        message: error?.message,
        name: error?.name,
      }
    );
    throw error;
  }
}
