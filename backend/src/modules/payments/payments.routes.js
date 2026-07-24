import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validate } from "../../middleware/validate.js";
import { ROLES } from "../../constants/roles.js";
import { listSchema, idParamSchema, createSchema, updateSchema, portalQuoteSchema, portalPaySchema, portalCheckoutSchema, portalOptionSchema, portalConfirmStripeSchema } from "./payments.validation.js";
import { create, list, getById, update, remove, portalQuote, portalPay, portalCheckout, portalSetOption, portalConfirmStripe, stripeWebhook } from "./payments.controller.js";

const router = Router();

// Stripe webhook (must not require auth)
router.post("/webhook/stripe", stripeWebhook);

router.use(requireAuth);

router.get("/", requireRole(ROLES.ADMIN, ROLES.RECEPTION, ROLES.RESTAURANT_STAFF, ROLES.CUSTOMER), validate(listSchema), list);

// Customer payment portal (server-calculated amounts)
router.get("/portal/quote", requireRole(ROLES.CUSTOMER), validate(portalQuoteSchema), portalQuote);
router.post("/portal/pay", requireRole(ROLES.CUSTOMER), validate(portalPaySchema), portalPay);
router.post("/portal/checkout", requireRole(ROLES.CUSTOMER), validate(portalCheckoutSchema), portalCheckout);
router.post("/portal/option", requireRole(ROLES.CUSTOMER), validate(portalOptionSchema), portalSetOption);
router.get("/portal/stripe/confirm", requireRole(ROLES.CUSTOMER), validate(portalConfirmStripeSchema), portalConfirmStripe);

router.post("/", requireRole(ROLES.ADMIN, ROLES.RECEPTION, ROLES.RESTAURANT_STAFF), validate(createSchema), create);
router.get("/:id", requireRole(ROLES.ADMIN, ROLES.RECEPTION, ROLES.RESTAURANT_STAFF, ROLES.CUSTOMER), validate(idParamSchema), getById);
router.patch("/:id", requireRole(ROLES.ADMIN), validate(updateSchema), update);
router.delete("/:id", requireRole(ROLES.ADMIN), validate(idParamSchema), remove);

export default router;
