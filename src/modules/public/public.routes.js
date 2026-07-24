import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { listSchema as roomsListSchema, availabilitySchema, idParamSchema as roomIdSchema } from "../rooms/rooms.validation.js";
import { listSchema as menuListSchema, idParamSchema as menuIdSchema } from "../menu/menu.validation.js";
import { listSchema as feedbackListSchema } from "../feedback/feedback.validation.js";
import { listPublicRooms, availabilityPublic, listPublicMenu, getPublicRoomById, getPublicMenuById, listPublicFeedback } from "./public.controller.js";

const router = Router();

router.get("/rooms", validate(roomsListSchema), listPublicRooms);
router.get("/rooms/availability", validate(availabilitySchema), availabilityPublic);
router.get("/rooms/:id", validate(roomIdSchema), getPublicRoomById);
router.get("/menu", validate(menuListSchema), listPublicMenu);
router.get("/menu/:id", validate(menuIdSchema), getPublicMenuById);
router.get("/feedback", validate(feedbackListSchema), listPublicFeedback);

export default router;
