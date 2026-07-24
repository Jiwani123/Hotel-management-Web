import { z } from "zod";
import { ROOM_STATUS_VALUES } from "../../constants/room.js";

export const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: z.enum(ROOM_STATUS_VALUES).optional(),
    type: z.string().optional(),
    q: z.string().optional(),
  }).passthrough(),
});

export const idParamSchema = z.object({ params: z.object({ id: z.string().min(1) }) });

export const createSchema = z.object({
  body: z.object({
    roomNo: z.string().min(1).max(20),
    type: z.string().min(1).max(50),
    pricePerNight: z.coerce.number().min(0),
    status: z.enum(ROOM_STATUS_VALUES).optional(),
    features: z.array(z.string().max(50)).optional(),
    images: z.array(z.string().min(1).max(500)).max(10).optional(),
  }),
});

export const updateSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    roomNo: z.string().min(1).max(20).optional(),
    type: z.string().min(1).max(50).optional(),
    pricePerNight: z.coerce.number().min(0).optional(),
    status: z.enum(ROOM_STATUS_VALUES).optional(),
    features: z.array(z.string().max(50)).optional(),
    images: z.array(z.string().min(1).max(500)).max(10).optional(),
  }),
});

export const availabilitySchema = z.object({
  query: z.object({
    checkIn: z.string().min(1),
    checkOut: z.string().min(1),
  }),
});
