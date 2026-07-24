import { z } from "zod";

export const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    type: z.enum(["INFO", "ALERT", "TASK", "BOOKING", "PAYMENT", "SYSTEM"]).optional(),
    isRead: z.coerce.boolean().optional(),
    userId: z.string().optional(),
  }).passthrough(),
});

export const idParamSchema = z.object({ params: z.object({ id: z.string().min(1) }) });

export const createSchema = z.object({
  body: z.object({
    userId: z.string().min(1),
    title: z.string().min(2).max(120),
    message: z.string().min(2).max(500),
    type: z.enum(["INFO", "ALERT", "TASK", "BOOKING", "PAYMENT", "SYSTEM"]).optional(),
    meta: z.record(z.any()).optional(),
  }),
});

export const markAllSchema = z.object({
  body: z.object({
    type: z.enum(["INFO", "ALERT", "TASK", "BOOKING", "PAYMENT", "SYSTEM"]).optional(),
  }).optional(),
});
