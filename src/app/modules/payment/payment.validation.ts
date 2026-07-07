import { z } from "zod";

const paymentStatusEnum = z.enum(["PENDING", "SUCCESS", "FAILED", "REFUNDED"]);

const createPaymentBodySchema = z.object({
  orderId: z.uuid("A valid order id is required"),
  currency: z
    .string()
    .length(3, "Currency must be a valid 3-letter ISO code")
    .optional(),
});

export const createPaymentValidationSchema = z.object({
  body: createPaymentBodySchema,
});

const paymentParamsSchema = z.object({
  id: z.uuid("A valid payment id is required"),
});

export const paymentParamsValidationSchema = z.object({
  params: paymentParamsSchema,
});

const paymentQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: paymentStatusEnum.optional(),
});

export const paymentQueryValidationSchema = z.object({
  query: paymentQuerySchema,
});

const sessionQuerySchema = z.object({
  session_id: z.string().min(1, "session_id is required"),
});

export const sessionQueryValidationSchema = z.object({
  query: sessionQuerySchema,
});
