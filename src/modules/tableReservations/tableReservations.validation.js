import { z } from "zod";
import { parseDateInput } from "../../shared/dates.js";

const phone10Schema = z
  .string()
  .transform((s) => String(s).replace(/\s+/g, ""))
  .refine((s) => /^0\d{9}$/.test(s), { message: "Phone must start with 0 and be exactly 10 digits" });

export const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: z.enum(["BOOKED","APPROVED","REJECTED","CANCELLED","ARRIVED"]).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    q: z.string().optional(),
  }).passthrough(),
});

export const idParamSchema = z.object({ params: z.object({ id: z.string().min(1) }) });

export const createSchema = z.object({
  body: z.object({
    customerName: z.string().min(2).max(120),
    phone: phone10Schema,
    dateTime: z.string().min(1, "Date/time is required").refine((v) => !!parseDateInput(v), { message: "Invalid date/time" }),
    partySize: z.coerce.number().int().min(1).max(50),
  }).superRefine((val, ctx) => {
    const dt = parseDateInput(val.dateTime);
    if (!dt) return;
    if (dt.getTime() < Date.now()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dateTime"], message: "Reservation date/time must be in the future" });
    }
  }),
});

export const updateSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    customerName: z.string().min(2).max(120).optional(),
    phone: phone10Schema.optional(),
    dateTime: z.string().optional().refine((v) => (v == null ? true : !!parseDateInput(v)), { message: "Invalid date/time" }),
    partySize: z.coerce.number().int().min(1).max(50).optional(),
    status: z.enum(["BOOKED","APPROVED","REJECTED","CANCELLED","ARRIVED"]).optional(),
  }).superRefine((val, ctx) => {
    if (!val.dateTime) return;
    const dt = parseDateInput(val.dateTime);
    if (!dt) return;
    if (dt.getTime() < Date.now()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dateTime"], message: "Reservation date/time must be in the future" });
    }
  }),
});
