import { z } from "zod";
import { parseDateInput, startOfLocalDay, startOfTodayLocal } from "../../shared/dates.js";

const phone10Schema = z
  .string()
  .transform((s) => String(s).replace(/\s+/g, ""))
  .refine((s) => /^0\d{9}$/.test(s), { message: "Phone must start with 0 and be exactly 10 digits" });

export const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: z.enum(["BOOKED","APPROVED","REJECTED","CANCELLED","CHECKED_IN","CHECKED_OUT"]).optional(),
    q: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }).passthrough(),
});

export const idParamSchema = z.object({ params: z.object({ id: z.string().min(1) }) });

export const createSchema = z.object({
  body: z.object({
    customerName: z.string().min(2).max(120),
    customerContact: phone10Schema,
    roomId: z.string().min(1),
    checkIn: z.string().min(1, "Check-in date is required").refine((v) => !!parseDateInput(v), { message: "Invalid check-in date" }),
    checkOut: z.string().min(1, "Check-out date is required").refine((v) => !!parseDateInput(v), { message: "Invalid check-out date" }),
  }).superRefine((val, ctx) => {
    const inDate = parseDateInput(val.checkIn);
    const outDate = parseDateInput(val.checkOut);
    if (!inDate || !outDate) return;

    const today = startOfTodayLocal();
    if (startOfLocalDay(inDate) < today) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["checkIn"], message: "Check-in date must be today or later" });
    }
    if (!(outDate > inDate)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["checkOut"], message: "Check-out must be after check-in" });
    }
  }),
});

export const updateSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    customerName: z.string().min(2).max(120).optional(),
    customerContact: phone10Schema.optional(),
    roomId: z.string().min(1).optional(),
    checkIn: z.string().min(1).optional().refine((v) => (v == null ? true : !!parseDateInput(v)), { message: "Invalid check-in date" }),
    checkOut: z.string().min(1).optional().refine((v) => (v == null ? true : !!parseDateInput(v)), { message: "Invalid check-out date" }),
    status: z.enum(["BOOKED","APPROVED","REJECTED","CANCELLED","CHECKED_IN","CHECKED_OUT"]).optional(),
  }).superRefine((val, ctx) => {
    if (val.checkIn) {
      const inDate = parseDateInput(val.checkIn);
      if (inDate && startOfLocalDay(inDate) < startOfTodayLocal()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["checkIn"], message: "Check-in date must be today or later" });
      }
    }
    if (val.checkIn && val.checkOut) {
      const inDate = parseDateInput(val.checkIn);
      const outDate = parseDateInput(val.checkOut);
      if (inDate && outDate && !(outDate > inDate)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["checkOut"], message: "Check-out must be after check-in" });
      }
    }
  }),
});

export const statusSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});
