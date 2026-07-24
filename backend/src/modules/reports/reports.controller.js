import { ok } from "../../shared/apiResponse.js";
import Payment from "../../models/Payment.js";
import Booking from "../../models/Booking.js";
import Order from "../../models/Order.js";
import Feedback from "../../models/Feedback.js";
import TableReservation from "../../models/TableReservation.js";
import MenuItem from "../../models/MenuItem.js";
import Room from "../../models/Room.js";
import { NotFoundError, BadRequestError } from "../../shared/errors.js";
import PDFDocument from "pdfkit";

function isDateOnly(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function parseRange({ from, to }) {
  const now = new Date();
  const defaultTo = new Date(now);
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 29);

  let fromDate = from ? new Date(from) : defaultFrom;
  let toDate = to ? new Date(to) : defaultTo;

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new BadRequestError("Invalid date range. Use ISO dates like 2026-03-01.");
  }

  // Normalize date-only inputs to whole-day range.
  if (isDateOnly(from)) {
    fromDate = new Date(fromDate);
    fromDate.setHours(0, 0, 0, 0);
  }
  if (isDateOnly(to)) {
    toDate = new Date(toDate);
    toDate.setHours(23, 59, 59, 999);
  }

  if (fromDate > toDate) {
    throw new BadRequestError("Invalid date range: 'from' must be <= 'to'.");
  }

  return { from: fromDate, to: toDate };
}

function parseRangeOptional({ from, to }) {
  const hasFrom = typeof from === "string" && from.trim() !== "";
  const hasTo = typeof to === "string" && to.trim() !== "";
  if (!hasFrom && !hasTo) return null;
  return parseRange({ from, to });
}

function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows, headers) {
  const headerLine = headers.map((h) => csvEscape(h.label)).join(",");
  const lines = rows.map((r) => headers.map((h) => csvEscape(h.get(r))).join(","));
  return [headerLine, ...lines].join("\n") + "\n";
}

async function buildInvoiceData(paymentId) {
  const payment = await Payment.findById(paymentId)
    .populate("createdBy", "name email")
    .lean();
  if (!payment) throw new NotFoundError("Payment not found");

  const payableType = payment.payableType;
  const refId = payment.refId;

  let title = "Invoice";
  let customer = {
    name: payment.createdBy?.name ?? "—",
    email: payment.createdBy?.email ?? "—",
    phone: "",
  };

  let lineItems = [];
  let context = {};

  if (payableType === "ROOM") {
    const booking = await Booking.findById(refId)
      .populate("roomId", "roomNo type pricePerNight")
      .lean();
    if (!booking) throw new NotFoundError("Booking not found for this payment");
    title = "Room Booking";
    customer = {
      name: booking.customerName ?? customer.name,
      email: customer.email,
      phone: booking.customerContact ?? "",
    };
    const room = booking.roomId;
    const checkIn = new Date(booking.checkIn);
    const checkOut = new Date(booking.checkOut);
    const nights = Math.max(1, Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)));
    const unit = Number(room?.pricePerNight ?? 0);
    const total = unit * nights;
    lineItems = [
      {
        description: room?.roomNo ? `Room ${room.roomNo} (${room.type ?? ""})` : "Room booking",
        qty: nights,
        unitPrice: unit,
        total,
      },
    ];
    context = {
      bookingId: String(booking._id),
      roomNo: room?.roomNo ?? "",
      roomType: room?.type ?? "",
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      status: booking.status,
    };
  } else if (payableType === "RESTAURANT") {
    const order = await Order.findById(refId).lean();
    if (!order) throw new NotFoundError("Order not found for this payment");
    title = "Restaurant Order";

    const ids = (order.items ?? []).map((i) => i.menuItemId).filter(Boolean);
    const menu = await MenuItem.find({ _id: { $in: ids } }, "name category").lean();
    const byId = new Map(menu.map((m) => [String(m._id), m]));
    lineItems = (order.items ?? []).map((it) => {
      const mi = byId.get(String(it.menuItemId));
      const unit = Number(it.price ?? 0);
      const qty = Number(it.qty ?? 0);
      return {
        description: mi?.name ? `${mi.name}${mi.category ? ` (${mi.category})` : ""}` : "Menu item",
        qty,
        unitPrice: unit,
        total: unit * qty,
      };
    });
    context = {
      orderId: String(order._id),
      orderType: order.orderType,
      status: order.status,
      tableNo: order.tableNo,
      roomId: order.roomId ? String(order.roomId) : "",
    };
  } else if (payableType === "RESERVATION") {
    const r = await TableReservation.findById(refId).lean();
    if (!r) throw new NotFoundError("Reservation not found for this payment");
    title = "Table Reservation";
    customer = {
      name: r.customerName ?? customer.name,
      email: customer.email,
      phone: r.phone ?? "",
    };
    lineItems = [
      {
        description: "Reservation deposit",
        qty: 1,
        unitPrice: Number(payment.amount ?? 0),
        total: Number(payment.amount ?? 0),
      },
    ];
    context = {
      reservationId: String(r._id),
      dateTime: r.dateTime,
      partySize: r.partySize,
      status: r.status,
    };
  } else {
    lineItems = [
      { description: `${payableType} payment`, qty: 1, unitPrice: Number(payment.amount ?? 0), total: Number(payment.amount ?? 0) },
    ];
  }

  const subtotal = lineItems.reduce((s, li) => s + Number(li.total ?? 0), 0);

  return {
    invoiceNo: payment.receiptNo,
    issuedAt: payment.paidAt,
    currency: payment.currency ?? "lkr",
    payableType,
    refId: String(refId),
    payment: {
      id: String(payment._id),
      method: payment.method,
      provider: payment.provider,
      providerRef: payment.providerRef ?? "",
      paidAt: payment.paidAt,
      amountPaid: payment.amount,
    },
    title,
    customer,
    lineItems,
    totals: {
      subtotal,
      total: subtotal,
      paid: Number(payment.amount ?? 0),
      balance: Math.max(0, subtotal - Number(payment.amount ?? 0)),
    },
    context,
  };
}

function formatMoney(amount) {
  const n = Number(amount ?? 0);
  return n.toFixed(2);
}

function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export async function exportResourceCsv(req, res, next) {
  try {
    const resource = String(req.params.resource ?? "").trim();
    const range = parseRangeOptional({ from: req.query.from, to: req.query.to });
    const all = String(req.query.all ?? "") === "1";

    const pickRangeMatch = (field) => {
      if (all) return {};
      if (!range) return {};
      return { [field]: { $gte: range.from, $lte: range.to } };
    };

    const exporters = {
      payments: async () => {
        const rows = await Payment.find(pickRangeMatch("paidAt"))
          .sort({ paidAt: -1 })
          .populate("createdBy", "name email role")
          .lean();
        const csv = toCsv(rows, [
          { label: "receiptNo", get: (r) => r.receiptNo },
          { label: "paidAt", get: (r) => r.paidAt },
          { label: "payableType", get: (r) => r.payableType },
          { label: "refId", get: (r) => r.refId },
          { label: "amount", get: (r) => r.amount },
          { label: "currency", get: (r) => r.currency },
          { label: "method", get: (r) => r.method },
          { label: "provider", get: (r) => r.provider },
          { label: "providerRef", get: (r) => r.providerRef },
          { label: "createdByName", get: (r) => r.createdBy?.name ?? "" },
          { label: "createdByEmail", get: (r) => r.createdBy?.email ?? "" },
        ]);
        return { csv, filenameBase: "payments" };
      },

      bookings: async () => {
        const rows = await Booking.find(pickRangeMatch("createdAt"))
          .sort({ createdAt: -1 })
          .populate("roomId", "roomNo type pricePerNight")
          .populate("createdBy", "name email")
          .lean();
        const csv = toCsv(rows, [
          { label: "id", get: (r) => r._id },
          { label: "createdAt", get: (r) => r.createdAt },
          { label: "status", get: (r) => r.status },
          { label: "customerName", get: (r) => r.customerName },
          { label: "customerContact", get: (r) => r.customerContact },
          { label: "roomNo", get: (r) => r.roomId?.roomNo ?? "" },
          { label: "roomType", get: (r) => r.roomId?.type ?? "" },
          { label: "checkIn", get: (r) => r.checkIn },
          { label: "checkOut", get: (r) => r.checkOut },
          { label: "paymentOption", get: (r) => r.paymentOption },
          { label: "paymentId", get: (r) => r.paymentId },
          { label: "createdByEmail", get: (r) => r.createdBy?.email ?? "" },
        ]);
        return { csv, filenameBase: "bookings" };
      },

      orders: async () => {
        const rows = await Order.find(pickRangeMatch("createdAt"))
          .sort({ createdAt: -1 })
          .populate("roomId", "roomNo type")
          .populate("createdBy", "name email")
          .lean();
        const csv = toCsv(rows, [
          { label: "id", get: (r) => r._id },
          { label: "createdAt", get: (r) => r.createdAt },
          { label: "orderType", get: (r) => r.orderType },
          { label: "status", get: (r) => r.status },
          { label: "tableNo", get: (r) => r.tableNo },
          { label: "roomNo", get: (r) => r.roomId?.roomNo ?? "" },
          { label: "itemsCount", get: (r) => (Array.isArray(r.items) ? r.items.length : 0) },
          { label: "total", get: (r) => r.total },
          { label: "paymentOption", get: (r) => r.paymentOption },
          { label: "paymentId", get: (r) => r.paymentId },
          { label: "createdByEmail", get: (r) => r.createdBy?.email ?? "" },
        ]);
        return { csv, filenameBase: "orders" };
      },

      rooms: async () => {
        const match = all ? {} : pickRangeMatch("createdAt");
        const rows = await Room.find(match).sort({ roomNo: 1 }).lean();
        const csv = toCsv(rows, [
          { label: "roomNo", get: (r) => r.roomNo },
          { label: "type", get: (r) => r.type },
          { label: "pricePerNight", get: (r) => r.pricePerNight },
          { label: "status", get: (r) => r.status },
          { label: "features", get: (r) => Array.isArray(r.features) ? r.features.join(";") : "" },
          { label: "createdAt", get: (r) => r.createdAt },
        ]);
        return { csv, filenameBase: "rooms" };
      },

      employees: async () => {
        const match = all ? {} : pickRangeMatch("createdAt");
        const Employee = (await import("../../models/Employee.js")).default;
        const rows = await Employee.find(match).sort({ empNo: 1 }).lean();
        const csv = toCsv(rows, [
          { label: "empNo", get: (r) => r.empNo },
          { label: "name", get: (r) => r.name },
          { label: "role", get: (r) => r.role },
          { label: "phone", get: (r) => r.phone },
          { label: "address", get: (r) => r.address },
          { label: "salary", get: (r) => r.salary },
          { label: "isActive", get: (r) => r.isActive },
          { label: "createdAt", get: (r) => r.createdAt },
        ]);
        return { csv, filenameBase: "employees" };
      },

      menu: async () => {
        const match = all ? {} : pickRangeMatch("createdAt");
        const MenuItemModel = (await import("../../models/MenuItem.js")).default;
        const rows = await MenuItemModel.find(match).sort({ category: 1, name: 1 }).lean();
        const csv = toCsv(rows, [
          { label: "name", get: (r) => r.name },
          { label: "category", get: (r) => r.category },
          { label: "price", get: (r) => r.price },
          { label: "isAvailable", get: (r) => r.isAvailable },
          { label: "isVeg", get: (r) => r.isVeg },
          { label: "createdAt", get: (r) => r.createdAt },
        ]);
        return { csv, filenameBase: "menu_items" };
      },

      cleaning: async () => {
        const CleaningTask = (await import("../../models/CleaningTask.js")).default;
        const rows = await CleaningTask.find(pickRangeMatch("createdAt"))
          .sort({ scheduledAt: -1 })
          .populate("roomId", "roomNo")
          .populate("assignedTo", "empNo name")
          .populate("createdBy", "email")
          .lean();
        const csv = toCsv(rows, [
          { label: "id", get: (r) => r._id },
          { label: "scheduledAt", get: (r) => r.scheduledAt },
          { label: "status", get: (r) => r.status },
          { label: "roomNo", get: (r) => r.roomId?.roomNo ?? "" },
          { label: "assignedTo", get: (r) => r.assignedTo?.name ?? "" },
          { label: "notes", get: (r) => r.notes },
          { label: "createdByEmail", get: (r) => r.createdBy?.email ?? "" },
          { label: "createdAt", get: (r) => r.createdAt },
        ]);
        return { csv, filenameBase: "cleaning_tasks" };
      },

      feedback: async () => {
        const rows = await Feedback.find(pickRangeMatch("createdAt"))
          .sort({ createdAt: -1 })
          .populate("bookingId", "_id")
          .lean();
        const csv = toCsv(rows, [
          { label: "createdAt", get: (r) => r.createdAt },
          { label: "customerName", get: (r) => r.customerName },
          { label: "rating", get: (r) => r.rating },
          { label: "comment", get: (r) => r.comment },
          { label: "bookingId", get: (r) => r.bookingId?._id ?? r.bookingId ?? "" },
        ]);
        return { csv, filenameBase: "feedback" };
      },

      "table-reservations": async () => {
        const rows = await TableReservation.find(pickRangeMatch("createdAt"))
          .sort({ createdAt: -1 })
          .populate("createdBy", "email")
          .lean();
        const csv = toCsv(rows, [
          { label: "id", get: (r) => r._id },
          { label: "createdAt", get: (r) => r.createdAt },
          { label: "customerName", get: (r) => r.customerName },
          { label: "phone", get: (r) => r.phone },
          { label: "dateTime", get: (r) => r.dateTime },
          { label: "partySize", get: (r) => r.partySize },
          { label: "status", get: (r) => r.status },
          { label: "paymentOption", get: (r) => r.paymentOption },
          { label: "paymentId", get: (r) => r.paymentId },
          { label: "createdByEmail", get: (r) => r.createdBy?.email ?? "" },
        ]);
        return { csv, filenameBase: "table_reservations" };
      },

      users: async () => {
        const User = (await import("../../models/User.js")).default;
        const match = all ? {} : pickRangeMatch("createdAt");
        const rows = await User.find(match).sort({ createdAt: -1 }).lean();
        const csv = toCsv(rows, [
          { label: "name", get: (r) => r.name },
          { label: "email", get: (r) => r.email },
          { label: "role", get: (r) => r.role },
          { label: "isActive", get: (r) => r.isActive },
          { label: "lastLogin", get: (r) => r.lastLogin },
          { label: "createdAt", get: (r) => r.createdAt },
        ]);
        return { csv, filenameBase: "users" };
      },

      notifications: async () => {
        const Notification = (await import("../../models/Notification.js")).default;
        const rows = await Notification.find(pickRangeMatch("createdAt"))
          .sort({ createdAt: -1 })
          .populate("userId", "email")
          .populate("createdBy", "email")
          .lean();
        const csv = toCsv(rows, [
          { label: "createdAt", get: (r) => r.createdAt },
          { label: "type", get: (r) => r.type },
          { label: "title", get: (r) => r.title },
          { label: "message", get: (r) => r.message },
          { label: "toUser", get: (r) => r.userId?.email ?? "" },
          { label: "createdBy", get: (r) => r.createdBy?.email ?? "" },
          { label: "readAt", get: (r) => r.readAt },
        ]);
        return { csv, filenameBase: "notifications" };
      },
    };

    const exporter = exporters[resource];
    if (!exporter) {
      throw new BadRequestError(
        "Unknown export resource. Allowed: payments, bookings, orders, rooms, employees, menu, cleaning, feedback, table-reservations, users, notifications."
      );
    }

    const { csv, filenameBase } = await exporter();
    const stamp = range ? `${range.from.toISOString().slice(0, 10)}_to_${range.to.toISOString().slice(0, 10)}` : "all";
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=${filenameBase}_${stamp}.csv`);
    return res.send(csv);
  } catch (e) {
    return next(e);
  }
}

export async function dashboard(req, res, next) {
  try {
    const range = parseRange({ from: req.query.from, to: req.query.to });
    const matchPaid = { paidAt: { $gte: range.from, $lte: range.to } };

    const [
      paymentsTotals,
      revenueByType,
      revenueByDay,
      ratingDist,
      topItems,
      bookingsByStatus,
      ordersByStatus,
      activeStays,
      upcomingReservations,
    ] = await Promise.all([
      Payment.aggregate([
        { $match: matchPaid },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
      Payment.aggregate([
        { $match: matchPaid },
        { $group: { _id: "$payableType", total: { $sum: "$amount" }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      Payment.aggregate([
        { $match: matchPaid },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt" } },
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Feedback.aggregate([
        { $match: { createdAt: { $gte: range.from, $lte: range.to } } },
        { $group: { _id: "$rating", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: range.from, $lte: range.to } } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.menuItemId",
            qty: { $sum: "$items.qty" },
            revenue: { $sum: { $multiply: ["$items.qty", "$items.price"] } },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 8 },
        {
          $lookup: {
            from: "menuitems",
            localField: "_id",
            foreignField: "_id",
            as: "menuItem",
          },
        },
        { $unwind: { path: "$menuItem", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            qty: 1,
            revenue: 1,
            name: "$menuItem.name",
            category: "$menuItem.category",
          },
        },
      ]),
      Booking.aggregate([
        { $match: { createdAt: { $gte: range.from, $lte: range.to } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: range.from, $lte: range.to } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Booking.countDocuments({ status: { $in: ["APPROVED", "CHECKED_IN"] } }),
      TableReservation.countDocuments({ status: { $in: ["BOOKED", "APPROVED"] } }),
    ]);

    const totals = paymentsTotals?.[0] ?? { revenue: 0, count: 0 };
    const ratingsCount = (ratingDist ?? []).reduce((s, r) => s + Number(r.count ?? 0), 0);
    const avgRating = ratingsCount
      ? (ratingDist.reduce((s, r) => s + Number(r._id ?? 0) * Number(r.count ?? 0), 0) / ratingsCount)
      : 0;

    return ok(
      res,
      {
        range: {
          from: range.from.toISOString(),
          to: range.to.toISOString(),
        },
        kpis: {
          revenue: Number(totals.revenue ?? 0),
          paymentsCount: Number(totals.count ?? 0),
          activeStays: Number(activeStays ?? 0),
          upcomingReservations: Number(upcomingReservations ?? 0),
          avgRating: Number(avgRating.toFixed(2)),
        },
        revenueByType,
        revenueByDay: (revenueByDay ?? []).map((d) => ({ date: d._id, total: d.total, count: d.count })),
        feedback: {
          distribution: ratingDist,
          count: ratingsCount,
        },
        topMenuItems: topItems,
        bookingsByStatus,
        ordersByStatus,
      },
      "Reports dashboard"
    );
  } catch (e) {
    return next(e);
  }
}

export async function revenueSummary(req, res, next) {
  try {
    const range = parseRange({ from: req.query.from, to: req.query.to });
    const data = await Payment.aggregate([
      { $match: { payableType: { $in: ["ROOM", "RESTAURANT", "RESERVATION"] }, paidAt: { $gte: range.from, $lte: range.to } } },
      { $group: { _id: "$payableType", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);
    return ok(res, data, "Revenue summary");
  } catch (e) { return next(e); }
}

export async function occupancySummary(req, res, next) {
  try {
    const totalBookings = await Booking.countDocuments();
    const active = await Booking.countDocuments({ status: { $in: ["BOOKED", "APPROVED", "CHECKED_IN"] } });
    const checkedOut = await Booking.countDocuments({ status: "CHECKED_OUT" });
    return ok(res, { totalBookings, active, checkedOut }, "Occupancy summary");
  } catch (e) { return next(e); }
}

export async function topMenuItems(req, res, next) {
  try {
    const range = parseRange({ from: req.query.from, to: req.query.to });
    const data = await Order.aggregate([
      { $match: { createdAt: { $gte: range.from, $lte: range.to } } },
      { $unwind: "$items" },
      { $group: { _id: "$items.menuItemId", qty: { $sum: "$items.qty" }, revenue: { $sum: { $multiply: ["$items.qty", "$items.price"] } } } },
      { $sort: { qty: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "menuitems",
          localField: "_id",
          foreignField: "_id",
          as: "menuItem",
        },
      },
      { $unwind: { path: "$menuItem", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          qty: 1,
          revenue: 1,
          name: "$menuItem.name",
          category: "$menuItem.category",
        },
      },
    ]);
    return ok(res, data, "Top menu items");
  } catch (e) { return next(e); }
}

export async function ratingTrends(req, res, next) {
  try {
    const range = parseRange({ from: req.query.from, to: req.query.to });
    const data = await Feedback.aggregate([
      { $match: { createdAt: { $gte: range.from, $lte: range.to } } },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    return ok(res, data, "Rating trends");
  } catch (e) { return next(e); }
}

export async function exportPaymentsCsv(req, res, next) {
  try {
    const range = parseRange({ from: req.query.from, to: req.query.to });
    const rows = await Payment.find({ paidAt: { $gte: range.from, $lte: range.to } })
      .sort({ paidAt: -1 })
      .populate("createdBy", "name email role")
      .lean();

    const csv = toCsv(rows, [
      { label: "receiptNo", get: (r) => r.receiptNo },
      { label: "paidAt", get: (r) => r.paidAt },
      { label: "payableType", get: (r) => r.payableType },
      { label: "amount", get: (r) => r.amount },
      { label: "currency", get: (r) => r.currency },
      { label: "method", get: (r) => r.method },
      { label: "provider", get: (r) => r.provider },
      { label: "providerRef", get: (r) => r.providerRef },
      { label: "refId", get: (r) => r.refId },
      { label: "createdByName", get: (r) => r.createdBy?.name ?? "" },
      { label: "createdByEmail", get: (r) => r.createdBy?.email ?? "" },
    ]);

    const stamp = `${range.from.toISOString().slice(0, 10)}_to_${range.to.toISOString().slice(0, 10)}`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=payments_${stamp}.csv`);
    return res.send(csv);
  } catch (e) {
    return next(e);
  }
}

export async function exportBookingsCsv(req, res, next) {
  try {
    const range = parseRange({ from: req.query.from, to: req.query.to });
    const rows = await Booking.find({ createdAt: { $gte: range.from, $lte: range.to } })
      .sort({ createdAt: -1 })
      .populate("roomId", "roomNo type pricePerNight")
      .populate("createdBy", "name email")
      .lean();

    const csv = toCsv(rows, [
      { label: "id", get: (r) => r._id },
      { label: "createdAt", get: (r) => r.createdAt },
      { label: "status", get: (r) => r.status },
      { label: "customerName", get: (r) => r.customerName },
      { label: "customerContact", get: (r) => r.customerContact },
      { label: "roomNo", get: (r) => r.roomId?.roomNo ?? "" },
      { label: "roomType", get: (r) => r.roomId?.type ?? "" },
      { label: "checkIn", get: (r) => r.checkIn },
      { label: "checkOut", get: (r) => r.checkOut },
      { label: "paymentOption", get: (r) => r.paymentOption },
      { label: "paymentId", get: (r) => r.paymentId },
      { label: "createdByEmail", get: (r) => r.createdBy?.email ?? "" },
    ]);

    const stamp = `${range.from.toISOString().slice(0, 10)}_to_${range.to.toISOString().slice(0, 10)}`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=bookings_${stamp}.csv`);
    return res.send(csv);
  } catch (e) {
    return next(e);
  }
}

export async function exportOrdersCsv(req, res, next) {
  try {
    const range = parseRange({ from: req.query.from, to: req.query.to });
    const rows = await Order.find({ createdAt: { $gte: range.from, $lte: range.to } })
      .sort({ createdAt: -1 })
      .populate("roomId", "roomNo type")
      .populate("createdBy", "name email")
      .lean();

    const csv = toCsv(rows, [
      { label: "id", get: (r) => r._id },
      { label: "createdAt", get: (r) => r.createdAt },
      { label: "orderType", get: (r) => r.orderType },
      { label: "status", get: (r) => r.status },
      { label: "tableNo", get: (r) => r.tableNo },
      { label: "roomNo", get: (r) => r.roomId?.roomNo ?? "" },
      { label: "itemsCount", get: (r) => (Array.isArray(r.items) ? r.items.length : 0) },
      { label: "total", get: (r) => r.total },
      { label: "paymentOption", get: (r) => r.paymentOption },
      { label: "paymentId", get: (r) => r.paymentId },
      { label: "createdByEmail", get: (r) => r.createdBy?.email ?? "" },
    ]);

    const stamp = `${range.from.toISOString().slice(0, 10)}_to_${range.to.toISOString().slice(0, 10)}`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=orders_${stamp}.csv`);
    return res.send(csv);
  } catch (e) {
    return next(e);
  }
}

export async function invoiceByPayment(req, res, next) {
  try {
    const invoice = await buildInvoiceData(req.params.id);
    return ok(res, invoice, "Invoice");
  } catch (e) {
    return next(e);
  }
}

export async function invoicePdfByPayment(req, res, next) {
  try {
    const invoice = await buildInvoiceData(req.params.id);

    const safeNo = String(invoice.invoiceNo ?? "invoice").replace(/[^a-z0-9_-]+/gi, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice_${safeNo}.pdf`);

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    doc.pipe(res);

    const pageRight = 545;
    const status = Number(invoice.totals?.balance ?? 0) <= 0 ? "PAID" : "BALANCE DUE";

    // Header band
    doc.save();
    doc.rect(50, 40, pageRight - 50, 62).fill("#F3F4F6");
    doc.restore();

    doc.fillColor("#111111");
    doc.fontSize(18).font("Helvetica-Bold").text("Hotel Management System", 62, 55, { align: "left" });
    doc.fontSize(12).font("Helvetica").text("Invoice", 62, 78);

    // Status pill
    const pillW = 110;
    const pillH = 22;
    const pillX = pageRight - pillW;
    const pillY = 58;
    doc.save();
    doc.roundedRect(pillX, pillY, pillW, pillH, 10).fill(status === "PAID" ? "#DCFCE7" : "#FEF9C3");
    doc.restore();
    doc.fillColor("#111111");
    doc.fontSize(10).font("Helvetica-Bold").text(status, pillX, pillY + 6, { width: pillW, align: "center" });

    // Meta block
    doc.fillColor("#111111");
    doc.fontSize(10).font("Helvetica");
    let metaY = 120;
    const metaLeftX = 50;
    const metaRightX = 320;
    doc.font("Helvetica-Bold").text("Invoice Details", metaLeftX, metaY);
    doc.font("Helvetica");
    metaY += 16;
    doc.text(`Invoice No: ${invoice.invoiceNo ?? ""}`, metaLeftX, metaY);
    metaY += 14;
    doc.text(`Issued: ${formatDateTime(invoice.issuedAt)}`, metaLeftX, metaY);
    metaY += 14;
    doc.text(`Service: ${invoice.title ?? ""}`, metaLeftX, metaY);
    metaY += 14;
    doc.text(`Method: ${invoice.payment?.method ?? ""}`, metaLeftX, metaY);
    metaY += 14;
    if (invoice.payment?.provider) {
      doc.text(`Provider: ${invoice.payment.provider}`, metaLeftX, metaY);
      metaY += 14;
    }
    if (invoice.payment?.providerRef) {
      doc.text(`Provider Ref: ${String(invoice.payment.providerRef).slice(0, 26)}`, metaLeftX, metaY);
      metaY += 14;
    }

    // Billed to
    doc.font("Helvetica-Bold").text("Billed To", metaRightX, 120);
    doc.font("Helvetica");
    doc.text(invoice.customer?.name ?? "—", metaRightX, 136);
    if (invoice.customer?.email) doc.text(invoice.customer.email, metaRightX, 150);
    if (invoice.customer?.phone) doc.text(invoice.customer.phone, metaRightX, 164);

    // Context hints
    let ctxY = 188;
    doc.font("Helvetica-Bold").text("Reference", metaRightX, ctxY);
    doc.font("Helvetica");
    ctxY += 16;
    doc.text(`Type: ${invoice.payableType ?? ""}`, metaRightX, ctxY);
    ctxY += 14;
    doc.text(`Ref: ${invoice.refId ?? ""}`, metaRightX, ctxY, { width: 220 });
    ctxY += 14;
    if (invoice.context?.roomNo) {
      doc.text(`Room: ${invoice.context.roomNo}${invoice.context.roomType ? " · " + invoice.context.roomType : ""}`, metaRightX, ctxY);
      ctxY += 14;
    }
    if (invoice.context?.checkIn) {
      doc.text(`Check-in: ${formatDateTime(invoice.context.checkIn)}`, metaRightX, ctxY);
      ctxY += 14;
    }
    if (invoice.context?.checkOut) {
      doc.text(`Check-out: ${formatDateTime(invoice.context.checkOut)}`, metaRightX, ctxY);
      ctxY += 14;
    }
    if (invoice.context?.dateTime) {
      doc.text(`Reservation: ${formatDateTime(invoice.context.dateTime)}`, metaRightX, ctxY);
      ctxY += 14;
    }
    if (invoice.context?.partySize) {
      doc.text(`Party size: ${invoice.context.partySize}`, metaRightX, ctxY);
      ctxY += 14;
    }
    if (invoice.context?.orderType) {
      doc.text(`Order type: ${invoice.context.orderType}`, metaRightX, ctxY);
      ctxY += 14;
    }
    if (invoice.context?.tableNo) {
      doc.text(`Table: ${invoice.context.tableNo}`, metaRightX, ctxY);
      ctxY += 14;
    }

    doc.y = Math.max(metaY, ctxY) + 18;

    // Table header
    const startX = doc.x;
    let y = doc.y;
    const colDesc = startX;
    const colQty = 360;
    const colUnit = 410;
    const colTotal = 480;

    doc.font("Helvetica-Bold");
    doc.text("Description", colDesc, y, { width: 340 });
    doc.text("Qty", colQty, y, { width: 40, align: "right" });
    doc.text("Unit", colUnit, y, { width: 60, align: "right" });
    doc.text("Total", colTotal, y, { width: 70, align: "right" });

    y += 16;
    doc.moveTo(startX, y).lineTo(pageRight, y).strokeColor("#CCCCCC").stroke();
    y += 8;

    doc.font("Helvetica").strokeColor("#000000");
    const items = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
    items.forEach((it) => {
      const desc = String(it?.description ?? "");
      const qty = Number(it?.qty ?? 0);
      const unit = Number(it?.unitPrice ?? 0);
      const total = Number(it?.total ?? 0);

      const descHeight = doc.heightOfString(desc, { width: 340 });
      const rowHeight = Math.max(16, descHeight);

      doc.text(desc, colDesc, y, { width: 340 });
      doc.text(String(qty), colQty, y, { width: 40, align: "right" });
      doc.text(formatMoney(unit), colUnit, y, { width: 60, align: "right" });
      doc.text(formatMoney(total), colTotal, y, { width: 70, align: "right" });

      y += rowHeight + 8;
      if (y > 720) {
        doc.addPage();
        y = doc.y;
      }
    });

    // Totals box
    doc.moveDown(0.6);
    y = doc.y;
    const boxX = 345;
    const boxW = 200;
    const boxH = 92;
    doc.save();
    doc.roundedRect(boxX, y, boxW, boxH, 10).fill("#F9FAFB");
    doc.restore();
    doc.fillColor("#111111");
    const tx = boxX + 12;
    const tv = boxX + boxW - 12;
    let ty = y + 12;

    doc.font("Helvetica-Bold").text("Subtotal", tx, ty);
    doc.font("Helvetica").text(formatMoney(invoice.totals?.subtotal), tv - 70, ty, { width: 70, align: "right" });
    ty += 18;

    doc.font("Helvetica-Bold").text("Paid", tx, ty);
    doc.font("Helvetica").text(formatMoney(invoice.totals?.paid), tv - 70, ty, { width: 70, align: "right" });
    ty += 18;

    doc.font("Helvetica-Bold").text("Balance", tx, ty);
    doc.font("Helvetica").text(formatMoney(invoice.totals?.balance), tv - 70, ty, { width: 70, align: "right" });
    ty += 20;

    doc.moveTo(tx, ty).lineTo(boxX + boxW - 12, ty).strokeColor("#D1D5DB").stroke();
    ty += 8;
    doc.fontSize(11).font("Helvetica-Bold").text("Total", tx, ty);
    doc.text(formatMoney(invoice.totals?.total), tv - 70, ty, { width: 70, align: "right" });

    // Paid watermark
    if (status === "PAID") {
      doc.save();
      doc.fillColor("#E5E7EB");
      doc.fillOpacity(0.25);
      doc.fontSize(44).font("Helvetica-Bold");
      doc.rotate(-18, { origin: [200, 500] });
      doc.text("PAID", 180, 480);
      doc.restore();
    }

    doc.end();
  } catch (e) {
    return next(e);
  }
}
