import { z } from "zod";

const optionalObjectId = z.preprocess(
  (v) => (v === null || v === undefined || v === "" ? undefined : v),
  z.coerce
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, "bookingId must be a valid id")
    .optional()
);

const ratingSchema = z.preprocess(
  (v) => {
    if (v === null || v === undefined || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : v;
  },
  z
    .number({
      required_error: "Rating is required",
      invalid_type_error: "Rating must be a number",
    })
    .int()
    .min(1)
    .max(5)
);

export const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    q: z.string().optional(),
  }).passthrough(),
});

export const idParamSchema = z.object({ params: z.object({ id: z.string().min(1) }) });

export const createSchema = z.object({
  body: z.object({
    customerName: z.coerce.string().trim().max(120).optional(),
    bookingId: optionalObjectId,
    rating: ratingSchema,
    comment: z.coerce.string().trim().max(500).optional(),
  }),
});

export const updateSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    customerName: z.coerce.string().trim().max(120).optional(),
    bookingId: optionalObjectId,
    rating: ratingSchema.optional(),
    comment: z.coerce.string().trim().max(500).optional(),
  }),
});
