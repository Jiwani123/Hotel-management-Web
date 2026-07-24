import { createServer } from "http";
import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { logger } from "./config/logger.js";

try {
  await connectDB();
} catch (error) {
  logger.error("Startup aborted: database connection failed.", {
    name: error?.name,
    message: error?.message,
  });
  process.exit(1);
}

const server = createServer(app);

let currentPort = env.PORT;
let listening = false;

function startListen(port) {
  if (listening) return;
  currentPort = port;
  server.listen(port, () => {
    listening = true;
    logger.info(`API running on http://localhost:${port}`);
  });
}

server.on("error", (err) => {
  if (err?.code === "EADDRINUSE") {
    if (env.NODE_ENV !== "production") {
      const nextPort = Number(currentPort) + 1;
      logger.warn(`Port ${currentPort} is already in use. Trying ${nextPort}...`);
      setTimeout(() => startListen(nextPort), 250);
      return;
    }
    logger.error(`Port ${currentPort} is already in use. Set PORT or stop the other process.`);
    process.exit(1);
  }

  logger.error("Server listen error", { code: err?.code, message: err?.message });
  process.exit(1);
});

function shutdown(signal) {
  logger.info(`Shutting down (${signal})...`);
  try {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1500).unref();
  } catch {
    process.exit(0);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startListen(env.PORT);
