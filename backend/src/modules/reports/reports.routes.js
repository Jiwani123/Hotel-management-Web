import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { ROLES } from "../../constants/roles.js";
import {
	revenueSummary,
	occupancySummary,
	topMenuItems,
	ratingTrends,
	dashboard,
	exportPaymentsCsv,
	exportBookingsCsv,
	exportOrdersCsv,
	invoiceByPayment,
	invoicePdfByPayment,
	exportResourceCsv,
} from "./reports.controller.js";

const router = Router();
router.use(
	requireAuth,
	requireRole(ROLES.ADMIN, ROLES.RECEPTION, ROLES.RESTAURANT_STAFF, ROLES.HOUSEKEEPING)
);

// Analytics dashboard (date-range aware)
router.get("/dashboard", dashboard);

// CSV exports
router.get("/export/payments", exportPaymentsCsv);
router.get("/export/bookings", exportBookingsCsv);
router.get("/export/orders", exportOrdersCsv);
router.get("/export/:resource", exportResourceCsv);

// Invoice generation
router.get("/invoices/payment/:id", invoiceByPayment);
router.get("/invoices/payment/:id/pdf", invoicePdfByPayment);

router.get("/revenue", revenueSummary);
router.get("/occupancy", occupancySummary);
router.get("/top-menu-items", topMenuItems);
router.get("/rating-trends", ratingTrends);

export default router;
