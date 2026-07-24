import Payment from "../../models/Payment.js";
import mongoose from "mongoose";
import Booking from "../../models/Booking.js";
import Order from "../../models/Order.js";
import TableReservation from "../../models/TableReservation.js";
import Notification from "../../models/Notification.js";
import { generateReceiptNo } from "../../shared/receipt.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../shared/errors.js";
import { PAYABLE_TYPES } from "../../constants/payment.js";
import { env } from "../../config/env.js";
import Stripe from "stripe";
import { sendPaymentReceiptEmail } from "../../shared/paymentReceiptEmail.js";
import { escapeRegex } from "../../shared/search.js";

const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;

function computeNights(checkIn, checkOut) {
  const inDt = new Date(checkIn);
  const outDt = new Date(checkOut);
  const diff = outDt - inDt;
  if (!Number.isFinite(diff) || diff <= 0) return 0;
  return Math.ceil(diff / 86400000);
}

function getReservationDepositAmount() {
  const raw = process.env.RESERVATION_DEPOSIT_AMOUNT;
  if (raw == null || raw === "") return 0;
  const val = Number(raw);
  if (!Number.isFinite(val) || val < 0) return 0;
  return val;
}

export async function createPayment({ payableType, refId, amount, method, paidAt, createdBy, provider = "MANUAL", providerRef = null, currency = env.STRIPE_CURRENCY || "lkr", sendReceiptEmail = false }) {
  // MANUAL payments must still have a unique providerRef because the DB has a unique
  // compound index on (provider, providerRef). Using receiptNo makes inserts safe.
  const receiptNo = generateReceiptNo("RCPT");
  const finalProviderRef = providerRef || (provider === "MANUAL" ? receiptNo : null);

  if (finalProviderRef) {
    const existing = await Payment.findOne({ provider, providerRef: finalProviderRef });
    if (existing) return existing;
  }

  if (payableType === PAYABLE_TYPES.ROOM) {
    const booking = await Booking.findById(refId);
    if (!booking) throw new NotFoundError("Booking not found");
    if (["CANCELLED", "REJECTED"].includes(booking.status)) throw new BadRequestError(`Cannot pay for ${booking.status} booking`);
    if (booking.paymentId) throw new BadRequestError("Booking already paid");
  }

  if (payableType === PAYABLE_TYPES.RESTAURANT) {
    const order = await Order.findById(refId);
    if (!order) throw new NotFoundError("Order not found");
    if (order.paymentId) throw new BadRequestError("Order already paid");
  }

  if (payableType === PAYABLE_TYPES.RESERVATION) {
    const resv = await TableReservation.findById(refId);
    if (!resv) throw new NotFoundError("Reservation not found");
    if (["CANCELLED", "REJECTED"].includes(resv.status)) throw new BadRequestError(`Cannot pay for ${resv.status} reservation`);
    if (resv.paymentId) throw new BadRequestError("Reservation already paid");
  }

  const payment = await Payment.create({
    payableType,
    refId,
    amount,
    method,
    provider,
    providerRef: finalProviderRef || undefined,
    currency,
    paidAt: paidAt ? new Date(paidAt) : new Date(),
    receiptNo,
    createdBy,
  });

  if (payableType === PAYABLE_TYPES.RESTAURANT) {
    await Order.findByIdAndUpdate(refId, { paymentId: payment._id, status: "PAID" });
  }

  if (payableType === PAYABLE_TYPES.ROOM) {
    await Booking.findByIdAndUpdate(refId, { paymentId: payment._id });
  }

  if (payableType === PAYABLE_TYPES.RESERVATION) {
    await TableReservation.findByIdAndUpdate(refId, { paymentId: payment._id });
  }

  await Notification.create({
    userId: createdBy,
    title: "Payment recorded",
    message: `Payment ${receiptNo} recorded for ${payableType}`,
    type: "PAYMENT",
    meta: { paymentId: payment._id, payableType, refId },
    createdBy,
  });

  // Send receipt email for Stripe payments (async, non-blocking).
  if (sendReceiptEmail && provider === "STRIPE") {
    setImmediate(() => {
      sendPaymentReceiptEmail({ payment }).catch(() => undefined);
    });
  }

  return payment;
}

export async function getPortalQuote({ payableType, refId, userId }) {
  if (payableType === PAYABLE_TYPES.ROOM) {
    const booking = await Booking.findById(refId).populate("roomId");
    if (!booking) throw new NotFoundError("Booking not found");
    if (String(booking.createdBy) !== String(userId)) throw new ForbiddenError("Not allowed");
    if (["CANCELLED", "REJECTED"].includes(booking.status)) throw new BadRequestError(`Cannot pay for ${booking.status} booking`);
    if (booking.paymentId) throw new BadRequestError("Booking already paid");

    const nights = computeNights(booking.checkIn, booking.checkOut);
    const rate = Number(booking.roomId?.pricePerNight ?? 0);
    if (!Number.isFinite(rate) || rate < 0) throw new BadRequestError("Invalid room rate");
    if (nights <= 0) throw new BadRequestError("Invalid booking date range");

    const amount = rate * nights;
    return {
      payableType,
      refId,
      amount,
      summary: {
        title: `Room ${booking.roomId?.roomNo ?? "—"}`,
        subtitle: `${nights} night${nights === 1 ? "" : "s"} · LKR ${rate}/night`,
        status: booking.status,
      },
    };
  }

  if (payableType === PAYABLE_TYPES.RESTAURANT) {
    const order = await Order.findById(refId);
    if (!order) throw new NotFoundError("Order not found");
    if (String(order.createdBy) !== String(userId)) throw new ForbiddenError("Not allowed");
    if (order.paymentId || order.status === "PAID") throw new BadRequestError("Order already paid");
    if (order.status === "CANCELLED") throw new BadRequestError("Cannot pay for CANCELLED order");

    const amount = Number(order.total ?? 0);
    if (!Number.isFinite(amount) || amount < 0) throw new BadRequestError("Invalid order total");
    return {
      payableType,
      refId,
      amount,
      summary: {
        title: `Restaurant Order`,
        subtitle: `${order.orderType} · ${order.status}`,
        status: order.status,
      },
    };
  }

  if (payableType === PAYABLE_TYPES.RESERVATION) {
    const resv = await TableReservation.findById(refId);
    if (!resv) throw new NotFoundError("Reservation not found");
    if (String(resv.createdBy) !== String(userId)) throw new ForbiddenError("Not allowed");
    if (["CANCELLED", "REJECTED"].includes(resv.status)) throw new BadRequestError(`Cannot pay for ${resv.status} reservation`);
    if (resv.paymentId) throw new BadRequestError("Reservation already paid");

    const amount = getReservationDepositAmount();
    return {
      payableType,
      refId,
      amount,
      summary: {
        title: `Table Reservation`,
        subtitle: `${new Date(resv.dateTime).toLocaleString()} · Party of ${resv.partySize}`,
        status: resv.status,
      },
    };
  }

  throw new BadRequestError("Unsupported payableType");
}

export async function createPortalPayment({ payableType, refId, method, userId }) {
  const quote = await getPortalQuote({ payableType, refId, userId });
  return createPayment({
    payableType,
    refId,
    amount: quote.amount,
    method,
    createdBy: userId,
  });
}

export async function createPortalCheckoutSession({ payableType, refId, userId }) {
  if (!stripe) throw new BadRequestError("Stripe is not configured");

  const quote = await getPortalQuote({ payableType, refId, userId });
  const amount = Number(quote.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new BadRequestError("Amount must be greater than 0");
  }

  const currency = env.STRIPE_CURRENCY || "lkr";
  const unitAmount = Math.round(amount * 100);

  const baseSuccessUrl = env.STRIPE_SUCCESS_URL || `${env.CORS_ORIGIN}/customer?tab=payments`;
  const baseCancelUrl = env.STRIPE_CANCEL_URL || `${env.CORS_ORIGIN}/customer?tab=payments`;
  const joiner = baseSuccessUrl.includes("?") ? "&" : "?";
  const successUrl = `${baseSuccessUrl}${joiner}stripe=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelJoiner = baseCancelUrl.includes("?") ? "&" : "?";
  const cancelUrl = `${baseCancelUrl}${cancelJoiner}stripe=cancel`;

  // Persist intent: user selected card payment
  if (payableType === PAYABLE_TYPES.ROOM) {
    await Booking.findByIdAndUpdate(refId, { paymentOption: "CARD" });
  }
  if (payableType === PAYABLE_TYPES.RESTAURANT) {
    await Order.findByIdAndUpdate(refId, { paymentOption: "CARD" });
  }
  if (payableType === PAYABLE_TYPES.RESERVATION) {
    await TableReservation.findByIdAndUpdate(refId, { paymentOption: "CARD" });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: String(userId),
    metadata: {
      payableType: String(payableType),
      refId: String(refId),
      userId: String(userId),
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: unitAmount,
          product_data: {
            name: quote.summary?.title ?? "Hotel payment",
            description: quote.summary?.subtitle ?? undefined,
          },
        },
      },
    ],
  });

  if (!session?.url) throw new BadRequestError("Failed to create checkout session");
  return { url: session.url, id: session.id };
}

export async function setPortalPaymentOption({ payableType, refId, option, userId }) {
  // Validate ownership and paid-state by reusing the quote checks.
  await getPortalQuote({ payableType, refId, userId });

  if (payableType === PAYABLE_TYPES.ROOM) {
    await Booking.findByIdAndUpdate(refId, { paymentOption: option });
    return { ok: true };
  }
  if (payableType === PAYABLE_TYPES.RESTAURANT) {
    await Order.findByIdAndUpdate(refId, { paymentOption: option });
    return { ok: true };
  }
  if (payableType === PAYABLE_TYPES.RESERVATION) {
    await TableReservation.findByIdAndUpdate(refId, { paymentOption: option });
    return { ok: true };
  }

  throw new BadRequestError("Unsupported payableType");
}

export async function confirmStripePayment({ sessionId, userId }) {
  const existing = await Payment.findOne({ provider: "STRIPE", providerRef: sessionId, createdBy: userId });
  if (existing) return { status: "PAID", payment: existing };

  // If the webhook is delayed/misconfigured, confirm via Stripe API and record the payment here.
  if (!stripe) return { status: "PENDING" };

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (!session) return { status: "PENDING" };
  if (session.payment_status !== "paid") return { status: "PENDING" };

  const md = session?.metadata ?? {};
  const payableType = md.payableType;
  const refId = md.refId;
  const sessionUserId = md.userId;

  // Ownership check: session must belong to current user.
  if (!payableType || !refId || !sessionUserId) return { status: "PENDING" };
  if (String(sessionUserId) !== String(userId)) throw new ForbiddenError("Not allowed");

  // Validate totals against server-side quote (prevents tampering).
  const quote = await getPortalQuote({ payableType, refId, userId });
  const quoteAmount = Number(quote?.amount ?? 0);

  const amountTotal = Number(session?.amount_total ?? 0);
  const paidAmount = amountTotal / 100;
  if (!Number.isFinite(paidAmount) || paidAmount <= 0) return { status: "PENDING" };

  // Accept minor rounding differences (e.g., floating conversions).
  if (Math.abs(paidAmount - quoteAmount) > 0.01) {
    throw new BadRequestError("Paid amount does not match quote");
  }

  const currency = String(session?.currency ?? env.STRIPE_CURRENCY ?? "usd").toLowerCase();

  try {
    const created = await createPayment({
      payableType,
      refId,
      amount: paidAmount,
      method: "CARD",
      createdBy: userId,
      provider: "STRIPE",
      providerRef: sessionId,
      currency,
      sendReceiptEmail: true,
    });
    return { status: "PAID", payment: created };
  } catch (e) {
    // If it was already paid by another path, try to return a linked payment record.
    const linked = await Payment.findOne({ payableType, refId, createdBy: userId }).sort("-paidAt");
    if (linked) return { status: "PAID", payment: linked };
    throw e;
  }
}

export async function listPayments({ page=1, limit=20, payableType, from, to, q, createdBy, refIds } = {}) {
  const filter = {};
  if (payableType) filter.payableType = payableType;
  if (q) {
    const or = [{ receiptNo: new RegExp(escapeRegex(q), "i") }];
    if (mongoose.isValidObjectId(q)) or.push({ refId: q });
    filter.$or = or;
  }
  if (createdBy) filter.createdBy = createdBy;
  if (refIds && refIds.length > 0) filter.refId = { $in: refIds };

  if (from || to) {
    filter.paidAt = {};
    if (from) filter.paidAt.$gte = new Date(from);
    if (to) filter.paidAt.$lte = new Date(to);
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Payment.find(filter).sort("-paidAt").skip(skip).limit(limit),
    Payment.countDocuments(filter),
  ]);

  return { items, total, page, limit, pages: Math.ceil(total/limit) };
}

export async function getPayment(id) {
  return Payment.findById(id);
}

export async function updatePayment(id, data) {
  const patch = { ...data };
  if (patch.paidAt) patch.paidAt = new Date(patch.paidAt);
  return Payment.findByIdAndUpdate(id, patch, { new: true, runValidators: true });
}

export async function deletePayment(id) {
  return Payment.findByIdAndDelete(id);
}
