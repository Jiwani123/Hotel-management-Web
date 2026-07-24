import { z } from "zod";
import { PAYABLE_TYPE_VALUES, PAYMENT_METHOD_VALUES } from "../../constants/payment.js";

export const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    payableType: z.enum(PAYABLE_TYPE_VALUES).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    q: z.string().optional(),
  }).passthrough(),
});

export const idParamSchema = z.object({ params: z.object({ id: z.string().min(1) }) });

export const createSchema = z.object({
  body: z.object({
    payableType: z.enum(PAYABLE_TYPE_VALUES),
    refId: z.string().min(1),
    amount: z.coerce.number().min(0),
    // Admin/staff payments are cash-only.
    method: z.literal("CASH"),
    paidAt: z.string().optional(),
  }),
});

export const updateSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    amount: z.coerce.number().min(0).optional(),
    // Allow updating method only to CASH from the admin API.
    method: z.literal("CASH").optional(),
    paidAt: z.string().optional(),
  }),
});

export const portalQuoteSchema = z.object({
  query: z.object({
    payableType: z.enum(PAYABLE_TYPE_VALUES),
    refId: z.string().min(1),
  }).passthrough(),
});

export const portalPaySchema = z.object({
  body: z.object({
    payableType: z.enum(PAYABLE_TYPE_VALUES),
    refId: z.string().min(1),
    method: z.enum(PAYMENT_METHOD_VALUES),
  }),
});

export const portalCheckoutSchema = z.object({
  body: z.object({
    payableType: z.enum(PAYABLE_TYPE_VALUES),
    refId: z.string().min(1),
  }),
});

export const portalOptionSchema = z.object({
  body: z.object({
    payableType: z.enum(PAYABLE_TYPE_VALUES),
    refId: z.string().min(1),
    option: z.enum(["PAY_ON_PICKUP", "CARD"]),
  }),
});

export const portalConfirmStripeSchema = z.object({
  query: z.object({
    sessionId: z.string().min(1),
  }).passthrough(),
});
