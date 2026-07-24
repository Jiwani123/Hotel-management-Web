import { z } from "zod";
import { ROLES } from "../../constants/roles.js";

export const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    q: z.string().optional(),
    role: z.enum(Object.values(ROLES)).optional(),
    isActive: z.coerce.boolean().optional(),
  }).passthrough(),
});

export const idParamSchema = z.object({ params: z.object({ id: z.string().min(1) }) });

export const updateSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(2).max(80).optional(),
    email: z.string().email().optional(),
    role: z.enum(Object.values(ROLES)).optional(),
    isActive: z.coerce.boolean().optional(),
    password: z.string().min(8).max(128).optional(),
  }),
});

export const updateMeSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80).optional(),
    email: z.string().email().optional(),
    password: z.string().min(8).max(128).optional(),
  }),
});
