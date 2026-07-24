import { ok } from "../../shared/apiResponse.js";
import { listRooms, findAvailableRooms } from "../rooms/rooms.service.js";
import { listItems } from "../menu/menu.service.js";
import { getRoom } from "../rooms/rooms.service.js";
import { getItem } from "../menu/menu.service.js";
import { NotFoundError } from "../../shared/errors.js";
import { listFeedback } from "../feedback/feedback.service.js";

export async function listPublicRooms(req, res, next) {
  try {
    const result = await listRooms({
      ...req.validated.query,
      status: req.validated.query.status ?? "AVAILABLE",
    });
    return ok(res, result, "Rooms");
  } catch (e) { return next(e); }
}

export async function availabilityPublic(req, res, next) {
  try {
    const result = await findAvailableRooms(req.validated.query);
    return ok(res, result, "Available rooms");
  } catch (e) { return next(e); }
}

export async function listPublicMenu(req, res, next) {
  try {
    const result = await listItems({
      ...req.validated.query,
      isAvailable: true,
    });
    return ok(res, result, "Menu items");
  } catch (e) { return next(e); }
}

export async function getPublicRoomById(req, res, next) {
  try {
    const room = await getRoom(req.validated.params.id);
    if (!room || room.status === "MAINTENANCE") throw new NotFoundError("Room not found");
    return ok(res, room, "Room");
  } catch (e) {
    return next(e);
  }
}

export async function getPublicMenuById(req, res, next) {
  try {
    const item = await getItem(req.validated.params.id);
    if (!item || item.isAvailable === false) throw new NotFoundError("Menu item not found");
    return ok(res, item, "Menu item");
  } catch (e) {
    return next(e);
  }
}

export async function listPublicFeedback(req, res, next) {
  try {
    const result = await listFeedback(req.validated.query);
    return ok(res, result, "Feedback");
  } catch (e) {
    return next(e);
  }
}
