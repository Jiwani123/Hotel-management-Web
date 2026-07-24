import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
  }),
});

export const bootstrapAdminSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80),
    email: z.string().email(),
    password: z.string().min(8).max(128),
  }),
});

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    role: z.enum(["ADMIN", "RECEPTION", "RESTAURANT_STAFF", "HOUSEKEEPING", "CUSTOMER"]),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80),
    email: z.string().email(),
    password: z.string().min(8).max(128),
  }),
});
