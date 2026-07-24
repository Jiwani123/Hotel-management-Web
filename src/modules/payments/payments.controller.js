import { ok, created } from "../../shared/apiResponse.js";
import { ForbiddenError, NotFoundError } from "../../shared/errors.js";
import Booking from "../../models/Booking.js";
import Order from "../../models/Order.js";
import TableReservation from "../../models/TableReservation.js";
import mongoose from "mongoose";
import Stripe from "stripe";
import { env } from "../../config/env.js";
import { BadRequestError } from "../../shared/errors.js";
import { createPayment, listPayments, getPayment, updatePayment, deletePayment, getPortalQuote, createPortalPayment, createPortalCheckoutSession, setPortalPaymentOption, confirmStripePayment } from "./payments.service.js";

export async function create(req,res,next){ try{
  const doc = await createPayment({ ...req.validated.body, createdBy: req.user.sub });
  return created(res, doc, "Payment recorded");
}catch(e){ return next(e);} }

export async function list(req,res,next){ try{
  const isCustomer = req.user.role === "CUSTOMER";

  let refIds = null;
  if (isCustomer) {
    const [bookings, orders, reservations] = await Promise.all([
      Booking.find({ createdBy: req.user.sub }).select("_id"),
      Order.find({ createdBy: req.user.sub }).select("_id"),
      TableReservation.find({ createdBy: req.user.sub }).select("_id"),
    ]);
    refIds = [
      ...bookings.map((b) => b._id),
      ...orders.map((o) => o._id),
      ...reservations.map((r) => r._id),
    ];
  }

  const result = await listPayments({
    ...req.validated.query,
    ...(isCustomer ? { refIds } : {}),
  });
  return ok(res, result, "Payments");
}catch(e){ return next(e);} }

export async function getById(req,res,next){ try{
  const doc = await getPayment(req.validated.params.id);
  if(!doc) throw new NotFoundError("Payment not found");
  if (req.user.role === "CUSTOMER") {
    const [booking, order, reservation] = await Promise.all([
      Booking.findOne({ _id: doc.refId, createdBy: req.user.sub }).select("_id"),
      Order.findOne({ _id: doc.refId, createdBy: req.user.sub }).select("_id"),
      TableReservation.findOne({ _id: doc.refId, createdBy: req.user.sub }).select("_id"),
    ]);
    if (!booking && !order && !reservation) throw new ForbiddenError("Not allowed");
  }
  return ok(res, doc, "Payment");
}catch(e){ return next(e);} }

export async function portalQuote(req, res, next) {
  try {
    const quote = await getPortalQuote({
      payableType: req.validated.query.payableType,
      refId: req.validated.query.refId,
      userId: req.user.sub,
    });
    return ok(res, quote, "Payment quote");
  } catch (e) {
    return next(e);
  }
}

export async function portalPay(req, res, next) {
  try {
    const payment = await createPortalPayment({
      payableType: req.validated.body.payableType,
      refId: req.validated.body.refId,
      method: req.validated.body.method,
      userId: req.user.sub,
    });
    return created(res, payment, "Payment recorded");
  } catch (e) {
    return next(e);
  }
}

export async function portalCheckout(req, res, next) {
  try {
    const session = await createPortalCheckoutSession({
      payableType: req.validated.body.payableType,
      refId: req.validated.body.refId,
      userId: req.user.sub,
    });
    return ok(res, session, "Checkout session created");
  } catch (e) {
    return next(e);
  }
}

export async function portalSetOption(req, res, next) {
  try {
    const result = await setPortalPaymentOption({
      payableType: req.validated.body.payableType,
      refId: req.validated.body.refId,
      option: req.validated.body.option,
      userId: req.user.sub,
    });
    return ok(res, result, "Payment option saved");
  } catch (e) {
    return next(e);
  }
}

export async function portalConfirmStripe(req, res, next) {
  try {
    const result = await confirmStripePayment({
      sessionId: req.validated.query.sessionId,
      userId: req.user.sub,
    });
    return ok(res, result, "Payment status");
  } catch (e) {
    return next(e);
  }
}

export async function stripeWebhook(req, res) {
  try {
    if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
      return res.status(400).json({ ok: false, message: "Stripe is not configured" });
    }

    const sig = req.headers["stripe-signature"];
    if (!sig) return res.status(400).json({ ok: false, message: "Missing stripe-signature header" });

    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    const rawBody = req.rawBody;
    if (!rawBody) return res.status(400).json({ ok: false, message: "Missing raw body" });

    const event = stripe.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const md = session?.metadata ?? {};
      const payableType = md.payableType;
      const refId = md.refId;
      const userId = md.userId;

      if (!payableType || !refId || !userId) {
        throw new BadRequestError("Missing checkout metadata");
      }
      if (!mongoose.isValidObjectId(refId) || !mongoose.isValidObjectId(userId)) {
        throw new BadRequestError("Invalid checkout metadata");
      }

      const amountTotal = Number(session?.amount_total ?? 0);
      const currency = String(session?.currency ?? env.STRIPE_CURRENCY ?? "usd").toLowerCase();
      const amount = amountTotal / 100;
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestError("Invalid checkout amount");
      }

      await createPayment({
        payableType,
        refId,
        amount,
        method: "CARD",
        createdBy: userId,
        provider: "STRIPE",
        providerRef: session.id,
        currency,
        sendReceiptEmail: true,
      });
    }

    return res.json({ received: true });
  } catch (err) {
    return res.status(400).json({ ok: false, message: err?.message ?? "Webhook error" });
  }
}

export async function update(req,res,next){ try{
  const doc = await updatePayment(req.validated.params.id, req.validated.body);
  if(!doc) throw new NotFoundError("Payment not found");
  return ok(res, doc, "Payment updated");
}catch(e){ return next(e);} }

export async function remove(req,res,next){ try{
  const doc = await deletePayment(req.validated.params.id);
  if(!doc) throw new NotFoundError("Payment not found");
  return ok(res, {deleted:true}, "Payment deleted");
}catch(e){ return next(e);} }
