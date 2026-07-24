import { z } from "zod";
import { parseDateInput } from "../../shared/dates.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

function isDateOnly(input) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(input ?? "").trim());
}

function isFutureDateTime(input) {
  const dt = parseDateInput(input);
  if (!dt) return false;
  return dt.getTime() >= Date.now();
}

export const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: z.enum(["PENDING","DONE"]).optional(),
    roomId: z.string().optional(),
    q: z.string().optional(),
  }).passthrough(),
});

export const idParamSchema = z.object({ params: z.object({ id: z.string().min(1) }) });

export const createSchema = z.object({
  body: z.object({
    roomId: z.string().min(1),
    assignedTo: objectId.optional(),
    scheduledAt: z
      .string()
      .min(1, "Scheduled date/time is required")
      .refine((v) => !isDateOnly(v), { message: "Please select a time slot" })
      .refine((v) => parseDateInput(v) !== null, { message: "Invalid scheduled date/time" })
      .refine((v) => isFutureDateTime(v), { message: "Scheduled time must be in the future" }),
    status: z.enum(["PENDING","DONE"]).optional(),
    notes: z.string().max(500).optional(),
  }),
});

export const updateSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    roomId: z.string().optional(),
    assignedTo: objectId.optional(),
    scheduledAt: z
      .string()
      .optional()
      .refine((v) => v === undefined || !isDateOnly(v), { message: "Please select a time slot" })
      .refine((v) => v === undefined || parseDateInput(v) !== null, { message: "Invalid scheduled date/time" })
      .refine((v) => v === undefined || isFutureDateTime(v), { message: "Scheduled time must be in the future" }),
    status: z.enum(["PENDING","DONE"]).optional(),
    notes: z.string().max(500).optional(),
  }),
});
