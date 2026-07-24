import { z } from "zod";

const optionalBool = z.preprocess((v) => (v === "" ? undefined : v), z.coerce.boolean().optional());

export const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    category: z.string().optional(),
    q: z.string().optional(),
    isAvailable: optionalBool,
    isVeg: optionalBool,
  }).passthrough(),
});

export const idParamSchema = z.object({ params: z.object({ id: z.string().min(1) }) });

export const createSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    category: z.string().min(1).max(80),
    price: z.coerce.number().min(0),
    isAvailable: optionalBool,
    isVeg: optionalBool,
    images: z.array(z.string().min(1).max(500)).max(10).optional(),
  }),
});

export const updateSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(2).max(120).optional(),
    category: z.string().min(1).max(80).optional(),
    price: z.coerce.number().min(0).optional(),
    isAvailable: optionalBool,
    isVeg: optionalBool,
    images: z.array(z.string().min(1).max(500)).max(10).optional(),
  }),
});
