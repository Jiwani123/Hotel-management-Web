import Booking from "../models/Booking.js";
import Order from "../models/Order.js";
import TableReservation from "../models/TableReservation.js";
import User from "../models/User.js";
import { PAYABLE_TYPES } from "../constants/payment.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { sendEmail } from "./mailer.js";

function escapeHtml(input) {
  return String(input ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMoney(amount, currency = "lkr") {
  const num = Number(amount);
  const cur = String(currency || "lkr").toUpperCase();
  if (!Number.isFinite(num)) return `${cur} 0.00`;
  return `${cur} ${num.toFixed(2)}`;
}

async function resolveCustomerForPayable({ payableType, refId }) {
  if (payableType === PAYABLE_TYPES.ROOM) {
    const booking = await Booking.findById(refId).select("createdBy");
    if (!booking) return null;
    return User.findById(booking.createdBy).select("email name");
  }

  if (payableType === PAYABLE_TYPES.RESTAURANT) {
    const order = await Order.findById(refId).select("createdBy");
    if (!order) return null;
    return User.findById(order.createdBy).select("email name");
  }

  if (payableType === PAYABLE_TYPES.RESERVATION) {
    const resv = await TableReservation.findById(refId).select("createdBy");
    if (!resv) return null;
    return User.findById(resv.createdBy).select("email name");
  }

  return null;
}

export async function sendPaymentReceiptEmail({ payment, summary }) {
  try {
    const customer = await resolveCustomerForPayable({ payableType: payment.payableType, refId: payment.refId });
    if (!customer?.email) {
      logger.warn("Receipt email skipped: missing customer email", { paymentId: payment._id });
      return { skipped: true };
    }

    const receiptUrl = `${env.CORS_ORIGIN}/customer/receipt/${payment._id}`;
    const subject = `Payment receipt ${payment.receiptNo}`;
    const paidAt = payment.paidAt ? new Date(payment.paidAt).toLocaleString() : "—";

    const title = summary?.title ?? payment.payableType;
    const subtitle = summary?.subtitle ?? `Reference: ${payment.refId}`;

    const safeName = escapeHtml(customer.name || "Customer");
    const safeTitle = escapeHtml(title);
    const safeSubtitle = escapeHtml(subtitle);
    const safeReceiptNo = escapeHtml(payment.receiptNo);
    const safeMethod = escapeHtml(payment.method);
    const safePayableType = escapeHtml(payment.payableType);
    const safePaidAt = escapeHtml(paidAt);
    const safeAmount = escapeHtml(formatMoney(payment.amount, payment.currency));
    const safeUrl = escapeHtml(receiptUrl);

    const text = [
      `Hi ${customer.name || "Customer"},`,
      "",
      `Thanks for your payment. Here is your receipt: ${payment.receiptNo}`,
      "",
      `Item: ${title}`,
      `${subtitle}`,
      "",
      `Amount: ${formatMoney(payment.amount, payment.currency)}`,
      `Method: ${payment.method}`,
      `Type: ${payment.payableType}`,
      `Paid at: ${paidAt}`,
      "",
      `View/print receipt: ${receiptUrl}`,
    ].join("\n");

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2 style="margin:0 0 12px">Payment receipt</h2>
        <p style="margin:0 0 16px">Hi ${safeName},</p>
        <p style="margin:0 0 16px">Thanks for your payment. Your receipt details are below.</p>

        <div style="border:1px solid #e5e7eb;border-radius:12px;padding:14px">
          <div style="display:flex;justify-content:space-between;gap:10px">
            <div>
              <div style="font-weight:700">${safeTitle}</div>
              <div style="color:#6b7280;font-size:13px">${safeSubtitle}</div>
            </div>
            <div style="font-weight:800">${safeAmount}</div>
          </div>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0" />
          <div style="color:#374151;font-size:13px">
            <div><b>Receipt:</b> ${safeReceiptNo}</div>
            <div><b>Method:</b> ${safeMethod}</div>
            <div><b>Type:</b> ${safePayableType}</div>
            <div><b>Paid at:</b> ${safePaidAt}</div>
          </div>
        </div>

        <p style="margin:16px 0 0">
          <a href="${safeUrl}" style="display:inline-block;padding:10px 14px;border-radius:10px;background:#111827;color:#fff;text-decoration:none">View / Print receipt</a>
        </p>

        <p style="margin:18px 0 0;color:#6b7280;font-size:12px">
          If you did not make this payment, please contact the hotel.
        </p>
      </div>
    `.trim();

    return await sendEmail({ to: customer.email, subject, text, html });
  } catch (e) {
    logger.warn("Failed to send receipt email", { error: e?.message, paymentId: payment?._id });
    return { skipped: true, error: e?.message };
  }
}
