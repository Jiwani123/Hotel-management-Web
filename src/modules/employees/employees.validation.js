import { z } from "zod";
import { STAFF_ROLES } from "../../constants/roles.js";

const phone10Schema = z
  .string()
  .transform((s) => String(s).replace(/\s+/g, ""))
  .refine((s) => /^0\d{9}$/.test(s), { message: "Phone must start with 0 and be exactly 10 digits" });

export const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    q: z.string().optional(),
    role: z.enum(STAFF_ROLES).optional(),
    isActive: z.coerce.boolean().optional(),
  }).passthrough(),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const createSchema = z.object({
  body: z.object({
    empNo: z.string().min(1).max(30),
    name: z.string().min(2).max(120),
    role: z.enum(STAFF_ROLES),
    phone: phone10Schema.optional(),
    address: z.string().max(200).optional(),
    salary: z.coerce.number().min(0).optional(),
    isActive: z.coerce.boolean().optional(),
  }),
});

export const updateSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    empNo: z.string().min(1).max(30).optional(),
    name: z.string().min(2).max(120).optional(),
    role: z.enum(STAFF_ROLES).optional(),
    phone: phone10Schema.optional(),
    address: z.string().max(200).optional(),
    salary: z.coerce.number().min(0).optional(),
    isActive: z.coerce.boolean().optional(),
  }),
});
