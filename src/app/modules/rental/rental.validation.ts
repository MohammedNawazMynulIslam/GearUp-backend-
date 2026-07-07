import { z } from "zod";

const orderStatusEnum = z.enum([
  "PLACED",
  "CONFIRMED",
  "PAID",
  "PICKED_UP",
  "RETURNED",
  "CANCELLED",
]);

const rentalItemSchema = z.object({
  gearId: z.uuid("A valid gear id is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

const createRentalBodySchema = z
  .object({
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    pickupAddress: z.string().min(1, "Pickup address is required"),
    notes: z.string().optional(),
    items: z
      .array(rentalItemSchema)
      .min(1, "At least one rental item is required"),
  })
  .refine(
    (data) => new Date(data.endDate).getTime() > new Date(data.startDate).getTime(),
    {
      message: "End date must be after start date",
      path: ["endDate"],
    }
  );

export const createRentalValidationSchema = z.object({
  body: createRentalBodySchema,
});

const rentalParamsSchema = z.object({
  id: z.uuid("A valid rental id is required"),
});

export const rentalParamsValidationSchema = z.object({
  params: rentalParamsSchema,
});

const rentalQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  orderStatus: orderStatusEnum.optional(),
});

export const rentalQueryValidationSchema = z.object({
  query: rentalQuerySchema,
});

const updateOrderStatusBodySchema = z.object({
  orderStatus: orderStatusEnum,
});

export const updateOrderStatusValidationSchema = z.object({
  params: rentalParamsSchema,
  body: updateOrderStatusBodySchema,
});