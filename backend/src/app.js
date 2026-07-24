import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import { sanitizeRequest } from "./middleware/sanitize.js";
import { xssSanitizeRequest } from "./middleware/xss.js";
import hpp from "hpp";

import { env } from "./config/env.js";
import { rateLimiter } from "./middleware/rateLimit.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";

import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import employeesRoutes from "./modules/employees/employees.routes.js";
import roomsRoutes from "./modules/rooms/rooms.routes.js";
import bookingsRoutes from "./modules/bookings/bookings.routes.js";
import paymentsRoutes from "./modules/payments/payments.routes.js";
import feedbackRoutes from "./modules/feedback/feedback.routes.js";
import cleaningRoutes from "./modules/cleaning/cleaning.routes.js";
import menuRoutes from "./modules/menu/menu.routes.js";
import ordersRoutes from "./modules/orders/orders.routes.js";
import tableResRoutes from "./modules/tableReservations/tableReservations.routes.js";
import reportsRoutes from "./modules/reports/reports.routes.js";
import notificationsRoutes from "./modules/notifications/notifications.routes.js";
import backupRoutes from "./modules/backup/backup.routes.js";
import publicRoutes from "./modules/public/public.routes.js";
import uploadsRoutes from "./modules/uploads/uploads.routes.js";

const app = express();

app.use(
	helmet({
		crossOriginResourcePolicy: { policy: "cross-origin" },
	})
);
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(compression());
app.use(express.json({
	limit: "2mb",
	verify: (req, res, buf) => {
		// Stripe webhooks require the exact raw payload for signature verification.
		// Keep this scoped to the webhook route only.
		if (req.originalUrl?.startsWith("/api/payments/webhook/stripe")) {
			req.rawBody = buf;
		}
	},
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Security: prevent NoSQL injection by stripping Mongo operator keys like `$` and `.`.
app.use(sanitizeRequest);
// Security: sanitize input strings to reduce XSS payload persistence.
app.use(xssSanitizeRequest);
app.use(hpp());

app.use("/api", rateLimiter);

app.get("/api/health", (req, res) => res.json({ ok: true, name: "Hotel HMS API" }));

// Swagger
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve uploaded assets publicly
const uploadsDir = path.join(__dirname, "..", "uploads");
app.use("/uploads", express.static(uploadsDir));
const spec = YAML.load(path.join(__dirname, "docs", "openapi.yaml"));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(spec));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/employees", employeesRoutes);
app.use("/api/rooms", roomsRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/cleaning", cleaningRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/table-reservations", tableResRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/backup", backupRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/uploads", uploadsRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
