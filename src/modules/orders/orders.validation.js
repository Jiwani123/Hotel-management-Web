import { z } from "zod";

const itemSchema = z.object({
  menuItemId: z.string().min(1),
  qty: z.coerce.number().int().min(1),
});

export const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: z.enum(["PLACED","PREPARING","SERVED","PAID","CANCELLED"]).optional(),
    orderType: z.enum(["DINE_IN","ROOM_SERVICE"]).optional(),
    tableNo: z.string().optional(),
    roomId: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    q: z.string().optional(),
  }).passthrough(),
});

export const idParamSchema = z.object({ params: z.object({ id: z.string().min(1) }) });

export const createSchema = z.object({
  body: z.object({
    orderType: z.enum(["DINE_IN","ROOM_SERVICE"]),
    items: z.array(itemSchema).min(1),
    tableNo: z.string().max(20).optional(),
    roomId: z.string().optional(),
  }),
});

export const updateStatusSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    status: z.enum(["PLACED","PREPARING","SERVED","PAID","CANCELLED"]),
  }),
});
