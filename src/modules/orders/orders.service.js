import Order from "../../models/Order.js";
import mongoose from "mongoose";
import MenuItem from "../../models/MenuItem.js";
import Notification from "../../models/Notification.js";
import { BadRequestError, NotFoundError } from "../../shared/errors.js";
import { escapeRegex } from "../../shared/search.js";

export async function createOrder({ orderType, items, tableNo = "", roomId = null, createdBy }) {
  if (orderType === "DINE_IN" && !tableNo) throw new BadRequestError("tableNo is required for DINE_IN");
  if (orderType === "ROOM_SERVICE" && !roomId) throw new BadRequestError("roomId is required for ROOM_SERVICE");

  // hydrate items with prices from menu
  const hydrated = [];
  let total = 0;

  for (const it of items) {
    const menu = await MenuItem.findById(it.menuItemId);
    if (!menu) throw new NotFoundError("Menu item not found");
    if (!menu.isAvailable) throw new BadRequestError(`Menu item not available: ${menu.name}`);

    const price = menu.price;
    hydrated.push({ menuItemId: menu._id, qty: it.qty, price });
    total += price * it.qty;
  }

  const order = await Order.create({
    orderType,
    items: hydrated,
    status: "PLACED",
    tableNo,
    roomId,
    total,
    createdBy,
  });

  await Notification.create({
    userId: createdBy,
    title: "Order placed",
    message: `Order ${order._id} created`,
    type: "TASK",
    meta: { orderId: order._id, orderType },
    createdBy,
  });

  return Order.findById(order._id).populate("items.menuItemId roomId");
}

export async function listOrders({ page=1, limit=20, status, orderType, tableNo, roomId, from, to, createdBy, q } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (orderType) filter.orderType = orderType;
  if (tableNo) filter.tableNo = tableNo;
  if (roomId) filter.roomId = roomId;
  if (createdBy) filter.createdBy = createdBy;
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    const or = [
      { tableNo: rx },
      { status: rx },
      { orderType: rx },
    ];
    if (mongoose.isValidObjectId(q)) {
      or.push({ _id: q });
      or.push({ roomId: q });
      or.push({ createdBy: q });
    }
    filter.$or = or;
  }
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const skip = (page-1)*limit;
  const [items,total] = await Promise.all([
    Order.find(filter).populate("items.menuItemId roomId").sort("-createdAt").skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);
  return { items, total, page, limit, pages: Math.ceil(total/limit) };
}

export async function getOrder(id){
  return Order.findById(id).populate("items.menuItemId roomId");
}

export async function updateOrderStatus(id, status){
  const order = await Order.findById(id);
  if(!order) throw new NotFoundError("Order not found");

  // simple allowed transitions
  const allowed = {
    PLACED: ["PREPARING", "CANCELLED"],
    PREPARING: ["SERVED", "CANCELLED"],
    SERVED: ["PAID"],
    PAID: [],
    CANCELLED: [],
  };
  if(!allowed[order.status].includes(status) && order.status !== status){
    throw new BadRequestError(`Invalid status transition ${order.status} -> ${status}`);
  }

  order.status = status;
  await order.save();

  await Notification.create({
    userId: order.createdBy,
    title: "Order updated",
    message: `Order ${order._id} status set to ${status}`,
    type: "TASK",
    meta: { orderId: order._id, status },
    createdBy: order.createdBy,
  });

  return Order.findById(id).populate("items.menuItemId roomId");
}

export async function deleteOrder(id){
  return Order.findByIdAndDelete(id);
}
